"""
Vision API Router

FastAPI router for camera-based meal estimation endpoint.
Exposes:
  POST /vision/estimate        – JSON body (mobile clients)
  POST /vision/estimate/upload – Multipart form (RealSense desktop demo)
Phase 3: Added feedback collection endpoints.
"""

import io
import json
import base64
import traceback
from typing import List, Optional

import numpy as np
from fastapi import APIRouter, File, Form, HTTPException, UploadFile, status

from app.schemas.vision import (
    CameraIntrinsics,
    CaptureMode,
    DepthData,
    DepthFormat,
    DeviceType,
    ImageData,
    CaptureAngle,
    PersonalizationProfile,
    RequestMetadata,
    VisionFeedbackRequest,
    VisionFeedbackResponse,
    VisionRequest,
    VisionResponse,
)
from app.services import vision_orchestrator
from app.services.vision_feedback_service import VisionFeedbackService


router = APIRouter()


@router.post(
    "/estimate",
    response_model=VisionResponse,
    status_code=status.HTTP_200_OK,
    summary="Estimate meal calories from camera images",
    description="""
    Camera-based meal estimation endpoint.
    
    Accepts 1-3 images with optional depth data and returns:
    - Dish predictions (Top-K)
    - Calorie estimate with range
    - Accuracy score
    - Suggested meal log entry
    
    Supports three estimation modes:
    - **depth**: Uses depth map + camera intrinsics (highest accuracy)
    - **multi_angle**: Uses multiple images from different angles
    - **reference_based**: Single image with database reference portions
    """
)
def estimate_meal(request: VisionRequest) -> VisionResponse:
    """
    Estimate meal calories from camera images.
    
    Args:
        request: VisionRequest with images, metadata, optional depth data
        
    Returns:
        VisionResponse with calorie estimate and metadata
        
    Raises:
        HTTPException: 400 for invalid request, 500 for server errors
    """
    try:
        # Validate request (Pydantic handles most validation)
        if not request.images:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="At least one image is required"
            )

        # Execute pipeline and persist vision_estimates row
        response = _run_estimation_and_store(request)

        # Check if estimation was successful
        if response.accuracy_score < 0.2:
            raise HTTPException(
                status_code=status.HTTP_200_OK,  # Still 200, but with low confidence
                detail="Estimation confidence is very low. Manual entry recommended."
            )
        
        return response
        
    except ValueError as e:
        # Validation errors
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid request: {str(e)}"
        )
    except Exception as e:
        # Unexpected errors
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal server error: {str(e)}"
        )


@router.get(
    "/health",
    summary="Vision service health check",
    description="Check if vision estimation services are available"
)
def health_check():
    """
    Health check for vision services.
    
    Returns:
        Status dict
    """
    return {
        "status": "ok",
        "service": "vision",
        "models_loaded": True  # Will be dynamic once real models loaded
    }


# ============================================================================
# Multipart Upload Endpoint (RealSense / desktop demo)
# ============================================================================

def _run_estimation_and_store(request: VisionRequest) -> VisionResponse:
    """Shared helper: run orchestrator + persist estimate row."""
    response = vision_orchestrator.estimate_meal(request)

    estimate_id: Optional[str] = None
    try:
        predicted_dish_id: Optional[int] = None
        try:
            predicted_dish_id = int(response.suggested_meal_log.dish_id)
        except (ValueError, TypeError):
            pass

        _ve_id = VisionFeedbackService.store_estimate(
            device_id=request.metadata.user_id,
            capture_mode=request.metadata.capture_mode.value,
            num_images=len(request.images),
            device_type=request.metadata.device_type.value,
            has_depth_data=request.depth_data is not None,
            predicted_dish_name=response.selected_dish.dish_name,
            predicted_confidence=response.selected_dish.confidence,
            calorie_estimate=response.calorie_estimate.value,
            calorie_range_min=response.calorie_estimate.range.min,
            calorie_range_max=response.calorie_estimate.range.max,
            volume_ml=(
                response.volume_estimate.value if response.volume_estimate else None
            ),
            volume_confidence=(
                response.volume_estimate.confidence if response.volume_estimate else None
            ),
            alternative_dishes=[
                {
                    "dish_id": p.dish_id,
                    "dish_name": p.dish_name,
                    "confidence": p.confidence,
                }
                for p in response.dish_predictions[1:]
            ],
            estimation_mode=response.estimation_mode.value,
            processing_time_ms=(
                response.metadata.processing_time_ms
                if response.metadata else None
            ),
            image_storage_keys=None,
            classifier_version=(
                response.metadata.model_versions.classifier
                if response.metadata and response.metadata.model_versions else None
            ),
            segmentation_version=(
                response.metadata.model_versions.segmentation
                if response.metadata and response.metadata.model_versions else None
            ),
            volume_estimator_version=(
                response.metadata.model_versions.volume_estimator
                if response.metadata and response.metadata.model_versions else None
            ),
            predicted_dish_id=predicted_dish_id,
        )
        estimate_id = str(_ve_id)
    except Exception:
        traceback.print_exc()

    return response.model_copy(update={"estimate_id": estimate_id})


