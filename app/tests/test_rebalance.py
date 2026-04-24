from app.services.rebalance_service import macro_rebalance

def test_macro_rebalance():
    base_macros = (25, 50, 17)
    target_cal = 750
    priors = (0.3, 0.45, 0.25)
    lam = 0.35

    result = macro_rebalance(target_cal, *base_macros, priors, lam)

    # Calculate resulting calories
    result_cal = 4 * (result[0] + result[1]) + 9 * result[2]

    assert abs(result_cal - target_cal) < 1e-6, f"Calories mismatch: {result_cal} != {target_cal}"