"""Insert a small set of test dishes into the canonical schema.

Uses dishes + dish_variants.  Safe to run multiple times (ON CONFLICT DO NOTHING).
"""

import json
from app.db.session import engine
from sentence_transformers import SentenceTransformer
from sqlalchemy import text

TEST_DISHES = [
    {
        "name": "Chicken Tikka Masala",
        "calories": 250.0, "protein_g": 20.0, "fat_g": 15.0, "carbs_g": 12.0,
        "fiber_g": 2.0, "sugar_g": 6.0, "sodium_mg": 680.0, "potassium_mg": 340.0,
        "saturated_fat_g": 5.0, "cholesterol_mg": 75.0,
        "category_name": "curry", "data_source": "test",
    },
    {
        "name": "Spaghetti Bolognese",
        "calories": 300.0, "protein_g": 18.0, "fat_g": 10.0, "carbs_g": 38.0,
        "fiber_g": 3.0, "sugar_g": 5.0, "sodium_mg": 520.0, "potassium_mg": 280.0,
        "saturated_fat_g": 3.5, "cholesterol_mg": 45.0,
        "category_name": "pasta", "data_source": "test",
    },
    {
        "name": "Grilled Salmon Fillet",
        "calories": 208.0, "protein_g": 23.0, "fat_g": 13.0, "carbs_g": 0.0,
        "fiber_g": 0.0, "sugar_g": 0.0, "sodium_mg": 59.0, "potassium_mg": 490.0,
        "saturated_fat_g": 3.1, "cholesterol_mg": 63.0,
        "category_name": "fish", "data_source": "test",
    },
]

print("Loading embedding model...")
model = SentenceTransformer('sentence-transformers/all-MiniLM-L6-v2')

with engine.begin() as conn:
    for dish in TEST_DISHES:
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
                    :category_name, :data_source, 0.9, TRUE, 1
                )
                ON CONFLICT DO NOTHING
                RETURNING id
            """),
            dish,
        ).fetchone()

        if row is None:
            row = conn.execute(
                text("SELECT id FROM dishes WHERE LOWER(name) = LOWER(:n)"),
                {"n": dish["name"]},
            ).fetchone()

        dish_id = row[0]
        variant_text = dish["name"].lower()
        embedding = model.encode(variant_text).tolist()

        conn.execute(
            text("""
                INSERT INTO dish_variants
                    (dish_id, variant_text, embedding, variant_type, language_code, search_count)
                VALUES
                    (:d, :t, CAST(:emb AS vector), 'original', 'en', 0)
                ON CONFLICT DO NOTHING
            """),
            {"d": dish_id, "t": variant_text, "emb": json.dumps(embedding)},
        )
        print(f"\u2705 {dish['name']}")

print("\nTest data inserted.")
