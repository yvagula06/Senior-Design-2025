"""Nutrition Label API Router

Mobile app endpoint for nutrition label generation:
- Dish-level retrieval with pgvector (source of truth)
- Deterministic calorie-aware scaling
- Optional top-k aggregation for better accuracy
- Confidence score [0,1] with explanation
"""

from fastapi import APIRouter, HTTPException, status
import json
import os
import traceback
from typing import Optional
from sqlalchemy import text

from app.schemas.label import LabelRequest, LabelResponse, Nutrients, Candidate
from app.services.retrieval_service import retrieve_candidates
from app.services.mixture_service import compute_mixture
from app.services.scaling_service import scale_nutrients
from app.services.confidence_service import compute_confidence
from app.db.session import engine, get_or_create_user_id

_SIM_THRESHOLD = float(os.getenv("SIM_THRESHOLD", "0.3"))


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
            k=5,
            similarity_threshold=_SIM_THRESHOLD
        )

        # Step 1b: LLM fallback when pgvector finds no match
        if not candidates_with_nutrients:
            llm_result = _llm_fallback(req.dish_name, req.target_calories)
            if llm_result:
                return llm_result
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"No matching dish found for '{req.dish_name}'"
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

        nutrition_dict = {
            "calories":         round(final_nutrients.calories, 1),
            "protein_g":        round(final_nutrients.protein_g, 1),
            "carbs_g":          round(final_nutrients.carbs_g, 1),
            "fat_g":            round(final_nutrients.fat_g, 1),
            "fiber_g":          round(final_nutrients.fiber_g, 1) if final_nutrients.fiber_g is not None else None,
            "sugar_g":          round(final_nutrients.sugar_g, 1) if final_nutrients.sugar_g is not None else None,
            "sodium_mg":        round(final_nutrients.sodium_mg, 0) if final_nutrients.sodium_mg is not None else None,
            "potassium_mg":     round(final_nutrients.potassium_mg, 0) if final_nutrients.potassium_mg is not None else None,
            "saturated_fat_g":  round(final_nutrients.saturated_fat_g, 1) if final_nutrients.saturated_fat_g is not None else None,
            "trans_fat_g":      round(final_nutrients.trans_fat_g, 1) if final_nutrients.trans_fat_g is not None else None,
            "cholesterol_mg":   round(final_nutrients.cholesterol_mg, 0) if final_nutrients.cholesterol_mg is not None else None,
            "vitamin_a_mcg":    round(final_nutrients.vitamin_a_mcg, 1) if final_nutrients.vitamin_a_mcg is not None else None,
            "vitamin_c_mg":     round(final_nutrients.vitamin_c_mg, 1) if final_nutrients.vitamin_c_mg is not None else None,
            "vitamin_d_mcg":    round(final_nutrients.vitamin_d_mcg, 1) if final_nutrients.vitamin_d_mcg is not None else None,
            "calcium_mg":       round(final_nutrients.calcium_mg, 0) if final_nutrients.calcium_mg is not None else None,
            "iron_mg":          round(final_nutrients.iron_mg, 1) if final_nutrients.iron_mg is not None else None,
        }

        # ---------- persist to meal_logs (manual flow) ----------
        # Writes a frozen nutrition snapshot so history is never affected by
        # future model or data updates.  No-op when device_id is absent
        # (label-preview mode: client will confirm before saving).
        meal_log_id: Optional[int] = None
        if req.device_id:
            try:
                dish_id_int: Optional[int] = None
                try:
                    dish_id_int = int(best_match.dish_id)
                except (ValueError, TypeError):
                    pass

                with engine.connect() as conn:
                    user_id = get_or_create_user_id(req.device_id, conn)
                    meal_log_id = conn.execute(
                        text("""
                            INSERT INTO meal_logs (
                                user_id, dish_id, entry_source,
                                logged_dish_name, logged_calories,
                                nutrition_label, serving_multiplier,
                                match_confidence, logged_at, created_at
                            ) VALUES (
                                :user_id, :dish_id, 'manual',
                                :dish_name, :calories,
                                :nutrition_label::jsonb, :serving_multiplier,
                                :confidence, now(), now()
                            )
                            RETURNING id
                        """),
                        {
                            "user_id": user_id,
                            "dish_id": dish_id_int,
                            "dish_name": best_match.name,
                            "calories": nutrition_dict["calories"],
                            "nutrition_label": json.dumps(nutrition_dict),
                            "serving_multiplier": round(scaling_factor, 4),
                            "confidence": round(confidence_result.score, 4),
                        },
                    ).fetchone()[0]
                    conn.commit()
            except Exception:
                # Persistence failure must not break the label response.
                traceback.print_exc()
        # --------------------------------------------------------

        return LabelResponse(
            matched_dish=best_match.name,
            nutrition=nutrition_dict,
            confidence=round(confidence_result.score, 2),
            explanation=confidence_result.explanation,
            meal_log_id=meal_log_id,
        )
    
    except HTTPException:
        raise

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid request: {str(e)}"
        )

    except Exception as e:
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal server error: {str(e)}"
        )


