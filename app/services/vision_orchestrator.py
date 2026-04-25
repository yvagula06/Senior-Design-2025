"""
Vision Orchestrator Service

Orchestrates the full vision-based meal estimation pipeline:
1. Image quality checks
2. Mode detection (depth / normal-camera sub-mode)
3. Dish classification
4. Food segmentation (enhanced)
5. Volume estimation (mode-specific)
6. Nutrition mapping
7. Confidence calculation (multi-factor)
8. Response assembly with quality scores and retake recommendations
"""

from typing import Dict, List, Optional
from datetime import datetime
import time

from app.schemas.vision import (
    CaptureMode,
    NormalCameraMode,
    VisionRequest,
    VisionResponse,
    DishPrediction,
    SelectedDish,
    CalorieEstimate,
    CalorieRange,
    VolumeEstimate,
    EstimationMode,
    SuggestedMealLog,
    ResponseMetadata,
    ModelVersions,
)
from app.services import (
    dish_classifier,
    segmentation_service,
    volume_estimator,
    nutrition_mapper,
    vision_confidence_adapter,
)
from app.services.image_quality_service import check_images_quality

# Import depth volume estimator for direct numpy path (RealSense)
try:
    from app.services.depth_volume_estimator import estimate_volume_from_numpy
    import base64 as _base64
    import io as _io
    import numpy as _np
    _NUMPY_DEPTH_AVAILABLE = True
except ImportError:
    _NUMPY_DEPTH_AVAILABLE = False