@router.post(
    "/estimate/upload",
    response_model=VisionResponse,
    status_code=status.HTTP_200_OK,
    summary="Estimate meal from uploaded files (RealSense / desktop demo)",
    description="""
    Multipart form-data endpoint for submitting RGB images and an optional
    depth file (`.npy` float32 array in meters from RealSense, or a base64
    depth payload as a plain-text file).

    Form fields:
    - **rgb_images** (required): one or more JPEG/PNG image files.
    - **depth_file** (optional): a `.npy` depth file (float32, depth in metres).
    - **metadata_json** (required): JSON string matching RequestMetadata schema.
    - **intrinsics_json** (optional): JSON string matching CameraIntrinsics schema.
    - **preferences_json** (optional): JSON string matching Preferences schema.

    This endpoint is primarily used by `tools/realsense_capture.py` for the
    senior-design demo. Mobile clients should continue using `POST /vision/estimate`.
    """,
)
async def estimate_meal_upload(
    rgb_images: List[UploadFile] = File(..., description="One or more RGB images"),
    depth_file: Optional[UploadFile] = File(None, description="Optional depth .npy file"),
    metadata_json: str = Form(..., description="JSON-encoded RequestMetadata"),
    intrinsics_json: Optional[str] = Form(None, description="JSON-encoded CameraIntrinsics"),
    preferences_json: Optional[str] = Form(None, description="JSON-encoded Preferences"),
) -> VisionResponse:
    """
    Multipart upload endpoint used by the RealSense desktop capture tool.

    Converts uploaded files into the same VisionRequest that the JSON endpoint
    uses, then delegates to the shared estimation pipeline.
    """
    # --- Parse form JSON fields -----------------------------------------------
    try:
        meta_dict = json.loads(metadata_json)
    except json.JSONDecodeError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid metadata_json: {exc}",
        )

    intrinsics_dict: Optional[dict] = None
    if intrinsics_json:
        try:
            intrinsics_dict = json.loads(intrinsics_json)
        except json.JSONDecodeError as exc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid intrinsics_json: {exc}",
            )

    # --- Build RequestMetadata ------------------------------------------------
    try:
        metadata = RequestMetadata(
            device_type=meta_dict.get("device_type", DeviceType.UNKNOWN),
            capture_mode=meta_dict.get("capture_mode", CaptureMode.SINGLE),
            device_model=meta_dict.get("device_model"),
            user_id=meta_dict.get("user_id"),
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid metadata: {exc}",
        )

    # --- Build CameraIntrinsics -----------------------------------------------
    camera_intrinsics: Optional[CameraIntrinsics] = None
    if intrinsics_dict:
        try:
            camera_intrinsics = CameraIntrinsics(**intrinsics_dict)
        except Exception as exc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid intrinsics: {exc}",
            )

    # --- Encode RGB images as base64 ------------------------------------------
    if not rgb_images:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="At least one RGB image is required.",
        )

    image_data_list: List[ImageData] = []
    angles = [CaptureAngle.TOP, CaptureAngle.SIDE, CaptureAngle.OBLIQUE]
    for idx, upload in enumerate(rgb_images[:3]):  # cap at 3 images
        raw = await upload.read()
        b64 = base64.b64encode(raw).decode("utf-8")
        image_data_list.append(
            ImageData(
                data=b64,
                angle=angles[idx] if idx < len(angles) else CaptureAngle.OBLIQUE,
            )
        )

    # --- Handle depth file (RealSense .npy) -----------------------------------
    depth_data: Optional[DepthData] = None
    if depth_file is not None:
        depth_bytes = await depth_file.read()
        filename = depth_file.filename or ""

        if filename.endswith(".npy"):
            # .npy file: encode as base64, mark format as NPY
            depth_scale = (
                intrinsics_dict.get("depth_scale", 1.0)
                if intrinsics_dict else 1.0
            )
            depth_data = DepthData(
                depth_map=base64.b64encode(depth_bytes).decode("utf-8"),
                format=DepthFormat.NPY,
                scale=depth_scale,
            )
        else:
            # Assume base64 text payload (legacy / PNG 16-bit)
            try:
                b64_str = depth_bytes.decode("utf-8").strip()
                depth_scale = (
                    intrinsics_dict.get("depth_scale", 0.001)
                    if intrinsics_dict else 0.001
                )
                depth_data = DepthData(
                    depth_map=b64_str,
                    format=DepthFormat.PNG_16BIT,
                    scale=depth_scale,
                )
            except Exception as exc:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Could not parse depth file: {exc}",
                )

    # --- Assemble VisionRequest and delegate ----------------------------------
    request = VisionRequest(
        images=image_data_list,
        depth_data=depth_data,
        camera_intrinsics=camera_intrinsics,
        metadata=metadata,
    )

    try:
        return _run_estimation_and_store(request)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal server error: {exc}",
        )


