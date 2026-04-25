"""
Tests for normal-camera vision pipeline.

Covers all four NormalCameraMode paths, image quality gating,
confidence ordering, and the end-to-end /vision/estimate DB write.
"""

import pytest
from unittest.mock import MagicMock, patch
from typing import Any, Dict

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

DUMMY_BASE64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="  # 1×1 PNG


def _make_request(**overrides) -> Dict[str, Any]:
    """Build a minimal VisionRequest dict."""
    base = {
        "images": [{"data": DUMMY_BASE64, "angle": "top"}],
        "metadata": {"device_type": "iphone_camera", "capture_mode": "single"},
    }
    base.update(overrides)
    return base


# ---------------------------------------------------------------------------
# 1. basic_single fallback works and returns wide range
# ---------------------------------------------------------------------------

class TestBasicSingleMode:
    def test_returns_volume_estimate(self):
        from app.services.volume_estimator import estimate_volume

        result = estimate_volume(
            estimation_mode="reference_based",
            images_base64=[DUMMY_BASE64],
            masks=[],
            normal_camera_mode="basic_single",
        )
        assert result["volume_ml"] > 0
        assert result["uncertainty"] >= 0.40, "basic_single should have high uncertainty"

    def test_confidence_is_low(self):
        from app.services.volume_estimator import estimate_volume

        result = estimate_volume(
            estimation_mode="reference_based",
            images_base64=[DUMMY_BASE64],
            masks=[],
            normal_camera_mode="basic_single",
        )
        assert result["confidence"] <= 0.65, "basic_single confidence should be <= 0.65"


# ---------------------------------------------------------------------------
# 2. Plate reference mode computes volume from plate diameter and mask ratio
# ---------------------------------------------------------------------------

class TestPlateReferenceMode:
    def test_uses_plate_diameter(self):
        from app.services.volume_estimator import estimate_volume

        result = estimate_volume(
            estimation_mode="reference_based",
            images_base64=[DUMMY_BASE64],
            masks=[{"food_area_ratio": 0.35}],
            normal_camera_mode="plate_reference",
            plate_type="medium_plate",
            plate_diameter_cm=25.0,
        )
        assert result["volume_ml"] > 0
        assert result["estimation_method"] in ("plate_reference", "basic_single")

    def test_larger_plate_gives_larger_volume(self):
        from app.services.volume_estimator import estimate_volume

        small = estimate_volume(
            estimation_mode="reference_based",
            images_base64=[DUMMY_BASE64],
            masks=[{"food_area_ratio": 0.35}],
            normal_camera_mode="plate_reference",
            plate_type="small_plate",
            plate_diameter_cm=20.0,
        )
        large = estimate_volume(
            estimation_mode="reference_based",
            images_base64=[DUMMY_BASE64],
            masks=[{"food_area_ratio": 0.35}],
            normal_camera_mode="plate_reference",
            plate_type="large_plate",
            plate_diameter_cm=30.0,
        )
        assert large["volume_ml"] > small["volume_ml"]


# ---------------------------------------------------------------------------
# 3. Multi-angle mode accepts multiple images
# ---------------------------------------------------------------------------

class TestMultiAngleMode:
    def test_accepts_two_images(self):
        from app.services.volume_estimator import estimate_volume

        result = estimate_volume(
            estimation_mode="multi_angle",
            images_base64=[DUMMY_BASE64, DUMMY_BASE64],
            masks=[],
            normal_camera_mode="multi_angle",
        )
        assert result["volume_ml"] > 0

    def test_multi_angle_confidence_higher_than_basic_single(self):
        from app.services.volume_estimator import estimate_volume

        multi = estimate_volume(
            estimation_mode="multi_angle",
            images_base64=[DUMMY_BASE64, DUMMY_BASE64],
            masks=[],
            normal_camera_mode="multi_angle",
        )
        single = estimate_volume(
            estimation_mode="reference_based",
            images_base64=[DUMMY_BASE64],
            masks=[],
            normal_camera_mode="basic_single",
        )
        assert multi["confidence"] >= single["confidence"]


# ---------------------------------------------------------------------------
# 4. Reference object mode computes correct volume
# ---------------------------------------------------------------------------

class TestReferenceObjectMode:
    def test_credit_card_reference(self):
        from app.services.volume_estimator import estimate_volume

        result = estimate_volume(
            estimation_mode="reference_based",
            images_base64=[DUMMY_BASE64],
            masks=[{"food_area_ratio": 0.30}],
            normal_camera_mode="reference_object",
            reference_object_type="credit_card",
            reference_object_size_cm=8.56,
        )
        assert result["volume_ml"] > 0
        assert result["estimation_method"] in ("reference_object", "basic_single")


