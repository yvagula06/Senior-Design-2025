"""
Scaling Service for Calorie-Aware Nutrition Adjustment

This module provides deterministic, linear scaling of nutrition facts based on
target calorie amounts. It applies proportional scaling to all nutrients while
clamping extreme scaling factors to prevent unrealistic results.

Key Features:
- Deterministic linear scaling (no randomness, no ML)
- Proportional scaling of all nutrients
- Clamping of extreme scaling factors (0.1x to 10x)
- Handles missing/optional nutrients gracefully

Assumptions:
1. All nutrients scale linearly with calories (reasonable for portion changes)
2. Canonical nutrition is per serving or per 100g
3. Extreme scaling requests (>10x or <0.1x) are clamped for safety
4. Negative or zero calories are invalid
"""

from typing import Optional
from app.schemas.label import Nutrients  # noqa: F401 (Optional used in _scale helper)


# Configuration
MIN_SCALING_FACTOR = 0.1   # Minimum 10% of original serving
MAX_SCALING_FACTOR = 10.0  # Maximum 10x original serving
MIN_VALID_CALORIES = 1.0   # Minimum valid calorie count


def scale_nutrients(
    canonical_nutrients: Nutrients,
    target_calories: float,
    clamp: bool = True
) -> Nutrients:
    """
    Scale nutrition facts proportionally to match target calorie amount.
    
    This function performs simple linear scaling:
        scaling_factor = target_calories / canonical_calories
        scaled_protein = canonical_protein * scaling_factor
        scaled_carbs = canonical_carbs * scaling_factor
        ... (and so on for all nutrients)
    
    Args:
        canonical_nutrients: Original nutrition facts from canonical dish
        target_calories: Desired calorie amount (e.g., user wants 500 calories)
        clamp: Whether to clamp extreme scaling factors (default: True)
    
    Returns:
        Nutrients object with all values scaled proportionally
    
    Example:
        >>> canonical = Nutrients(calories=200, protein_g=20, carbs_g=10, fat_g=5)
        >>> scaled = scale_nutrients(canonical, target_calories=400)
        >>> print(scaled.protein_g)  # 40.0 (doubled)
        >>> print(scaled.fat_g)      # 10.0 (doubled)
    
    Raises:
        ValueError: If canonical_nutrients.calories <= 0
        ValueError: If target_calories <= 0
    
    Notes:
        - Scaling factor is clamped to [0.1, 10.0] by default
        - This prevents unrealistic scenarios like "10000 calorie salad"
        - Missing nutrients (None) remain None after scaling
    """
    # Validation
    if canonical_nutrients.calories <= 0:
        raise ValueError(
            f"Canonical calories must be positive, got {canonical_nutrients.calories}"
        )
    
    if target_calories <= 0:
        raise ValueError(
            f"Target calories must be positive, got {target_calories}"
        )
    
    # Calculate scaling factor
    scaling_factor = target_calories / canonical_nutrients.calories
    
    # Clamp to prevent extreme scaling
    if clamp:
        if scaling_factor < MIN_SCALING_FACTOR:
            scaling_factor = MIN_SCALING_FACTOR
        elif scaling_factor > MAX_SCALING_FACTOR:
            scaling_factor = MAX_SCALING_FACTOR
    
    def _scale(value: Optional[float]) -> Optional[float]:
        """Scale a single nutrient value; propagates None."""
        return value * scaling_factor if value is not None else None

    return Nutrients(
        calories=canonical_nutrients.calories * scaling_factor,
        protein_g=_scale(canonical_nutrients.protein_g) or 0.0,
        carbs_g=_scale(canonical_nutrients.carbs_g) or 0.0,
        fat_g=_scale(canonical_nutrients.fat_g) or 0.0,
        fiber_g=_scale(canonical_nutrients.fiber_g),
        sugar_g=_scale(canonical_nutrients.sugar_g),
        sodium_mg=_scale(canonical_nutrients.sodium_mg),
        potassium_mg=_scale(canonical_nutrients.potassium_mg),
        saturated_fat_g=_scale(canonical_nutrients.saturated_fat_g),
        trans_fat_g=_scale(canonical_nutrients.trans_fat_g),
        cholesterol_mg=_scale(canonical_nutrients.cholesterol_mg),
        vitamin_a_mcg=_scale(canonical_nutrients.vitamin_a_mcg),
        vitamin_c_mg=_scale(canonical_nutrients.vitamin_c_mg),
        vitamin_d_mcg=_scale(canonical_nutrients.vitamin_d_mcg),
        calcium_mg=_scale(canonical_nutrients.calcium_mg),
        iron_mg=_scale(canonical_nutrients.iron_mg),
    )


