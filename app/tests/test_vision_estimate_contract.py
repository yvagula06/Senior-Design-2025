"""
Test: Vision Estimate Contract

Validates that POST /vision/estimate response matches the locked schema.
Tests required fields, data types, and value constraints.
"""

import pytest
from fastapi.testclient import TestClient
from app.main import app


client = TestClient(app)


def get_sample_request(mode="single"):
    """Generate sample VisionRequest payloads."""
    base_request = {
        "images": [
            {
                "data": "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
                "angle": "top",
                "timestamp": "2026-01-20T10:30:00Z"
            }
        ],
        "metadata": {
            "device_type": "ios",
            "capture_mode": "single",
            "device_model": "iPhone 14 Pro"
        }
    }
    
    if mode == "multi_angle":
        base_request["images"].append({
            "data": "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
            "angle": "side",
            "timestamp": "2026-01-20T10:30:05Z"
        })
        base_request["metadata"]["capture_mode"] = "multi_angle"
    
    elif mode == "depth":
        base_request["depth_data"] = {
            "depth_map": "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
            "format": "png_16bit",
            "scale": 0.001
        }
        base_request["camera_intrinsics"] = {
            "focal_length_x": 1000.0,
            "focal_length_y": 1000.0,
            "principal_point_x": 320.0,
            "principal_point_y": 240.0,
            "image_width": 640,
            "image_height": 480
        }
        base_request["metadata"]["capture_mode"] = "depth"
    
    return base_request


