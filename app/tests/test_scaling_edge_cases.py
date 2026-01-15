"""
Scaling Service Edge Case Tests

Focused tests for boundary conditions and extreme scenarios.
"""

import pytest
from app.services.scaling_service import scale_nutrients
from app.schemas.label import Nutrients


class TestScalingEdgeCases:
    """Test suite for scaling_service edge cases."""
    
    def test_no_scaling_factor_one(self):
        """Test that scaling factor of 1.0 preserves nutrients exactly."""
        base = Nutrients(
            calories=300.0,
            protein_g=25.0,
            carbs_g=30.0,
            fat_g=10.0,
            fiber_g=5.0,
            sugar_g=8.0,
            sodium_mg=600.0
        )
        
        # Scale to same calories (factor = 1.0)
        scaled = scale_nutrients(base, target_calories=300.0, clamp=True)
        
        assert scaled.calories == base.calories
        assert scaled.protein_g == base.protein_g
        assert scaled.carbs_g == base.carbs_g
        assert scaled.fat_g == base.fat_g
        assert scaled.fiber_g == base.fiber_g
        assert scaled.sugar_g == base.sugar_g
        assert scaled.sodium_mg == base.sodium_mg
    
    def test_extreme_downscaling_clamped(self):
        """Test that extreme downscaling is clamped to 0.1x minimum."""
        base = Nutrients(
            calories=1000.0,
            protein_g=50.0,
            carbs_g=100.0,
            fat_g=30.0,
            fiber_g=10.0,
            sugar_g=20.0,
            sodium_mg=1500.0
        )
        
        # Try to scale to 1 calorie (would be 0.001x without clamping)
        scaled = scale_nutrients(base, target_calories=1.0, clamp=True)
        
        # Should be clamped to 0.1x = 100 calories
        assert scaled.calories == pytest.approx(100.0, rel=0.01)
        assert scaled.protein_g == pytest.approx(5.0, rel=0.01)  # 50 * 0.1
        assert scaled.carbs_g == pytest.approx(10.0, rel=0.01)   # 100 * 0.1
    
    def test_extreme_upscaling_clamped(self):
        """Test that extreme upscaling is clamped to 10x maximum."""
        base = Nutrients(
            calories=100.0,
            protein_g=10.0,
            carbs_g=15.0,
            fat_g=3.0,
            fiber_g=2.0,
            sugar_g=5.0,
            sodium_mg=200.0
        )
        
        # Try to scale to 50000 calories (would be 500x without clamping)
        scaled = scale_nutrients(base, target_calories=50000.0, clamp=True)
        
        # Should be clamped to 10x = 1000 calories
        assert scaled.calories == pytest.approx(1000.0, rel=0.01)
        assert scaled.protein_g == pytest.approx(100.0, rel=0.01)  # 10 * 10
        assert scaled.fat_g == pytest.approx(30.0, rel=0.01)       # 3 * 10
    
    def test_zero_base_calories_raises_error(self):
        """Test that zero base calories raises ValueError."""
        base = Nutrients(
            calories=0.0,  # Invalid
            protein_g=0.0,
            carbs_g=0.0,
            fat_g=0.0,
            fiber_g=0.0,
            sugar_g=0.0,
            sodium_mg=0.0
        )
        
        with pytest.raises(ValueError, match="calories"):
            scale_nutrients(base, target_calories=500.0, clamp=True)
    
    def test_negative_target_calories_raises_error(self):
        """Test that negative target calories raises ValueError."""
        base = Nutrients(
            calories=300.0,
            protein_g=25.0,
            carbs_g=30.0,
            fat_g=10.0,
            fiber_g=5.0,
            sugar_g=8.0,
            sodium_mg=600.0
        )
        
        with pytest.raises(ValueError, match="positive"):
            scale_nutrients(base, target_calories=-100.0, clamp=True)
    
    def test_proportional_scaling_maintained(self):
        """Test that nutrient proportions are maintained during scaling."""
        base = Nutrients(
            calories=400.0,
            protein_g=30.0,
            carbs_g=40.0,
            fat_g=15.0,
            fiber_g=8.0,
            sugar_g=12.0,
            sodium_mg=800.0
        )
        
        # Scale up by 2x
        scaled = scale_nutrients(base, target_calories=800.0, clamp=True)
        
        # Check proportions maintained
        base_protein_ratio = base.protein_g / base.calories
        scaled_protein_ratio = scaled.protein_g / scaled.calories
        assert base_protein_ratio == pytest.approx(scaled_protein_ratio, rel=0.01)
        
        base_carb_ratio = base.carbs_g / base.calories
        scaled_carb_ratio = scaled.carbs_g / scaled.calories
        assert base_carb_ratio == pytest.approx(scaled_carb_ratio, rel=0.01)
    
    def test_unclamped_scaling_extreme_values(self):
        """Test unclamped scaling allows extreme values."""
        base = Nutrients(
            calories=100.0,
            protein_g=10.0,
            carbs_g=15.0,
            fat_g=3.0,
            fiber_g=2.0,
            sugar_g=5.0,
            sodium_mg=200.0
        )
        
        # Scale to 20000 calories without clamping (200x)
        scaled = scale_nutrients(base, target_calories=20000.0, clamp=False)
        
        # Should be exactly 200x
        assert scaled.calories == pytest.approx(20000.0, rel=0.01)
        assert scaled.protein_g == pytest.approx(2000.0, rel=0.01)  # 10 * 200
    
    def test_very_small_portions(self):
        """Test scaling for very small portions (e.g., condiments)."""
        base = Nutrients(
            calories=50.0,
            protein_g=1.0,
            carbs_g=5.0,
            fat_g=3.0,
            fiber_g=0.5,
            sugar_g=2.0,
            sodium_mg=300.0
        )
        
        # Scale down to 10 calories (0.2x)
        scaled = scale_nutrients(base, target_calories=10.0, clamp=True)
        
        assert scaled.calories == pytest.approx(10.0, rel=0.01)
        assert scaled.protein_g == pytest.approx(0.2, rel=0.01)
        assert scaled.sodium_mg == pytest.approx(60.0, rel=0.01)
    
    def test_realistic_meal_scaling(self):
        """Test realistic meal scaling scenario."""
        # Base: Standard chicken breast (165 calories)
        base = Nutrients(
            calories=165.0,
            protein_g=31.0,
            carbs_g=0.0,
            fat_g=3.6,
            fiber_g=0.0,
            sugar_g=0.0,
            sodium_mg=74.0
        )
        
        # Scale to 400-calorie meal (2.42x)
        scaled = scale_nutrients(base, target_calories=400.0, clamp=True)
        
        assert scaled.calories == pytest.approx(400.0, rel=0.01)
        assert scaled.protein_g == pytest.approx(75.0, rel=0.1)  # High protein maintained
        assert scaled.carbs_g == 0.0  # Zero stays zero
        assert scaled.fat_g > 0  # Fat scales proportionally
    
    def test_floating_point_precision(self):
        """Test that floating point errors don't accumulate significantly."""
        base = Nutrients(
            calories=333.33,
            protein_g=22.22,
            carbs_g=44.44,
            fat_g=11.11,
            fiber_g=5.55,
            sugar_g=8.88,
            sodium_mg=666.66
        )
        
        # Scale to precise value
        scaled = scale_nutrients(base, target_calories=500.0, clamp=True)
        
        # Target should be exact
        assert scaled.calories == pytest.approx(500.0, rel=1e-6)
        
        # Other nutrients should maintain proportion
        ratio = 500.0 / 333.33
        assert scaled.protein_g == pytest.approx(22.22 * ratio, rel=1e-4)


