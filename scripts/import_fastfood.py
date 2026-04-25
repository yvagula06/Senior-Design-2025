"""
Import fast-food restaurant menu items into the canonical flat-schema database.

Canonical schema (no separate nutrients / embeddings tables):
  dishes         — flat nutrition table (all macros/micros inline)
  dish_variants  — one row per search alias, with 384-dim pgvector embedding

CSV columns: restaurant, item, calories, cal_fat, total_fat, sat_fat,
             trans_fat, cholesterol, sodium, total_carb, fiber, sugar,
             protein, vit_a, vit_c, calcium, salad

Notes:
- vit_a / vit_c / calcium are stored as % Daily Value in the CSV.
  Converted to actual units using FDA reference values:
    vitamin_a_mcg = pct * 900 / 100
    vitamin_c_mg  = pct * 90  / 100
    calcium_mg    = pct * 1300 / 100
- Name is formatted as "ITEM (Restaurant)" to match USDA "food (brand)" style.
- data_source is set to 'FastFood'.

Usage:
    python scripts/import_fastfood.py data/fastfood.csv
"""

import sys
import csv
import time
import json
import os
from pathlib import Path
from typing import List, Dict, Optional
import numpy as np
from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session
from sentence_transformers import SentenceTransformer
from tqdm import tqdm

BATCH_SIZE = 500
EMBED_BATCH_SIZE = 256

# FDA Daily Values used for % DV → unit conversion
DV_VITAMIN_A_MCG = 900.0
DV_VITAMIN_C_MG  = 90.0
DV_CALCIUM_MG    = 1300.0


def normalize_value(value: str) -> Optional[float]:
    """Convert string to float, return None if invalid."""
    if not value or value.strip() in ('', 'NA', 'N/A', 'null', 'NULL'):
        return None
    try:
        return float(value)
    except (ValueError, TypeError):
        return None


def clamp_value(value: Optional[float], max_val: float = 999999.99) -> Optional[float]:
    """Clamp to NUMERIC(8,2) safe range; nulls implausibly large values."""
    if value is None:
        return None
    return None if abs(value) > max_val else value


def normalize_name(name: str) -> str:
    return name.strip()[:255]


def pct_dv_to_amount(pct_str: str, dv: float) -> Optional[float]:
    """Convert a % Daily Value string to an actual amount."""
    pct = normalize_value(pct_str)
    if pct is None:
        return None
    return clamp_value(round(pct * dv / 100.0, 2))


def parse_fastfood_row(row: Dict[str, str]) -> Optional[Dict]:
    """Parse a fastfood CSV row into canonical dishes schema."""
    item = row.get('item', '').strip()
    restaurant = row.get('restaurant', '').strip()

    if not item:
        return None

    # "Artisan Grilled Chicken Sandwich (Mcdonalds)" — matches USDA style
    full_name = normalize_name(f"{item} ({restaurant})" if restaurant else item)

    calories = clamp_value(normalize_value(row.get('calories')))
    if calories is None:
        return None

    return {
        'name': full_name,
        'calories': calories,
        'protein_g':       clamp_value(normalize_value(row.get('protein'))) or 0.0,
        'fat_g':           clamp_value(normalize_value(row.get('total_fat'))) or 0.0,
        'carbs_g':         clamp_value(normalize_value(row.get('total_carb'))) or 0.0,
        'fiber_g':         clamp_value(normalize_value(row.get('fiber'))),
        'sugar_g':         clamp_value(normalize_value(row.get('sugar'))),
        'sodium_mg':       clamp_value(normalize_value(row.get('sodium'))),
        'potassium_mg':    None,
        'saturated_fat_g': clamp_value(normalize_value(row.get('sat_fat'))),
        'trans_fat_g':     clamp_value(normalize_value(row.get('trans_fat'))),
        'cholesterol_mg':  clamp_value(normalize_value(row.get('cholesterol'))),
        'vitamin_a_mcg':   pct_dv_to_amount(row.get('vit_a', ''), DV_VITAMIN_A_MCG),
        'vitamin_c_mg':    pct_dv_to_amount(row.get('vit_c', ''), DV_VITAMIN_C_MG),
        'vitamin_d_mcg':   None,
        'calcium_mg':      pct_dv_to_amount(row.get('calcium', ''), DV_CALCIUM_MG),
        'iron_mg':         None,
        'data_source':     'FastFood',
        'confidence_score': 0.95,
        'is_active':       True,
        'version':         1,
        '_variant_text':   item.lower(),
    }


def load_embedding_model() -> SentenceTransformer:
    print("Loading embedding model: sentence-transformers/all-MiniLM-L6-v2")
    return SentenceTransformer('sentence-transformers/all-MiniLM-L6-v2')


def generate_embeddings(texts: List[str], model: SentenceTransformer) -> List[List[float]]:
    embeddings = model.encode(texts, normalize_embeddings=False, show_progress_bar=False)
    if isinstance(embeddings, np.ndarray):
        return [vec.astype(np.float32).tolist() for vec in embeddings]
    return [list(map(float, vec)) for vec in embeddings]