class TestVisionEstimateContract:
    """Test vision estimate endpoint contract compliance."""
    
    def test_endpoint_exists_and_returns_200(self):
        """Test that POST /vision/estimate endpoint returns 200 for valid request."""
        response = client.post("/vision/estimate", json=get_sample_request())
        assert response.status_code == 200, "Endpoint should return 200 for valid request"
    
    def test_response_has_required_fields(self):
        """Test that response contains all required fields."""
        response = client.post("/vision/estimate", json=get_sample_request())
        assert response.status_code == 200
        
        data = response.json()
        
        # Required top-level fields
        assert "dish_predictions" in data
        assert "selected_dish" in data
        assert "calorie_estimate" in data
        assert "estimation_mode" in data
        assert "accuracy_score" in data
        assert "suggested_meal_log" in data
    
    def test_dish_predictions_structure(self):
        """Test dish_predictions array structure."""
        response = client.post("/vision/estimate", json=get_sample_request())
        assert response.status_code == 200
        
        data = response.json()
        predictions = data["dish_predictions"]
        
        assert isinstance(predictions, list)
        assert len(predictions) > 0, "Should return at least one prediction"
        
        # Check first prediction structure
        pred = predictions[0]
        assert "dish_id" in pred
        assert "dish_name" in pred
        assert "confidence" in pred
        
        # Validate confidence range
        assert 0.0 <= pred["confidence"] <= 1.0
    
    def test_selected_dish_structure(self):
        """Test selected_dish object structure."""
        response = client.post("/vision/estimate", json=get_sample_request())
        assert response.status_code == 200
        
        data = response.json()
        selected = data["selected_dish"]
        
        assert "dish_id" in selected
        assert "dish_name" in selected
        assert "confidence" in selected
        assert 0.0 <= selected["confidence"] <= 1.0
    
    def test_calorie_estimate_structure(self):
        """Test calorie_estimate object structure."""
        response = client.post("/vision/estimate", json=get_sample_request())
        assert response.status_code == 200
        
        data = response.json()
        calorie = data["calorie_estimate"]
        
        assert "value" in calorie
        assert "range" in calorie
        assert "unit" in calorie
        
        # Check range structure
        assert "min" in calorie["range"]
        assert "max" in calorie["range"]
        
        # Validate range constraints (non-negative, proper ordering)
        assert calorie["value"] >= 0, "Calorie value must be non-negative"
        assert calorie["range"]["min"] >= 0, "Calorie min must be non-negative"
        assert calorie["range"]["min"] <= calorie["value"], "Min should be <= value"
        assert calorie["value"] <= calorie["range"]["max"], "Value should be <= max"
        assert calorie["range"]["max"] >= calorie["range"]["min"], "Max must be >= min"
        assert calorie["unit"] == "kcal"
    
    def test_volume_estimate_when_present(self):
        """Test volume_estimate structure when present."""
        response = client.post("/vision/estimate", json=get_sample_request())
        assert response.status_code == 200
        
        data = response.json()
        
        if "volume_estimate" in data and data["volume_estimate"]:
            volume = data["volume_estimate"]
            assert "value" in volume
            assert "unit" in volume
            assert "confidence" in volume
            assert volume["value"] > 0
            assert 0.0 <= volume["confidence"] <= 1.0
    
    def test_estimation_mode_values(self):
        """Test estimation_mode is valid enum value."""
        response = client.post("/vision/estimate", json=get_sample_request())
        assert response.status_code == 200
        
        data = response.json()
        mode = data["estimation_mode"]
        
        assert mode in ["depth", "multi_angle", "reference_based"]
    
    def test_accuracy_score_range(self):
        """Test accuracy_score is in valid range [0, 1]."""
        response = client.post("/vision/estimate", json=get_sample_request())
        assert response.status_code == 200
        
        data = response.json()
        accuracy = data["accuracy_score"]
        
        assert 0.0 <= accuracy <= 1.0
    
    def test_suggested_meal_log_structure(self):
        """Test suggested_meal_log object structure."""
        response = client.post("/vision/estimate", json=get_sample_request())
        assert response.status_code == 200
        
        data = response.json()
        meal_log = data["suggested_meal_log"]
        
        assert "dish_id" in meal_log
        assert "dish_name" in meal_log
        assert "calories" in meal_log
        assert "timestamp" in meal_log
        assert meal_log["calories"] >= 0
    
    def test_metadata_when_present(self):
        """Test metadata structure when present."""
        response = client.post("/vision/estimate", json=get_sample_request())
        assert response.status_code == 200
        
        data = response.json()
        
        if "metadata" in data and data["metadata"]:
            metadata = data["metadata"]
            
            if "processing_time_ms" in metadata:
                assert metadata["processing_time_ms"] >= 0
            
            if "model_versions" in metadata:
                versions = metadata["model_versions"]
                assert isinstance(versions, dict)
    
    def test_selected_dish_matches_top_prediction(self):
        """Test that selected_dish is the same as top prediction."""
        response = client.post("/vision/estimate", json=get_sample_request())
        assert response.status_code == 200
        
        data = response.json()
        top_pred = data["dish_predictions"][0]
        selected = data["selected_dish"]
        
        assert selected["dish_id"] == top_pred["dish_id"]
        assert selected["dish_name"] == top_pred["dish_name"]
        assert selected["confidence"] == top_pred["confidence"]
    
    def test_invalid_request_returns_400(self):
        """Test that invalid request returns 400 error."""
        invalid_request = {
            "images": [],  # Empty images array
            "metadata": {
                "device_type": "ios",
                "capture_mode": "single"
            }
        }
        
        response = client.post("/vision/estimate", json=invalid_request)
        assert response.status_code in [400, 422]  # 422 for validation errors
    
    def test_mode_detection_single_image(self):
        """Test that single image triggers reference_based mode."""
        response = client.post("/vision/estimate", json=get_sample_request("single"))
        assert response.status_code == 200
        
        data = response.json()
        assert data["estimation_mode"] == "reference_based"
    
    def test_mode_detection_multi_angle(self):
        """Test that multiple angles trigger multi_angle mode."""
        response = client.post("/vision/estimate", json=get_sample_request("multi_angle"))
        assert response.status_code == 200
        
        data = response.json()
        assert data["estimation_mode"] == "multi_angle"
    
    def test_mode_detection_depth(self):
        """Test that depth data triggers depth mode."""
        response = client.post("/vision/estimate", json=get_sample_request("depth"))
        assert response.status_code == 200
        
        data = response.json()
        assert data["estimation_mode"] == "depth"
