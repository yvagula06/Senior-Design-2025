from app.db.session import engine
from sqlalchemy import text
import random

# Sample data
data = [
    {
        "dish_id": "123e4567-e89b-12d3-a456-426614174001",
        "name": "Chicken Tikka Masala",
        "aliases": ["CTM", "Chicken Tikka"],
        "kcal": 400,
        "protein_g": 25,
        "carbs_g": 40,
        "fat_g": 15,
        "fiber_g": 5,
        "sugar_g": 10,
        "sodium_mg": 800
    }
]

def insert_test_data():
    with engine.connect() as conn:
        for dish in data:
            dish_insert = text("""
                INSERT INTO dishes (dish_id, name, aliases)
                VALUES (:dish_id, :name, :aliases)
                ON CONFLICT (dish_id) DO UPDATE SET
                    name = EXCLUDED.name,
                    aliases = EXCLUDED.aliases
            """)
            
            nutrients_insert = text("""
                INSERT INTO nutrients (dish_id, kcal, protein_g, carbs_g, fat_g, fiber_g, sugar_g, sodium_mg)
                VALUES (:dish_id, :kcal, :protein_g, :carbs_g, :fat_g, :fiber_g, :sugar_g, :sodium_mg)
                ON CONFLICT (dish_id) DO UPDATE SET
                    kcal = EXCLUDED.kcal,
                    protein_g = EXCLUDED.protein_g,
                    carbs_g = EXCLUDED.carbs_g,
                    fat_g = EXCLUDED.fat_g,
                    fiber_g = EXCLUDED.fiber_g,
                    sugar_g = EXCLUDED.sugar_g,
                    sodium_mg = EXCLUDED.sodium_mg
            """)
            
            conn.execute(dish_insert, {
                "dish_id": dish["dish_id"],
                "name": dish["name"],
                "aliases": dish.get("aliases", [])
            })
            
            conn.execute(nutrients_insert, {
                "dish_id": dish["dish_id"],
                "kcal": dish["kcal"],
                "protein_g": dish["protein_g"],
                "carbs_g": dish["carbs_g"],
                "fat_g": dish["fat_g"],
                "fiber_g": dish["fiber_g"],
                "sugar_g": dish["sugar_g"],
                "sodium_mg": dish["sodium_mg"]
            })
            
        print(f"Inserted {len(data)} test dishes")

if __name__ == "__main__":
    insert_test_data()