def process_batch(batch_dishes: List[Dict], model: SentenceTransformer, engine) -> int:
    if not batch_dishes:
        return 0

    variant_texts = [d['_variant_text'] for d in batch_dishes]
    embeddings = generate_embeddings(variant_texts, model)

    with Session(engine) as session:
        try:
            inserted_count = 0
            for dish_data, embedding in zip(batch_dishes, embeddings):
                variant_text = dish_data.pop('_variant_text')

                result = session.execute(
                    text("""
                        INSERT INTO dishes (
                            name, calories, protein_g, fat_g, carbs_g,
                            fiber_g, sugar_g, sodium_mg, potassium_mg,
                            saturated_fat_g, trans_fat_g, cholesterol_mg,
                            vitamin_a_mcg, vitamin_c_mg, vitamin_d_mcg,
                            calcium_mg, iron_mg,
                            data_source, confidence_score, is_active, version
                        ) VALUES (
                            :name, :calories, :protein_g, :fat_g, :carbs_g,
                            :fiber_g, :sugar_g, :sodium_mg, :potassium_mg,
                            :saturated_fat_g, :trans_fat_g, :cholesterol_mg,
                            :vitamin_a_mcg, :vitamin_c_mg, :vitamin_d_mcg,
                            :calcium_mg, :iron_mg,
                            :data_source, :confidence_score, :is_active, :version
                        )
                        RETURNING id
                    """),
                    dish_data,
                )
                dish_id = result.fetchone()[0]

                session.execute(
                    text("""
                        INSERT INTO dish_variants
                            (dish_id, variant_text, embedding, variant_type,
                             language_code, search_count)
                        VALUES
                            (:dish_id, :variant_text, CAST(:embedding AS vector),
                             'original', 'en', 0)
                        ON CONFLICT DO NOTHING
                    """),
                    {
                        'dish_id': dish_id,
                        'variant_text': variant_text,
                        'embedding': json.dumps(embedding),
                    },
                )
                inserted_count += 1

            session.commit()
            return inserted_count

        except Exception as e:
            session.rollback()
            print(f"❌ Error processing batch: {e}")
            return 0


def import_dishes(csv_path: Path, engine, model: SentenceTransformer):
    if not csv_path.exists():
        print(f"❌ Error: File not found: {csv_path}")
        return

    file_size = csv_path.stat().st_size / (1024 * 1024)
    print(f"\n📂 Reading from: {csv_path}")
    print(f"📦 File size: {file_size:.1f} MB\n")

    print("🔍 Checking existing dishes in database...")
    with Session(engine) as session:
        existing_names = set(
            session.execute(text("SELECT LOWER(name) FROM dishes")).scalars().all()
        )
    print(f"✅ Found {len(existing_names):,} existing dishes\n")
    print("🚀 Starting import...\n")

    total_processed = 0
    total_inserted = 0
    total_skipped = 0
    batch_dishes = []
    start_time = time.time()

    with open(csv_path, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)

        pbar = tqdm(
            desc="Importing", unit=" rows",
            bar_format="{desc}: {n_fmt} rows | ✅ {postfix[0]} inserted | ⏭️ {postfix[1]} skipped | {rate_fmt}",
            postfix=[0, 0],
        )

        for row in reader:
            total_processed += 1
            dish_data = parse_fastfood_row(row)

            if not dish_data:
                total_skipped += 1
                pbar.postfix = [f"{total_inserted:,}", f"{total_skipped:,}"]
                pbar.update(1)
                continue

            if dish_data['name'].lower() in existing_names:
                total_skipped += 1
                pbar.postfix = [f"{total_inserted:,}", f"{total_skipped:,}"]
                pbar.update(1)
                continue

            existing_names.add(dish_data['name'].lower())
            batch_dishes.append(dish_data)

            if len(batch_dishes) >= BATCH_SIZE:
                inserted = process_batch(batch_dishes, model, engine)
                total_inserted += inserted
                batch_dishes = []

            pbar.postfix = [f"{total_inserted:,}", f"{total_skipped:,}"]
            pbar.update(1)

        pbar.close()

        if batch_dishes:
            print("\n🔄 Processing final batch...")
            inserted = process_batch(batch_dishes, model, engine)
            total_inserted += inserted

    elapsed = time.time() - start_time
    print(f"\n{'='*70}")
    print("✅ Import complete!")
    print(f"   Total processed: {total_processed:,}")
    print(f"   Total inserted:  {total_inserted:,}")
    print(f"   Total skipped:   {total_skipped:,}")
    print(f"   Time elapsed:    {elapsed:.1f}s ({total_processed/max(elapsed, 1):.0f} rows/sec)")
    print(f"{'='*70}")


def main():
    if len(sys.argv) < 2:
        print("Usage: python scripts/import_fastfood.py data/fastfood.csv")
        sys.exit(1)

    csv_path = Path(sys.argv[1])

    DATABASE_URL = os.getenv("DATABASE_URL")
    if not DATABASE_URL:
        print("❌ ERROR: DATABASE_URL not set")
        sys.exit(1)

    engine = create_engine(DATABASE_URL, pool_pre_ping=True)

    with engine.connect() as conn:
        conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
        conn.commit()

    print("🤖 Loading embedding model...")
    model = load_embedding_model()
    print("✅ Model loaded!\n")

    import_dishes(csv_path, engine, model)


if __name__ == "__main__":
    main()
