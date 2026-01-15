"""Nutrition Label API Router

Mobile app endpoint for nutrition label generation:
- Dish-level retrieval with pgvector (source of truth)
- Deterministic calorie-aware scaling
- Optional top-k aggregation for better accuracy
- Confidence score [0,1] with explanation
"""

from fastapi import APIRouter, HTTPException, status
import traceback

from app.schemas.label import LabelRequest, LabelResponse, Nutrients, Candidate
from app.services.retrieval_service import retrieve_candidates
from app.services.mixture_service import compute_mixture
from app.services.scaling_service import scale_nutrients
from app.services.confidence_service import compute_confidence


router = APIRouter(
    prefix="/label",
    tags=["nutrition-labels"]
)


@router.post("", response_model=LabelResponse, status_code=status.HTTP_200_OK)
def create_label(req: LabelRequest) -> LabelResponse:
    """
    Generate nutrition label for mobile app.
    
    Pipeline:
    1. Retrieval: pgvector semantic search for similar dishes (source of truth)
    2. Mixture: Optional top-k aggregation using similarity weights
    3. Scaling: Deterministic calorie-aware portion adjustment
    4. Confidence: Multi-factor score [0,1] with explanation
    
    Args:
        req: LabelRequest with dish_name, optional calories, optional style, optional top_k
    
    Returns:
        LabelResponse with matched_dish, nutrition dict, confidence, explanation
    
    Example:
        POST /label
        {"dish_name": "chicken tikka masala", "calories": 600}
        
        Response:
        {
            "matched_dish": "Chicken Tikka Masala",
            "nutrition": {"calories": 600.0, "protein_g": 35.2, ...},
            "confidence": 0.87,
            "explanation": "Excellent match with consistent candidates"
        }
    """
    try:
        # Step 1: Retrieval - Get top-k similar dishes from database
        query_text = _build_query_text(req.dish_name, req.style)
        candidates_with_nutrients = retrieve_candidates(
            dish_name=query_text,
            k=5,  # Always retrieve top 5
            similarity_threshold=0.3
        )
        
        # Handle no matches - return 404
        if not candidates_with_nutrients:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No matching dish found"
            )
        
        # Step 2: Mixture - Aggregate candidates (if top_k > 1)
        base_nutrients = compute_mixture(candidates_with_nutrients)
        
        # Step 3: Scaling - Adjust for target calories
        if req.target_calories is not None:
            final_nutrients = scale_nutrients(
                canonical_nutrients=base_nutrients,
                target_calories=req.target_calories,
                clamp=True
            )
            scaling_factor = req.target_calories / base_nutrients.calories
        else:
            final_nutrients = base_nutrients
            scaling_factor = 1.0
        
        # Step 4: Confidence - Compute quality score
        candidate_similarities = [cand.sim for cand, _ in candidates_with_nutrients]
        candidate_calories = [nut.calories for _, nut in candidates_with_nutrients]
        
        confidence_result = compute_confidence(
            top_similarity=candidate_similarities[0],
            candidate_similarities=candidate_similarities,
            candidate_calories=candidate_calories,
            target_calories=req.target_calories or base_nutrients.calories,
            scaling_factor=scaling_factor
        )
        
        # Build mobile-friendly response
        best_match = candidates_with_nutrients[0][0]
        
        return LabelResponse(
            matched_dish=best_match.name,
            nutrition={
                "calories": round(final_nutrients.calories, 1),
                "protein_g": round(final_nutrients.protein_g, 1),
                "carbs_g": round(final_nutrients.carbs_g, 1),
                "fat_g": round(final_nutrients.fat_g, 1),
                "sugar_g": round(final_nutrients.sugar_g, 1) if final_nutrients.sugar_g > 0 else None,
                "fiber_g": round(final_nutrients.fiber_g, 1) if final_nutrients.fiber_g > 0 else None,
                "sodium_mg": round(final_nutrients.sodium_mg, 0) if final_nutrients.sodium_mg > 0 else None,
                "potassium_mg": None  # Not tracked in current schema, can add later
            },
            confidence=round(confidence_result.score, 2),
            explanation=confidence_result.explanation
        )
    
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid request: {str(e)}"
        )
    
    except Exception as e:
        # Log error and return 500
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal server error: {str(e)}"
        )


def _build_query_text(dish_name: str, style: str = None) -> str:
    """Build query text with optional style hint."""
    if style and style.strip():
        return f"{style.strip().lower()} {dish_name.strip()}"
    return dish_name.strip()
