"""
Vision API Router

FastAPI router for camera-based meal estimation endpoint.
Exposes POST /vision/estimate for mobile clients.
Phase 3: Added feedback collection endpoints.
"""

from fastapi import APIRouter, HTTPException, status
import traceback
from typing import Optional
from app.schemas.vision import (
    VisionRequest,
    VisionResponse,
    VisionFeedbackRequest,
    VisionFeedbackResponse,
    PersonalizationProfile,
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
        
        # Execute vision estimation pipeline
        response = vision_orchestrator.estimate_meal(request)

        # ------ persist prediction to vision_estimates ------
        # Stored immediately so feedback and meal-log confirms can link back.
        # Raw base64 images are NOT stored here.  In production, the mobile
        # client should upload images to object storage (S3 / GCS) before
        # calling this endpoint and pass back the storage keys; for now
        # image_storage_keys is left null.
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
                    response.volume_estimate.value
                    if response.volume_estimate else None
                ),
                volume_confidence=(
                    response.volume_estimate.confidence
                    if response.volume_estimate else None
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
            # DB write failure must never abort the estimation response.
            traceback.print_exc()

        response = response.model_copy(update={"estimate_id": estimate_id})
        # ----------------------------------------------------

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

