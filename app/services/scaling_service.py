from app.schemas.label import Nutrients

def scale_nutrients(n0: Nutrients, target_calories: float) -> Nutrients:
    s = target_calories / max(n0.calories, 1e-6)
    def mul(x): return None if x is None else x * s
    return Nutrients(
        calories=target_calories,
        protein_g=mul(n0.protein_g),
        carbs_g=mul(n0.carbs_g),
        fat_g=mul(n0.fat_g),
        fiber_g=mul(n0.fiber_g),
        sugar_g=mul(n0.sugar_g),
        sodium_mg=mul(n0.sodium_mg),
    )
