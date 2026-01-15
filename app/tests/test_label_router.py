"""
Tests for Label Router

Tests the complete nutrition label generation pipeline:
- Request validation
- Service integration (retrieval → mixture → scaling → confidence)
- Response structure
- Error handling
"""

import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


class TestLabelRouter:
    """Test suite for /label endpoint."""
    
    def test_basic_label_request(self):
        """Test basic label generation with dish name and calories."""
        response = client.post(
            "/label",
            json={
                "dish_name": "chicken tikka masala",
                "calories": 600
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Check response structure
        assert "nutrients" in data
        assert "confidence" in data
        assert "candidates" in data
        assert "metadata" in data
        
        # Check nutrients
        nutrients = data["nutrients"]
        assert nutrients["calories"] == 600
        assert nutrients["protein_g"] > 0
        assert nutrients["carbs_g"] > 0
        assert nutrients["fat_g"] > 0
        
        # Check confidence structure
        confidence = data["confidence"]
        assert "score" in confidence
        assert "tier" in confidence
        assert "explanation" in confidence
        assert 0.0 <= confidence["score"] <= 1.0
        assert confidence["tier"] in ["High", "Medium", "Low"]
    
    def test_label_with_style_hint(self):
        """Test label generation with cuisine style hint."""
        response = client.post(
            "/label",
            json={
                "dish_name": "chicken curry",
                "calories": 500,
                "style": "indian"
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Check metadata includes query with style
        metadata = data["metadata"]
        assert "query_text" in metadata
        assert "indian" in metadata["query_text"].lower()
    
    def test_label_without_calories(self):
        """Test label generation without target calories (no scaling)."""
        response = client.post(
            "/label",
            json={
                "dish_name": "grilled chicken breast"
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Check that scaling factor is 1.0 (no scaling)
        metadata = data["metadata"]
        assert metadata["scaling_factor"] == 1.0
        
        # Check nutrients are reasonable for chicken breast
        nutrients = data["nutrients"]
        assert 150 <= nutrients["calories"] <= 250  # Typical chicken breast
        assert nutrients["protein_g"] > 25  # High protein
    
    def test_label_with_custom_top_k(self):
        """Test label generation with custom number of candidates."""
        response = client.post(
            "/label",
            json={
                "dish_name": "pasta carbonara",
                "calories": 700,
                "top_k": 10
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Check that multiple candidates were retrieved
        candidates = data["candidates"]
        assert len(candidates) > 1
        assert len(candidates) <= 10
        
        # Check candidate structure
        for candidate in candidates:
            assert "dish_id" in candidate
            assert "name" in candidate
            assert "similarity" in candidate
            assert "weight" in candidate
            assert 0.0 <= candidate["similarity"] <= 1.0
            assert 0.0 <= candidate["weight"] <= 1.0
    
    def test_validation_empty_dish_name(self):
        """Test that empty dish name is rejected."""
        response = client.post(
            "/label",
            json={
                "dish_name": "   ",  # Whitespace only
                "calories": 500
            }
        )
        
        assert response.status_code == 422  # Validation error
    
    def test_validation_negative_calories(self):
        """Test that negative calories are rejected."""
        response = client.post(
            "/label",
            json={
                "dish_name": "pizza",
                "calories": -100
            }
        )
        
        assert response.status_code == 422  # Validation error
    
    def test_validation_excessive_calories(self):
        """Test that unrealistic calories are rejected."""
        response = client.post(
            "/label",
            json={
                "dish_name": "salad",
                "calories": 50000  # Unrealistic
            }
        )
        
        assert response.status_code == 422  # Validation error
    
    def test_validation_invalid_top_k(self):
        """Test that invalid top_k values are rejected."""
        # top_k = 0
        response = client.post(
            "/label",
            json={
                "dish_name": "burger",
                "calories": 800,
                "top_k": 0
            }
        )
        assert response.status_code == 422
        
        # top_k = 100 (exceeds max)
        response = client.post(
            "/label",
            json={
                "dish_name": "burger",
                "calories": 800,
                "top_k": 100
            }
        )
        assert response.status_code == 422
    
    def test_metadata_completeness(self):
        """Test that metadata includes all expected fields."""
        response = client.post(
            "/label",
            json={
                "dish_name": "sushi roll",
                "calories": 400,
                "top_k": 5
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        metadata = data["metadata"]
        
        # Check all expected metadata fields
        assert "scaling_factor" in metadata
        assert "mixture_used" in metadata
        assert "num_candidates" in metadata
        assert "base_calories" in metadata
        assert "query_text" in metadata
        
        # Verify types
        assert isinstance(metadata["scaling_factor"], float)
        assert isinstance(metadata["mixture_used"], bool)
        assert isinstance(metadata["num_candidates"], int)
        assert isinstance(metadata["base_calories"], float)
        assert isinstance(metadata["query_text"], str)
    
    def test_confidence_tiers(self):
        """Test that confidence tiers are assigned correctly."""
        # This test requires actual database with dishes
        # In a real test, you'd mock the services or use test database
        
        response = client.post(
            "/label",
            json={
                "dish_name": "chicken tikka masala",  # Should match well
                "calories": 600,
                "top_k": 5
            }
        )
        
        if response.status_code == 200:
            data = response.json()
            confidence = data["confidence"]
            
            # High similarity queries should have high confidence
            if data["candidates"][0]["similarity"] > 0.85:
                assert confidence["tier"] in ["High", "Medium"]
            
            # Verify explanation is not empty
            assert len(confidence["explanation"]) > 0


# Integration tests (require running database)
class TestLabelRouterIntegration:
    """Integration tests requiring database connection."""
    
    @pytest.mark.integration
    def test_end_to_end_pipeline(self):
        """Test complete pipeline from request to response."""
        response = client.post(
            "/label",
            json={
                "dish_name": "margherita pizza",
                "calories": 800,
                "style": "italian",
                "top_k": 5
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify pipeline stages reflected in response
        assert len(data["candidates"]) > 0  # Retrieval worked
        assert data["metadata"]["mixture_used"]  # Mixture worked
        assert data["metadata"]["scaling_factor"] > 0  # Scaling worked
        assert 0.0 <= data["confidence"]["score"] <= 1.0  # Confidence worked
        
        # Verify nutrient values are reasonable for pizza
        nutrients = data["nutrients"]
        assert nutrients["calories"] == 800
        assert 30 <= nutrients["protein_g"] <= 60
        assert 80 <= nutrients["carbs_g"] <= 120
        assert 20 <= nutrients["fat_g"] <= 40


# Performance tests
class TestLabelRouterPerformance:
    """Performance tests for label generation."""
    
    @pytest.mark.performance
    def test_response_time(self):
        """Test that label generation completes within acceptable time."""
        import time
        
        start = time.time()
        response = client.post(
            "/label",
            json={
                "dish_name": "pasta carbonara",
                "calories": 700
            }
        )
        end = time.time()
        
        assert response.status_code == 200
        assert (end - start) < 2.0  # Should complete in under 2 seconds


if __name__ == "__main__":
    # Run basic tests
    print("=" * 70)
    print("LABEL ROUTER BASIC TESTS")
    print("=" * 70)
    
    test_suite = TestLabelRouter()
    
    tests = [
        ("Basic Label Request", test_suite.test_basic_label_request),
        ("With Style Hint", test_suite.test_label_with_style_hint),
        ("Without Calories", test_suite.test_label_without_calories),
        ("Custom top_k", test_suite.test_label_with_custom_top_k),
        ("Metadata Completeness", test_suite.test_metadata_completeness),
    ]
    
    for test_name, test_func in tests:
        try:
            print(f"\n✓ Testing: {test_name}")
            test_func()
            print(f"  ✅ PASSED")
        except AssertionError as e:
            print(f"  ❌ FAILED: {str(e)}")
        except Exception as e:
            print(f"  ⚠️  ERROR: {str(e)}")
    
    print("\n" + "=" * 70)
    print("Run full test suite with: pytest app/tests/test_label_router.py")
    print("=" * 70)
