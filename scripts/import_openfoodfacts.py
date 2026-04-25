"""
Import Open Food Facts (OFF) products into the canonical flat-schema database.

Source: https://static.openfoodfacts.org/data/en.openfoodfacts.org.products.csv.gz
Format: tab-separated, gzip compressed, ~3.5M rows

All nutrient values in OFF are per 100g — same convention as USDA branded foods.

Column mapping:
  product_name          → name (+ brand in parentheses if present)
  brands                → appended to name
  energy-kcal_100g      → calories
  proteins_100g         → protein_g
  fat_100g              → fat_g
  carbohydrates_100g    → carbs_g
  fiber_100g            → fiber_g
  sugars_100g           → sugar_g
  sodium_100g           → sodium_mg  (OFF stores in g/100g → multiply × 1000)
  potassium_100g        → potassium_mg (same conversion)
  saturated-fat_100g    → saturated_fat_g
  trans-fat_100g        → trans_fat_g
  cholesterol_100g      → cholesterol_mg (g → mg × 1000)
  vitamin-a_100g        → vitamin_a_mcg  (g → mcg × 1,000,000)
  vitamin-c_100g        → vitamin_c_mg   (g → mg × 1000)
  vitamin-d_100g        → vitamin_d_mcg  (g → mcg × 1,000,000)
  calcium_100g          → calcium_mg     (g → mg × 1000)
  iron_100g             → iron_mg        (g → mg × 1000)

Usage:
    python scripts/import_openfoodfacts.py data/openfoodfacts.csv.gz [--limit N]
"""

import sys
import csv
import gzip
import time
import json
import os
import argparse
from pathlib import Path
from typing import List, Dict, Optional
import numpy as np

# OFF CSV has some very large fields (ingredient lists, etc.)
csv.field_size_limit(10 * 1024 * 1024)  # 10 MB
from sqlalchemy import create_engine, text  # noqa: E402
from sqlalchemy.orm import Session  # noqa: E402
from sentence_transformers import SentenceTransformer  # noqa: E402
from tqdm import tqdm  # noqa: E402

BATCH_SIZE = 500
EMBED_BATCH_SIZE = 256


def normalize_value(value: str) -> Optional[float]:
    if not value or value.strip() in ('', 'NA', 'N/A', 'null', 'NULL', 'None'):
        return None
    try:
        return float(value)
    except (ValueError, TypeError):
        return None


def clamp_value(value: Optional[float], max_val: float = 999999.99) -> Optional[float]:
    if value is None:
        return None
    if value < 0:
        return None
    return None if value > max_val else value


def g_to_mg(value: Optional[float]) -> Optional[float]:
    """Convert g/100g to mg/100g."""
    return clamp_value(value * 1000) if value is not None else None


def g_to_mcg(value: Optional[float]) -> Optional[float]:
    """Convert g/100g to mcg/100g."""
    return clamp_value(value * 1_000_000) if value is not None else None


def normalize_name(name: str) -> str:
    return name.strip()[:255]


def parse_off_row(row: Dict[str, str]) -> Optional[Dict]:
    """Parse an Open Food Facts row into canonical dishes schema."""
    name = row.get('product_name', '').strip()
    brand = row.get('brands', '').strip()

    if not name:
        return None

    # Clean brand — OFF sometimes has comma-separated multiple brands; use first
    brand = brand.split(',')[0].strip() if brand else ''
    full_name = normalize_name(f"{name} ({brand})" if brand else name)

    calories = clamp_value(normalize_value(row.get('energy-kcal_100g')))
    if calories is None:
        return None

    # OFF sodium/potassium/cholesterol are in g/100g → convert to mg
    # OFF vitamins are in g/100g → convert to mcg or mg
    return {
        'name':            full_name,
        'calories':        calories,
        'protein_g':       clamp_value(normalize_value(row.get('proteins_100g'))) or 0.0,
        'fat_g':           clamp_value(normalize_value(row.get('fat_100g'))) or 0.0,
        'carbs_g':         clamp_value(normalize_value(row.get('carbohydrates_100g'))) or 0.0,
        'fiber_g':         clamp_value(normalize_value(row.get('fiber_100g'))),
        'sugar_g':         clamp_value(normalize_value(row.get('sugars_100g'))),
        'sodium_mg':       g_to_mg(normalize_value(row.get('sodium_100g'))),
        'potassium_mg':    g_to_mg(normalize_value(row.get('potassium_100g'))),
        'saturated_fat_g': clamp_value(normalize_value(row.get('saturated-fat_100g'))),
        'trans_fat_g':     clamp_value(normalize_value(row.get('trans-fat_100g'))),
        'cholesterol_mg':  g_to_mg(normalize_value(row.get('cholesterol_100g'))),
        'vitamin_a_mcg':   g_to_mcg(normalize_value(row.get('vitamin-a_100g'))),
        'vitamin_c_mg':    g_to_mg(normalize_value(row.get('vitamin-c_100g'))),
        'vitamin_d_mcg':   g_to_mcg(normalize_value(row.get('vitamin-d_100g'))),
        'calcium_mg':      g_to_mg(normalize_value(row.get('calcium_100g'))),
        'iron_mg':         g_to_mg(normalize_value(row.get('iron_100g'))),
        'data_source':     'OpenFoodFacts',
        'confidence_score': 0.80,   # community-submitted, lower confidence
        'is_active':       True,
        'version':         1,
        '_variant_text':   name.lower(),
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
            print(f"\n❌ Error processing batch: {e}")
            return 0


def import_dishes(csv_path: Path, engine, model: SentenceTransformer,
                  limit: Optional[int] = None):
    file_size = csv_path.stat().st_size / (1024 * 1024)
    print(f"\n📂 Reading from: {csv_path}")
    print(f"📦 File size: {file_size:.1f} MB (compressed)")
    if limit:
        print(f"⚠️  Limiting to {limit:,} rows")
    print()

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

    open_fn = gzip.open if str(csv_path).endswith('.gz') else open

    with open_fn(csv_path, 'rt', encoding='utf-8', errors='replace') as f:
        reader = csv.DictReader(f, delimiter='\t')

        pbar = tqdm(
            desc="Importing", unit=" rows",
            bar_format="{desc}: {n_fmt} rows | ✅ {postfix[0]} inserted | ⏭️ {postfix[1]} skipped | {rate_fmt}",
            postfix=[0, 0],
        )

        for row in reader:
            if limit and total_processed >= limit:
                break

            total_processed += 1
            dish_data = parse_off_row(row)

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
    print(f"   Time elapsed:    {elapsed:.1f}s ({total_processed/max(elapsed,1):.0f} rows/sec)")
    print(f"{'='*70}")


def main():
    parser = argparse.ArgumentParser(description='Import Open Food Facts into database')
    parser.add_argument('csv_file', help='Path to en.openfoodfacts.org.products.csv.gz')
    parser.add_argument('--limit', type=int, default=None,
                        help='Limit number of rows to process')
    args = parser.parse_args()

    csv_path = Path(args.csv_file)
    if not csv_path.exists():
        print(f"❌ File not found: {csv_path}")
        sys.exit(1)

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
    print("✅ Model loaded!")

    import_dishes(csv_path, engine, model, args.limit)


if __name__ == "__main__":
    main()
