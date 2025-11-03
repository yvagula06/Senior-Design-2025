"""
Confidence calculation based on similarity, weights, and calorie alignment.
"""

import math
from typing import List

def clamp(value: float, min_value: float, max_value: float) -> float:
    """
    Clamp a value between a minimum and maximum.

    Args:
        value (float): The value to clamp.
        min_value (float): The minimum allowable value.
        max_value (float): The maximum allowable value.

    Returns:
        float: The clamped value.
    """
    return max(min_value, min(value, max_value))

def confidence(
    sim: float,
    weights: List[float],
    kcal0: float,
    target_cal: float
) -> float:
    """
    Calculate confidence score based on similarity, weights, and calorie alignment.

    Args:
        sim (float): Similarity score, expected to be in [0, 1].
        weights (List[float]): List of weights for candidates.
        kcal0 (float): Initial calorie value.
        target_cal (float): Target calorie value.

    Returns:
        float: Confidence score in the range [0, 1].
    """
    # Similarity term
    sim_term = clamp(sim, 0.0, 1.0)

    # Entropy term
    if len(weights) > 1:
        entropy = -sum(w * math.log2(w) for w in weights if w > 0)
        max_entropy = math.log2(len(weights))
        entropy_term = 1.0 - (entropy / max_entropy)
    else:
        entropy_term = 1.0

    # Calorie alignment term
    cal_term = max(0.0, 1.0 - abs(target_cal - kcal0) / max(target_cal, 1.0))

    # Combine terms with weights
    confidence_score = 0.5 * sim_term + 0.3 * entropy_term + 0.2 * cal_term

    # Clamp final score to [0, 1]
    return clamp(confidence_score, 0.0, 1.0)

if __name__ == "__main__":
    # Example test case
    similarity = 0.8
    candidate_weights = [0.4, 0.3, 0.3]
    initial_calories = 500
    target_calories = 600

    score = confidence(similarity, candidate_weights, initial_calories, target_calories)
    print("Confidence Score:", score)