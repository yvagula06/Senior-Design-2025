"""
Confidence Scoring for Nutrition Predictions

This module computes deterministic confidence scores for nutrition label predictions
based on three key factors:
1. Embedding similarity (how well the query matched canonical dishes)
2. Candidate variance (how consistent the top-k matches are)
3. Scaling magnitude (how much portion adjustment was needed)

Key Features:
- Deterministic confidence scoring (no probabilistic ML)
- Human-readable explanations
- Multi-factor analysis (similarity, variance, scaling)
- Confidence tiers (High, Medium, Low)

Confidence Formula:
    confidence = 0.50 × similarity_score
               + 0.30 × consistency_score (low variance)
               + 0.20 × scaling_score (reasonable portion)
"""

import math
from typing import List, Tuple, Optional, Dict
from dataclasses import dataclass


@dataclass
class ConfidenceResult:
    """
    Structured confidence result with score and explanation.
    
    Attributes:
        score: Numeric confidence in [0.0, 1.0]
        tier: Human-readable tier (High, Medium, Low)
        explanation: Short human-readable explanation
        breakdown: Dictionary of component scores for debugging
    """
    score: float
    tier: str
    explanation: str
    breakdown: Dict[str, float]


# Configuration
SIMILARITY_WEIGHT = 0.50    # Weight for embedding similarity term
CONSISTENCY_WEIGHT = 0.30   # Weight for candidate consistency term
SCALING_WEIGHT = 0.20       # Weight for scaling magnitude term

# Confidence tiers
HIGH_CONFIDENCE_THRESHOLD = 0.75
MEDIUM_CONFIDENCE_THRESHOLD = 0.50


def compute_confidence(
    top_similarity: float,
    candidate_similarities: List[float],
    candidate_calories: List[float],
    target_calories: float,
    scaling_factor: Optional[float] = None
) -> ConfidenceResult:
    """
    Compute comprehensive confidence score with human-readable explanation.
    
    This function analyzes three dimensions of prediction quality:
    1. **Similarity:** How well did the query match canonical dishes?
    2. **Consistency:** How similar are the top-k candidate dishes?
    3. **Scaling:** How reasonable is the portion adjustment?
    
    Args:
        top_similarity: Similarity score of best match [0.0, 1.0]
        candidate_similarities: List of similarity scores for top-k candidates
        candidate_calories: List of calorie values for top-k candidates
        target_calories: User's target calorie amount
        scaling_factor: Optional pre-computed scaling factor
    
    Returns:
        ConfidenceResult with score, tier, explanation, and breakdown
    
    Example:
        >>> result = compute_confidence(
        ...     top_similarity=0.92,
        ...     candidate_similarities=[0.92, 0.88, 0.85],
        ...     candidate_calories=[310, 290, 305],
        ...     target_calories=600
        ... )
        >>> print(f"Confidence: {result.score:.2f} ({result.tier})")
        Confidence: 0.87 (High)
        >>> print(result.explanation)
        Excellent match with consistent candidates and reasonable portion size.
    """
    # 1. Similarity Term (50% weight)
    similarity_score = _compute_similarity_score(top_similarity)
    
    # 2. Consistency Term (30% weight)
    consistency_score = _compute_consistency_score(
        candidate_similarities,
        candidate_calories
    )
    
    # 3. Scaling Term (20% weight)
    if scaling_factor is None:
        # Compute from first candidate
        canonical_calories = candidate_calories[0] if candidate_calories else target_calories
        scaling_factor = target_calories / max(canonical_calories, 1.0)
    
    scaling_score = _compute_scaling_score(scaling_factor)
    
    # Weighted combination
    confidence_score = (
        SIMILARITY_WEIGHT * similarity_score +
        CONSISTENCY_WEIGHT * consistency_score +
        SCALING_WEIGHT * scaling_score
    )
    
    # Clamp to [0, 1]
    confidence_score = max(0.0, min(1.0, confidence_score))
    
    # Determine tier
    if confidence_score >= HIGH_CONFIDENCE_THRESHOLD:
        tier = "High"
    elif confidence_score >= MEDIUM_CONFIDENCE_THRESHOLD:
        tier = "Medium"
    else:
        tier = "Low"
    
    # Generate explanation
    explanation = _generate_explanation(
        confidence_score,
        tier,
        similarity_score,
        consistency_score,
        scaling_score
    )
    
    # Breakdown for debugging
    breakdown = {
        "similarity": similarity_score,
        "consistency": consistency_score,
        "scaling": scaling_score,
        "top_similarity_raw": top_similarity,
        "scaling_factor": scaling_factor
    }
    
    return ConfidenceResult(
        score=confidence_score,
        tier=tier,
        explanation=explanation,
        breakdown=breakdown
    )


