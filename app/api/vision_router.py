"""
Vision API Router

FastAPI router for camera-based meal estimation endpoint.
Exposes POST /vision/estimate for mobile clients.
"""

from fastapi import APIRouter, HTTPException, status
from app.schemas.vision import VisionRequest, VisionResponse
from app.services import vision_orchestrator


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