def compute_scaling_factor(
    canonical_calories: float,
    target_calories: float,
    clamp: bool = True
) -> float:
    """
    Calculate the scaling factor between canonical and target calories.
    
    Useful for debugging or displaying scaling information to users.
    
    Args:
        canonical_calories: Original calorie amount
        target_calories: Desired calorie amount
        clamp: Whether to clamp to [MIN_SCALING_FACTOR, MAX_SCALING_FACTOR]
    
    Returns:
        Scaling factor (e.g., 2.0 means "double the portion")
    
    Example:
        >>> factor = compute_scaling_factor(200, 400)
        >>> print(f"Portion size: {factor}x")  # "Portion size: 2.0x"
    """
    if canonical_calories <= 0:
        raise ValueError(f"Canonical calories must be positive, got {canonical_calories}")
    
    if target_calories <= 0:
        raise ValueError(f"Target calories must be positive, got {target_calories}")
    
    factor = target_calories / canonical_calories
    
    if clamp:
        if factor < MIN_SCALING_FACTOR:
            factor = MIN_SCALING_FACTOR
        elif factor > MAX_SCALING_FACTOR:
            factor = MAX_SCALING_FACTOR

    return factor


def get_scaling_factor(
    canonical_calories: float,
    target_calories: float,
    clamp: bool = True
) -> float:
    """
    Alias for compute_scaling_factor for backward compatibility.

    Deprecated: Use compute_scaling_factor instead.
    """
    return compute_scaling_factor(canonical_calories, target_calories, clamp)


def estimate_portion_size(scaling_factor: float) -> str:
    """
    Convert scaling factor to human-readable portion description.
    
    Args:
        scaling_factor: Numeric scaling factor (e.g., 2.0, 0.5)
    
    Returns:
        Human-readable description (e.g., "double portion", "half portion")
    
    Example:
        >>> estimate_portion_size(2.0)
        'double portion'
        >>> estimate_portion_size(0.5)
        'half portion'
        >>> estimate_portion_size(1.5)
        '1.5x portion'
    """
    if abs(scaling_factor - 1.0) < 0.05:
        return "standard portion"
    elif abs(scaling_factor - 0.5) < 0.05:
        return "half portion"
    elif abs(scaling_factor - 2.0) < 0.05:
        return "double portion"
    elif abs(scaling_factor - 1.5) < 0.05:
        return "1.5x portion"
    elif scaling_factor < 1.0:
        return f"{scaling_factor:.1f}x portion (smaller)"
    else:
        return f"{scaling_factor:.1f}x portion (larger)"


# Validation utilities
def is_scaling_clamped(canonical_calories: float, target_calories: float) -> bool:
    """
    Check if the scaling would be clamped.
    
    Useful for warning users when their request is unrealistic.
    
    Args:
        canonical_calories: Original calorie amount
        target_calories: Desired calorie amount
    
    Returns:
        True if scaling factor would be clamped
    
    Example:
        >>> is_scaling_clamped(100, 5000)  # 50x scaling
        True  # Would be clamped to 10x
    """
    if canonical_calories <= 0 or target_calories <= 0:
        return False
    
    factor = target_calories / canonical_calories
    return factor < MIN_SCALING_FACTOR or factor > MAX_SCALING_FACTOR
