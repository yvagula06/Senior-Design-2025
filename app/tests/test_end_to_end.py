"""
End-to-End Test for /label Endpoint

Minimal but meaningful test that validates the complete pipeline:
retrieval → mixture → scaling → confidence
"""

import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_label_endpoint_end_to_end():
    """
    End-to-end test: Validates full pipeline with real request.
    
    Tests:
    - Request validation and parsing
    - Service integration (retrieval → mixture → scaling → confidence)
    - Response structure and types
    - Nutritional value reasonableness
    - Confidence scoring bounds
    - Metadata completeness
    
    This single test covers the critical path through the entire system.
    """
    # Arrange: Create a realistic request
    request_data = {
        "dish_name": "grilled chicken breast with vegetables",
        "calories": 400,
        "style": "healthy",
        "top_k": 5
    }
    
    # Act: Send request to /label endpoint
    response = client.post("/label", json=request_data)
    
    # Assert: Response structure
    assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
    data = response.json()
    
    # Assert: Top-level keys present
    assert "nutrients" in data, "Response missing 'nutrients'"
    assert "confidence" in data, "Response missing 'confidence'"
    assert "candidates" in data, "Response missing 'candidates'"
    assert "metadata" in data, "Response missing 'metadata'"
    
    # Assert: Nutrients structure
    nutrients = data["nutrients"]
    required_nutrients = ["calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "sugar_g", "sodium_mg"]
    for nutrient in required_nutrients:
        assert nutrient in nutrients, f"Missing nutrient: {nutrient}"
        assert nutrients[nutrient] >= 0, f"{nutrient} cannot be negative"
    
    # Assert: Calorie matching (should match request or be reasonable)
    if request_data.get("calories"):
        assert abs(nutrients["calories"] - request_data["calories"]) < 1.0, \
            "Scaled calories don't match target"
    
    # Assert: Macros are reasonable for protein-rich dish
    # Chicken breast should have high protein ratio
    protein_calories = nutrients["protein_g"] * 4
    total_calories = nutrients["calories"]
    protein_ratio = protein_calories / total_calories
    assert protein_ratio > 0.15, "Protein ratio too low for chicken dish"
    
    # Assert: Confidence structure
    confidence = data["confidence"]
    assert "score" in confidence
    assert "tier" in confidence
    assert "explanation" in confidence
    
    # Assert: Confidence bounds
    assert 0.0 <= confidence["score"] <= 1.0, f"Confidence score {confidence['score']} out of bounds"
    assert confidence["tier"] in ["High", "Medium", "Low"], f"Invalid tier: {confidence['tier']}"
    assert len(confidence["explanation"]) > 0, "Explanation is empty"
    
    # Assert: Candidates structure
    candidates = data["candidates"]
    assert len(candidates) > 0, "No candidates returned"
    assert len(candidates) <= request_data["top_k"], "Too many candidates returned"
    
    for candidate in candidates:
        assert "dish_id" in candidate
        assert "name" in candidate
        assert "similarity" in candidate
        assert "weight" in candidate
        assert 0.0 <= candidate["similarity"] <= 1.0, "Similarity out of bounds"
        assert 0.0 <= candidate["weight"] <= 1.0, "Weight out of bounds"
    
    # Assert: Weights sum to approximately 1.0
    total_weight = sum(c["weight"] for c in candidates)
    assert abs(total_weight - 1.0) < 0.01, f"Weights sum to {total_weight}, expected ~1.0"
    
    # Assert: Metadata completeness
    metadata = data["metadata"]
    required_metadata = ["scaling_factor", "mixture_used", "num_candidates", "base_calories", "query_text"]
    for key in required_metadata:
        assert key in metadata, f"Missing metadata: {key}"
    
    # Assert: Metadata values reasonable
    assert metadata["scaling_factor"] > 0, "Scaling factor must be positive"
    assert metadata["num_candidates"] == len(candidates), "Candidate count mismatch"
    assert metadata["base_calories"] > 0, "Base calories must be positive"
    assert "grilled chicken" in metadata["query_text"].lower() or \
           "chicken" in metadata["query_text"].lower(), \
           "Query text doesn't contain dish name"
    
    # Assert: Candidates sorted by similarity (descending)
    similarities = [c["similarity"] for c in candidates]
    assert similarities == sorted(similarities, reverse=True), "Candidates not sorted by similarity"
    
    print("\n✅ End-to-end test PASSED")
    print(f"   Dish: {request_data['dish_name']}")
    print(f"   Calories: {nutrients['calories']}")
    print(f"   Protein: {nutrients['protein_g']}g")
    print(f"   Confidence: {confidence['score']:.3f} ({confidence['tier']})")
    print(f"   Candidates: {len(candidates)}")
    print(f"   Top match: {candidates[0]['name']} (sim: {candidates[0]['similarity']:.3f})")


def test_label_endpoint_without_calories():
    """
    Test /label without target calories (no scaling applied).
    
    Validates that:
    - Calories is truly optional
    - Scaling factor is 1.0
    - Response structure is consistent
    """
    request_data = {
        "dish_name": "chicken tikka masala"
    }
    
    response = client.post("/label", json=request_data)
    
    assert response.status_code == 200
    data = response.json()
    
    # Should have no scaling
    metadata = data["metadata"]
    assert metadata["scaling_factor"] == 1.0, "Should have no scaling when calories not provided"
    
    # Calories should be reasonable for typical serving
    nutrients = data["nutrients"]
    assert 200 <= nutrients["calories"] <= 800, "Unscaled calories seem unreasonable"
    
    print("\n✅ No-scaling test PASSED")
    print(f"   Unscaled calories: {nutrients['calories']}")
    print(f"   Scaling factor: {metadata['scaling_factor']}")


def test_label_endpoint_with_style_hint():
    """
    Test that style hints enhance retrieval quality.
    
    Validates:
    - Style is incorporated into query
    - Metadata reflects enhanced query
    """
    # Test with style hint
    request_with_style = {
        "dish_name": "curry",
        "calories": 500,
        "style": "indian"
    }
    
    response = client.post("/label", json=request_with_style)
    assert response.status_code == 200
    
    data = response.json()
    metadata = data["metadata"]
    
    # Query text should include style
    assert "indian" in metadata["query_text"].lower(), "Style hint not in query"
    
    # Test without style hint
    request_without_style = {
        "dish_name": "curry",
        "calories": 500
    }
    
    response2 = client.post("/label", json=request_without_style)
    assert response2.status_code == 200
    
    data2 = response2.json()
    metadata2 = data2["metadata"]
    
    # Should not have style prefix
    assert metadata2["query_text"] == "curry", "Query should not have style prefix"
    
    print("\n✅ Style hint test PASSED")
    print(f"   With style: {metadata['query_text']}")
    print(f"   Without style: {metadata2['query_text']}")


def test_label_endpoint_validation_errors():
    """
    Test that invalid requests are properly rejected.
    
    Validates Pydantic validation layer.
    """
    invalid_requests = [
        # Empty dish name
        {"dish_name": "   ", "calories": 500},
        # Negative calories
        {"dish_name": "pizza", "calories": -100},
        # Excessive calories
        {"dish_name": "salad", "calories": 50000},
        # Invalid top_k
        {"dish_name": "burger", "calories": 800, "top_k": 0},
        {"dish_name": "burger", "calories": 800, "top_k": 100},
    ]
    
    for i, request_data in enumerate(invalid_requests):
        response = client.post("/label", json=request_data)
        assert response.status_code == 422, \
            f"Request {i} should be rejected with 422, got {response.status_code}"
    
    print(f"\n✅ Validation test PASSED ({len(invalid_requests)} invalid requests rejected)")


if __name__ == "__main__":
    # Run tests directly
    print("=" * 70)
    print("END-TO-END TESTS")
    print("=" * 70)
    
    try:
        test_label_endpoint_end_to_end()
    except AssertionError as e:
        print(f"❌ End-to-end test failed: {e}")
    
    try:
        test_label_endpoint_without_calories()
    except AssertionError as e:
        print(f"❌ No-scaling test failed: {e}")
    
    try:
        test_label_endpoint_with_style_hint()
    except AssertionError as e:
        print(f"❌ Style hint test failed: {e}")
    
    try:
        test_label_endpoint_validation_errors()
    except AssertionError as e:
        print(f"❌ Validation test failed: {e}")
    
    print("\n" + "=" * 70)