class VisionOrchestrator:
    """Orchestrates vision-based meal estimation pipeline."""
    
    def __init__(self):
        """Initialize orchestrator."""
        self.model_versions = ModelVersions(
            classifier="mocked_v1.0",
            segmentation="mocked_v1.0",
            volume_estimator="mocked_v1.0"
        )
    
    def estimate_meal(self, request: VisionRequest) -> VisionResponse:
        """
        Execute full vision estimation pipeline.
        """
        start_time = time.time()
        warnings: List[str] = []

        # ── STEP 0: Image quality checks ──────────────────────────────────────
        image_data_list = [img.data for img in request.images]
        quality_info = check_images_quality(image_data_list)
        avg_image_quality = quality_info.get("avg_quality_score", 0.75)
        retake_recommendation: Optional[str] = quality_info.get("retake_recommendation")
        if retake_recommendation:
            warnings.append(f"Image quality: {retake_recommendation}")

        # ── STEP 1: Mode detection ─────────────────────────────────────────────
        estimation_mode = self._detect_mode(request)
        normal_camera_mode: Optional[str] = (
            request.normal_camera_mode.value if request.normal_camera_mode else None
        )

        # Infer normal_camera_mode from context if not set
        if normal_camera_mode is None and estimation_mode != EstimationMode.DEPTH:
            has_plate = bool(request.plate_type or request.plate_diameter_cm)
            has_ref = bool(request.reference_object_type or request.reference_object_size_cm)
            n_imgs = len(request.images)
            if has_ref:
                normal_camera_mode = "reference_object"
            elif has_plate:
                normal_camera_mode = "plate_reference"
            elif estimation_mode == EstimationMode.MULTI_ANGLE or n_imgs >= 2:
                normal_camera_mode = "multi_angle"
            else:
                normal_camera_mode = "basic_single"

        has_scale_reference = bool(
            request.plate_type or request.plate_diameter_cm
            or request.reference_object_type or request.reference_object_size_cm
        )

        # ── STEP 2: Dish classification ────────────────────────────────────────
        primary_image = request.images[0].data
        predictions = dish_classifier.classify_dish(primary_image, top_k=3)

        dish_predictions = [
            DishPrediction(
                dish_id=p["dish_id"],
                dish_name=p["dish_name"],
                confidence=p["confidence"],
                category=p.get("category"),
            )
            for p in predictions
        ]

        selected = predictions[0]
        selected_dish = SelectedDish(
            dish_id=selected["dish_id"],
            dish_name=selected["dish_name"],
            confidence=selected["confidence"],
        )
        dish_category: Optional[str] = selected.get("category")

        # ── STEP 3: Food segmentation (enhanced) ──────────────────────────────
        seg_info = segmentation_service.segment_food_enhanced(image_data_list)
        masks = seg_info.get("masks", [])
        avg_segmentation_quality = seg_info.get("avg_segmentation_quality", 0.5)

        # ── STEP 4: Volume estimation ──────────────────────────────────────────
        depth_data_dict: Optional[Dict] = None
        if request.depth_data:
            depth_data_dict = {
                "depth_map": request.depth_data.depth_map,
                "format": request.depth_data.format.value,
                "scale": request.depth_data.scale,
            }

        intrinsics_dict: Optional[Dict] = None
        if request.camera_intrinsics:
            intrinsics_dict = {
                "focal_length_x": request.camera_intrinsics.focal_length_x,
                "focal_length_y": request.camera_intrinsics.focal_length_y,
                "principal_point_x": request.camera_intrinsics.principal_point_x,
                "principal_point_y": request.camera_intrinsics.principal_point_y,
                "image_width": request.camera_intrinsics.image_width,
                "image_height": request.camera_intrinsics.image_height,
            }
            if request.camera_intrinsics.depth_scale is not None:
                intrinsics_dict["depth_scale"] = request.camera_intrinsics.depth_scale

        # RealSense NPY direct path
        npy_volume_attempted = False
        if (
            estimation_mode.value == "depth"
            and depth_data_dict is not None
            and intrinsics_dict is not None
            and depth_data_dict.get("format") == "npy"
            and _NUMPY_DEPTH_AVAILABLE
        ):
            try:
                raw_bytes = _base64.b64decode(depth_data_dict["depth_map"])
                depth_m = _np.load(_io.BytesIO(raw_bytes))
                volume_result = estimate_volume_from_numpy(
                    depth_m=depth_m,
                    camera_intrinsics=intrinsics_dict,
                    mask=masks[0] if masks else None,
                )
                npy_volume_attempted = True
            except Exception as exc:
                warnings.append(f"RealSense NPY volume estimation failed ({exc}), falling back")

        if not npy_volume_attempted:
            # Depth mode without data → downgrade
            if estimation_mode.value == "depth" and depth_data_dict is None:
                fb_mode = "multi_angle" if len(request.images) >= 2 else "reference_based"
                warnings.append(
                    f"Depth mode requested but no depth data provided. "
                    f"Falling back to {fb_mode} (accuracy penalty applied)."
                )
                estimation_mode = EstimationMode(fb_mode)

            volume_result = volume_estimator.estimate_volume(
                estimation_mode=estimation_mode.value,
                images_base64=image_data_list,
                masks=masks,
                depth_data=depth_data_dict,
                camera_intrinsics=intrinsics_dict,
                # Normal-camera extras
                normal_camera_mode=normal_camera_mode,
                plate_type=(
                    request.plate_type.value if request.plate_type else None
                ),
                plate_diameter_cm=request.plate_diameter_cm,
                reference_object_type=(
                    request.reference_object_type.value
                    if request.reference_object_type else None
                ),
                reference_object_size_cm=request.reference_object_size_cm,
                dish_category=dish_category,
                segmentation_info=seg_info,
            )

        # Defensive volume clamp
        if volume_result.get("volume_ml", 0) <= 0:
            warnings.append("Invalid volume estimate, using fallback")
            volume_result["volume_ml"] = 250.0
            volume_result["confidence"] = 0.3
            volume_result["uncertainty"] = 0.5

        # ── STEP 5: Nutrition mapping ──────────────────────────────────────────
        nutrition_result = nutrition_mapper.map_by_name(
            dish_name=selected_dish.dish_name,
            volume_ml=volume_result["volume_ml"],
        )

        if not nutrition_result.get("success", False) or nutrition_result.get("calories", 0) <= 0:
            warnings.append(
                f"Nutrition mapping failed: {nutrition_result.get('error', 'unknown')}. "
                "Using volume-based fallback."
            )
            nutrition_result["calories"] = volume_result["volume_ml"] * 1.0
            nutrition_result["success"] = False

        # ── STEP 6: Confidence calculation ────────────────────────────────────
        effective_mode = normal_camera_mode or estimation_mode.value
        confidence_result = vision_confidence_adapter.calculate_confidence(
            classification_confidence=selected_dish.confidence,
            estimation_mode=estimation_mode.value,
            volume_uncertainty=volume_result.get("uncertainty", 0.4),
            segmentation_quality=avg_segmentation_quality,
            image_quality_score=avg_image_quality,
            num_images=len(request.images),
            has_scale_reference=has_scale_reference,
            normal_camera_mode=effective_mode,
        )

        accuracy_score = confidence_result["accuracy_score"]
        range_multiplier = confidence_result["range_multiplier"]

        # ── STEP 7: Calorie range ──────────────────────────────────────────────
        calories = max(50.0, nutrition_result.get("calories", 50.0))
        calorie_min = max(0.0, calories * (1 - range_multiplier))
        calorie_max = calories * (1 + range_multiplier)

        calorie_estimate = CalorieEstimate(
            value=round(calories, 1),
            range=CalorieRange(
                min=round(calorie_min, 1),
                max=round(calorie_max, 1),
            ),
            unit="kcal",
        )

        volume_estimate = VolumeEstimate(
            value=round(volume_result["volume_ml"], 1),
            unit=volume_result.get("unit", "ml"),
            confidence=volume_result.get("confidence", 0.5),
        )

        suggested_meal_log = SuggestedMealLog(
            dish_id=nutrition_result.get("dish_id", selected_dish.dish_id),
            dish_name=nutrition_result.get("dish_name", selected_dish.dish_name),
            calories=round(calories, 1),
            serving_size=f"~{round(volume_result['volume_ml'])}ml",
            timestamp=datetime.now(),
            notes=f"Estimated via {effective_mode} mode",
        )

        processing_time = int((time.time() - start_time) * 1000)
        metadata = ResponseMetadata(
            processing_time_ms=processing_time,
            model_versions=self.model_versions,
            warnings=warnings or None,
        )

        # ── Retake recommendation ─────────────────────────────────────────────
        # Escalate if quality is very low, regardless of per-image check
        if accuracy_score < 0.35 and not retake_recommendation:
            retake_recommendation = (
                "Estimation confidence is low. Try adding a plate-size reference "
                "or taking an additional angled photo."
            )

        # ── Debug metadata ────────────────────────────────────────────────────
        debug = {
            "normal_camera_mode": effective_mode,
            "image_quality": quality_info,
            "segmentation": {
                "avg_quality": avg_segmentation_quality,
                "food_area_ratio": seg_info.get("avg_food_area_ratio"),
            },
            "volume": {
                "method": volume_result.get("estimation_method"),
                "area_cm2": volume_result.get("area_cm2"),
                "height_cm": volume_result.get("height_cm"),
            },
            "confidence_breakdown": confidence_result.get("breakdown"),
        }

        return VisionResponse(
            dish_predictions=dish_predictions,
            selected_dish=selected_dish,
            calorie_estimate=calorie_estimate,
            volume_estimate=volume_estimate,
            estimation_mode=estimation_mode,
            accuracy_score=round(accuracy_score, 3),
            suggested_meal_log=suggested_meal_log,
            metadata=metadata,
            # Enhanced fields
            image_quality_score=round(avg_image_quality, 3),
            segmentation_quality_score=round(avg_segmentation_quality, 3),
            estimated_area_cm2=volume_result.get("area_cm2"),
            estimated_height_cm=volume_result.get("height_cm"),
            retake_recommendation=retake_recommendation,
            debug_metadata=debug,
        )
    
    def _detect_mode(self, request: VisionRequest) -> EstimationMode:
        """
        Detect estimation mode based on request data.

        Decision tree:
        1. If depth_data AND camera_intrinsics → depth  (regardless of metadata)
        2. Elif metadata.capture_mode == "depth" (but no data) → will be caught
           later in the volume step and downgraded with a warning.
        3. Elif multiple images with top + side/oblique → multi_angle
        4. Elif metadata.capture_mode == "multi_angle" → multi_angle
        5. Else → reference_based

        Args:
            request: VisionRequest

        Returns:
            EstimationMode enum
        """
        # Depth data present → use depth mode unconditionally
        if request.depth_data and request.camera_intrinsics:
            return EstimationMode.DEPTH

        # Caller explicitly requested depth but supplied no depth data;
        # we still return DEPTH here so the volume-step fallback can emit
        # a meaningful warning with the correct mode label.
        if request.metadata.capture_mode.value == "depth":
            return EstimationMode.DEPTH

        # Check for multi-angle mode
        if len(request.images) >= 2:
            angles = [img.angle.value for img in request.images]
            has_top = "top" in angles
            has_side_or_oblique = "side" in angles or "oblique" in angles

            if has_top and has_side_or_oblique:
                return EstimationMode.MULTI_ANGLE

        if request.metadata.capture_mode.value == "multi_angle":
            return EstimationMode.MULTI_ANGLE

        # Default to reference-based
        return EstimationMode.REFERENCE_BASED


# Singleton instance
_orchestrator_instance = None


def get_orchestrator() -> VisionOrchestrator:
    """Get or create singleton orchestrator instance."""
    global _orchestrator_instance
    if _orchestrator_instance is None:
        _orchestrator_instance = VisionOrchestrator()
    return _orchestrator_instance


def estimate_meal(request: VisionRequest) -> VisionResponse:
    """
    Execute vision estimation pipeline (convenience function).
    
    Args:
        request: VisionRequest
        
    Returns:
        VisionResponse
    """
    orchestrator = get_orchestrator()
    return orchestrator.estimate_meal(request)
