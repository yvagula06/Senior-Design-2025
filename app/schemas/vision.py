"""
Vision API Schemas

Pydantic models for camera-based meal estimation feature.
These schemas match the locked design document specifications.
"""

from pydantic import BaseModel, Field, field_validator
from typing import List, Optional, Dict, Any
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
    NPY = "npy"  # NumPy .npy file (float32, depth in meters) from RealSense


class DeviceType(str, Enum):
    """Device / sensor type for the capture source."""
    # Legacy mobile values (keep for backward compatibility)
    IOS = "ios"
    ANDROID = "android"
    # Extended values
    REALSENSE = "realsense"       # Intel RealSense D435i (desktop demo)
    IOS_LIDAR = "ios_lidar"       # iPhone with LiDAR (12 Pro+)
    IPHONE_CAMERA = "iphone_camera"  # Regular iPhone (no LiDAR)
    ANDROID_CAMERA = "android_camera"  # Android without depth sensor
    UNKNOWN = "unknown"


class CaptureMode(str, Enum):
    """Meal capture mode."""
    DEPTH = "depth"
    MULTI_ANGLE = "multi_angle"
    SINGLE = "single"


class NormalCameraMode(str, Enum):
    """Sub-mode used when depth sensor is unavailable."""
    PLATE_REFERENCE = "plate_reference"      # Known plate diameter → scale
    MULTI_ANGLE = "multi_angle"              # Top + angled photos for height
    REFERENCE_OBJECT = "reference_object"    # Credit card / utensil for scale
    BASIC_SINGLE = "basic_single"            # Single photo, avg serving fallback


class PlateType(str, Enum):
    """Standard plate/container sizes."""
    SMALL_PLATE = "small_plate"      # ~20 cm diameter
    MEDIUM_PLATE = "medium_plate"    # ~25 cm diameter (standard dinner plate)
    LARGE_PLATE = "large_plate"      # ~30 cm diameter
    BOWL = "bowl"                    # ~15 cm diameter, deeper
    CUP = "cup"                      # Cup / mug (200–350 ml)
    CONTAINER = "container"          # Takeaway / food-storage container


