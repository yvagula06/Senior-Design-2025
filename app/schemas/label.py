from pydantic import BaseModel, Field
from typing import List, Optional

class LabelRequest(BaseModel):
    dish_name: str
    calories: float = Field(gt=0)
    prefer_restaurant_style: bool = False
    top_k: int = 5
    use_mixture: bool = True

class Nutrients(BaseModel):
    calories: float
    protein_g: Optional[float] = None
    carbs_g: Optional[float] = None
    fat_g: Optional[float] = None
    fiber_g: Optional[float] = None
    sugar_g: Optional[float] = None
    sodium_mg: Optional[float] = None

class Candidate(BaseModel):
    dish_id: str
    name: str
    sim: float
    weight: Optional[float] = None

class LabelResponse(BaseModel):
    nutrients: Nutrients
    confidence: float
    assumptions: str
    candidates: List[Candidate]
