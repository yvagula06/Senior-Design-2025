import pytest
from app.services.confidence_service import confidence

def test_confidence_high_entropy():
    sim = 0.9
    weights = [1.0]
    kcal0 = 600
    target_cal = 600

    result = confidence(sim, weights, kcal0, target_cal)

    assert 0.8 <= result <= 1.0, f"Confidence out of range: {result}"