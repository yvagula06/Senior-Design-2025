from fastapi import APIRouter, HTTPException
from app.schemas.label import LabelRequest, LabelResponse, Nutrients, Candidate
from app.services.retrieval_service import retrieve_candidates
from app.services.scaling_service import scale_nutrients
from app.services.mixture_service import blend_candidates

router = APIRouter()

@router.post("", response_model=LabelResponse)
def create_label(req: LabelRequest):
    try:
        # For development, create a fallback response when no candidates are found
        # Use default nutrients as a placeholder
        fallback_nutrients = Nutrients(
            calories=req.calories,
            protein_g=req.calories * 0.05,
            carbs_g=req.calories * 0.10,
            fat_g=req.calories * 0.03,
            fiber_g=req.calories * 0.01,
            sugar_g=req.calories * 0.02,
            sodium_mg=req.calories * 1.6
        )
        
        cands = retrieve_candidates(req.dish_name, req.top_k)
        
        if not cands:
            # Use fallback during development
            fallback_candidate = Candidate(dish_id="fallback", name=req.dish_name, sim=0.5, weight=1.0)
            return LabelResponse(
                nutrients=fallback_nutrients,
                confidence=0.5,
                assumptions="Fallback response - no matching dishes found.",
                candidates=[fallback_candidate]
            )
            
        # pick best (first)
        best_cand, base_nut = cands[0]
        scaled = scale_nutrients(base_nut, req.calories)
        blended = blend_candidates(cands if req.use_mixture else [cands[0]])
        assumptions = "MVP scaling from a canonical profile; values are approximate."
        confidence = min(1.0, max(0.0, best_cand.sim))  # placeholder
        return LabelResponse(
            nutrients=scaled,
            confidence=confidence,
            assumptions=assumptions,
            candidates=blended
        )
    except Exception as e:
        # Print full stack trace for debugging
        import traceback
        traceback.print_exc()
        
        # Return fallback response during development
        fallback_candidate = Candidate(dish_id="error", name=req.dish_name, sim=0.5, weight=1.0)
        fallback_nutrients = Nutrients(
            calories=req.calories,
            protein_g=req.calories * 0.05,
            carbs_g=req.calories * 0.10,
            fat_g=req.calories * 0.03,
            fiber_g=req.calories * 0.01,
            sugar_g=req.calories * 0.02,
            sodium_mg=req.calories * 1.6
        )
        
        return LabelResponse(
            nutrients=fallback_nutrients,
            confidence=0.5,
            assumptions=f"Error processing request: {str(e)}",
            candidates=[fallback_candidate]
        )
