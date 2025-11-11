from fastapi import APIRouter, HTTPException, Query
from typing import List
from app.schemas.label import Candidate
from app.services.retrieval_service import retrieve_candidates

router = APIRouter()

@router.get("/search", response_model=List[Candidate])
def search_dishes(q: str = Query(..., min_length=1), k: int = Query(10, ge=1, le=50)):
    try:
        candidates = retrieve_candidates(q, k)
        # Return just the candidates (first item in each tuple)
        return [c for c, _ in candidates] if candidates else []
    except Exception as e:
        # For development, print more details
        import traceback
        traceback.print_exc()
        # Return empty list instead of error during development
        return []
