"""
Rebalance macros to match a target calorie while gently nudging toward priors.
"""

def macro_rebalance(
    target_cal: float,
    base_P: float | None,
    base_C: float | None,
    base_F: float | None,
    priors: tuple[float, float, float] | None,
    lam: float = 0.35
) -> tuple[float, float, float]:
    """
    Adjust macros to match a target calorie while blending with prior distributions.

    Args:
        target_cal (float): Target calorie value.
        base_P (float | None): Base protein macro (grams). If None, treated as 0.
        base_C (float | None): Base carbohydrate macro (grams). If None, treated as 0.
        base_F (float | None): Base fat macro (grams). If None, treated as 0.
        priors (tuple[float, float, float] | None): Prior distribution of macros (protein, carbs, fat).
            If None, base macros are scaled directly to target calories.
        lam (float): Blending factor between priors and scaled base macros. Default is 0.35.

    Returns:
        tuple[float, float, float]: Adjusted macros (protein, carbs, fat) in grams.
    """
    # Handle None values for base macros
    base_P = base_P or 0.0
    base_C = base_C or 0.0
    base_F = base_F or 0.0

    # Calculate base calories
    base_cal = 4 * (base_P + base_C) + 9 * base_F

    if priors is None:
        # Scale base macros directly to target calories
        scale = target_cal / base_cal if base_cal > 0 else 0
        return (base_P * scale, base_C * scale, base_F * scale)

    # Extract prior distributions
    rP, rC, rF = priors

    # Calculate scaling factor for priors
    t = target_cal / (4 * (rP + rC) + 9 * rF)
    prior_P, prior_C, prior_F = rP * t, rC * t, rF * t

    # Scale base macros
    scale = target_cal / base_cal if base_cal > 0 else 0
    scaled_P, scaled_C, scaled_F = base_P * scale, base_C * scale, base_F * scale

    # Blend priors and scaled base macros
    out_P = max(0, lam * prior_P + (1 - lam) * scaled_P)
    out_C = max(0, lam * prior_C + (1 - lam) * scaled_C)
    out_F = max(0, lam * prior_F + (1 - lam) * scaled_F)

    return out_P, out_C, out_F