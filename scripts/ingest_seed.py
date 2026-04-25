"""Ingest a seed CSV into the canonical flat-schema database.

Expected CSV columns (all optional except name and calories):
  name, calories, protein_g, fat_g, carbs_g, fiber_g, sugar_g,
  sodium_mg, potassium_mg, saturated_fat_g, trans_fat_g, cholesterol_mg,
  vitamin_a_mcg, vitamin_c_mg, vitamin_d_mcg, calcium_mg, iron_mg,
  serving_size_g, category_name, data_source

Usage:
    python -m scripts.ingest_seed <csv_file>
"""

import csv
import json
import os
import sys
from pathlib import Path
from typing import Optional

from sqlalchemy import create_engine, text
from sentence_transformers import SentenceTransformer

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    print("Error: DATABASE_URL not set.")
    sys.exit(1)

engine = create_engine(DATABASE_URL, future=True)


def _float(val) -> Optional[float]:
    if val is None or str(val).strip() in ('', 'na', 'n/a', 'null', 'NA'):
        return None
    try:
        return float(val)
    except (ValueError, TypeError):
        return None


def upsert_dish(conn, row: dict, model: SentenceTransformer) -> bool:
    """Insert dish + variant. Returns True if newly inserted."""
    name = row.get('name', '').strip()
    if not name:
        return False
    calories = _float(row.get('calories'))
    if calories is None:
        return False

    inserted = conn.execute(
        text("""
            INSERT INTO dishes (
                name, calories, protein_g, fat_g, carbs_g,
                fiber_g, sugar_g, sodium_mg, potassium_mg,
                saturated_fat_g, trans_fat_g, cholesterol_mg,
                vitamin_a_mcg, vitamin_c_mg, vitamin_d_mcg,
                calcium_mg, iron_mg,
                serving_size_g, category_name,
                data_source, confidence_score, is_active, version
            ) VALUES (
                :name, :calories, :protein_g, :fat_g, :carbs_g,
                :fiber_g, :sugar_g, :sodium_mg, :potassium_mg,
                :saturated_fat_g, :trans_fat_g, :cholesterol_mg,
                :vitamin_a_mcg, :vitamin_c_mg, :vitamin_d_mcg,
                :calcium_mg, :iron_mg,
                :serving_size_g, :category_name,
                :data_source, 0.9, TRUE, 1
            )
            ON CONFLICT DO NOTHING
            RETURNING id
        """),
        {
            'name': name,
            'calories': calories,
            'protein_g': _float(row.get('protein_g')) or 0.0,
            'fat_g': _float(row.get('fat_g')) or 0.0,
            'carbs_g': _float(row.get('carbs_g')) or 0.0,
            'fiber_g': _float(row.get('fiber_g')),
            'sugar_g': _float(row.get('sugar_g')),
            'sodium_mg': _float(row.get('sodium_mg')),
            'potassium_mg': _float(row.get('potassium_mg')),
            'saturated_fat_g': _float(row.get('saturated_fat_g')),
            'trans_fat_g': _float(row.get('trans_fat_g')),
            'cholesterol_mg': _float(row.get('cholesterol_mg')),
            'vitamin_a_mcg': _float(row.get('vitamin_a_mcg')),
            'vitamin_c_mg': _float(row.get('vitamin_c_mg')),
            'vitamin_d_mcg': _float(row.get('vitamin_d_mcg')),
            'calcium_mg': _float(row.get('calcium_mg')),
            'iron_mg': _float(row.get('iron_mg')),
            'serving_size_g': _float(row.get('serving_size_g')),
            'category_name': row.get('category_name') or None,
            'data_source': row.get('data_source') or 'seed',
        },
    ).fetchone()

    if not inserted:
        return False  # already existed

    dish_id = inserted[0]
    variant_text = name.lower()
    embedding = model.encode(variant_text).tolist()

    conn.execute(
        text("""
            INSERT INTO dish_variants
                (dish_id, variant_text, embedding, variant_type, language_code, search_count)
            VALUES
                (:dish_id, :vt, CAST(:emb AS vector), 'original', 'en', 0)
            ON CONFLICT DO NOTHING
        """),
        {'dish_id': dish_id, 'vt': variant_text, 'emb': json.dumps(embedding)},
    )
    return True


def main():
    if len(sys.argv) != 2:
        print("Usage: python -m scripts.ingest_seed <csv_file>")
        sys.exit(1)

    csv_file = Path(sys.argv[1])
    if not csv_file.exists():
        print(f"File not found: {csv_file}")
        sys.exit(1)

    print("Loading embedding model ...")
    model = SentenceTransformer('sentence-transformers/all-MiniLM-L6-v2')

    inserted = skipped = 0
    with engine.begin() as conn:
        with open(csv_file, newline='', encoding='utf-8') as f:
            for row in csv.DictReader(f):
                if upsert_dish(conn, row, model):
                    inserted += 1
                    print(f"  \u2705 {row.get('name')}")
                else:
                    skipped += 1

    print(f"\nInserted: {inserted}  |  Skipped/existing: {skipped}")


if __name__ == "__main__":
    main()