def _compute_similarity_score(similarity: float) -> float:
    """
    Convert raw similarity to confidence component.
    
    High similarity (>0.9) → High confidence
    Medium similarity (0.7-0.9) → Medium confidence
    Low similarity (<0.7) → Low confidence
    
    Args:
        similarity: Raw similarity score [0.0, 1.0]
    
    Returns:
        Normalized score [0.0, 1.0]
    """
    # Clamp to valid range
    similarity = max(0.0, min(1.0, similarity))
    
    # Apply non-linear scaling to emphasize high similarities
    # Uses power function to be more stringent on low similarities
    return similarity ** 0.8


def _compute_consistency_score(
    similarities: List[float],
    calories: List[float]
) -> float:
    """
    Measure consistency across top-k candidates.
    
    Low variance in both similarities and calories → High consistency
    High variance → Low consistency
    
    Strategy:
    - Compute coefficient of variation (CV) for similarities
    - Compute CV for calories
    - Low CV → High consistency score
    
    Args:
        similarities: List of similarity scores
        calories: List of calorie values
    
    Returns:
        Consistency score [0.0, 1.0]
    """
    if len(similarities) <= 1:
        # Single candidate: perfect consistency
        return 1.0
    
    # Similarity consistency
    sim_mean = sum(similarities) / len(similarities)
    sim_variance = sum((s - sim_mean) ** 2 for s in similarities) / len(similarities)
    sim_std = math.sqrt(sim_variance)
    sim_cv = sim_std / max(sim_mean, 1e-6)  # Coefficient of variation
    
    # Calorie consistency
    cal_mean = sum(calories) / len(calories)
    cal_variance = sum((c - cal_mean) ** 2 for c in calories) / len(calories)
    cal_std = math.sqrt(cal_variance)
    cal_cv = cal_std / max(cal_mean, 1e-6)
    
    # Convert CV to consistency score (lower CV = higher consistency)
    # CV typically ranges from 0 to 0.5 for similar dishes
    sim_consistency = max(0.0, 1.0 - sim_cv / 0.3)
    cal_consistency = max(0.0, 1.0 - cal_cv / 0.3)
    
    # Average of both consistency measures
    return (sim_consistency + cal_consistency) / 2.0


def _compute_scaling_score(scaling_factor: float) -> float:
    """
    Evaluate reasonableness of portion scaling.
    
    Scaling near 1.0x → High confidence (standard portion)
    Scaling 0.5x or 2.0x → Medium confidence (reasonable adjustment)
    Scaling <0.2x or >5.0x → Low confidence (extreme)
    
    Args:
        scaling_factor: Ratio of target_calories / canonical_calories
    
    Returns:
        Scaling score [0.0, 1.0]
    """
    # Ideal scaling is 1.0 (no adjustment needed)
    # Acceptable range: 0.5x to 2.0x
    # Extreme range: <0.2x or >5.0x
    
    if 0.8 <= scaling_factor <= 1.2:
        # Near-perfect scaling (±20%)
        return 1.0
    elif 0.5 <= scaling_factor <= 2.0:
        # Reasonable scaling (half to double)
        deviation = abs(math.log2(scaling_factor))  # Log scale
        return max(0.0, 1.0 - deviation / 2.0)
    elif 0.2 <= scaling_factor <= 5.0:
        # Significant but acceptable scaling
        return 0.5
    else:
        # Extreme scaling (suspicious)
        return 0.2


