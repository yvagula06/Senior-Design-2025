"""
Populate the database with a representative set of sample dishes.
Uses the canonical flat schema: dishes + dish_variants (no nutrients / embeddings tables).

Usage:
    DATABASE_URL=postgresql+psycopg://postgres:postgres@localhost:5432/nutrition \\
        python scripts/populate_db_simple.py
"""

import json
import os
import sys

from sqlalchemy import create_engine, text
from sentence_transformers import SentenceTransformer

SAMPLE_DISHES = [
    {"name": "Chicken Tikka Masala", "category_name": "curry",
     "calories": 250, "protein_g": 20, "fat_g": 15, "carbs_g": 12,
     "fiber_g": 2, "sugar_g": 6, "sodium_mg": 680, "potassium_mg": 340,
     "saturated_fat_g": 5.0, "cholesterol_mg": 75},
    {"name": "Grilled Chicken Breast", "category_name": "chicken",
     "calories": 165, "protein_g": 31, "fat_g": 3.6, "carbs_g": 0,
     "fiber_g": 0, "sugar_g": 0, "sodium_mg": 74, "potassium_mg": 256,
     "saturated_fat_g": 1.0, "cholesterol_mg": 85},
    {"name": "Caesar Salad", "category_name": "salad",
     "calories": 200, "protein_g": 5, "fat_g": 15, "carbs_g": 12,
     "fiber_g": 3, "sugar_g": 2, "sodium_mg": 400, "potassium_mg": 150},
    {"name": "Spaghetti Carbonara", "category_name": "pasta",
     "calories": 450, "protein_g": 18, "fat_g": 18, "carbs_g": 55,
     "fiber_g": 3, "sugar_g": 3, "sodium_mg": 550, "potassium_mg": 180,
     "saturated_fat_g": 6.0, "cholesterol_mg": 120},
    {"name": "Big Mac", "category_name": "burger",
     "calories": 563, "protein_g": 26, "fat_g": 33, "carbs_g": 46,
     "fiber_g": 3, "sugar_g": 9, "sodium_mg": 1007, "potassium_mg": 400,
     "saturated_fat_g": 11.0, "cholesterol_mg": 80},
    {"name": "Pepperoni Pizza", "category_name": "pizza",
     "calories": 298, "protein_g": 12, "fat_g": 11, "carbs_g": 36,
     "fiber_g": 2, "sugar_g": 4, "sodium_mg": 698, "potassium_mg": 200},
    {"name": "Greek Salad", "category_name": "salad",
     "calories": 150, "protein_g": 4, "fat_g": 12, "carbs_g": 8,
     "fiber_g": 3, "sugar_g": 4, "sodium_mg": 400, "potassium_mg": 220},
    {"name": "Fish and Chips", "category_name": "fish",
     "calories": 585, "protein_g": 32, "fat_g": 29, "carbs_g": 51,
     "fiber_g": 4, "sugar_g": 2, "sodium_mg": 1200, "potassium_mg": 350,
     "saturated_fat_g": 6.0, "cholesterol_mg": 90},
    {"name": "Pad Thai", "category_name": "noodles",
     "calories": 350, "protein_g": 15, "fat_g": 14, "carbs_g": 40,
     "fiber_g": 3, "sugar_g": 12, "sodium_mg": 800, "potassium_mg": 210},
    {"name": "Burrito Bowl", "category_name": "mexican",
     "calories": 450, "protein_g": 25, "fat_g": 15, "carbs_g": 50,
     "fiber_g": 10, "sugar_g": 5, "sodium_mg": 950, "potassium_mg": 450},
    {"name": "Grilled Salmon", "category_name": "fish",
     "calories": 206, "protein_g": 22, "fat_g": 13, "carbs_g": 0,
     "fiber_g": 0, "sugar_g": 0, "sodium_mg": 59, "potassium_mg": 490,
     "saturated_fat_g": 3.1, "cholesterol_mg": 63},
    {"name": "Vegetable Stir Fry", "category_name": "vegetarian",
     "calories": 150, "protein_g": 5, "fat_g": 8, "carbs_g": 16,
     "fiber_g": 4, "sugar_g": 6, "sodium_mg": 450, "potassium_mg": 380},
]


def main():
    DATABASE_URL = os.getenv("DATABASE_URL")
    if not DATABASE_URL:
        print("\u274c DATABASE_URL not set")
        sys.exit(1)

    print("Loading embedding model ...")
    model = SentenceTransformer('sentence-transformers/all-MiniLM-L6-v2')
    print("Model loaded.\n")

    engine = create_engine(DATABASE_URL, future=True)

    inserted = 0
    with engine.begin() as conn:
        for dish in SAMPLE_DISHES:
            row = conn.execute(
                text("""
                    INSERT INTO dishes (
                        name, calories, protein_g, fat_g, carbs_g,
                        fiber_g, sugar_g, sodium_mg, potassium_mg,
                        saturated_fat_g, cholesterol_mg,
                        category_name, data_source, confidence_score, is_active, version
                    ) VALUES (
                        :name, :calories, :protein_g, :fat_g, :carbs_g,
                        :fiber_g, :sugar_g, :sodium_mg, :potassium_mg,
                        :saturated_fat_g, :cholesterol_mg,
                        :category_name, 'sample', 0.9, TRUE, 1
                    )
                    ON CONFLICT DO NOTHING
                    RETURNING id
                """),
                {
                    "name": dish["name"],
                    "calories": dish["calories"],
                    "protein_g": dish["protein_g"],
                    "fat_g": dish["fat_g"],
                    "carbs_g": dish["carbs_g"],
                    "fiber_g": dish.get("fiber_g"),
                    "sugar_g": dish.get("sugar_g"),
                    "sodium_mg": dish.get("sodium_mg"),
                    "potassium_mg": dish.get("potassium_mg"),
                    "saturated_fat_g": dish.get("saturated_fat_g"),
                    "cholesterol_mg": dish.get("cholesterol_mg"),
                    "category_name": dish.get("category_name"),
                },
            ).fetchone()

            if row is None:
                print(f"  \u23ed  {dish['name']} (already exists)")
                continue

            dish_id = row[0]
            variant_text = dish["name"].lower()
            embedding = model.encode(variant_text).tolist()

            conn.execute(
                text("""
                    INSERT INTO dish_variants
                        (dish_id, variant_text, embedding, variant_type,
                         language_code, search_count)
                    VALUES
                        (:d, :t, CAST(:emb AS vector), 'original', 'en', 0)
                    ON CONFLICT DO NOTHING
                """),
                {"d": dish_id, "t": variant_text, "emb": json.dumps(embedding)},
            )
            inserted += 1
            print(f"  \u2705 {dish['name']}")

    print(f"\n\u2705 {inserted} dishes inserted.")

    with engine.connect() as conn:
        counts = {
            t: conn.execute(text(f"SELECT COUNT(*) FROM {t}")).scalar()
            for t in ("dishes", "dish_variants")
        }
    print(f"\nDB totals \u2014 dishes: {counts['dishes']:,}  |  variants: {counts['dish_variants']:,}")


if __name__ == "__main__":
    main()
