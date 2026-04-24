"""
Test: Vision Orchestrator Mode Selection

Tests that the vision orchestrator correctly detects estimation mode
and returns expected estimation_mode values.
"""

from app.schemas.vision import (
    VisionRequest,
    ImageData,
    RequestMetadata,
    CaptureAngle,
    DeviceType,
    CaptureMode,
    EstimationMode,
    DepthData,
    DepthFormat,
    CameraIntrinsics
)
from app.services.vision_orchestrator import estimate_meal
from datetime import datetime


class TestVisionOrchestratorMocked:
    """Test vision orchestrator with mocked ML services."""
    
    def test_mode_detection_reference_based(self):
        """Test single image without depth → reference_based."""
        request = VisionRequest(
            images=[
                ImageData(
                    data="iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
                    angle=CaptureAngle.TOP
                )
            ],
            metadata=RequestMetadata(
                device_type=DeviceType.IOS,
                capture_mode=CaptureMode.SINGLE
            )
        )
        
        response = estimate_meal(request)
        
        assert response.estimation_mode == EstimationMode.REFERENCE_BASED
    
    def test_mode_detection_multi_angle(self):
        """Test multiple images (top + side) → multi_angle."""
        request = VisionRequest(
            images=[
                ImageData(
                    data="iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
                    angle=CaptureAngle.TOP
                ),
                ImageData(
                    data="iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
                    angle=CaptureAngle.SIDE
                )
            ],
            metadata=RequestMetadata(
                device_type=DeviceType.ANDROID,
                capture_mode=CaptureMode.MULTI_ANGLE
            )
        )
        
        response = estimate_meal(request)
        
        assert response.estimation_mode == EstimationMode.MULTI_ANGLE
    
    def test_mode_detection_depth(self):
        """Test depth data + intrinsics → depth."""
        request = VisionRequest(
            images=[
                ImageData(
                    data="iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
                    angle=CaptureAngle.TOP
                )
            ],
            depth_data=DepthData(
                depth_map="iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
                format=DepthFormat.PNG_16BIT,
                scale=0.001
            ),
            camera_intrinsics=CameraIntrinsics(
                focal_length_x=1000.0,
                focal_length_y=1000.0,
                principal_point_x=320.0,
                principal_point_y=240.0,
                image_width=640,
                image_height=480
            ),
            metadata=RequestMetadata(
                device_type=DeviceType.IOS,
                capture_mode=CaptureMode.DEPTH
            )
        )
        
        response = estimate_meal(request)
        
        assert response.estimation_mode == EstimationMode.DEPTH
    
    def test_dish_predictions_returned(self):
        """Test that dish predictions are returned."""
        request = VisionRequest(
            images=[
                ImageData(
                    data="iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
                    angle=CaptureAngle.TOP
                )
            ],
            metadata=RequestMetadata(
                device_type=DeviceType.IOS,
                capture_mode=CaptureMode.SINGLE
            )
        )
        
        response = estimate_meal(request)
        
        assert len(response.dish_predictions) >= 1
        assert response.dish_predictions[0].confidence > 0
    
    def test_selected_dish_is_top_prediction(self):
        """Test that selected dish is the top prediction."""
        request = VisionRequest(
            images=[
                ImageData(
                    data="iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
                    angle=CaptureAngle.TOP
                )
            ],
            metadata=RequestMetadata(
                device_type=DeviceType.IOS,
                capture_mode=CaptureMode.SINGLE
            )
        )
        
        response = estimate_meal(request)
        
        top_prediction = response.dish_predictions[0]
        selected = response.selected_dish
        
        assert selected.dish_id == top_prediction.dish_id
        assert selected.confidence == top_prediction.confidence
    
    def test_calorie_estimate_has_valid_range(self):
        """Test that calorie range is valid (min <= value <= max)."""
        request = VisionRequest(
            images=[
                ImageData(
                    data="iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
                    angle=CaptureAngle.TOP
                )
            ],
            metadata=RequestMetadata(
                device_type=DeviceType.IOS,
                capture_mode=CaptureMode.SINGLE
            )
        )
        
        response = estimate_meal(request)
        
        calorie = response.calorie_estimate
        assert calorie.value >= 0, "Calorie value must be non-negative"
        assert calorie.range.min >= 0, "Calorie min must be non-negative"
        assert calorie.range.min <= calorie.value <= calorie.range.max, "Value must be within range"
    
    def test_accuracy_score_varies_by_mode(self):
        """Test that accuracy score reflects estimation mode quality."""
        # Reference-based mode (lowest accuracy)
        request_ref = VisionRequest(
            images=[
                ImageData(
                    data="iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
                    angle=CaptureAngle.TOP
                )
            ],
            metadata=RequestMetadata(
                device_type=DeviceType.IOS,
                capture_mode=CaptureMode.SINGLE
            )
        )
        
        response_ref = estimate_meal(request_ref)
        
        # Depth mode (highest accuracy)
        request_depth = VisionRequest(
            images=[
                ImageData(
                    data="iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
                    angle=CaptureAngle.TOP
                )
            ],
            depth_data=DepthData(
                depth_map="iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
                format=DepthFormat.PNG_16BIT,
                scale=0.001
            ),
            camera_intrinsics=CameraIntrinsics(
                focal_length_x=1000.0,
                focal_length_y=1000.0,
                principal_point_x=320.0,
                principal_point_y=240.0,
                image_width=640,
                image_height=480
            ),
            metadata=RequestMetadata(
                device_type=DeviceType.IOS,
                capture_mode=CaptureMode.DEPTH
            )
        )
        
        response_depth = estimate_meal(request_depth)
        
        # Depth mode should have higher accuracy than reference-based
        assert response_depth.accuracy_score > response_ref.accuracy_score
    
    def test_volume_estimate_present(self):
        """Test that volume estimate is returned."""
        request = VisionRequest(
            images=[
                ImageData(
                    data="iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
                    angle=CaptureAngle.TOP
                )
            ],
            metadata=RequestMetadata(
                device_type=DeviceType.IOS,
                capture_mode=CaptureMode.SINGLE
            )
        )
        
        response = estimate_meal(request)
        
        assert response.volume_estimate is not None
        assert response.volume_estimate.value > 0
        assert response.volume_estimate.unit in ["ml", "cm3"]
    
    def test_suggested_meal_log_has_timestamp(self):
        """Test that suggested meal log includes timestamp."""
        request = VisionRequest(
            images=[
                ImageData(
                    data="iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
                    angle=CaptureAngle.TOP
                )
            ],
            metadata=RequestMetadata(
                device_type=DeviceType.IOS,
                capture_mode=CaptureMode.SINGLE
            )
        )
        
        response = estimate_meal(request)
        
        assert response.suggested_meal_log.timestamp is not None
        assert isinstance(response.suggested_meal_log.timestamp, datetime)
    
    def test_metadata_includes_processing_time(self):
        """Test that metadata includes processing time."""
        request = VisionRequest(
            images=[
                ImageData(
                    data="iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
                    angle=CaptureAngle.TOP
                )
            ],
            metadata=RequestMetadata(
                device_type=DeviceType.IOS,
                capture_mode=CaptureMode.SINGLE
            )
        )
        
        response = estimate_meal(request)
        
        assert response.metadata is not None
        assert response.metadata.processing_time_ms is not None
        assert response.metadata.processing_time_ms >= 0, "Processing time must be non-negative"
    
    def test_metadata_includes_model_versions(self):
        """Test that metadata includes model versions."""
        request = VisionRequest(
            images=[
                ImageData(
                    data="iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
                    angle=CaptureAngle.TOP
                )
            ],
            metadata=RequestMetadata(
                device_type=DeviceType.IOS,
                capture_mode=CaptureMode.SINGLE
            )
        )
        
        response = estimate_meal(request)
        
        assert response.metadata is not None
        assert response.metadata.model_versions is not None, "Model versions should be present"
        assert hasattr(response.metadata.model_versions, 'classifier')
        assert hasattr(response.metadata.model_versions, 'segmentation')
        assert hasattr(response.metadata.model_versions, 'volume_estimator')