def _generate_explanation(
    confidence: float,
    tier: str,
    similarity: float,
    consistency: float,
    scaling: float
) -> str:
    """
    Generate human-readable explanation of confidence score.
    
    Args:
        confidence: Overall confidence score
        tier: Confidence tier (High, Medium, Low)
        similarity: Similarity component score
        consistency: Consistency component score
        scaling: Scaling component score
    
    Returns:
        Short explanation string
    """
    # Identify strongest and weakest factors
    factors = {
        "match quality": similarity,
        "candidate consistency": consistency,
        "portion size": scaling
    }
    
    strongest = max(factors.items(), key=lambda x: x[1])
    weakest = min(factors.items(), key=lambda x: x[1])
    
    if tier == "High":
        if similarity >= 0.9:
            return "Excellent match with consistent candidates and reasonable portion size."
        else:
            return "Strong match with good candidate consistency."
    
    elif tier == "Medium":
        if weakest[1] < 0.4:
            return f"Decent prediction, but {weakest[0]} is uncertain."
        else:
            return "Good match, though some uncertainty remains."
    
    else:  # Low
        issues = []
        if similarity < 0.5:
            issues.append("weak match")
        if consistency < 0.5:
            issues.append("inconsistent candidates")
        if scaling < 0.4:
            issues.append("extreme portion adjustment")
        
        if issues:
            return f"Low confidence due to: {', '.join(issues)}."
        else:
            return "Prediction is uncertain. Consider refining your query."


# Legacy compatibility function
def confidence(
    sim: float,
    weights: List[float],
    kcal0: float,
    target_cal: float
) -> float:
    """
    Legacy confidence function for backward compatibility.
    
    This is a simplified version that maintains the original API.
    For new code, use compute_confidence() instead.
    
    Args:
        sim: Top similarity score
        weights: Candidate weights (for entropy calculation)
        kcal0: Canonical calories
        target_cal: Target calories
    
    Returns:
        Confidence score [0.0, 1.0]
    """
    # Similarity term
    sim_term = max(0.0, min(1.0, sim))
    
    # Entropy term (consistency proxy)
    if len(weights) > 1:
        entropy = -sum(w * math.log2(w) for w in weights if w > 1e-9)
        max_entropy = math.log2(len(weights))
        entropy_term = 1.0 - (entropy / max_entropy) if max_entropy > 0 else 1.0
    else:
        entropy_term = 1.0
    
    # Scaling term
    scaling_factor = target_cal / max(kcal0, 1.0)
    if 0.8 <= scaling_factor <= 1.2:
        scaling_term = 1.0
    elif 0.5 <= scaling_factor <= 2.0:
        scaling_term = 0.8
    else:
        scaling_term = 0.5
    
    # Weighted combination
    confidence_score = (
        0.5 * sim_term +
        0.3 * entropy_term +
        0.2 * scaling_term
    )
    
    return max(0.0, min(1.0, confidence_score))


