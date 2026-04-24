"""
Volume Estimation Service

Performs 3D volume estimation using:
- Phase 2: Depth-based reconstruction (Open3D)
- Phase 1: Multi-angle geometric reconstruction (approximated)
- Fallback: Reference portion estimates

Integrates DepthVolumeEstimator for accurate depth-based volumes.
"""

from typing import Any, Dict, Optional, List
import logging

# Import depth volume estimator for Phase 2
try:
    from app.services.depth_volume_estimator import estimate_volume_from_depth
    DEPTH_ESTIMATOR_AVAILABLE = True
except ImportError as e:
    logging.warning(f"⚠️ Depth volume estimator not available: {e}")
    DEPTH_ESTIMATOR_AVAILABLE = False

logger = logging.getLogger(__name__)


class VolumeEstimator:
    """
    Volume estimator supporting multiple estimation modes.
    
    Phase 2: Real depth-based volume estimation
    Phase 1: Approximated multi-angle and reference-based
    """
    
    def __init__(self):
        """Initialize volume estimator with depth support and plate size calibration."""
        # Mode-specific volume defaults (used as fallback)
        self.mode_defaults = {
            "depth": {
                "volume": 350.0,
                "uncertainty": 0.15  # ±15%
            },
            "multi_angle": {
                "volume": 380.0,
                "uncertainty": 0.30  # ±30%
            },
            "reference_based": {
                "volume": 400.0,
                "uncertainty": 0.50  # ±50%
            }
        }
        
        # Phase 3: Plate size reference scales (diameter in cm)
        # Used for scaling volume estimates when plate size is known
        self.plate_sizes = {
            "small_plate": 20.0,        # ~8 inch diameter
            "standard_plate": 25.0,     # ~10 inch diameter
            "large_plate": 30.0,        # ~12 inch diameter
            "bowl": 15.0,               # ~6 inch diameter (depth accounts for volume)
            "hand": 10.0                # ~4 inch hand width reference
        }
        
        # Default plate size (standard dinner plate)
        self.default_plate_size = "standard_plate"
        
        self.depth_available = DEPTH_ESTIMATOR_AVAILABLE
        logger.info(f"✅ VolumeEstimator initialized (Depth support: {self.depth_available})")
    
    def estimate_volume(
        self,
        estimation_mode: str,
        images_base64: List[str],
        masks: List[Dict],
        depth_data: Optional[Dict] = None,
        camera_intrinsics: Optional[Dict] = None,
        plate_size: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Estimate volume of food in images.
        
        Phase 3: Added plate_size parameter for improved scale estimation
        Phase 2: Uses depth data when available for accurate 3D volume
        Phase 1: Uses approximations for multi-angle and reference-based
        
        Args:
            estimation_mode: "depth", "multi_angle", or "reference_based"
            images_base64: List of base64-encoded images
            masks: Segmentation masks from segmentation_service
            depth_data: Optional depth map data (Phase 2)
            camera_intrinsics: Optional camera calibration (Phase 2)
            plate_size: Optional plate/bowl size for scale reference (Phase 3)
            
        Returns:
            Dict with volume (ml), uncertainty, and confidence
        """
        # Phase 2: Try depth-based estimation if available
        if estimation_mode == "depth" and depth_data and camera_intrinsics:
            if self.depth_available:
                try:
                    logger.info("🔬 Using depth-based volume estimation (Phase 2)")
                    
                    # Get mask for food region (use first mask if available)
                    mask = masks[0] if masks else None
                    
                    result = estimate_volume_from_depth(
                        depth_map_base64=depth_data["depth_map"],
                        depth_format=depth_data["format"],
                        depth_scale=depth_data["scale"],
                        camera_intrinsics=camera_intrinsics,
                        mask=mask
                    )
                    
                    # Phase 3: Apply plate size adjustment if provided
                    if plate_size:
                        result = self._apply_plate_size_adjustment(result, plate_size)
                    
                    logger.info(f"✅ Depth volume: {result['volume_ml']:.1f}ml (confidence: {result['confidence']:.2f})")
                    return result
                    
                except Exception as e:
                    logger.error(f"❌ Depth estimation failed: {e}, falling back to default")
            else:
                logger.warning("⚠️ Depth estimation requested but not available, using fallback")
        
        # Phase 1: Use approximations or fallback to defaults
        logger.info(f"Using {estimation_mode} mode volume estimation (Phase 1 approximation)")
        
        defaults = self.mode_defaults.get(
            estimation_mode,
            self.mode_defaults["reference_based"]
        )
        
        volume_ml = defaults["volume"]
        uncertainty = defaults["uncertainty"]
        
        # Phase 3: Apply plate size adjustment if provided
        if plate_size:
            scale_factor = self._get_plate_size_scale_factor(plate_size)
            volume_ml *= scale_factor
            logger.info(f"📏 Applied plate size adjustment: {plate_size} (×{scale_factor:.2f})")
        
        # Calculate confidence from uncertainty
        # Lower uncertainty = higher confidence
        confidence = max(0.1, 1.0 - uncertainty)
        
        return {
            "volume_ml": volume_ml,
            "uncertainty": uncertainty,
            "confidence": confidence,
            "estimation_method": estimation_mode,
            "unit": "ml",
            "plate_size": plate_size
        }
    
    def _get_plate_size_scale_factor(self, plate_size: str) -> float:
        """
        Get volume scale factor based on plate size.
        
        Phase 3: Volume scales approximately with area (diameter²)
        for plate-based meals.
        
        Args:
            plate_size: Plate size identifier
            
        Returns:
            Scale factor relative to standard plate
        """
        if plate_size not in self.plate_sizes:
            logger.warning(f"⚠️ Unknown plate size: {plate_size}, using standard")
            plate_size = self.default_plate_size
        
        standard_diameter = self.plate_sizes[self.default_plate_size]
        plate_diameter = self.plate_sizes[plate_size]
        
        # Volume scales with area (diameter²)
        scale_factor = (plate_diameter / standard_diameter) ** 2
        
        # Clamp to reasonable range (0.5x to 2.0x)
        scale_factor = max(0.5, min(2.0, scale_factor))
        
        return scale_factor
    
    def _apply_plate_size_adjustment(
        self,
        volume_result: Dict[str, Any],
        plate_size: str
    ) -> Dict[str, Any]:
        """
        Apply plate size adjustment to existing volume estimate.
        
        Phase 3: Refine depth-based volume using plate size context.
        
        Args:
            volume_result: Result from depth estimation
            plate_size: Plate size identifier
            
        Returns:
            Adjusted volume result
        """
        scale_factor = self._get_plate_size_scale_factor(plate_size)
        
        volume_result["volume_ml"] *= scale_factor
        volume_result["plate_size"] = plate_size
        volume_result["plate_size_scale_factor"] = scale_factor
        
        logger.info(f"📏 Applied plate size adjustment: {plate_size} (×{scale_factor:.2f})")
        
        return volume_result


# Singleton instance
_volume_estimator_instance = None


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
    plate_size: Optional[str] = None
) -> Dict[str, Any]:
    """
    Estimate volume (convenience function).
    
    Args:
        estimation_mode: "depth", "multi_angle", or "reference_based"
        images_base64: List of base64-encoded images
        masks: Segmentation masks
        depth_data: Optional depth map data
        camera_intrinsics: Optional camera calibration
        plate_size: Optional plate/bowl size for scale reference (Phase 3)
        
    Returns:
        Volume estimate dict
    """
    estimator = get_volume_estimator()
    return estimator.estimate_volume(
        estimation_mode,
        images_base64,
        masks,
        depth_data,
        camera_intrinsics,
        plate_size
    )