def _build_query_text(dish_name: str, style: str = None) -> str:
    """Build query text with optional style hint appended as context."""
    name = dish_name.strip()
    if style and style.strip() and style.strip().lower() not in ("unknown", ""):
        return f"{name} {style.strip().lower()} style"
    return name


def _llm_fallback(dish_name: str, target_calories: Optional[float]) -> Optional[LabelResponse]:
    """
    Use OpenAI GPT to estimate nutrition when pgvector finds no match.
    Returns None if OpenAI key is missing or the call fails.
    """
    api_key = os.getenv("OPENAI_API_KEY")
    model = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
    if not api_key:
        return None

    try:
        from openai import OpenAI
        client = OpenAI(api_key=api_key)

        portion_hint = f" for a {target_calories:.0f} kcal portion" if target_calories else " per 100g"
        prompt = (
            f"Give me the nutrition facts for '{dish_name}'{portion_hint}.\n"
            "Respond ONLY with a JSON object with these exact keys:\n"
            "matched_dish, calories, protein_g, carbs_g, fat_g, fiber_g, sugar_g, sodium_mg, potassium_mg\n"
            "All values must be numbers (use null if unknown). No extra text."
        )

        resp = client.chat.completions.create(
            model=model,
            messages=[{"role": "user", "content": prompt}],
            temperature=0,
            max_tokens=300,
            response_format={"type": "json_object"},
        )

        data = json.loads(resp.choices[0].message.content)

        nutrition_dict = {
            "calories":     round(float(data.get("calories") or 0), 1),
            "protein_g":    round(float(data.get("protein_g") or 0), 1),
            "carbs_g":      round(float(data.get("carbs_g") or 0), 1),
            "fat_g":        round(float(data.get("fat_g") or 0), 1),
            "fiber_g":      round(float(data["fiber_g"]), 1) if data.get("fiber_g") is not None else None,
            "sugar_g":      round(float(data["sugar_g"]), 1) if data.get("sugar_g") is not None else None,
            "sodium_mg":    round(float(data["sodium_mg"]), 0) if data.get("sodium_mg") is not None else None,
            "potassium_mg": round(float(data["potassium_mg"]), 0) if data.get("potassium_mg") is not None else None,
            "saturated_fat_g": None, "trans_fat_g": None, "cholesterol_mg": None,
            "vitamin_a_mcg": None, "vitamin_c_mg": None, "vitamin_d_mcg": None,
            "calcium_mg": None, "iron_mg": None,
        }

        return LabelResponse(
            matched_dish=data.get("matched_dish", dish_name.title()),
            nutrition=nutrition_dict,
            confidence=0.60,
            explanation="Estimated by AI — no exact match found in database.",
            meal_log_id=None,
        )

    except Exception:
        traceback.print_exc()
        return None
