from pydantic import BaseModel, Field, field_validator
from typing import Optional, Dict


class LabelRequest(BaseModel):
    """
    Mobile app request for nutrition label generation.
    
    Fields:
        dish_name: User's dish description (e.g., "chicken tikka masala")
        target_calories: Optional target calories for portion scaling
        style: Optional cuisine/prep style ("home", "restaurant", "fast_food")
    """
    dish_name: str = Field(
        ...,
        min_length=2,
        max_length=200,
        description="Dish name or description"
    )
    target_calories: Optional[float] = Field(
        None,
        gt=0,
        le=10000,
        description="Target calories for portion scaling"
    )
    style: Optional[str] = Field(
        None,
        max_length=50,
        description="Cuisine or preparation style: home, restaurant, or fast_food"
    )
    device_id: Optional[str] = Field(
        None,
        max_length=255,
        description="Mobile device UUID — when provided, the result is saved to meal_logs",
    )

    @field_validator('dish_name')
    @classmethod
    def validate_dish_name(cls, v: str) -> str:
        """Ensure dish name is not empty or whitespace-only."""
        if not v.strip():
            raise ValueError("Dish name cannot be empty")
        return v.strip()


class LabelResponse(BaseModel):
    """
    Mobile app response for nutrition label generation.
    
    Simple, stable JSON structure for mobile consumption.
    
    Fields:
        matched_dish: Name of the best-matching dish from database
        nutrition: Dictionary with calories, protein_g, carbs_g, fat_g, sugar_g, fiber_g, sodium_mg, potassium_mg (some nullable)
        confidence: Numeric confidence score [0.0, 1.0]
        explanation: Short human-readable explanation of confidence
    """
    matched_dish: str = Field(
        description="Best matching dish name from database"
    )
    nutrition: Dict[str, Optional[float]] = Field(
        description="Nutrition facts: calories, protein_g, carbs_g, fat_g, sugar_g (nullable), fiber_g (nullable), sodium_mg (nullable), potassium_mg (nullable)"
    )
    confidence: float = Field(
        ge=0.0,
        le=1.0,
        description="Confidence score [0.0, 1.0]"
    )
    explanation: str = Field(
        description="Short explanation of confidence level"
    )
    meal_log_id: Optional[int] = Field(
        None,
        description="meal_logs row ID created for this request (null when device_id was not provided)",
    )


# Internal schemas for service layer (not exposed to API)
class Nutrients(BaseModel):
    """Internal nutrition facts schema for service layer (all fields per 100 g)."""
    # Core macros — always present
    calories: float = Field(ge=0)
    protein_g: float = Field(ge=0)
    carbs_g: float = Field(ge=0)
    fat_g: float = Field(ge=0)
    # FDA-required micronutrients — optional because source data may be missing
    fiber_g: Optional[float] = Field(default=None, ge=0)
    sugar_g: Optional[float] = Field(default=None, ge=0)
    sodium_mg: Optional[float] = Field(default=None, ge=0)
    potassium_mg: Optional[float] = Field(default=None, ge=0)
    saturated_fat_g: Optional[float] = Field(default=None, ge=0)
    trans_fat_g: Optional[float] = Field(default=None, ge=0)
    cholesterol_mg: Optional[float] = Field(default=None, ge=0)
    vitamin_a_mcg: Optional[float] = Field(default=None, ge=0)
    vitamin_c_mg: Optional[float] = Field(default=None, ge=0)
    vitamin_d_mcg: Optional[float] = Field(default=None, ge=0)
    calcium_mg: Optional[float] = Field(default=None, ge=0)
    iron_mg: Optional[float] = Field(default=None, ge=0)


class Candidate(BaseModel):
    """Internal candidate schema for service layer."""
    dish_id: str
    name: str
    sim: float  # similarity score
    category: Optional[str] = None  # food category from dishes.category_name
    weight: Optional[float] = None
