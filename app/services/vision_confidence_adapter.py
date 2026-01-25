"""
Vision Confidence Adapter

This adapter computes accuracy scores and calorie range multipliers
for vision-based meal estimation. It wraps the existing confidence_service
without modifying it.

Confidence calculation factors:
1. Classification confidence (from dish_classifier)
2. Estimation mode prior (depth > multi_angle > reference)
3. Volume uncertainty (from volume_estimator)
"""

from typing import Dict


# Mode-specific accuracy priors
MODE_ACCURACY_PRIORS = {
    "depth": 0.85,          # High accuracy for depth-based
    "multi_angle": 0.70,    # Medium accuracy for multi-angle
    "reference_based": 0.50 # Lower accuracy for reference-based
}

# Mode-specific range multipliers (for calorie range calculation)
MODE_RANGE_MULTIPLIERS = {
    "depth": 0.175,          # ±17.5% range
    "multi_angle": 0.30,     # ±30% range
    "reference_based": 0.50  # ±50% range
}


class VisionConfidenceAdapter:
    """Adapter for computing vision estimation confidence scores."""
    
    def __init__(self):
        """Initialize confidence adapter."""
        pass
    
    def calculate_confidence(
        self,
        classification_confidence: float,
        estimation_mode: str,
        volume_uncertainty: float,
        segmentation_quality: float = 0.85
    ) -> Dict[str, any]:
        """
        Calculate overall confidence and range multiplier.
        
        Args:
            classification_confidence: Dish classification confidence [0-1]
            estimation_mode: "depth", "multi_angle", or "reference_based"
            volume_uncertainty: Volume estimation uncertainty [0-1]
            segmentation_quality: Optional segmentation quality [0-1]
            
        Returns:
            Dict with accuracy_score and range_multiplier
        """
        # Get mode-specific prior
        mode_prior = MODE_ACCURACY_PRIORS.get(
            estimation_mode,
            MODE_ACCURACY_PRIORS["reference_based"]
        )
        
        # Calculate volume confidence (inverse of uncertainty)
        volume_confidence = max(0.0, 1.0 - volume_uncertainty)
        
        # Weighted combination:
        # - 40% classification confidence
        # - 30% mode prior
        # - 20% volume confidence
        # - 10% segmentation quality
        accuracy_score = (
            0.40 * classification_confidence +
            0.30 * mode_prior +
            0.20 * volume_confidence +
            0.10 * segmentation_quality
        )
        
        # Clamp to [0, 1]
        accuracy_score = max(0.0, min(1.0, accuracy_score))
        
        # Get base range multiplier for mode
        base_multiplier = MODE_RANGE_MULTIPLIERS.get(
            estimation_mode,
            MODE_RANGE_MULTIPLIERS["reference_based"]
        )
        
        # Adjust multiplier based on confidence
        # Lower confidence = wider range
        confidence_adjustment = 1.0 + (1.0 - accuracy_score) * 0.5
        range_multiplier = base_multiplier * confidence_adjustment
        
        # Clamp range multiplier to reasonable bounds
        range_multiplier = max(0.10, min(0.80, range_multiplier))
        
        return {
            "accuracy_score": accuracy_score,
            "range_multiplier": range_multiplier,
            "breakdown": {
                "classification_confidence": classification_confidence,
                "mode_prior": mode_prior,
                "volume_confidence": volume_confidence,
                "segmentation_quality": segmentation_quality
            }
        }


# Singleton instance
_confidence_adapter_instance = None


def get_confidence_adapter() -> VisionConfidenceAdapter:
    """Get or create singleton confidence adapter instance."""
    global _confidence_adapter_instance
    if _confidence_adapter_instance is None:
        _confidence_adapter_instance = VisionConfidenceAdapter()
    return _confidence_adapter_instance


def calculate_confidence(
    classification_confidence: float,
    estimation_mode: str,
    volume_uncertainty: float,
    segmentation_quality: float = 0.85
) -> Dict[str, any]:
    """
    Calculate confidence (convenience function).
    
    Args:
        classification_confidence: Dish classification confidence [0-1]
        estimation_mode: "depth", "multi_angle", or "reference_based"
        volume_uncertainty: Volume estimation uncertainty [0-1]
        segmentation_quality: Optional segmentation quality [0-1]
        
    Returns:
        Dict with accuracy_score and range_multiplier
    """
    adapter = get_confidence_adapter()
    return adapter.calculate_confidence(
        classification_confidence,
        estimation_mode,
        volume_uncertainty,
        segmentation_quality
    )