def test_scaling_factor_calculation():
    """Test that scaling factors are computed correctly."""
    from app.services.scaling_service import compute_scaling_factor
    
    # Normal scaling
    assert compute_scaling_factor(300.0, 600.0, clamp=True) == pytest.approx(2.0)
    assert compute_scaling_factor(400.0, 200.0, clamp=True) == pytest.approx(0.5)
    
    # Extreme scaling with clamping
    assert compute_scaling_factor(100.0, 5000.0, clamp=True) == pytest.approx(10.0)  # Clamped
    assert compute_scaling_factor(1000.0, 10.0, clamp=True) == pytest.approx(0.1)     # Clamped
    
    # Extreme scaling without clamping
    assert compute_scaling_factor(100.0, 5000.0, clamp=False) == pytest.approx(50.0)
    assert compute_scaling_factor(1000.0, 10.0, clamp=False) == pytest.approx(0.01)


if __name__ == "__main__":
    print("=" * 70)
    print("SCALING EDGE CASE TESTS")
    print("=" * 70)
    
    test_suite = TestScalingEdgeCases()
    
    tests = [
        ("No scaling (factor=1.0)", test_suite.test_no_scaling_factor_one),
        ("Extreme downscaling (clamped)", test_suite.test_extreme_downscaling_clamped),
        ("Extreme upscaling (clamped)", test_suite.test_extreme_upscaling_clamped),
        ("Zero base calories error", test_suite.test_zero_base_calories_raises_error),
        ("Negative target error", test_suite.test_negative_target_calories_raises_error),
        ("Proportional scaling", test_suite.test_proportional_scaling_maintained),
        ("Unclamped extreme", test_suite.test_unclamped_scaling_extreme_values),
        ("Very small portions", test_suite.test_very_small_portions),
        ("Realistic meal scaling", test_suite.test_realistic_meal_scaling),
        ("Floating point precision", test_suite.test_floating_point_precision),
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
    
    try:
        print(f"\n✓ Testing: Scaling factor calculation")
        test_scaling_factor_calculation()
        print(f"  ✅ PASSED")
        passed += 1
    except Exception as e:
        print(f"  ❌ FAILED: {str(e)}")
        failed += 1
    
    print("\n" + "=" * 70)
    print(f"RESULTS: {passed} passed, {failed} failed")
    print("=" * 70)
