"""
Confidence Service Bounds Tests

Validates that confidence scores are always within [0.0, 1.0] bounds
and that tier assignments are correct for all scenarios.
"""

import pytest
from app.services.confidence_service import (
    compute_confidence,
    _compute_similarity_score,
    _compute_consistency_score,
    _compute_scaling_score
)


class TestConfidenceBounds:
    """Test suite for confidence score bounds."""
    
    def test_perfect_scenario_high_confidence(self):
        """Test perfect scenario: high similarity, low variance, no scaling."""
        result = compute_confidence(
            top_similarity=0.98,
            candidate_similarities=[0.98, 0.96, 0.95],
            candidate_calories=[300, 305, 295],
            target_calories=300,
            scaling_factor=1.0
        )
        
        # Score should be within bounds
        assert 0.0 <= result.score <= 1.0
        
        # Should be high confidence
        assert result.tier == "High"
        assert result.score >= 0.75
        
        # Breakdown should sum to score (weighted)
        weighted_sum = (
            0.50 * result.breakdown["similarity_score"] +
            0.30 * result.breakdown["consistency_score"] +
            0.20 * result.breakdown["scaling_score"]
        )
        assert abs(weighted_sum - result.score) < 0.01
    
    def test_worst_scenario_low_confidence(self):
        """Test worst scenario: low similarity, high variance, extreme scaling."""
        result = compute_confidence(
            top_similarity=0.20,
            candidate_similarities=[0.20, 0.15, 0.10],
            candidate_calories=[100, 500, 900],
            target_calories=5000,
            scaling_factor=10.0  # Extreme scaling (clamped)
        )
        
        # Score should be within bounds
        assert 0.0 <= result.score <= 1.0
        
        # Should be low confidence
        assert result.tier == "Low"
        assert result.score < 0.50
        
        # All component scores should be low
        assert result.breakdown["similarity_score"] < 0.5
        assert result.breakdown["consistency_score"] < 0.5
        assert result.breakdown["scaling_score"] < 0.5
    
    def test_medium_confidence_scenario(self):
        """Test medium confidence: decent match, some variance, moderate scaling."""
        result = compute_confidence(
            top_similarity=0.70,
            candidate_similarities=[0.70, 0.65, 0.60],
            candidate_calories=[400, 450, 380],
            target_calories=600,
            scaling_factor=1.5
        )
        
        # Score should be within bounds
        assert 0.0 <= result.score <= 1.0
        
        # Should be medium confidence
        assert result.tier == "Medium"
        assert 0.50 <= result.score < 0.75
    
    def test_extreme_similarity_values(self):
        """Test that extreme similarity values (0.0, 1.0) are handled correctly."""
        # Perfect similarity
        result_perfect = compute_confidence(
            top_similarity=1.0,
            candidate_similarities=[1.0, 1.0, 1.0],
            candidate_calories=[300, 300, 300],
            target_calories=300,
            scaling_factor=1.0
        )
        assert 0.0 <= result_perfect.score <= 1.0
        assert result_perfect.tier == "High"
        
        # Zero similarity
        result_zero = compute_confidence(
            top_similarity=0.0,
            candidate_similarities=[0.0, 0.0, 0.0],
            candidate_calories=[100, 500, 900],
            target_calories=1000,
            scaling_factor=5.0
        )
        assert 0.0 <= result_zero.score <= 1.0
        assert result_zero.tier == "Low"
    
    def test_single_candidate(self):
        """Test confidence with only one candidate (no variance to compute)."""
        result = compute_confidence(
            top_similarity=0.85,
            candidate_similarities=[0.85],
            candidate_calories=[400],
            target_calories=500,
            scaling_factor=1.25
        )
        
        # Score should be within bounds
        assert 0.0 <= result.score <= 1.0
        
        # Single candidate should have perfect consistency
        assert result.breakdown["consistency_score"] == 1.0
    
    def test_zero_variance_perfect_consistency(self):
        """Test that zero variance (identical candidates) gives perfect consistency."""
        result = compute_confidence(
            top_similarity=0.80,
            candidate_similarities=[0.80, 0.80, 0.80],
            candidate_calories=[350, 350, 350],
            target_calories=400,
            scaling_factor=1.14
        )
        
        # Consistency should be perfect (CV = 0)
        assert result.breakdown["consistency_score"] == 1.0
    
    def test_extreme_variance_low_consistency(self):
        """Test that extreme variance gives low consistency score."""
        result = compute_confidence(
            top_similarity=0.75,
            candidate_similarities=[0.75, 0.40, 0.10],
            candidate_calories=[200, 800, 1500],
            target_calories=500,
            scaling_factor=1.5
        )
        
        # Consistency should be low (high CV)
        assert result.breakdown["consistency_score"] < 0.5
    
    def test_all_component_scores_bounded(self):
        """Test that all component scores are individually bounded [0.0, 1.0]."""
        result = compute_confidence(
            top_similarity=0.65,
            candidate_similarities=[0.65, 0.60, 0.55],
            candidate_calories=[350, 400, 380],
            target_calories=700,
            scaling_factor=2.0
        )
        
        # Check each component
        assert 0.0 <= result.breakdown["similarity_score"] <= 1.0
        assert 0.0 <= result.breakdown["consistency_score"] <= 1.0
        assert 0.0 <= result.breakdown["scaling_score"] <= 1.0
    
    def test_tier_thresholds(self):
        """Test that tier assignments are correct at threshold boundaries."""
        # High tier boundary (0.75)
        result_high = compute_confidence(
            top_similarity=0.92,
            candidate_similarities=[0.92, 0.90, 0.88],
            candidate_calories=[300, 310, 295],
            target_calories=400,
            scaling_factor=1.33
        )
        if result_high.score >= 0.75:
            assert result_high.tier == "High"
        
        # Medium tier boundary (0.50 - 0.75)
        result_medium = compute_confidence(
            top_similarity=0.70,
            candidate_similarities=[0.70, 0.65, 0.60],
            candidate_calories=[300, 350, 380],
            target_calories=500,
            scaling_factor=1.5
        )
        if 0.50 <= result_medium.score < 0.75:
            assert result_medium.tier == "Medium"
        
        # Low tier boundary (< 0.50)
        result_low = compute_confidence(
            top_similarity=0.35,
            candidate_similarities=[0.35, 0.30, 0.25],
            candidate_calories=[200, 600, 1000],
            target_calories=2000,
            scaling_factor=5.0
        )
        if result_low.score < 0.50:
            assert result_low.tier == "Low"
    
    def test_explanation_not_empty(self):
        """Test that explanation is always provided."""
        test_cases = [
            (0.95, [0.95, 0.93], [300, 305], 300, 1.0),
            (0.65, [0.65, 0.60], [400, 450], 600, 1.5),
            (0.30, [0.30, 0.25], [200, 800], 2000, 10.0),
        ]
        
        for top_sim, sims, cals, target, scaling in test_cases:
            result = compute_confidence(top_sim, sims, cals, target, scaling)
            assert len(result.explanation) > 0
            assert isinstance(result.explanation, str)


