"""
Segmentation Service

Uses Clarifai API for food segmentation as per Camera_Functionality_Plan.md.
Falls back to mocked segmentation data if Clarifai is unavailable.

Note: Clarifai's food models primarily provide classification, not pixel-level
segmentation. For Phase 1 MVP, this returns estimated segmentation quality.
For true pixel-level segmentation, consider Segment Anything Model (SAM) integration.
"""

from typing import List, Dict, Optional
import logging

# Import Clarifai client
try:
    from app.services.vision_api_client import get_clarifai_client
    CLARIFAI_AVAILABLE = True
except ImportError as e:
    logger = logging.getLogger(__name__)
    logger.warning(f"⚠️ Clarifai client not available: {e}")
    CLARIFAI_AVAILABLE = False

logger = logging.getLogger(__name__)


class SegmentationService:
    """
    Food segmentation service using Clarifai (primary) with mocked fallback.
    
    For Phase 1 MVP:
    - Returns estimated segmentation quality from Clarifai
    - Falls back to placeholder data if Clarifai unavailable
    
    For future phases:
    - Option 1: Use Clarifai's segmentation models (if available)
    - Option 2: Integrate Segment Anything Model (SAM) from segment-anything/
    - Option 3: Use other segmentation APIs
    """
    
    def __init__(self):
        """Initialize segmentation service with Clarifai client."""
        self.clarifai_client = None
        if CLARIFAI_AVAILABLE:
            try:
                self.clarifai_client = get_clarifai_client()
                if self.clarifai_client.stub:
                    logger.info("✅ Clarifai client initialized for segmentation")
            except Exception as e:
                logger.warning(f"⚠️ Failed to initialize Clarifai for segmentation: {e}")
    
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
            Format: [
                {
                    "image_index": int,
                    "mask_available": bool,
                    "segmentation_quality": float (0-1),
                    "food_region_pixels": int,
                    "total_pixels": int,
                    "coverage_ratio": float
                },
                ...
            ]
        """
        masks = []
        
        for idx, image_base64 in enumerate(images_base64):
            # Try Clarifai segmentation
            if self.clarifai_client and self.clarifai_client.stub:
                try:
                    logger.info(f"🔍 Trying Clarifai API for image {idx} segmentation...")
                    clarifai_result = self.clarifai_client.segment_food(image_base64)
                    
                    # Format Clarifai result to match expected schema
                    mask_metadata = {
                        "image_index": idx,
                        "mask_available": clarifai_result.get("mask_available", False),
                        "segmentation_quality": clarifai_result.get("segmentation_quality", 0.75),
                        "food_region_pixels": clarifai_result.get("food_region_pixels", 0),
                        "total_pixels": clarifai_result.get("total_pixels", 640 * 480),
                        "coverage_ratio": clarifai_result.get("coverage_ratio", 0.6)
                    }
                    
                    masks.append(mask_metadata)
                    logger.info(f"✅ Clarifai segmentation for image {idx}: quality={mask_metadata['segmentation_quality']:.2f}")
                    continue
                    
                except Exception as e:
                    logger.warning(f"⚠️ Clarifai segmentation failed for image {idx}: {e}, using fallback")
            
            # Fallback to mocked data
            logger.info(f"Using mocked segmentation data for image {idx}")
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