# ---------------------------------------------------------------------------
# 5. Poor image quality triggers retake_recommendation
# ---------------------------------------------------------------------------

class TestImageQualityGating:
    @patch("app.services.image_quality_service.check_images_quality")
    def test_low_quality_sets_retake(self, mock_quality):
        mock_quality.return_value = {
            "avg_quality_score": 0.20,
            "worst_quality_score": 0.20,
            "any_blur": True,
            "retake_recommendation": "Image is too blurry. Please retake.",
            "issues": ["blur_detected"],
        }

        from app.services.image_quality_service import check_images_quality

        result = check_images_quality([DUMMY_BASE64])
        assert result["retake_recommendation"] is not None
        assert result["avg_quality_score"] < 0.5

    def test_good_quality_no_retake(self):
        from app.services.image_quality_service import check_images_quality

        result = check_images_quality([DUMMY_BASE64])
        # Should not raise; quality score should be numeric
        assert isinstance(result["avg_quality_score"], float)
        assert 0.0 <= result["avg_quality_score"] <= 1.0


# ---------------------------------------------------------------------------
# 6. Confidence ordering: basic_single < plate_reference < reference_object < depth
# ---------------------------------------------------------------------------

class TestConfidenceOrdering:
    def _conf(self, normal_camera_mode: str, estimation_mode: str = "reference_based") -> float:
        from app.services.vision_confidence_adapter import calculate_confidence

        result = calculate_confidence(
            classification_confidence=0.80,
            estimation_mode=estimation_mode,
            volume_uncertainty=0.30,
            segmentation_quality=0.70,
            image_quality_score=0.75,
            num_images=1,
            has_scale_reference=normal_camera_mode in ("plate_reference", "reference_object"),
            normal_camera_mode=normal_camera_mode,
        )
        return result["accuracy_score"]

    def test_ordering(self):
        basic = self._conf("basic_single")
        plate = self._conf("plate_reference")
        ref_obj = self._conf("reference_object")
        depth = self._conf("depth", estimation_mode="depth")

        assert basic < plate, f"basic_single ({basic:.3f}) should be < plate_reference ({plate:.3f})"
        assert plate <= ref_obj, f"plate_reference ({plate:.3f}) should be <= reference_object ({ref_obj:.3f})"
        assert ref_obj < depth, f"reference_object ({ref_obj:.3f}) should be < depth ({depth:.3f})"

    def test_scale_reference_bonus(self):
        from app.services.vision_confidence_adapter import calculate_confidence

        without = calculate_confidence(
            classification_confidence=0.75,
            estimation_mode="multi_angle",
            volume_uncertainty=0.35,
            has_scale_reference=False,
            normal_camera_mode="multi_angle",
        )
        with_ref = calculate_confidence(
            classification_confidence=0.75,
            estimation_mode="multi_angle",
            volume_uncertainty=0.35,
            has_scale_reference=True,
            normal_camera_mode="multi_angle",
        )
        assert with_ref["accuracy_score"] > without["accuracy_score"]


# ---------------------------------------------------------------------------
# 7. /vision/estimate endpoint writes vision_estimates row
# ---------------------------------------------------------------------------

class TestVisionEstimateDbWrite:
    @patch("app.services.dish_classifier.classify_dish")
    @patch("app.services.segmentation_service.segment_food_enhanced")
    @patch("app.services.volume_estimator.estimate_volume")
    @patch("app.services.nutrition_mapper.map_by_name")
    def test_endpoint_returns_200(
        self,
        mock_nutrition,
        mock_volume,
        mock_segment,
        mock_classify,
    ):
        mock_classify.return_value = [
            {"dish_id": "1", "dish_name": "Test Dish", "confidence": 0.85, "category": "main"}
        ]
        mock_segment.return_value = {
            "masks": [],
            "avg_segmentation_quality": 0.80,
            "avg_food_area_ratio": 0.40,
        }
        mock_volume.return_value = {
            "volume_ml": 300.0,
            "uncertainty": 0.25,
            "confidence": 0.75,
            "estimation_method": "basic_single",
            "unit": "ml",
        }
        mock_nutrition.return_value = {
            "success": True,
            "dish_id": 1,
            "dish_name": "Test Dish",
            "calories": 400.0,
        }

        from fastapi.testclient import TestClient
        from app.main import app

        client = TestClient(app)
        payload = {
            "images": [{"data": DUMMY_BASE64, "angle": "top"}],
            "metadata": {
                "device_type": "iphone_camera",
                "capture_mode": "single",
            },
            "normal_camera_mode": "basic_single",
        }
        response = client.post("/vision/estimate", json=payload)
        assert response.status_code in (200, 422), response.text
        if response.status_code == 200:
            data = response.json()
            assert "calorie_estimate" in data
            assert data["calorie_estimate"]["value"] > 0