class ReferenceObjectType(str, Enum):
    """Known real-world objects used for scale calibration."""
    CREDIT_CARD = "credit_card"   # 85.6 × 54.0 mm
    FORK = "fork"                  # ~19 cm long
    SPOON = "spoon"                # ~17 cm long
    SODA_CAN = "soda_can"          # 6.6 cm diameter, 12.2 cm tall
    CUSTOM = "custom"              # User-supplied dimension


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
    # depth_scale: meters per depth unit (D435i default 0.001, i.e. 1 mm/unit)
    # Required when uploading a .npy depth file so the estimator can convert
    # raw float values to the correct metric unit.
    depth_scale: Optional[float] = Field(
        None, gt=0,
        description="Depth units in meters per value (e.g. 0.001 for RealSense)"
    )


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
    # ----- Normal-camera enhanced fields -----
    normal_camera_mode: Optional[NormalCameraMode] = Field(
        None,
        description="Sub-mode for normal (non-depth) cameras"
    )
    plate_type: Optional[PlateType] = Field(
        None,
        description="Type/size of plate or container"
    )
    plate_diameter_cm: Optional[float] = Field(
        None,
        gt=0,
        le=100,
        description="Exact plate diameter in cm (overrides plate_type lookup)"
    )
    reference_object_type: Optional[ReferenceObjectType] = Field(
        None,
        description="Known reference object placed beside the food"
    )
    reference_object_size_cm: Optional[float] = Field(
        None,
        gt=0,
        le=200,
        description="Size of the reference object in cm (longest dimension, or custom)"
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
    estimate_id: Optional[str] = Field(
        None,
        description="vision_estimates row ID — pass this when saving to meal_logs or submitting feedback",
    )
    # ----- Quality / enhanced fields (normal camera pipeline) -----
    image_quality_score: Optional[float] = Field(
        None,
        ge=0.0,
        le=1.0,
        description="Overall image quality score (blur, brightness, centering)"
    )
    segmentation_quality_score: Optional[float] = Field(
        None,
        ge=0.0,
        le=1.0,
        description="Quality of the food/plate segmentation"
    )
    estimated_area_cm2: Optional[float] = Field(
        None,
        gt=0,
        description="Estimated food surface area in cm² (when scale reference available)"
    )
    estimated_height_cm: Optional[float] = Field(
        None,
        gt=0,
        description="Estimated food height in cm (from side/angled image or heuristic)"
    )
    retake_recommendation: Optional[str] = Field(
        None,
        description="Human-readable suggestion to retake if quality is poor"
    )
    debug_metadata: Optional[Dict] = Field(
        None,
        description="Internal debug info (segmentation ratios, scale factors, etc.)"
    )


# ============================================================================
# Phase 3: Feedback Collection & Personalization Schemas
# ============================================================================


class FeedbackType(str, Enum):
    """Type of user feedback."""
    CONFIRMED = "confirmed"                    # User confirmed prediction was correct
    CORRECTED_DISH = "corrected_dish"         # User changed the dish
    CORRECTED_PORTION = "corrected_portion"   # User adjusted portion size
    QUICK_CORRECTION = "quick_correction"     # Quick thumbs up/down or too high/low


class QuickFeedback(str, Enum):
    """Quick feedback options."""
    ACCURATE = "accurate"           # Thumbs up - estimate was accurate
    TOO_HIGH = "too_high"          # Estimate was too high
    TOO_LOW = "too_low"            # Estimate was too low
    WRONG_DISH = "wrong_dish"      # Dish was misidentified


class PlateSize(str, Enum):
    """Plate/bowl size options."""
    SMALL_PLATE = "small_plate"         # ~8 inch diameter
    STANDARD_PLATE = "standard_plate"   # ~10 inch diameter
    LARGE_PLATE = "large_plate"         # ~12 inch diameter
    BOWL = "bowl"                        # Standard bowl
    HAND = "hand"                        # Hand reference (for scale)


class VisionFeedbackRequest(BaseModel):
    """Request schema for POST /vision/feedback - Phase 3."""
    
    # Link to original estimate (if available from backend)
    estimate_id: Optional[str] = Field(
        None,
        description="UUID of the original vision estimate (if stored)"
    )
    
    # User identification
    user_id: Optional[str] = Field(
        None,
        description="Optional user ID for personalization"
    )
    
    # Feedback type
    feedback_type: FeedbackType = Field(
        ...,
        description="Type of feedback being provided"
    )
    
    # Original prediction context (for logging)
    original_dish_name: str = Field(
        ...,
        description="The dish name that was originally predicted"
    )
    original_calories: float = Field(
        ...,
        ge=0,
        description="The calorie value that was originally estimated"
    )
    original_mode: EstimationMode = Field(
        ...,
        description="The estimation mode used"
    )
    
    # User corrections
    confirmed_dish: Optional[str] = Field(
        None,
        description="The dish name the user confirmed or selected"
    )
    portion_adjustment: Optional[float] = Field(
        None,
        ge=0.25,
        le=2.0,
        description="Portion size multiplier (e.g., 0.5, 0.75, 1.0, 1.25, 1.5)"
    )
    plate_size: Optional[PlateSize] = Field(
        None,
        description="What plate/bowl size was used"
    )
    
    # Quick feedback
    quick_feedback: Optional[QuickFeedback] = Field(
        None,
        description="Quick thumbs up/down or correction indicator"
    )
    corrected_calories: Optional[float] = Field(
        None,
        ge=0,
        description="If user manually provides a calorie correction"
    )
    
    # Additional context
    notes: Optional[str] = Field(
        None,
        max_length=500,
        description="Optional user notes or comments"
    )
    
    # Metadata
    timestamp: Optional[datetime] = Field(
        None,
        description="When feedback was provided"
    )


class VisionFeedbackResponse(BaseModel):
    """Response schema for POST /vision/feedback - Phase 3."""
    
    success: bool = Field(
        ...,
        description="Whether feedback was successfully recorded"
    )
    feedback_id: str = Field(
        ...,
        description="UUID of the stored feedback record"
    )
    message: str = Field(
        ...,
        description="Confirmation message"
    )
    
    # Optional personalization info
    personalization_updated: Optional[bool] = Field(
        None,
        description="Whether user's personalization profile was updated"
    )
    new_portion_factor: Optional[float] = Field(
        None,
        description="Updated average portion factor for this user"
    )


class PersonalizationProfile(BaseModel):
    """User's personalization profile - Phase 3."""
    
    user_id: str = Field(..., description="User identifier")
    
    # Global preferences
    avg_portion_factor: float = Field(
        default=1.0,
        ge=0.5,
        le=2.0,
        description="Average portion size factor for this user"
    )
    feedback_count: int = Field(
        default=0,
        ge=0,
        description="Number of feedback entries collected"
    )
    confidence_score: float = Field(
        default=0.0,
        ge=0.0,
        le=1.0,
        description="Confidence in personalization (higher = more data)"
    )
    
    # Per-dish preferences (optional)
    dish_preferences: Optional[Dict[str, Dict[str, float]]] = Field(
        None,
        description="Per-dish portion preferences: {dish_name: {avg_factor, count}}"
    )
    
    # Per-category preferences (optional)
    category_preferences: Optional[Dict[str, Dict[str, float]]] = Field(
        None,
        description="Per-category portion preferences: {category: {avg_factor, count}}"
    )
    
    # Metadata
    last_updated: datetime = Field(
        ...,
        description="When profile was last updated"
    )
    created_at: datetime = Field(
        ...,
        description="When profile was created"
    )
