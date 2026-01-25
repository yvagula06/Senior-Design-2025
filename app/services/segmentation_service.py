"""
Segmentation Service (MOCKED for Milestone 1)

This service will eventually load and run a food segmentation model.
For now, it returns placeholder mask metadata for testing purposes.

Future implementation will:
- Load segmentation model from segment-anything/
- Segment food regions from plate/background
- Return binary or multi-class masks
- Process multiple images independently
"""

from typing import List, Dict, Optional


class SegmentationService:
    """Mocked segmentation service for Milestone 1."""
    
    def __init__(self):
        """Initialize mocked segmentation service."""
        pass
    
    def segment_food(
        self,
        images_base64: List[str]
    ) -> List[Dict[str, any]]:
        """
        Segment food regions from images.
        
        Args:
            images_base64: List of base64-encoded images
            
        Returns:
            List of mask metadata (one per image)
        """
        # For milestone 1, return placeholder mask metadata
        # In future, this will:
        # 1. Decode base64 images
        # 2. Run segmentation model (segment-anything)
        # 3. Return actual binary masks or polygons
        
        masks = []
        for idx, image_base64 in enumerate(images_base64):
            mask_metadata = {
                "image_index": idx,
                "mask_available": True,
                "segmentation_quality": 0.85,  # Mocked quality score
                "food_region_pixels": 45000,  # Mocked pixel count
                "total_pixels": 640 * 480,
                "coverage_ratio": 0.147  # 45000 / (640*480)
            }
            masks.append(mask_metadata)
        
        return masks


# Singleton instance
_segmentation_instance = None


def get_segmentation_service() -> SegmentationService:
    """Get or create singleton segmentation service instance."""
    global _segmentation_instance
    if _segmentation_instance is None:
        _segmentation_instance = SegmentationService()
    return _segmentation_instance


def segment_food(images_base64: List[str]) -> List[Dict[str, any]]:
    """
    Segment food regions from images (convenience function).
    
    Args:
        images_base64: List of base64-encoded images
        
    Returns:
        List of mask metadata
    """
    service = get_segmentation_service()
    return service.segment_food(images_base64)