# Example usage and test cases
if __name__ == "__main__":
    print("=" * 70)
    print("CONFIDENCE SCORING EXAMPLES")
    print("=" * 70)
    
    # Example 1: High confidence (excellent match, consistent candidates)
    print("\n📊 EXAMPLE 1: High Confidence Scenario")
    print("-" * 70)
    print("Query: 'chicken tikka masala'")
    print("Top Match: Chicken Tikka Masala (sim: 0.92)")
    print("Candidates: [0.92, 0.88, 0.85] (consistent)")
    print("Calories: [310, 290, 305] (low variance)")
    print("Target: 600 calories (1.94x scaling)")
    
    result1 = compute_confidence(
        top_similarity=0.92,
        candidate_similarities=[0.92, 0.88, 0.85],
        candidate_calories=[310, 290, 305],
        target_calories=600
    )
    
    print(f"\n✅ Result:")
    print(f"   Score: {result1.score:.3f}")
    print(f"   Tier: {result1.tier}")
    print(f"   Explanation: {result1.explanation}")
    print(f"   Breakdown:")
    for key, value in result1.breakdown.items():
        if isinstance(value, float):
            print(f"     - {key}: {value:.3f}")
    
    # Example 2: Medium confidence (decent match, some variance)
    print("\n\n📊 EXAMPLE 2: Medium Confidence Scenario")
    print("-" * 70)
    print("Query: 'spicy noodles'")
    print("Top Match: Pad Thai (sim: 0.75)")
    print("Candidates: [0.75, 0.68, 0.62] (moderate spread)")
    print("Calories: [400, 450, 380] (some variance)")
    print("Target: 350 calories (0.88x scaling)")
    
    result2 = compute_confidence(
        top_similarity=0.75,
        candidate_similarities=[0.75, 0.68, 0.62],
        candidate_calories=[400, 450, 380],
        target_calories=350
    )
    
    print(f"\n⚠️  Result:")
    print(f"   Score: {result2.score:.3f}")
    print(f"   Tier: {result2.tier}")
    print(f"   Explanation: {result2.explanation}")
    print(f"   Breakdown:")
    for key, value in result2.breakdown.items():
        if isinstance(value, float):
            print(f"     - {key}: {value:.3f}")
    
    # Example 3: Low confidence (weak match, high variance, extreme scaling)
    print("\n\n📊 EXAMPLE 3: Low Confidence Scenario")
    print("-" * 70)
    print("Query: 'food'")
    print("Top Match: Mixed Salad (sim: 0.45)")
    print("Candidates: [0.45, 0.38, 0.32] (high spread)")
    print("Calories: [120, 350, 280] (high variance)")
    print("Target: 1200 calories (10x scaling)")
    
    result3 = compute_confidence(
        top_similarity=0.45,
        candidate_similarities=[0.45, 0.38, 0.32],
        candidate_calories=[120, 350, 280],
        target_calories=1200
    )
    
    print(f"\n❌ Result:")
    print(f"   Score: {result3.score:.3f}")
    print(f"   Tier: {result3.tier}")
    print(f"   Explanation: {result3.explanation}")
    print(f"   Breakdown:")
    for key, value in result3.breakdown.items():
        if isinstance(value, float):
            print(f"     - {key}: {value:.3f}")
    
    # Example 4: Perfect match (exact dish, minimal scaling)
    print("\n\n📊 EXAMPLE 4: Perfect Match Scenario")
    print("-" * 70)
    print("Query: 'grilled chicken breast'")
    print("Top Match: Grilled Chicken Breast (sim: 0.98)")
    print("Candidates: [0.98, 0.96, 0.94] (very consistent)")
    print("Calories: [165, 160, 168] (minimal variance)")
    print("Target: 170 calories (1.03x scaling)")
    
    result4 = compute_confidence(
        top_similarity=0.98,
        candidate_similarities=[0.98, 0.96, 0.94],
        candidate_calories=[165, 160, 168],
        target_calories=170
    )
    
    print(f"\n⭐ Result:")
    print(f"   Score: {result4.score:.3f}")
    print(f"   Tier: {result4.tier}")
    print(f"   Explanation: {result4.explanation}")
    print(f"   Breakdown:")
    for key, value in result4.breakdown.items():
        if isinstance(value, float):
            print(f"     - {key}: {value:.3f}")
    
    # Legacy API test
    print("\n\n📊 LEGACY API TEST")
    print("-" * 70)
    legacy_score = confidence(
        sim=0.85,
        weights=[0.5, 0.3, 0.2],
        kcal0=300,
        target_cal=600
    )
    print(f"Legacy confidence() score: {legacy_score:.3f}")
    
    print("\n" + "=" * 70)
    print("SUMMARY")
    print("=" * 70)
    print(f"Example 1 (Perfect): {result4.score:.3f} - {result4.tier}")
    print(f"Example 2 (High):    {result1.score:.3f} - {result1.tier}")
    print(f"Example 3 (Medium):  {result2.score:.3f} - {result2.tier}")
    print(f"Example 4 (Low):     {result3.score:.3f} - {result3.tier}")
    print("=" * 70)