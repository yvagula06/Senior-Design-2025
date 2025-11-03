from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional
from sqlalchemy import text
from app.db.session import engine

router = APIRouter()

class FeedbackRequest(BaseModel):
    dish_name: str = Field(..., max_length=100)
    target_calories: int
    correction: str = Field(..., max_length=500)
    too_salty: bool
    too_oily: bool
    selected_dish_id: Optional[str] = None

@router.post("/feedback")
def submit_feedback(feedback: FeedbackRequest):
    try:
        with engine.connect() as conn:
            insert_query = text("""
                INSERT INTO audit_logs (
                    query_text, target_calories, chosen_dishes, final_label, confidence, corrections
                ) VALUES (
                    :query_text, :target_calories, NULL, NULL, NULL, :corrections
                )
            """)
            import json
            feedback_data = {
                "correction": feedback.correction,
                "too_salty": feedback.too_salty,
                "too_oily": feedback.too_oily,
                "selected_dish_id": feedback.selected_dish_id
            }
            # Put feedback in chosen_dishes for now since there's no corrections column
            insert_query = text("""
                INSERT INTO audit_logs (
                    query_text, target_calories, chosen_dishes, final_label, confidence
                ) VALUES (
                    :query_text, :target_calories, :chosen_dishes, NULL, NULL
                )
            """)
            conn.execute(insert_query, {
                "query_text": feedback.dish_name,
                "target_calories": feedback.target_calories,
                "chosen_dishes": json.dumps(feedback_data)  # Store feedback in chosen_dishes as JSON
            })
        return {"ok": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to submit feedback: {str(e)}")