from fastapi import APIRouter
from app.schemas.label import LabelRequest, LabelResponse, Nutrients, Candidate
from app.services.retrieval_service import retrieve_candidates
from app.services.scaling_service import scale_nutrients
from app.services.mixture_service import blend_candidates
from app.services.rebalance_service import macro_rebalance
from app.services.mixture_service import solve_weights
from app.services.confidence_service import confidence

router = APIRouter()

@router.post("", response_model=LabelResponse)
def create_label(req: LabelRequest):
    try:
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
            fallback_candidate = Candidate(dish_id="fallback", name=req.dish_name, sim=0.5, weight=1.0)
            return LabelResponse(
                nutrients=fallback_nutrients,
                confidence=0.5,
                assumptions="Fallback response - no matching dishes found.",
                candidates=[fallback_candidate]
            )

        best_cand, base_nut = cands[0]
        base_kcal = base_nut.calories
        base_macros = (base_nut.protein_g, base_nut.carbs_g, base_nut.fat_g)

        rebalanced_macros = macro_rebalance(req.calories, *base_macros, priors=None)

        macros = [
            macro_rebalance(
                req.calories,
                cand_nut.protein_g,
                cand_nut.carbs_g,
                cand_nut.fat_g,
                priors=None
            )
            for _, cand_nut in cands
        ]

        if req.use_mixture and len(cands) >= 2:
            try:
                weights = solve_weights(macros, rebalanced_macros)
            except Exception:
                weights = [1.0] + [0.0] * (len(cands) - 1)
        else:
            weights = [1.0] + [0.0] * (len(cands) - 1)

        final_nutrients = Nutrients(
            calories=req.calories,
            protein_g=sum(w * m[0] for w, m in zip(weights, macros)),
            carbs_g=sum(w * m[1] for w, m in zip(weights, macros)),
            fat_g=sum(w * m[2] for w, m in zip(weights, macros)),
            fiber_g=sum(w * cand_nut.fiber_g for w, (_, cand_nut) in zip(weights, cands)),
            sugar_g=sum(w * cand_nut.sugar_g for w, (_, cand_nut) in zip(weights, cands)),
            sodium_mg=sum(w * cand_nut.sodium_mg for w, (_, cand_nut) in zip(weights, cands)),
        )

        conf = confidence(best_cand.sim, weights, base_kcal, req.calories)

        assumptions = "Rebalanced macros and weighted mixture applied."
        return LabelResponse(
            nutrients=final_nutrients,
            confidence=conf,
            assumptions=assumptions,
            candidates=[Candidate(dish_id=cand.dish_id, name=cand.name, sim=cand.sim, weight=w) for (cand, _), w in zip(cands, weights)]
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
