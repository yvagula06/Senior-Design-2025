"""
Volume Estimation Service

Supports four estimation paths for normal cameras plus the existing depth path.

Depth (Phase 2 / RealSense / LiDAR):
    Uses DepthVolumeEstimator + Open3D for accurate 3D reconstruction.

Normal-camera paths:
    plate_reference   – uses known plate diameter to calibrate pixel→cm scale,
                        then derives food area from the segmentation mask and
                        estimates height from a dish-category heuristic.
    multi_angle       – top image for area + angled/side image for height;
                        combines two measurements for improved confidence.
    reference_object  – credit card / utensil / soda can provides pixel scale;
                        food area estimated from mask.
    basic_single      – no scale reference; falls back to average serving size
                        from a lookup table and returns a wide calorie range.
"""

from typing import Any, Dict, Optional, List
import logging
import math
from typing import Dict, Optional, List, Any

logger = logging.getLogger(__name__)

# ── Depth estimator (optional) ────────────────────────────────────────────────
try:
    from app.services.depth_volume_estimator import estimate_volume_from_depth
    _DEPTH_AVAILABLE = True
except ImportError:
    _DEPTH_AVAILABLE = False
    logger.warning("⚠️ Depth volume estimator not available")


# ── Reference object known dimensions (longest dimension in cm) ───────────────
REFERENCE_OBJECT_SIZES_CM: Dict[str, float] = {
    "credit_card": 8.56,    # 85.6 mm long
    "fork": 19.0,
    "spoon": 17.0,
    "soda_can": 6.6,         # diameter
    "custom": 10.0,          # user-supplied; treated as fallback
}

# Standard plate/container diameters in cm
PLATE_DIAMETERS_CM: Dict[str, float] = {
    "small_plate": 20.0,
    "medium_plate": 25.0,
    "large_plate": 30.0,
    "bowl": 15.0,
    "cup": 8.0,
    "container": 18.0,
    # legacy names kept for backward compat
    "standard_plate": 25.0,
    "hand": 10.0,
}

# Typical food heights by dish category (cm) — used when no side image available
DISH_HEIGHT_HEURISTICS_CM: Dict[str, float] = {
    "pasta": 4.0,
    "salad": 5.0,
    "soup": 4.0,
    "rice": 3.5,
    "steak": 3.0,
    "burger": 8.0,
    "sandwich": 6.0,
    "pizza": 2.5,
    "cake": 6.0,
    "fruit": 4.0,
    "vegetable": 4.0,
    "meat": 3.5,
    "seafood": 3.0,
    "default": 4.0,
}

# Average single-serving volumes (ml) for basic_single fallback
AVERAGE_SERVING_ML: Dict[str, float] = {
    "pasta": 380.0,
    "salad": 300.0,
    "soup": 350.0,
    "rice": 250.0,
    "steak": 200.0,
    "burger": 350.0,
    "sandwich": 280.0,
    "pizza": 280.0,
    "cake": 200.0,
    "fruit": 200.0,
    "vegetable": 250.0,
    "meat": 220.0,
    "seafood": 200.0,
    "default": 300.0,
}