class TestComponentScoreFunctions:
    """Test individual component scoring functions."""
    
    def test_similarity_score_bounds(self):
        """Test that similarity score is always [0.0, 1.0]."""
        test_values = [0.0, 0.1, 0.3, 0.5, 0.7, 0.9, 1.0]
        
        for sim in test_values:
            score = _compute_similarity_score(sim)
            assert 0.0 <= score <= 1.0, f"Similarity score {score} out of bounds for sim={sim}"
    
    def test_consistency_score_bounds(self):
        """Test that consistency score is always [0.0, 1.0]."""
        test_cases = [
            # (similarities, calories)
            ([0.9, 0.9, 0.9], [300, 300, 300]),  # Perfect consistency
            ([0.8, 0.7, 0.6], [400, 450, 380]),  # Moderate variance
            ([0.7, 0.4, 0.1], [200, 800, 1500]), # High variance
        ]
        
        for sims, cals in test_cases:
            score = _compute_consistency_score(sims, cals)
            assert 0.0 <= score <= 1.0, f"Consistency score {score} out of bounds"
    
    def test_scaling_score_bounds(self):
        """Test that scaling score is always [0.0, 1.0]."""
        test_factors = [0.1, 0.5, 1.0, 2.0, 5.0, 10.0]
        
        for factor in test_factors:
            score = _compute_scaling_score(factor)
            assert 0.0 <= score <= 1.0, f"Scaling score {score} out of bounds for factor={factor}"
    
    def test_scaling_score_none_handling(self):
        """Test that None scaling factor is handled (assumes 1.0)."""
        score = _compute_scaling_score(None)
        assert 0.0 <= score <= 1.0
        
        # Should treat as perfect scaling (1.0)
        score_one = _compute_scaling_score(1.0)
        assert score == score_one


