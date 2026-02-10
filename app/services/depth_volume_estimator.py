"""
Depth-Based Volume Estimator (Phase 2)

Uses depth maps and camera intrinsics to compute accurate 3D volume of food.
Integrates with Open3D for point cloud processing and volume calculation.

According to Camera_Functionality_Plan.md Phase 2:
- Process depth map + camera intrinsics
- Estimate base plane (table/plate)
- Integrate segmented food height above plane
- Compute volume in cm³
"""

import base64
import numpy as np
import logging
from typing import Dict, Optional, Tuple, List

# Optional Open3D import (will use fallback if not available)
try:
    import open3d as o3d
    OPEN3D_AVAILABLE = True
except ImportError:
    OPEN3D_AVAILABLE = False
    logging.warning("⚠️ Open3D not available. Depth volume estimation will use approximation.")

logger = logging.getLogger(__name__)


class DepthVolumeEstimator:
    """
    Compute food volume from depth maps using 3D reconstruction.
    
    Phase 2 implementation with:
    - Point cloud generation from depth + intrinsics
    - Plane fitting for table/plate detection
    - Height-based volume integration
    - Quality-based confidence scoring
    """
    
    def __init__(self):
        """Initialize depth volume estimator."""
        self.use_open3d = OPEN3D_AVAILABLE
        
        # Volume calculation parameters
        self.min_depth_mm = 100      # Minimum valid depth (10cm)
        self.max_depth_mm = 2000     # Maximum valid depth (2m)
        self.plane_inlier_threshold = 0.01  # 1cm for RANSAC plane fitting
        self.min_food_height_mm = 5  # Minimum food height (5mm)
        
        # Density estimation for common food shapes
        self.shape_factors = {
            "flat": 0.8,      # Flat foods like pizza
            "mounded": 1.2,   # Mounded foods like rice
            "irregular": 1.0  # Average for irregular shapes
        }
        
        logger.info(f"✅ DepthVolumeEstimator initialized (Open3D: {self.use_open3d})")
    
    def estimate_volume_from_depth(
        self,
        depth_map_base64: str,
        depth_format: str,
        depth_scale: float,
        camera_intrinsics: Dict,
        mask: Optional[Dict] = None
    ) -> Dict[str, any]:
        """
        Estimate volume from depth map using 3D reconstruction.
        
        Args:
            depth_map_base64: Base64-encoded depth map
            depth_format: "png_16bit" or "binary_float32"
            depth_scale: Depth units in meters per value
            camera_intrinsics: Camera calibration parameters
            mask: Optional segmentation mask for food region
            
        Returns:
            Dict with volume (ml), uncertainty, confidence, and metadata
        """
        try:
            # Decode depth map
            depth_array = self._decode_depth_map(depth_map_base64, depth_format, depth_scale)
            
            # Validate depth data
            quality_score = self._validate_depth_quality(depth_array)
            
            if quality_score < 0.3:
                logger.warning(f"⚠️ Low depth quality ({quality_score:.2f}), using fallback")
                return self._fallback_volume_estimate(quality_score)
            
            # Extract intrinsics
            fx = camera_intrinsics["focal_length_x"]
            fy = camera_intrinsics["focal_length_y"]
            cx = camera_intrinsics["principal_point_x"]
            cy = camera_intrinsics["principal_point_y"]
            width = camera_intrinsics["image_width"]
            height = camera_intrinsics["image_height"]
            
            # Use Open3D for accurate volume if available
            if self.use_open3d:
                return self._compute_volume_with_open3d(
                    depth_array, fx, fy, cx, cy, width, height, mask, quality_score
                )
            else:
                return self._compute_volume_approximation(
                    depth_array, fx, fy, cx, cy, width, height, mask, quality_score
                )
                
        except Exception as e:
            logger.error(f"❌ Depth volume estimation failed: {e}")
            return self._fallback_volume_estimate(0.2)
    
    def _decode_depth_map(
        self,
        depth_map_base64: str,
        depth_format: str,
        depth_scale: float
    ) -> np.ndarray:
        """
        Decode base64 depth map to numpy array.
        
        Args:
            depth_map_base64: Base64-encoded depth data
            depth_format: Format specification
            depth_scale: Scale factor (meters per unit)
            
        Returns:
            Numpy array of depth values in millimeters
        """
        # Decode base64
        depth_bytes = base64.b64decode(depth_map_base64)
        
        if depth_format == "png_16bit":
            # PNG 16-bit format (common for iOS LiDAR)
            import struct
            depth_raw = np.frombuffer(depth_bytes, dtype=np.uint16)
            # Reshape based on typical image dimensions (will need actual dimensions)
            # For now, assume square or use provided dimensions
        elif depth_format == "binary_float32":
            # Raw float32 array
            depth_raw = np.frombuffer(depth_bytes, dtype=np.float32)
        else:
            raise ValueError(f"Unsupported depth format: {depth_format}")
        
        # Convert to millimeters
        depth_mm = depth_raw * depth_scale * 1000.0
        
        return depth_mm
    
    def _validate_depth_quality(self, depth_array: np.ndarray) -> float:
        """
        Assess depth map quality.
        
        Checks:
        - Valid depth coverage (not too many zeros/NaNs)
        - Depth range reasonableness
        - Noise level
        
        Returns:
            Quality score 0.0-1.0
        """
        # Check for invalid values
        valid_mask = (depth_array > self.min_depth_mm) & (depth_array < self.max_depth_mm)
        valid_ratio = np.sum(valid_mask) / depth_array.size
        
        if valid_ratio < 0.3:
            return 0.2  # Poor coverage
        
        # Check depth variance (too uniform = likely bad data)
        valid_depths = depth_array[valid_mask]
        depth_std = np.std(valid_depths)
        
        if depth_std < 1.0:  # Less than 1mm variation
            return 0.3  # Too uniform
        
        # Good quality if we reach here
        quality = min(1.0, valid_ratio * 1.2)
        return quality
    
    def _compute_volume_with_open3d(
        self,
        depth_array: np.ndarray,
        fx: float, fy: float, cx: float, cy: float,
        width: int, height: int,
        mask: Optional[Dict],
        quality_score: float
    ) -> Dict[str, any]:
        """
        Compute volume using Open3D point cloud processing.
        
        Steps:
        1. Generate point cloud from depth + intrinsics
        2. Fit plane to table/plate (RANSAC)
        3. Extract food region above plane
        4. Integrate volume using voxel grid or alpha shapes
        
        Returns:
            Volume estimate dict
        """
        # Reshape depth array (assuming it was flattened)
        depth_image = depth_array.reshape((height, width))
        
        # Create Open3D intrinsic parameters
        intrinsic = o3d.camera.PinholeCameraIntrinsic(
            width, height, fx, fy, cx, cy
        )
        
        # Create point cloud from depth image
        depth_o3d = o3d.geometry.Image((depth_image / 1000.0).astype(np.float32))  # Convert to meters
        pcd = o3d.geometry.PointCloud.create_from_depth_image(
            depth_o3d,
            intrinsic,
            depth_scale=1.0,  # Already scaled
            depth_trunc=2.0   # 2 meters max
        )
        
        if len(pcd.points) < 100:
            logger.warning("⚠️ Too few points in point cloud, using fallback")
            return self._fallback_volume_estimate(quality_score * 0.5)
        
        # Fit plane to detect table/plate surface
        plane_model, inliers = pcd.segment_plane(
            distance_threshold=self.plane_inlier_threshold,
            ransac_n=3,
            num_iterations=1000
        )
        
        # Extract points above plane (food region)
        points = np.asarray(pcd.points)
        plane_normal = plane_model[:3]
        plane_d = plane_model[3]
        
        # Distance from each point to plane
        distances = np.dot(points, plane_normal) + plane_d
        
        # Food points are above plane (positive distance)
        food_mask = distances > (self.min_food_height_mm / 1000.0)
        food_points = points[food_mask]
        
        if len(food_points) < 50:
            logger.warning("⚠️ Too few food points detected, using fallback")
            return self._fallback_volume_estimate(quality_score * 0.6)
        
        # Compute volume using voxel grid approach
        food_heights = distances[food_mask]
        
        # Estimate base area (project to plane)
        # Simple approach: count unique XY voxels
        voxel_size = 0.005  # 5mm voxels
        xy_coords = food_points[:, :2]
        xy_voxels = np.floor(xy_coords / voxel_size).astype(int)
        unique_voxels = len(np.unique(xy_voxels, axis=0))
        
        base_area_cm2 = unique_voxels * (voxel_size * 100) ** 2
        avg_height_cm = np.mean(food_heights) * 100
        
        # Volume = base_area * avg_height * shape_factor
        shape_factor = self.shape_factors["mounded"]  # Assume mounded by default
        volume_cm3 = base_area_cm2 * avg_height_cm * shape_factor
        volume_ml = volume_cm3  # 1 cm³ = 1 ml
        
        # Confidence based on quality and number of points
        point_confidence = min(1.0, len(food_points) / 1000.0)
        confidence = (quality_score * 0.6 + point_confidence * 0.4) * 0.95  # Depth mode typically high confidence
        
        # Uncertainty based on height variance
        height_std = np.std(food_heights) * 100  # cm
        relative_uncertainty = min(0.3, height_std / avg_height_cm) if avg_height_cm > 0 else 0.3
        
        return {
            "volume_ml": float(volume_ml),
            "uncertainty": float(relative_uncertainty),
            "confidence": float(confidence),
            "estimation_method": "depth_open3d",
            "unit": "ml",
            "metadata": {
                "num_food_points": int(len(food_points)),
                "base_area_cm2": float(base_area_cm2),
                "avg_height_cm": float(avg_height_cm),
                "depth_quality": float(quality_score)
            }
        }
    
    def _compute_volume_approximation(
        self,
        depth_array: np.ndarray,
        fx: float, fy: float, cx: float, cy: float,
        width: int, height: int,
        mask: Optional[Dict],
        quality_score: float
    ) -> Dict[str, any]:
        """
        Compute volume using simplified approach without Open3D.
        
        Uses basic statistics on depth values to estimate volume.
        Less accurate but works without Open3D dependency.
        
        Returns:
            Volume estimate dict
        """
        # Reshape depth
        depth_image = depth_array.reshape((height, width))
        
        # Find valid depth region
        valid_mask = (depth_image > self.min_depth_mm) & (depth_image < self.max_depth_mm)
        
        if not np.any(valid_mask):
            return self._fallback_volume_estimate(0.2)
        
        # Find min depth (likely table/plate surface)
        min_depth = np.percentile(depth_image[valid_mask], 5)  # 5th percentile to avoid outliers
        
        # Heights above surface
        heights_mm = depth_image - min_depth
        heights_mm[~valid_mask] = 0
        heights_mm = np.maximum(heights_mm, 0)
        
        # Filter to food region (heights above threshold)
        food_mask = heights_mm > self.min_food_height_mm
        
        if not np.any(food_mask):
            return self._fallback_volume_estimate(quality_score * 0.5)
        
        # Estimate pixel area (need to convert to real-world area)
        # Use average depth for scale estimation
        avg_depth_m = np.mean(depth_image[food_mask]) / 1000.0
        
        # Pixel size at this depth (assuming centered)
        pixel_size_m = avg_depth_m / fx  # Approximate
        pixel_area_m2 = pixel_size_m ** 2
        
        # Base area
        num_food_pixels = np.sum(food_mask)
        base_area_m2 = num_food_pixels * pixel_area_m2
        base_area_cm2 = base_area_m2 * 10000
        
        # Average height
        avg_height_mm = np.mean(heights_mm[food_mask])
        avg_height_cm = avg_height_mm / 10.0
        
        # Volume with shape factor
        shape_factor = self.shape_factors["mounded"]
        volume_cm3 = base_area_cm2 * avg_height_cm * shape_factor
        volume_ml = volume_cm3
        
        # Confidence (lower than Open3D approach)
        confidence = quality_score * 0.7
        uncertainty = 0.25
        
        return {
            "volume_ml": float(volume_ml),
            "uncertainty": float(uncertainty),
            "confidence": float(confidence),
            "estimation_method": "depth_approximation",
            "unit": "ml",
            "metadata": {
                "num_food_pixels": int(num_food_pixels),
                "base_area_cm2": float(base_area_cm2),
                "avg_height_cm": float(avg_height_cm),
                "depth_quality": float(quality_score)
            }
        }
    
    def _fallback_volume_estimate(self, quality_score: float) -> Dict[str, any]:
        """
        Fallback volume estimate when depth processing fails.
        
        Returns typical serving size with high uncertainty.
        """
        return {
            "volume_ml": 300.0,  # Typical single serving
            "uncertainty": 0.6,  # High uncertainty
            "confidence": quality_score,
            "estimation_method": "depth_fallback",
            "unit": "ml",
            "metadata": {
                "fallback_reason": "depth_processing_failed"
            }
        }


# Singleton instance
_depth_volume_estimator = None


def get_depth_volume_estimator() -> DepthVolumeEstimator:
    """Get or create singleton depth volume estimator."""
    global _depth_volume_estimator
    if _depth_volume_estimator is None:
        _depth_volume_estimator = DepthVolumeEstimator()
    return _depth_volume_estimator


def estimate_volume_from_depth(
    depth_map_base64: str,
    depth_format: str,
    depth_scale: float,
    camera_intrinsics: Dict,
    mask: Optional[Dict] = None
) -> Dict[str, any]:
    """
    Estimate volume from depth map (convenience function).
    
    Args:
        depth_map_base64: Base64-encoded depth map
        depth_format: "png_16bit" or "binary_float32"
        depth_scale: Depth units in meters per value
        camera_intrinsics: Camera calibration parameters
        mask: Optional segmentation mask
        
    Returns:
        Volume estimate dict
    """
    estimator = get_depth_volume_estimator()
    return estimator.estimate_volume_from_depth(
        depth_map_base64,
        depth_format,
        depth_scale,
        camera_intrinsics,
        mask
    )
