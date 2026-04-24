"""Insert sample dishes for testing/development.

Inserts into the canonical flat-schema tables:
  dishes  +  dish_variants (with 384-dim embeddings)

Safe to run multiple times — skips existing dishes.
"""

from app.db.session import engine
from sentence_transformers import SentenceTransformer
from sqlalchemy import text
import json

# name, cal, protein_g, fat_g, carbs_g, fiber_g, sugar_g, sodium_mg, potassium_mg
sample_dishes = [
    ("Grilled Chicken Breast", 165, 31.0, 3.6,  0.0, 0.0, 0.0,  74.0, 256.0),
    ("Caesar Salad",           190,  4.0, 17.0,  8.0, 2.0, 2.0, 380.0, 150.0),
    ("Spaghetti Carbonara",    350, 13.0, 15.0, 40.0, 2.0, 1.0, 450.0, 140.0),
    ("Grilled Salmon",         206, 22.0, 13.0,  0.0, 0.0, 0.0,  59.0, 490.0),
    ("Greek Yogurt",            97, 10.0,  4.0,  3.6, 0.0, 3.5,  36.0, 141.0),
    ("Avocado Toast",          240,  6.0, 13.0, 25.0, 7.0, 1.5, 340.0, 280.0),
    ("Chicken Tikka Masala",   250, 20.0, 15.0, 12.0, 2.0, 6.0, 680.0, 340.0),
    ("Beef Burger",            295, 17.0, 14.0, 24.0, 1.5, 4.0, 497.0, 230.0),
    ("Margherita Pizza",       266, 11.0, 10.0, 33.0, 2.0, 4.0, 598.0, 172.0),
    ("Fruit Smoothie",         150,  3.0,  1.0, 35.0, 4.0, 28.0, 45.0, 320.0),
]

print("Loading embedding model...")
model = SentenceTransformer('sentence-transformers/all-MiniLM-L6-v2')
print("Model loaded.\n")

with engine.begin() as conn:
    result = conn.execute(text("SELECT COUNT(*) FROM dishes"))
    existing = result.scalar()
    print(f"Current dishes in DB: {existing}")

    inserted = 0
    for name, cal, protein, fat, carbs, fiber, sugar, sodium, potassium in sample_dishes:
        row = conn.execute(
            text("""
                INSERT INTO dishes (
                    name, calories, protein_g, fat_g, carbs_g,
                    fiber_g, sugar_g, sodium_mg, potassium_mg,
                    data_source, confidence_score, is_active, version
                ) VALUES (
                    :name, :cal, :protein, :fat, :carbs,
                    :fiber, :sugar, :sodium, :potassium,
                    'sample', 0.9, TRUE, 1
                )
                ON CONFLICT DO NOTHING
                RETURNING id
            """),
            {
                "name": name,
                "cal": cal, "protein": protein, "fat": fat, "carbs": carbs,
                "fiber": fiber, "sugar": sugar, "sodium": sodium, "potassium": potassium,
            },
        ).fetchone()

        if row is None:
            # Already existed — fetch id
            row = conn.execute(
                text("SELECT id FROM dishes WHERE LOWER(name) = LOWER(:n)"),
                {"n": name},
            ).fetchone()
            dish_id = row[0]
        else:
            dish_id = row[0]
            inserted += 1

        # Add variant + embedding if missing
        variant_text = name.lower()
        already_has_variant = conn.execute(
            text("SELECT 1 FROM dish_variants WHERE dish_id = :d AND variant_text = :t"),
            {"d": dish_id, "t": variant_text},
        ).fetchone()
        if not already_has_variant:
            embedding = model.encode(variant_text).tolist()
            conn.execute(
                text("""
                    INSERT INTO dish_variants
                        (dish_id, variant_text, embedding, language_code, search_count)
                    VALUES
                        (:d, :t, CAST(:emb AS vector), 'en', 0)
                    ON CONFLICT DO NOTHING
                """),
                {"d": dish_id, "t": variant_text, "emb": json.dumps(embedding)},
            )

    print(f"Inserted {inserted} new dishes (skipped {len(sample_dishes) - inserted} existing).")

with engine.connect() as conn:
    total = conn.execute(text("SELECT COUNT(*) FROM dishes")).scalar()
print(f"\nTotal dishes now: {total}")