def test_confidence_weighted_combination():
    """Test that confidence score is correct weighted combination of components."""
    result = compute_confidence(
        top_similarity=0.80,
        candidate_similarities=[0.80, 0.75, 0.70],
        candidate_calories=[350, 380, 360],
        target_calories=500,
        scaling_factor=1.43
    )
    
    # Manually compute weighted sum
    sim_score = result.breakdown["similarity_score"]
    con_score = result.breakdown["consistency_score"]
    scl_score = result.breakdown["scaling_score"]
    
    expected_score = 0.50 * sim_score + 0.30 * con_score + 0.20 * scl_score
    
    # Should match (within floating point tolerance)
    assert abs(result.score - expected_score) < 0.01


def test_confidence_result_structure():
    """Test that ConfidenceResult has all required fields."""
    result = compute_confidence(
        top_similarity=0.75,
        candidate_similarities=[0.75, 0.70],
        candidate_calories=[400, 420],
        target_calories=500,
        scaling_factor=1.25
    )
    
    # Check all fields present
    assert hasattr(result, "score")
    assert hasattr(result, "tier")
    assert hasattr(result, "explanation")
    assert hasattr(result, "breakdown")
    
    # Check breakdown has all components
    assert "similarity_score" in result.breakdown
    assert "consistency_score" in result.breakdown
    assert "scaling_score" in result.breakdown
    assert "raw_similarity" in result.breakdown
    assert "scaling_factor" in result.breakdown


if __name__ == "__main__":
    print("=" * 70)
    print("CONFIDENCE BOUNDS TESTS")
    print("=" * 70)
    
    test_suite = TestConfidenceBounds()
    component_suite = TestComponentScoreFunctions()
    
    tests = [
        ("Perfect scenario", test_suite.test_perfect_scenario_high_confidence),
        ("Worst scenario", test_suite.test_worst_scenario_low_confidence),
        ("Medium confidence", test_suite.test_medium_confidence_scenario),
        ("Extreme similarities", test_suite.test_extreme_similarity_values),
        ("Single candidate", test_suite.test_single_candidate),
        ("Zero variance", test_suite.test_zero_variance_perfect_consistency),
        ("Extreme variance", test_suite.test_extreme_variance_low_consistency),
        ("All components bounded", test_suite.test_all_component_scores_bounded),
        ("Tier thresholds", test_suite.test_tier_thresholds),
        ("Explanation not empty", test_suite.test_explanation_not_empty),
        ("Similarity score bounds", component_suite.test_similarity_score_bounds),
        ("Consistency score bounds", component_suite.test_consistency_score_bounds),
        ("Scaling score bounds", component_suite.test_scaling_score_bounds),
        ("Scaling None handling", component_suite.test_scaling_score_none_handling),
    ]
    
    passed = 0
    failed = 0
    
    for test_name, test_func in tests:
        try:
            print(f"\n✓ Testing: {test_name}")
            test_func()
            print(f"  ✅ PASSED")
            passed += 1
        except AssertionError as e:
            print(f"  ❌ FAILED: {str(e)}")
            failed += 1
        except Exception as e:
            print(f"  ⚠️  ERROR: {str(e)}")
            failed += 1
    
    # Additional tests
    try:
        print(f"\n✓ Testing: Weighted combination")
        test_confidence_weighted_combination()
        print(f"  ✅ PASSED")
        passed += 1
    except Exception as e:
        print(f"  ❌ FAILED: {str(e)}")
        failed += 1
    
    try:
        print(f"\n✓ Testing: Result structure")
        test_confidence_result_structure()
        print(f"  ✅ PASSED")
        passed += 1
    except Exception as e:
        print(f"  ❌ FAILED: {str(e)}")
        failed += 1
    
    print("\n" + "=" * 70)
    print(f"RESULTS: {passed} passed, {failed} failed")
    print("=" * 70)
