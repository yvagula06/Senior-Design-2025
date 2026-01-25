"""
Vision API Schemas

Pydantic models for camera-based meal estimation feature.
These schemas match the locked design document specifications.
"""

from pydantic import BaseModel, Field, field_validator
from typing import List, Optional, Dict
from enum import Enum
from datetime import datetime


class CaptureAngle(str, Enum):
    """Allowed camera angles for meal capture."""
    TOP = "top"
    SIDE = "side"
    OBLIQUE = "oblique"


class DepthFormat(str, Enum):
    """Supported depth map formats."""
    PNG_16BIT = "png_16bit"
    BINARY_FLOAT32 = "binary_float32"


class DeviceType(str, Enum):
    """Mobile device operating system."""
    IOS = "ios"
    ANDROID = "android"


class CaptureMode(str, Enum):
    """Meal capture mode."""
    DEPTH = "depth"
    MULTI_ANGLE = "multi_angle"
    SINGLE = "single"


class EstimationMode(str, Enum):
    """Volume estimation method used."""
    DEPTH = "depth"
    MULTI_ANGLE = "multi_angle"
    REFERENCE_BASED = "reference_based"


class PortionSizeHint(str, Enum):
    """User's subjective portion size assessment."""
    SMALL = "small"
    MEDIUM = "medium"
    LARGE = "large"


class ImageData(BaseModel):
    """Single image with metadata."""
    data: str = Field(
        ...,
        description="Base64-encoded JPEG or PNG image data"
    )
    angle: CaptureAngle = Field(
        ...,
        description="Camera angle relative to the plate"
    )
    timestamp: Optional[datetime] = Field(
        None,
        description="ISO 8601 timestamp when image was captured"
    )
    
    @field_validator('data')
    @classmethod
    def validate_base64_not_empty(cls, v: str) -> str:
        """Ensure base64 data is not empty."""
        if not v or not v.strip():
            raise ValueError("Base64 image data cannot be empty")
        return v


class DepthData(BaseModel):
    """Optional depth information from LiDAR or ARCore."""
    depth_map: str = Field(
        ...,
        description="Base64-encoded depth map"
    )
    format: DepthFormat = Field(
        ...,
        description="Format of the depth map data"
    )
    scale: float = Field(
        ...,
        gt=0,
        description="Depth units in meters per value"
    )
    
    @field_validator('depth_map')
    @classmethod
    def validate_depth_map_not_empty(cls, v: str) -> str:
        """Ensure depth map data is not empty."""
        if not v or not v.strip():
            raise ValueError("Depth map data cannot be empty")
        return v


class CameraIntrinsics(BaseModel):
    """Camera calibration parameters."""
    focal_length_x: float = Field(..., gt=0)
    focal_length_y: float = Field(..., gt=0)
    principal_point_x: float = Field(..., ge=0)
    principal_point_y: float = Field(..., ge=0)
    image_width: int = Field(..., gt=0)
    image_height: int = Field(..., gt=0)


class RequestMetadata(BaseModel):
    """Request metadata from mobile device."""
    device_type: DeviceType = Field(
        ...,
        description="Operating system of the mobile device"
    )
    capture_mode: CaptureMode = Field(
        ...,
        description="Mode used to capture the meal"
    )
    device_model: Optional[str] = Field(
        None,
        description="Device model (e.g., 'iPhone 14 Pro', 'Pixel 7')"
    )
    user_id: Optional[str] = Field(
        None,
        description="Optional user ID for personalization or logging"
    )


class Preferences(BaseModel):
    """Optional user preferences for estimation."""
    portion_size_hint: Optional[PortionSizeHint] = Field(
        None,
        description="User's subjective assessment of portion size"
    )
    dish_hint: Optional[str] = Field(
        None,
        max_length=200,
        description="Optional user-provided dish name to guide classification"
    )


