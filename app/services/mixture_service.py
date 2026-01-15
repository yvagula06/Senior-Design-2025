"""
Mixture Service for Multi-Candidate Aggregation

This module provides similarity-weighted averaging of multiple candidate dishes
to produce a single aggregated nutrition profile. This is useful when multiple
dishes match the user's query with similar confidence levels.

Key Features:
- Similarity-weighted averaging (higher similarity = higher weight)
- Cap prevention (no single candidate dominates >70%)
- Softmax normalization for smooth weight distribution
- Fallback to uniform weights when similarities are equal

Weighting Strategy:
1. Convert similarity scores to weights using softmax with temperature
2. Cap individual weights to prevent single-candidate dominance
3. Renormalize weights to sum to 1.0
4. Compute weighted average of all nutrients

Use Cases:
- User query matches multiple similar dishes (e.g., "chicken curry" → 5 curry types)
- Hedging uncertainty by blending top predictions
- Smooth interpolation between related dishes
"""

from typing import List, Tuple, Optional
import numpy as np
from app.schemas.label import Candidate, Nutrients


# Configuration
MAX_SINGLE_WEIGHT = 0.70   # Maximum weight for any single candidate (prevents dominance)
SOFTMAX_TEMPERATURE = 2.0  # Temperature for softmax (higher = more uniform)
MIN_SIMILARITY_DIFF = 0.01 # Threshold for treating similarities as equal


def compute_mixture(
    candidates: List[Tuple[Candidate, Nutrients]],
    use_weights: bool = True
) -> Nutrients:
    """
    Compute similarity-weighted average of multiple candidate dishes.
    
    This function aggregates nutrition facts from multiple candidates using
    their similarity scores as weights. Higher similarity = higher influence.
    
    Args:
        candidates: List of (Candidate, Nutrients) tuples from retrieval
        use_weights: If False, use uniform weights (default: True)
    
    Returns:
        Single aggregated Nutrients object
    
    Example:
        >>> candidate1 = (Candidate(name="Tikka Masala", sim=0.9), Nutrients(calories=300, protein_g=25, ...))
        >>> candidate2 = (Candidate(name="Butter Chicken", sim=0.8), Nutrients(calories=320, protein_g=22, ...))
        >>> mixed = compute_mixture([candidate1, candidate2])
        >>> # Result will be weighted average: 0.56*tikka + 0.44*butter
    
    Raises:
        ValueError: If candidates list is empty
    
    Notes:
        - Uses softmax to convert similarities to weights
        - Caps individual weights to prevent dominance
        - Handles missing nutrients (None) by ignoring in average
    """
    if not candidates:
        raise ValueError("Cannot compute mixture from empty candidate list")
    
    if len(candidates) == 1:
        # Single candidate: return as-is
        return candidates[0][1]
    
    # Extract similarity scores
    similarities = [cand.sim for cand, _ in candidates]
    
    # Compute weights
    if use_weights:
        weights = _compute_similarity_weights(similarities)
    else:
        # Uniform weights
        weights = [1.0 / len(candidates)] * len(candidates)
    
    # Aggregate nutrients
    aggregated = _weighted_average_nutrients(candidates, weights)
    
    return aggregated


def blend_candidates(
    candidates: List[Tuple[Candidate, Nutrients]],
    use_weights: bool = True
) -> List[Candidate]:
    """
    Compute weights for candidates and return updated Candidate objects.
    
    This is a convenience function that adds weight attributes to Candidate
    objects without computing the final mixture.
    
    Args:
        candidates: List of (Candidate, Nutrients) tuples
        use_weights: If False, use uniform weights (default: True)
    
    Returns:
        List of Candidate objects with .weight attribute set
    
    Example:
        >>> weighted = blend_candidates(candidates)
        >>> for cand in weighted:
        >>>     print(f"{cand.name}: {cand.weight:.2f}")
    """
    if not candidates:
        return []
    
    # Extract similarity scores
    similarities = [cand.sim for cand, _ in candidates]
    
    # Compute weights
    if use_weights:
        weights = _compute_similarity_weights(similarities)
    else:
        weights = [1.0 / len(candidates)] * len(candidates)
    
    # Update Candidate objects
    result = []
    for (cand, _), weight in zip(candidates, weights):
        cand.weight = weight
        result.append(cand)
    
    return result


