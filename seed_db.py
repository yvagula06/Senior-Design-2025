"""Seed the database with sample dishes for development and testing.

Inserts into the canonical schema:
  dishes  +  dish_variants (with 384-dim embeddings)

Usage:
    DATABASE_URL=postgresql+psycopg://... python seed_db.py
"""

from sqlalchemy import create_engine, text
from sentence_transformers import SentenceTransformer
import os
import json

# Load embedding model
print("Loading embedding model...")
model = SentenceTransformer('sentence-transformers/all-MiniLM-L6-v2')

engine = create_engine(os.getenv('DATABASE_URL'))

# Sample dishes — all macros/micros are per 100 g
dishes = [
    {
        'name': 'Pizza', 'category_name': 'pizza',
        'calories': 266, 'protein_g': 11, 'fat_g': 10, 'carbs_g': 33,
        'fiber_g': 2.5, 'sugar_g': 3.6, 'sodium_mg': 598, 'potassium_mg': 172,
        'saturated_fat_g': 4.5, 'cholesterol_mg': 22,
    },
    {
        'name': 'Burger', 'category_name': 'burger',
        'calories': 295, 'protein_g': 17, 'fat_g': 14, 'carbs_g': 24,
        'fiber_g': 1.5, 'sugar_g': 5, 'sodium_mg': 497, 'potassium_mg': 230,
        'saturated_fat_g': 5.1, 'cholesterol_mg': 55,
    },
    {
        'name': 'Pasta', 'category_name': 'pasta',
        'calories': 131, 'protein_g': 5, 'fat_g': 1, 'carbs_g': 25,
        'fiber_g': 1.8, 'sugar_g': 0.6, 'sodium_mg': 1, 'potassium_mg': 44,
    },
    {
        'name': 'Garden Salad', 'category_name': 'salad',
        'calories': 33, 'protein_g': 2.8, 'fat_g': 0.2, 'carbs_g': 6.5,
        'fiber_g': 2.1, 'sugar_g': 2.9, 'sodium_mg': 65, 'potassium_mg': 218,
    },
    {
        'name': 'Chicken Tikka Masala', 'category_name': 'curry',
        'calories': 137, 'protein_g': 14, 'fat_g': 6, 'carbs_g': 7,
        'fiber_g': 1.2, 'sugar_g': 3, 'sodium_mg': 450, 'potassium_mg': 340,
        'saturated_fat_g': 2.0, 'cholesterol_mg': 52,
    },
    {
        'name': 'Grilled Chicken Breast', 'category_name': 'chicken',
        'calories': 165, 'protein_g': 31, 'fat_g': 3.6, 'carbs_g': 0,
        'fiber_g': 0, 'sugar_g': 0, 'sodium_mg': 74, 'potassium_mg': 256,
        'saturated_fat_g': 1.0, 'cholesterol_mg': 85,
    },
    {
        'name': 'Caesar Salad', 'category_name': 'salad',
        'calories': 190, 'protein_g': 4, 'fat_g': 17, 'carbs_g': 8,
        'fiber_g': 2, 'sugar_g': 2, 'sodium_mg': 380, 'potassium_mg': 150,
    },
    {
        'name': 'Spaghetti Carbonara', 'category_name': 'pasta',
        'calories': 350, 'protein_g': 13, 'fat_g': 15, 'carbs_g': 40,
        'fiber_g': 2, 'sugar_g': 1, 'sodium_mg': 450, 'potassium_mg': 140,
        'saturated_fat_g': 6.0, 'cholesterol_mg': 120,
    },
    {
        'name': 'Grilled Salmon', 'category_name': 'fish',
        'calories': 206, 'protein_g': 22, 'fat_g': 13, 'carbs_g': 0,
        'fiber_g': 0, 'sugar_g': 0, 'sodium_mg': 59, 'potassium_mg': 490,
        'saturated_fat_g': 3.1, 'cholesterol_mg': 63,
    },
    {
        'name': 'Greek Yogurt', 'category_name': 'dairy',
        'calories': 97, 'protein_g': 10, 'fat_g': 4, 'carbs_g': 3.6,
        'fiber_g': 0, 'sugar_g': 3.5, 'sodium_mg': 36, 'potassium_mg': 141,
        'saturated_fat_g': 2.5, 'cholesterol_mg': 14,
    },
]

with engine.begin() as conn:
    for dish in dishes:
        result = conn.execute(
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
                    :category_name, 'seed', 0.9, TRUE, 1
                )
                ON CONFLICT DO NOTHING
                RETURNING id
            """),
            {
                'name': dish['name'],
                'calories': dish['calories'],
                'protein_g': dish['protein_g'],
                'fat_g': dish['fat_g'],
                'carbs_g': dish['carbs_g'],
                'fiber_g': dish.get('fiber_g'),
                'sugar_g': dish.get('sugar_g'),
                'sodium_mg': dish.get('sodium_mg'),
                'potassium_mg': dish.get('potassium_mg'),
                'saturated_fat_g': dish.get('saturated_fat_g'),
                'cholesterol_mg': dish.get('cholesterol_mg'),
                'category_name': dish.get('category_name'),
            },
        )
        row = result.fetchone()
        if row is None:
            # Already exists — fetch id
            row = conn.execute(
                text("SELECT id FROM dishes WHERE LOWER(name) = LOWER(:name)"),
                {'name': dish['name']},
            ).fetchone()
        dish_id = row[0]

        # Skip variant if already present
        exists = conn.execute(
            text("SELECT 1 FROM dish_variants WHERE dish_id = :d AND variant_text = :t"),
            {'d': dish_id, 't': dish['name'].lower()},
        ).fetchone()
        if exists:
            print(f'\u23ed  Skipped (already seeded): {dish["name"]}')
            continue

        # Generate 384-dim embedding
        embedding = model.encode(dish['name'].lower()).tolist()

        # Insert variant with embedding cast to pgvector type
        conn.execute(
            text("""
                INSERT INTO dish_variants (dish_id, variant_text, embedding, language_code, search_count)
                VALUES (:id, :text, CAST(:emb AS vector), 'en', 0)
            """),
            {'id': dish_id, 'text': dish['name'].lower(), 'emb': json.dumps(embedding)},
        )
        print(f'\u2705 Added {dish["name"]}')

print('\n\u2705 Seed complete.')

