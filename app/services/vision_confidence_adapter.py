"""
Vision Confidence Adapter

Computes accuracy scores and calorie range multipliers for vision-based meal
estimation.  Factors:

  1. Dish classification confidence  (40 %)
  2. Estimation-mode prior           (25 %)
  3. Volume confidence (1 – uncertainty) (15 %)
  4. Segmentation quality            (10 %)
  5. Image quality score             ( 5 %)
  6. Number of images used           ( 3 %)
  7. Whether a real scale reference was provided (2 %)

Mode-specific priors (higher = more reliable):
  depth                        → 0.90
  multi_angle + plate/ref obj  → 0.78
  plate_reference              → 0.68
  reference_object             → 0.72
  multi_angle (no ref)         → 0.65
  basic_single                 → 0.45
  reference_based (legacy)     → 0.50
"""

from typing import Dict, Any, Optional


# ── Priors ────────────────────────────────────────────────────────────────────

_MODE_PRIORS: Dict[str, float] = {
    "depth": 0.90,
    "plate_reference": 0.68,
    "reference_object": 0.72,
    "multi_angle": 0.65,
    "basic_single": 0.45,
    # Legacy EstimationMode values
    "reference_based": 0.50,
}

_MODE_RANGE_MULTIPLIERS: Dict[str, float] = {
    "depth": 0.15,
    "plate_reference": 0.28,
    "reference_object": 0.25,
    "multi_angle": 0.32,
    "basic_single": 0.50,
    "reference_based": 0.50,
}


class VisionConfidenceAdapter:
    """Adapter for computing vision estimation confidence scores."""

    def calculate_confidence(
        self,
        classification_confidence: float,
        estimation_mode: str,
        volume_uncertainty: float,
        segmentation_quality: float = 0.75,
        # Extended factors
        image_quality_score: float = 0.75,
        num_images: int = 1,
        has_scale_reference: bool = False,
        normal_camera_mode: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Calculate overall confidence and range multiplier.

        Args:
            classification_confidence: Dish classification score [0-1]
            estimation_mode:           "depth" | "multi_angle" | "reference_based"
            volume_uncertainty:        Volume uncertainty [0-1]  (lower = better)
            segmentation_quality:      Segmentation quality [0-1]
            image_quality_score:       Overall image quality [0-1]
            num_images:                Number of images in the request (1-3)
            has_scale_reference:       True when plate type / ref object was supplied
            normal_camera_mode:        Fine-grained mode key for normal cameras

        Returns:
            {accuracy_score, range_multiplier, breakdown}
        """
        # Resolve the most specific mode key available
        mode_key = normal_camera_mode or estimation_mode
        mode_prior = _MODE_PRIORS.get(mode_key, _MODE_PRIORS["reference_based"])

        # Multi-angle WITH a scale reference → better prior
        if (
            mode_key in ("multi_angle", "reference_based")
            and has_scale_reference
        ):
            mode_prior = min(mode_prior + 0.08, 0.80)

        volume_confidence = max(0.0, 1.0 - volume_uncertainty)

        # Multi-image bonus (small)
        image_count_bonus = min(0.05 * (num_images - 1), 0.10)

        # Scale reference bonus
        scale_bonus = 0.05 if has_scale_reference else 0.0

        # Weighted combination
        accuracy_score = (
            0.40 * classification_confidence
            + 0.25 * mode_prior
            + 0.15 * volume_confidence
            + 0.10 * segmentation_quality
            + 0.05 * image_quality_score
            + image_count_bonus
            + scale_bonus
        )
        accuracy_score = float(max(0.0, min(1.0, accuracy_score)))

        # Range multiplier: higher accuracy → narrower range
        base_mult = _MODE_RANGE_MULTIPLIERS.get(
            mode_key, _MODE_RANGE_MULTIPLIERS["reference_based"]
        )
        # Widen range when accuracy is low
        confidence_adj = 1.0 + (1.0 - accuracy_score) * 0.50
        range_multiplier = float(
            max(0.10, min(0.80, base_mult * confidence_adj))
        )

        return {
            "accuracy_score": round(accuracy_score, 3),
            "range_multiplier": round(range_multiplier, 3),
            "breakdown": {
                "classification_confidence": classification_confidence,
                "mode_prior": mode_prior,
                "volume_confidence": volume_confidence,
                "segmentation_quality": segmentation_quality,
                "image_quality_score": image_quality_score,
                "num_images": num_images,
                "has_scale_reference": has_scale_reference,
                "image_count_bonus": image_count_bonus,
                "scale_bonus": scale_bonus,
            },
        }


# ── Singleton / convenience ───────────────────────────────────────────────────

_confidence_adapter_instance: Optional["VisionConfidenceAdapter"] = None


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
    segmentation_quality: float = 0.75,
    **kwargs: Any,
) -> Dict[str, Any]:
    """
    Calculate confidence (convenience function).

    Accepts all keyword arguments of ``VisionConfidenceAdapter.calculate_confidence``.
    """
    return get_confidence_adapter().calculate_confidence(
        classification_confidence=classification_confidence,
        estimation_mode=estimation_mode,
        volume_uncertainty=volume_uncertainty,
        segmentation_quality=segmentation_quality,
        **kwargs,
    )
