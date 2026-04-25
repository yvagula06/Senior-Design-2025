"""
Meal log router — lets clients save a meal entry (manual or camera-based)
to the meal_logs table and retrieve their history.
"""

import json
from typing import Optional, List

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import text

from app.db.session import engine, get_or_create_user_id

router = APIRouter()


class SaveMealLogRequest(BaseModel):
    device_id: str = Field(..., description="Mobile device UUID used as stable user identity")
    dish_name: str = Field(..., max_length=255)
    calories: float
    entry_source: str = Field("manual", pattern="^(manual|camera)$")
    nutrition_label: Optional[dict] = None
    serving_multiplier: float = 1.0
    dish_id: Optional[int] = None
    vision_estimate_id: Optional[int] = None
    match_confidence: Optional[float] = None
    model_version: Optional[str] = None


class MealLogResponse(BaseModel):
    id: int
    logged_dish_name: str
    logged_calories: float
    entry_source: str
    serving_multiplier: float
    logged_at: str


@router.post("/meal-logs", status_code=201)
def save_meal_log(request: SaveMealLogRequest):
    """Save a meal to the user's log (manual entry or confirmed camera estimate)."""
    try:
        with engine.connect() as conn:
            user_id = get_or_create_user_id(request.device_id, conn)

            result = conn.execute(
                text("""
                    INSERT INTO meal_logs (
                        user_id, dish_id, vision_estimate_id,
                        entry_source, logged_dish_name, logged_calories,
                        nutrition_label, serving_multiplier,
                        match_confidence, model_version, logged_at
                    ) VALUES (
                        :user_id, :dish_id, :vision_estimate_id,
                        :entry_source, :logged_dish_name, :logged_calories,
                        :nutrition_label::jsonb, :serving_multiplier,
                        :match_confidence, :model_version, now()
                    )
                    RETURNING id
                """),
                {
                    "user_id": user_id,
                    "dish_id": request.dish_id,
                    "vision_estimate_id": request.vision_estimate_id,
                    "entry_source": request.entry_source,
                    "logged_dish_name": request.dish_name,
                    "logged_calories": request.calories,
                    "nutrition_label": json.dumps(request.nutrition_label) if request.nutrition_label else None,
                    "serving_multiplier": request.serving_multiplier,
                    "match_confidence": request.match_confidence,
                    "model_version": request.model_version,
                },
            )
            new_id = result.fetchone()[0]  # type: ignore[index]
            conn.commit()

        return {"ok": True, "id": new_id}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to save meal log: {exc}")


@router.get("/meal-logs/{device_id}", response_model=List[MealLogResponse])
def get_meal_logs(device_id: str, limit: int = 50):
    """Return the most recent meal log entries for a device/user."""
    try:
        with engine.connect() as conn:
            rows = conn.execute(
                text("""
                    SELECT ml.id, ml.logged_dish_name, ml.logged_calories,
                           ml.entry_source, ml.serving_multiplier, ml.logged_at
                    FROM meal_logs ml
                    JOIN users u ON u.id = ml.user_id
                    WHERE u.device_id = :did
                    ORDER BY ml.logged_at DESC
                    LIMIT :lim
                """),
                {"did": device_id, "lim": limit},
            ).fetchall()

        return [
            MealLogResponse(
                id=r[0],
                logged_dish_name=r[1],
                logged_calories=float(r[2]),
                entry_source=r[3],
                serving_multiplier=float(r[4]),
                logged_at=str(r[5]),
            )
            for r in rows
        ]
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve meal logs: {exc}")