# ============================================================================
# Phase 3: Feedback Collection & Personalization Endpoints
# ============================================================================


@router.post(
    "/feedback",
    response_model=VisionFeedbackResponse,
    status_code=status.HTTP_200_OK,
    summary="Submit feedback on vision estimate",
    description="""
    Phase 3: Collect user feedback on vision estimates.
    
    Enables data-driven improvements and personalization:
    - Confirm or correct dish predictions
    - Adjust portion sizes
    - Provide quick feedback (thumbs up/down, too high/low)
    - Specify plate/bowl size used
    
    Feedback is used to:
    - Improve future estimates for this user (personalization)
    - Refine density priors and volume estimation
    - Improve dish classification accuracy
    """
)
def submit_vision_feedback(request: VisionFeedbackRequest) -> VisionFeedbackResponse:
    """
    Submit user feedback on a vision estimate.
    
    Args:
        request: VisionFeedbackRequest with feedback data
        
    Returns:
        VisionFeedbackResponse with confirmation and personalization updates
        
    Raises:
        HTTPException: 400 for invalid request, 500 for server errors
    """
    try:
        # Submit feedback and update personalization
        response = VisionFeedbackService.submit_feedback(request)
        return response
        
    except ValueError as e:
        # Validation errors
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid feedback request: {str(e)}"
        )
    except Exception as e:
        # Unexpected errors
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to submit feedback: {str(e)}"
        )


@router.get(
    "/personalization/{user_id}",
    response_model=PersonalizationProfile,
    status_code=status.HTTP_200_OK,
    summary="Get user's personalization profile",
    description="""
    Phase 3: Retrieve user's personalization profile.
    
    Returns:
    - Average portion factor
    - Number of feedback entries
    - Confidence score
    - Per-dish and per-category preferences (if available)
    """
)
def get_personalization(user_id: str) -> PersonalizationProfile:
    """
    Get user's personalization profile.
    
    Args:
        user_id: User identifier
        
    Returns:
        PersonalizationProfile with user's portion preferences
        
    Raises:
        HTTPException: 404 if profile not found, 500 for server errors
    """
    try:
        profile = VisionFeedbackService.get_personalization_profile(user_id)
        
        if not profile:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"No personalization profile found for user: {user_id}"
            )
        
        return profile
        
    except HTTPException:
        raise
    except Exception as e:
        # Unexpected errors
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve personalization profile: {str(e)}"
        )


@router.get(
    "/feedback/stats",
    status_code=status.HTTP_200_OK,
    summary="Get feedback statistics",
    description="""
    Phase 3: Get aggregated feedback statistics.
    
    Useful for:
    - Monitoring estimation accuracy
    - Analyzing user feedback patterns
    - Tracking improvement over time
    """
)
def get_feedback_stats(user_id: Optional[str] = None, days: int = 30):
    """
    Get feedback statistics.
    
    Args:
        user_id: Optional user ID to filter by
        days: Number of days to look back (default: 30)
        
    Returns:
        Dictionary with feedback metrics
        
    Raises:
        HTTPException: 500 for server errors
    """
    try:
        stats = VisionFeedbackService.get_feedback_stats(user_id=user_id, days=days)  # type: ignore[attr-defined]
        return stats
        
    except Exception as e:
        # Unexpected errors
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve feedback stats: {str(e)}"
        )

