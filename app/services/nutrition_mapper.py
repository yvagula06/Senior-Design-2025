"""
Nutrition Mapper Service

Maps (dish_id, volume_ml) to calorie estimates by:
1. Retrieving dish from database via retrieval_service
2. Converting volume to weight using density assumptions
3. Scaling nutrition facts via scaling_service

This service integrates with existing nutrition pipeline.
"""

from typing import Dict, Optional, Tuple
from app.services import retrieval_service, scaling_service
from app.schemas.label import Candidate, Nutrients


# Density assumptions for common food categories (g/ml)
# These are rough estimates for volume-to-weight conversion
DENSITY_DEFAULTS = {
    "liquid": 1.0,      # Water-like liquids
    "solid": 0.6,       # Dense solids (meat, vegetables)
    "grain": 0.7,       # Rice, pasta, bread
    "default": 0.65     # Generic density
}


class NutritionMapper:
    """Maps dish_id and volume to calorie estimates."""
    
    def __init__(self):
        """Initialize nutrition mapper."""
        pass
    
    def map_to_calories(
        self,
        dish_id: str,
        volume_ml: float,
        density_override: Optional[float] = None
    ) -> Dict[str, any]:
        """
        Map dish_id and volume to calorie estimate.
        
        Args:
            dish_id: Database dish identifier
            volume_ml: Estimated volume in milliliters
            density_override: Optional density (g/ml) for conversion
            
        Returns:
            Dict with calories, nutrients, and metadata
        """
        try:
            # Retrieve dish from database
            candidate, nutrients = retrieval_service.get_dish_by_id(int(dish_id))
            
            # Convert volume to weight
            density = density_override or self._estimate_density(candidate.name)
            estimated_weight_g = volume_ml * density
            
            # Get reference serving size (assume database is per 100g)
            reference_weight_g = 100.0
            
            # Calculate target calories based on weight
            calories_per_g = nutrients.calories / reference_weight_g
            target_calories = calories_per_g * estimated_weight_g
            
            # Scale all nutrients proportionally
            scaled_nutrients = scaling_service.scale_nutrients(
                canonical_nutrients=nutrients,
                target_calories=target_calories,
                clamp=True
            )
            
            return {
                "dish_id": dish_id,
                "dish_name": candidate.name,
                "calories": scaled_nutrients.calories,
                "nutrients": {
                    "protein_g": scaled_nutrients.protein_g,
                    "carbs_g": scaled_nutrients.carbs_g,
                    "fat_g": scaled_nutrients.fat_g,
                    "fiber_g": scaled_nutrients.fiber_g,
                    "sugar_g": scaled_nutrients.sugar_g,
                    "sodium_mg": scaled_nutrients.sodium_mg,
                },
                "estimated_weight_g": estimated_weight_g,
                "volume_ml": volume_ml,
                "density_used": density,
                "success": True
            }
            
        except ValueError as e:
            # Dish not found in database
            return {
                "dish_id": dish_id,
                "dish_name": "Unknown Dish",
                "calories": 0.0,
                "nutrients": {},
                "estimated_weight_g": 0.0,
                "volume_ml": volume_ml,
                "density_used": 0.0,
                "success": False,
                "error": str(e)
            }
        except Exception as e:
            # Other errors
            return {
                "dish_id": dish_id,
                "dish_name": "Error",
                "calories": 0.0,
                "nutrients": {},
                "estimated_weight_g": 0.0,
                "volume_ml": volume_ml,
                "density_used": 0.0,
                "success": False,
                "error": f"Nutrition mapping failed: {str(e)}"
            }
    
    def _estimate_density(self, dish_name: str) -> float:
        """
        Estimate food density from dish name.
        
        Args:
            dish_name: Name of the dish
            
        Returns:
            Density in g/ml
        """
        dish_lower = dish_name.lower()
        
        # Liquid-based dishes
        if any(word in dish_lower for word in ["soup", "smoothie", "juice", "broth", "sauce"]):
            return DENSITY_DEFAULTS["liquid"]
        
        # Grain-based dishes
        if any(word in dish_lower for word in ["rice", "pasta", "noodle", "bread", "cereal"]):
            return DENSITY_DEFAULTS["grain"]
        
        # Solid dishes (meat, vegetables, etc.)
        if any(word in dish_lower for word in ["chicken", "beef", "pork", "fish", "salad", "steak"]):
            return DENSITY_DEFAULTS["solid"]
        
        # Default
        return DENSITY_DEFAULTS["default"]


# Singleton instance
_nutrition_mapper_instance = None


def get_nutrition_mapper() -> NutritionMapper:
    """Get or create singleton nutrition mapper instance."""
    global _nutrition_mapper_instance
    if _nutrition_mapper_instance is None:
        _nutrition_mapper_instance = NutritionMapper()
    return _nutrition_mapper_instance


def map_to_calories(
    dish_id: str,
    volume_ml: float,
    density_override: Optional[float] = None
) -> Dict[str, any]:
    """
    Map dish and volume to calories (convenience function).
    
    Args:
        dish_id: Database dish identifier
        volume_ml: Estimated volume in milliliters
        density_override: Optional density (g/ml) for conversion
        
    Returns:
        Calorie and nutrient data
    """
    mapper = get_nutrition_mapper()
    return mapper.map_to_calories(dish_id, volume_ml, density_override)
