"""
Nutrition Mapper Service

Maps (dish_id, volume_ml) to calorie estimates by:
1. Retrieving dish from database via retrieval_service
2. Converting volume to weight using density assumptions
3. Scaling nutrition facts via scaling_service

This service integrates with existing nutrition pipeline.
"""

from typing import Any, Dict, Optional
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
    
    def map_by_name(
        self,
        dish_name: str,
        volume_ml: float,
        density_override: Optional[float] = None,
    ) -> Dict[str, Any]:
        """
        Map a dish name and volume to a calorie estimate.

        This is the primary entry point for the camera path.  The classifier
        returns a human-readable dish name; this method resolves it to the
        closest canonical DB record via pgvector semantic search, then
        scales the nutrient data by the estimated volume.

        Args:
            dish_name: Predicted or entered dish name (e.g. "grilled chicken")
            volume_ml: Estimated plate volume in millilitres
            density_override: Optional density (g/ml); default is name-derived

        Returns:
            Dict with calories, nutrients, dish_id, dish_name, success flag
        """
        try:
            results = retrieval_service.retrieve_candidates(
                dish_name=dish_name, k=1, similarity_threshold=0.0
            )
            if not results:
                return self._error_result(
                    dish_name, volume_ml, f"No DB match found for: '{dish_name}'"
                )
            candidate, nutrients = results[0]
            return self._map_with_candidate(candidate, nutrients, volume_ml, density_override)
        except Exception as exc:
            return self._error_result(dish_name, volume_ml, f"Nutrition mapping failed: {exc}")

    def map_to_calories(
        self,
        dish_id: str,
        volume_ml: float,
        density_override: Optional[float] = None,
    ) -> Dict[str, Any]:
        """
        Map a known DB dish_id and volume to a calorie estimate.

        Used when the caller already holds a verified BIGINT dish id
        (e.g. from a previous search result or confirmed meal log).

        Args:
            dish_id: Database dish primary key (as string)
            volume_ml: Estimated plate volume in millilitres
            density_override: Optional density (g/ml)

        Returns:
            Dict with calories, nutrients, dish_id, dish_name, success flag
        """
        try:
            candidate, nutrients = retrieval_service.get_dish_by_id(int(dish_id))
            return self._map_with_candidate(candidate, nutrients, volume_ml, density_override)
        except ValueError as exc:
            return self._error_result(dish_id, volume_ml, str(exc))
        except Exception as exc:
            return self._error_result(dish_id, volume_ml, f"Nutrition mapping failed: {exc}")

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _map_with_candidate(
        self,
        candidate: "Candidate",
        nutrients: "Nutrients",
        volume_ml: float,
        density_override: Optional[float],
    ) -> Dict[str, Any]:
        """Shared compute logic once we have a resolved (Candidate, Nutrients)."""
        density = density_override or self._estimate_density(candidate.name)
        estimated_weight_g = volume_ml * density

        # Dishes are stored as per-100 g values
        reference_weight_g = 100.0
        calories_per_g = nutrients.calories / reference_weight_g
        target_calories = calories_per_g * estimated_weight_g

        scaled = scaling_service.scale_nutrients(
            canonical_nutrients=nutrients,
            target_calories=target_calories,
            clamp=True,
        )

        return {
            "dish_id": candidate.dish_id,
            "dish_name": candidate.name,
            "calories": scaled.calories,
            "nutrients": {
                "protein_g":  scaled.protein_g,
                "carbs_g":    scaled.carbs_g,
                "fat_g":      scaled.fat_g,
                "fiber_g":    scaled.fiber_g,
                "sugar_g":    scaled.sugar_g,
                "sodium_mg":  scaled.sodium_mg,
            },
            "estimated_weight_g": estimated_weight_g,
            "volume_ml": volume_ml,
            "density_used": density,
            "success": True,
        }

    @staticmethod
    def _error_result(
        dish_ref: str, volume_ml: float, error: str
    ) -> Dict[str, Any]:
        return {
            "dish_id": dish_ref,
            "dish_name": "Unknown Dish",
            "calories": 0.0,
            "nutrients": {},
            "estimated_weight_g": 0.0,
            "volume_ml": volume_ml,
            "density_used": 0.0,
            "success": False,
            "error": error,
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


def map_by_name(
    dish_name: str,
    volume_ml: float,
    density_override: Optional[float] = None,
) -> Dict[str, Any]:
    """
    Resolve a dish name via semantic search then map to calories (convenience function).

    This is the correct entry point for the camera pipeline: the classifier
    returns a dish_name string, which is resolved to a real DB record through
    pgvector similarity search before nutrition scaling.

    Args:
        dish_name: Predicted or entered dish name
        volume_ml: Estimated plate volume in millilitres
        density_override: Optional density (g/ml)

    Returns:
        Calorie and nutrient data dict
    """
    mapper = get_nutrition_mapper()
    return mapper.map_by_name(dish_name, volume_ml, density_override)


def map_to_calories(
    dish_id: str,
    volume_ml: float,
    density_override: Optional[float] = None,
) -> Dict[str, Any]:
    """
    Map a known DB dish_id and volume to calories (convenience function).

    Args:
        dish_id: Database dish primary key (as string)
        volume_ml: Estimated plate volume in millilitres
        density_override: Optional density (g/ml)

    Returns:
        Calorie and nutrient data
    """
    mapper = get_nutrition_mapper()
    return mapper.map_to_calories(dish_id, volume_ml, density_override)
