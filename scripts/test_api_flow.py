# Quick API Test Script
# Run with: python test_api_flow.py

import requests
import json

BASE_URL = "http://localhost:8000"

def test_health():
    """Test GET /health endpoint"""
    print("=" * 60)
    print("TEST 1: Health Check")
    print("=" * 60)
    
    response = requests.get(f"{BASE_URL}/health")
    print(f"Status Code: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
    
    assert response.status_code == 200, "Health check failed"
    data = response.json()
    assert "status" in data, "Missing 'status' field"
    assert data["status"] == "ok", "Status not 'ok'"
    print("✅ PASSED\n")


def test_label_basic():
    """Test POST /label with dish_name only"""
    print("=" * 60)
    print("TEST 2: Basic Label Request (dish_name only)")
    print("=" * 60)
    
    payload = {
        "dish_name": "chicken tikka masala"
    }
    
    print(f"Request: {json.dumps(payload, indent=2)}")
    response = requests.post(f"{BASE_URL}/label", json=payload)
    print(f"Status Code: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
    
    assert response.status_code == 200, "Label request failed"
    data = response.json()
    
    # Validate response structure
    assert "matched_dish" in data, "Missing 'matched_dish'"
    assert "nutrition" in data, "Missing 'nutrition'"
    assert "confidence" in data, "Missing 'confidence'"
    assert "explanation" in data, "Missing 'explanation'"
    
    # Validate nutrition dict
    nutrition = data["nutrition"]
    assert "calories" in nutrition, "Missing 'calories'"
    assert "protein_g" in nutrition, "Missing 'protein_g'"
    assert "carbs_g" in nutrition, "Missing 'carbs_g'"
    assert "fat_g" in nutrition, "Missing 'fat_g'"
    assert "sugar_g" in nutrition, "Missing 'sugar_g'"
    assert "fiber_g" in nutrition, "Missing 'fiber_g'"
    assert "sodium_mg" in nutrition, "Missing 'sodium_mg'"
    assert "potassium_mg" in nutrition, "Missing 'potassium_mg'"
    
    # Validate confidence range
    assert 0.0 <= data["confidence"] <= 1.0, "Confidence out of range"
    
    print("✅ PASSED\n")


def test_label_with_target_calories():
    """Test POST /label with target_calories"""
    print("=" * 60)
    print("TEST 3: Label Request with Target Calories")
    print("=" * 60)
    
    payload = {
        "dish_name": "grilled salmon",
        "target_calories": 400
    }
    
    print(f"Request: {json.dumps(payload, indent=2)}")
    response = requests.post(f"{BASE_URL}/label", json=payload)
    print(f"Status Code: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
    
    assert response.status_code == 200, "Label request failed"
    data = response.json()
    
    # Should scale to approximately 400 calories
    calories = data["nutrition"]["calories"]
    assert 380 <= calories <= 420, f"Calories not scaled correctly: {calories}"
    
    print("✅ PASSED\n")


def test_label_with_style():
    """Test POST /label with style hint"""
    print("=" * 60)
    print("TEST 4: Label Request with Style")
    print("=" * 60)
    
    payload = {
        "dish_name": "burger",
        "target_calories": 800,
        "style": "restaurant"
    }
    
    print(f"Request: {json.dumps(payload, indent=2)}")
    response = requests.post(f"{BASE_URL}/label", json=payload)
    print(f"Status Code: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
    
    assert response.status_code == 200, "Label request failed"
    print("✅ PASSED\n")


def test_label_404():
    """Test POST /label with no matching dish"""
    print("=" * 60)
    print("TEST 5: No Match (404)")
    print("=" * 60)
    
    payload = {
        "dish_name": "xyznotarealdish12345"
    }
    
    print(f"Request: {json.dumps(payload, indent=2)}")
    response = requests.post(f"{BASE_URL}/label", json=payload)
    print(f"Status Code: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
    
    assert response.status_code == 404, "Should return 404 for no match"
    data = response.json()
    assert "detail" in data, "Missing 'detail' field"
    assert data["detail"] == "No matching dish found", "Wrong error message"
    
    print("✅ PASSED\n")


def test_label_validation_error():
    """Test POST /label with invalid input"""
    print("=" * 60)
    print("TEST 6: Validation Error (422)")
    print("=" * 60)
    
    payload = {
        "dish_name": ""  # Empty string (< 2 chars)
    }
    
    print(f"Request: {json.dumps(payload, indent=2)}")
    response = requests.post(f"{BASE_URL}/label", json=payload)
    print(f"Status Code: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
    
    assert response.status_code == 422, "Should return 422 for validation error"
    
    print("✅ PASSED\n")


def main():
    print("\n" + "=" * 60)
    print("NutriLabelAI API End-to-End Tests")
    print("=" * 60 + "\n")
    
    try:
        test_health()
        test_label_basic()
        test_label_with_target_calories()
        test_label_with_style()
        test_label_404()
        test_label_validation_error()
        
        print("=" * 60)
        print("✅ ALL TESTS PASSED!")
        print("=" * 60)
        
    except AssertionError as e:
        print(f"\n❌ TEST FAILED: {e}")
        return 1
    except requests.exceptions.ConnectionError:
        print(f"\n❌ CONNECTION ERROR: Is the backend running at {BASE_URL}?")
        print("   Start with: uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload")
        return 1
    except Exception as e:
        print(f"\n❌ UNEXPECTED ERROR: {e}")
        return 1
    
    return 0


if __name__ == "__main__":
    exit(main())