class VisionRequest(BaseModel):
    """Request schema for POST /vision/estimate."""
    images: List[ImageData] = Field(
        ...,
        min_length=1,
        max_length=3,
        description="1-3 meal images from different angles"
    )
    depth_data: Optional[DepthData] = Field(
        None,
        description="Optional depth information (iOS LiDAR, ARCore depth)"
    )
    camera_intrinsics: Optional[CameraIntrinsics] = Field(
        None,
        description="Optional camera calibration parameters"
    )
    metadata: RequestMetadata = Field(
        ...,
        description="Device and capture metadata"
    )
    preferences: Optional[Preferences] = Field(
        None,
        description="Optional user preferences for estimation"
    )

    @field_validator('images')
    @classmethod
    def validate_images(cls, v: List[ImageData]) -> List[ImageData]:
        """Ensure images list is not empty."""
        if not v:
            raise ValueError("At least one image is required")
        return v


class DishPrediction(BaseModel):
    """Single dish classification prediction."""
    dish_id: str = Field(..., description="Unique identifier for the dish")
    dish_name: str = Field(..., description="Human-readable dish name")
    confidence: float = Field(
        ...,
        ge=0.0,
        le=1.0,
        description="Classification confidence score"
    )
    category: Optional[str] = Field(
        None,
        description="Food category (e.g., 'pasta', 'salad', 'meat')"
    )


class SelectedDish(BaseModel):
    """The dish selected for calorie estimation."""
    dish_id: str
    dish_name: str
    confidence: float = Field(ge=0.0, le=1.0)


class CalorieRange(BaseModel):
    """Calorie estimate range."""
    min: float = Field(..., ge=0, description="Lower bound of calorie estimate")
    max: float = Field(..., ge=0, description="Upper bound of calorie estimate")

    @field_validator('max')
    @classmethod
    def validate_range(cls, v: float, info) -> float:
        """Ensure max >= min."""
        if 'min' in info.data and v < info.data['min']:
            raise ValueError("max must be >= min")
        return v


class CalorieEstimate(BaseModel):
    """Estimated calorie information."""
    value: float = Field(..., ge=0, description="Point estimate of calories")
    range: CalorieRange = Field(..., description="Min-max range")
    unit: str = Field(default="kcal", description="Unit of measurement")


class VolumeEstimate(BaseModel):
    """Estimated volume information."""
    value: float = Field(..., gt=0)
    unit: str = Field(..., description="ml or cm3")
    confidence: float = Field(..., ge=0.0, le=1.0)


class SuggestedMealLog(BaseModel):
    """Pre-filled meal log entry for user to confirm or edit."""
    dish_id: str
    dish_name: str
    calories: float = Field(ge=0)
    serving_size: Optional[str] = None
    timestamp: datetime
    notes: Optional[str] = Field(
        None,
        description="Auto-generated notes (e.g., 'Estimated via depth camera')"
    )


class ModelVersions(BaseModel):
    """Versions of models used in estimation."""
    classifier: Optional[str] = None
    segmentation: Optional[str] = None
    volume_estimator: Optional[str] = None


class ResponseMetadata(BaseModel):
    """Additional metadata about the estimation process."""
    processing_time_ms: Optional[int] = Field(
        None,
        ge=0,
        description="Total processing time in milliseconds"
    )
    model_versions: Optional[ModelVersions] = None
    warnings: Optional[List[str]] = Field(
        None,
        description="Any warnings (e.g., 'Low lighting detected')"
    )


class VisionResponse(BaseModel):
    """Response schema for POST /vision/estimate."""
    dish_predictions: List[DishPrediction] = Field(
        ...,
        description="Top-K dish classification results"
    )
    selected_dish: SelectedDish = Field(
        ...,
        description="The dish selected for calorie estimation (highest confidence)"
    )
    calorie_estimate: CalorieEstimate = Field(
        ...,
        description="Estimated calorie information"
    )
    volume_estimate: Optional[VolumeEstimate] = Field(
        None,
        description="Estimated volume information (when available)"
    )
    estimation_mode: EstimationMode = Field(
        ...,
        description="Method used for volume and calorie estimation"
    )
    accuracy_score: float = Field(
        ...,
        ge=0.0,
        le=1.0,
        description="Overall accuracy/confidence score for the entire estimation"
    )
    suggested_meal_log: SuggestedMealLog = Field(
        ...,
        description="Pre-filled meal log entry for user to confirm or edit"
    )
    metadata: Optional[ResponseMetadata] = Field(
        None,
        description="Additional metadata about the estimation process"
    )