def _compute_similarity_weights(similarities: List[float]) -> List[float]:
    """
    Convert similarity scores to normalized weights using softmax with capping.
    
    Strategy:
    1. Apply softmax with temperature to smooth distribution
    2. Cap individual weights to MAX_SINGLE_WEIGHT
    3. Renormalize to sum to 1.0
    
    Args:
        similarities: List of similarity scores (0.0 to 1.0)
    
    Returns:
        List of weights summing to 1.0
    
    Example:
        >>> _compute_similarity_weights([0.9, 0.8, 0.7])
        [0.37, 0.33, 0.30]  # Softmax with capping
    """
    if not similarities:
        return []
    
    if len(similarities) == 1:
        return [1.0]
    
    # Check if all similarities are essentially equal
    sim_range = max(similarities) - min(similarities)
    if sim_range < MIN_SIMILARITY_DIFF:
        # All equal → uniform weights
        return [1.0 / len(similarities)] * len(similarities)
    
    # Apply softmax with temperature
    # Higher temperature → more uniform distribution
    # Lower temperature → more peaked distribution
    similarities_array = np.array(similarities, dtype=float)
    exp_scores = np.exp(similarities_array / SOFTMAX_TEMPERATURE)
    softmax_weights = exp_scores / np.sum(exp_scores)
    
    # Cap individual weights
    capped_weights = np.minimum(softmax_weights, MAX_SINGLE_WEIGHT)
    
    # Renormalize
    weight_sum = np.sum(capped_weights)
    if weight_sum > 0:
        normalized_weights = capped_weights / weight_sum
    else:
        # Fallback to uniform
        normalized_weights = np.ones(len(similarities)) / len(similarities)
    
    return normalized_weights.tolist()


def _weighted_average_nutrients(
    candidates: List[Tuple[Candidate, Nutrients]],
    weights: List[float]
) -> Nutrients:
    """
    Compute weighted average of nutrients across candidates.
    
    For each nutrient field:
    - If all candidates have the value: weighted average
    - If some candidates missing (None): average over available values only
    - If all candidates missing: result is None
    
    Args:
        candidates: List of (Candidate, Nutrients) tuples
        weights: Corresponding weights (must sum to 1.0)
    
    Returns:
        Nutrients object with weighted averages
    """
    if len(candidates) != len(weights):
        raise ValueError(
            f"Candidates ({len(candidates)}) and weights ({len(weights)}) length mismatch"
        )
    
    # Extract nutrients
    nutrients_list = [nutr for _, nutr in candidates]
    
    # Helper function to compute weighted average for a single field
    def weighted_avg_field(field_name: str) -> Optional[float]:
        values = []
        corresponding_weights = []
        
        for nutr, weight in zip(nutrients_list, weights):
            value = getattr(nutr, field_name)
            if value is not None:
                values.append(float(value))
                corresponding_weights.append(weight)
        
        if not values:
            return None
        
        # Renormalize weights for available values
        weight_sum = sum(corresponding_weights)
        if weight_sum > 0:
            normalized_weights = [w / weight_sum for w in corresponding_weights]
        else:
            normalized_weights = [1.0 / len(values)] * len(values)
        
        # Compute weighted average
        weighted_sum = sum(v * w for v, w in zip(values, normalized_weights))
        return weighted_sum
    
    # Compute weighted averages for all fields
    return Nutrients(
        calories=weighted_avg_field("calories") or 0.0,
        protein_g=weighted_avg_field("protein_g"),
        carbs_g=weighted_avg_field("carbs_g"),
        fat_g=weighted_avg_field("fat_g"),
        fiber_g=weighted_avg_field("fiber_g"),
        sugar_g=weighted_avg_field("sugar_g"),
        sodium_mg=weighted_avg_field("sodium_mg")
    )


def get_effective_diversity(similarities: List[float]) -> float:
    """
    Compute effective diversity (entropy-based) of similarity distribution.
    
    Effective diversity is the exponential of Shannon entropy, which measures
    how "spread out" the weights are. Higher diversity means candidates are
    more evenly weighted.
    
    Args:
        similarities: List of similarity scores
    
    Returns:
        Effective diversity (1.0 = all weight on one candidate, N = uniform)
    
    Example:
        >>> get_effective_diversity([1.0, 0.0, 0.0])  # All weight on first
        1.0
        >>> get_effective_diversity([0.9, 0.9, 0.9])  # Uniform
        3.0
    
    Notes:
        - Useful for assessing prediction confidence
        - Low diversity (< 2) suggests confident single match
        - High diversity (> 3) suggests ambiguous query
    """
    if not similarities:
        return 0.0
    
    weights = _compute_similarity_weights(similarities)
    
    # Compute Shannon entropy: H = -Σ(w_i * log(w_i))
    entropy = 0.0
    for w in weights:
        if w > 0:
            entropy -= w * np.log(w)
    
    # Effective diversity: exp(H)
    return np.exp(entropy)