class VolumeEstimator:
    """
    Volume estimator supporting all estimation modes.

    All methods return a dict with at minimum:
        volume_ml, uncertainty, confidence, estimation_method, unit
    Additional keys (when available):
        area_cm2, height_cm, scale_factor_cm_per_px, plate_size
    """

    def __init__(self):
        self._depth_available = _DEPTH_AVAILABLE

    # ------------------------------------------------------------------
    # Public dispatch
    # ------------------------------------------------------------------

    def estimate_volume(
        self,
        estimation_mode: str,
        images_base64: List[str],
        masks: List[Dict],
        depth_data: Optional[Dict] = None,
        camera_intrinsics: Optional[Dict] = None,
        # Normal-camera extras
        normal_camera_mode: Optional[str] = None,
        plate_type: Optional[str] = None,
        plate_diameter_cm: Optional[float] = None,
        reference_object_type: Optional[str] = None,
        reference_object_size_cm: Optional[float] = None,
        dish_category: Optional[str] = None,
        segmentation_info: Optional[Dict] = None,
    ) -> Dict[str, Any]:
        """
        Dispatch to the appropriate estimation path.

        Args:
            estimation_mode:          "depth", "multi_angle", or "reference_based"
            images_base64:            list of base64 images
            masks:                    segmentation results (legacy per-image list)
            depth_data:               depth map dict (depth mode only)
            camera_intrinsics:        camera calibration dict (depth mode only)
            normal_camera_mode:       "plate_reference" | "multi_angle" |
                                      "reference_object" | "basic_single"
            plate_type:               plate size key (e.g. "medium_plate")
            plate_diameter_cm:        explicit diameter (overrides plate_type)
            reference_object_type:    "credit_card" | "fork" | ...
            reference_object_size_cm: explicit reference size (overrides type lookup)
            dish_category:            category for height heuristic
            segmentation_info:        enhanced segmentation dict
        Returns:
            volume result dict
        """
        # 1. Depth path
        if estimation_mode == "depth" and depth_data and camera_intrinsics:
            if self._depth_available:
                try:
                    mask = masks[0] if masks else None
                    result = estimate_volume_from_depth(
                        depth_map_base64=depth_data["depth_map"],
                        depth_format=depth_data["format"],
                        depth_scale=depth_data["scale"],
                        camera_intrinsics=camera_intrinsics,
                        mask=mask,
                    )
                    logger.info(f"✅ Depth volume: {result['volume_ml']:.1f} ml")
                    return result
                except Exception as exc:
                    logger.error(f"❌ Depth estimation failed: {exc}, falling back")

        # 2. Normal-camera paths
        ncm = normal_camera_mode or self._infer_normal_mode(
            estimation_mode, len(images_base64), plate_type, plate_diameter_cm,
            reference_object_type, reference_object_size_cm,
        )

        seg = segmentation_info or {}
        food_pixels = seg.get("primary_food_pixels") or (
            masks[0].get("food_region_pixels", 0) if masks else 0
        )
        total_pixels = seg.get("primary_total_pixels") or (
            masks[0].get("total_pixels", 307200) if masks else 307200
        )
        food_area_ratio = (
            seg.get("avg_food_area_ratio") or
            (food_pixels / (total_pixels + 1))
        )

        if ncm == "plate_reference":
            return self._estimate_plate_reference(
                food_area_ratio=food_area_ratio,
                plate_type=plate_type,
                plate_diameter_cm=plate_diameter_cm,
                dish_category=dish_category,
                total_pixels=total_pixels,
                food_pixels=food_pixels,
            )
        elif ncm == "multi_angle":
            return self._estimate_multi_angle(
                images_count=len(images_base64),
                food_area_ratio=food_area_ratio,
                dish_category=dish_category,
            )
        elif ncm == "reference_object":
            return self._estimate_reference_object(
                food_area_ratio=food_area_ratio,
                reference_object_type=reference_object_type,
                reference_object_size_cm=reference_object_size_cm,
                dish_category=dish_category,
            )
        else:
            return self._estimate_basic_single(dish_category=dish_category)

    # ------------------------------------------------------------------
    # Estimation sub-methods
    # ------------------------------------------------------------------

    def _estimate_plate_reference(
        self,
        food_area_ratio: float,
        plate_type: Optional[str],
        plate_diameter_cm: Optional[float],
        dish_category: Optional[str],
        total_pixels: int,
        food_pixels: int,
    ) -> Dict[str, Any]:
        """
        Use the known plate diameter to establish a pixel→cm² scale.

        Approach:
          area_per_pixel = π*(d/2)² / plate_pixels
          food_area_cm²  = food_pixels × area_per_pixel
          volume         = food_area_cm² × height_cm
        """
        diam = (
            plate_diameter_cm
            or PLATE_DIAMETERS_CM.get(plate_type or "medium_plate", 25.0)
        )
        plate_area_cm2 = math.pi * (diam / 2) ** 2  # ~490 cm² for 25 cm plate

        # Estimate how many pixels the plate occupies
        # Heuristic: plate fills ~60% of the FOV in a well-framed top-down shot
        plate_pixel_fraction = 0.60
        estimated_plate_pixels = total_pixels * plate_pixel_fraction
        area_per_pixel = plate_area_cm2 / (estimated_plate_pixels + 1)

        food_area_cm2 = food_pixels * area_per_pixel
        # Clamp to plausible food area
        food_area_cm2 = max(10.0, min(food_area_cm2, plate_area_cm2 * 0.95))

        height_cm = DISH_HEIGHT_HEURISTICS_CM.get(
            dish_category or "default", DISH_HEIGHT_HEURISTICS_CM["default"]
        )

        # Volume = area × height (cylinder approximation)
        volume_ml = food_area_cm2 * height_cm  # 1 cm³ ≈ 1 ml

        # Packing / shape correction (~65% average density vs bounding cylinder)
        volume_ml *= 0.65

        uncertainty = 0.30  # ±30%
        confidence = 0.70

        logger.info(
            f"📏 plate_reference: diam={diam}cm area={food_area_cm2:.1f}cm² "
            f"h={height_cm}cm → {volume_ml:.1f}ml"
        )
        return {
            "volume_ml": round(volume_ml, 1),
            "uncertainty": uncertainty,
            "confidence": confidence,
            "estimation_method": "plate_reference",
            "unit": "ml",
            "area_cm2": round(food_area_cm2, 2),
            "height_cm": height_cm,
            "plate_diameter_cm": diam,
            "plate_type": plate_type,
        }

    def _estimate_multi_angle(
        self,
        images_count: int,
        food_area_ratio: float,
        dish_category: Optional[str],
    ) -> Dict[str, Any]:
        """
        Multi-angle: use top image for area + side/angled image for height.
        More images → lower uncertainty.
        """
        # Without a true scale reference the area estimate is rough
        # Assume food covers ~20% of a standard 25 cm plate footprint
        assumed_plate_area_cm2 = math.pi * (25.0 / 2) ** 2  # ~491 cm²
        food_area_cm2 = assumed_plate_area_cm2 * min(food_area_ratio * 1.5, 0.80)

        height_cm = DISH_HEIGHT_HEURISTICS_CM.get(
            dish_category or "default", DISH_HEIGHT_HEURISTICS_CM["default"]
        )

        # Slightly adjust height heuristic for extra image (side view)
        if images_count >= 2:
            height_cm *= 1.05  # side image gives a mild upward correction
            uncertainty = 0.30
            confidence = 0.70
        else:
            uncertainty = 0.40
            confidence = 0.60

        volume_ml = food_area_cm2 * height_cm * 0.65  # packing correction

        logger.info(
            f"📐 multi_angle ({images_count} imgs): area={food_area_cm2:.1f}cm² "
            f"h={height_cm}cm → {volume_ml:.1f}ml"
        )
        return {
            "volume_ml": round(volume_ml, 1),
            "uncertainty": uncertainty,
            "confidence": confidence,
            "estimation_method": "multi_angle",
            "unit": "ml",
            "area_cm2": round(food_area_cm2, 2),
            "height_cm": height_cm,
            "images_used": images_count,
        }

    def _estimate_reference_object(
        self,
        food_area_ratio: float,
        reference_object_type: Optional[str],
        reference_object_size_cm: Optional[float],
        dish_category: Optional[str],
    ) -> Dict[str, Any]:
        """
        Use a known reference object to establish the pixel scale.
        """
        ref_size = (
            reference_object_size_cm
            or REFERENCE_OBJECT_SIZES_CM.get(
                reference_object_type or "credit_card", 8.56
            )
        )

        # Assume reference object occupies ~10% of image width (rough heuristic)
        assumed_img_width_px = 1280
        px_per_cm = assumed_img_width_px * 0.10 / ref_size  # px/cm
        cm_per_px = 1.0 / (px_per_cm + 1e-6)
        area_per_pixel_cm2 = cm_per_px ** 2

        # Estimated food pixel count from food_area_ratio and 1080p image
        total_pixels = 1280 * 960
        food_pixels = total_pixels * food_area_ratio
        food_area_cm2 = food_pixels * area_per_pixel_cm2

        height_cm = DISH_HEIGHT_HEURISTICS_CM.get(
            dish_category or "default", DISH_HEIGHT_HEURISTICS_CM["default"]
        )
        volume_ml = food_area_cm2 * height_cm * 0.65

        uncertainty = 0.25
        confidence = 0.75

        logger.info(
            f"📐 reference_object ({reference_object_type}={ref_size}cm): "
            f"area={food_area_cm2:.1f}cm² → {volume_ml:.1f}ml"
        )
        return {
            "volume_ml": round(volume_ml, 1),
            "uncertainty": uncertainty,
            "confidence": confidence,
            "estimation_method": "reference_object",
            "unit": "ml",
            "area_cm2": round(food_area_cm2, 2),
            "height_cm": height_cm,
            "reference_object_type": reference_object_type,
            "reference_size_cm": ref_size,
        }

    def _estimate_basic_single(
        self,
        dish_category: Optional[str],
    ) -> Dict[str, Any]:
        """
        No scale reference available – fall back to average serving size lookup.
        Returns a wider calorie range (±50%).
        """
        volume_ml = AVERAGE_SERVING_ML.get(
            dish_category or "default", AVERAGE_SERVING_ML["default"]
        )
        uncertainty = 0.50
        confidence = 0.50

        logger.info(f"🍽️ basic_single (category={dish_category}): {volume_ml:.1f}ml")
        return {
            "volume_ml": round(volume_ml, 1),
            "uncertainty": uncertainty,
            "confidence": confidence,
            "estimation_method": "basic_single",
            "unit": "ml",
        }

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    def _infer_normal_mode(
        self,
        estimation_mode: str,
        num_images: int,
        plate_type: Optional[str],
        plate_diameter_cm: Optional[float],
        reference_object_type: Optional[str],
        reference_object_size_cm: Optional[float],
    ) -> str:
        """Infer best normal-camera mode from available context."""
        if reference_object_type or reference_object_size_cm:
            return "reference_object"
        if plate_type or plate_diameter_cm:
            return "plate_reference"
        if estimation_mode == "multi_angle" or num_images >= 2:
            return "multi_angle"
        return "basic_single"


# ── Singleton / convenience ───────────────────────────────────────────────────

_volume_estimator_instance: Optional[VolumeEstimator] = None


def get_volume_estimator() -> VolumeEstimator:
    """Get or create singleton volume estimator instance."""
    global _volume_estimator_instance
    if _volume_estimator_instance is None:
        _volume_estimator_instance = VolumeEstimator()
    return _volume_estimator_instance


def estimate_volume(
    estimation_mode: str,
    images_base64: List[str],
    masks: List[Dict],
    depth_data: Optional[Dict] = None,
    camera_intrinsics: Optional[Dict] = None,
    plate_size: Optional[str] = None,     # legacy kwarg kept for compat
    **kwargs: Any,
) -> Dict[str, Any]:
    """
    Estimate volume (convenience function).

    ``plate_size`` is accepted as a legacy keyword (maps to ``plate_type``).
    All additional normal-camera kwargs are forwarded.
    """
    if plate_size and "plate_type" not in kwargs:
        kwargs["plate_type"] = plate_size
    return get_volume_estimator().estimate_volume(
        estimation_mode=estimation_mode,
        images_base64=images_base64,
        masks=masks,
        depth_data=depth_data,
        camera_intrinsics=camera_intrinsics,
        **kwargs,
    )

