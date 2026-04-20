"""
Import USDA SR Legacy, Foundation Foods, and Survey (FNDDS) datasets
into the canonical flat-schema database.

All three datasets share the same relational structure:
  food.csv          — fdc_id, description
  food_nutrient.csv — fdc_id, nutrient_id, amount

Nutrient IDs used (standard USDA FDC nutrient numbers):
  1008 → calories (kcal)
  1003 → protein_g
  1004 → fat_g
  1005 → carbs_g
  1079 → fiber_g
  2000 → sugar_g  (fallback: 1063)
  1093 → sodium_mg
  1092 → potassium_mg
  1258 → saturated_fat_g
  1257 → trans_fat_g
  1253 → cholesterol_mg
  1106 → vitamin_a_mcg
  1162 → vitamin_c_mg
  1114 → vitamin_d_mcg
  1087 → calcium_mg
  1089 → iron_mg

Usage:
    python scripts/import_usda_whole_foods.py <dataset_dir> [--source LABEL]

    dataset_dir  — path to extracted dataset folder (contains food.csv etc.)
                   Can also be a parent folder with a single subfolder inside.
    --source     — data_source label stored in DB (default: 'USDA_WholeFoods')

Examples:
    python scripts/import_usda_whole_foods.py data/sr_legacy --source SR_Legacy
    python scripts/import_usda_whole_foods.py data/survey    --source FNDDS
    python scripts/import_usda_whole_foods.py data/foundation --source Foundation
"""

import sys
import csv
import time
import json
import os
import argparse
from pathlib import Path
from typing import List, Dict, Optional
import numpy as np
from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session
from sentence_transformers import SentenceTransformer
from tqdm import tqdm

BATCH_SIZE = 500
EMBED_BATCH_SIZE = 256

# USDA nutrient_id → canonical dishes column
NUTRIENT_MAP = {
    '1008': 'calories',
    '1003': 'protein_g',
    '1004': 'fat_g',
    '1005': 'carbs_g',
    '1079': 'fiber_g',
    '2000': 'sugar_g',
    '1063': 'sugar_g',      # fallback older datasets
    '1093': 'sodium_mg',
    '1092': 'potassium_mg',
    '1258': 'saturated_fat_g',
    '1257': 'trans_fat_g',
    '1253': 'cholesterol_mg',
    '1106': 'vitamin_a_mcg',
    '1162': 'vitamin_c_mg',
    '1114': 'vitamin_d_mcg',
    '1087': 'calcium_mg',
    '1089': 'iron_mg',
}


def clamp_value(value: Optional[float], max_val: float = 999999.99) -> Optional[float]:
    if value is None:
        return None
    return None if abs(value) > max_val else value


def normalize_name(name: str) -> str:
    return name.strip()[:255]


def find_data_dir(base: Path) -> Path:
    """If base contains a single subdirectory, descend into it."""
    items = list(base.iterdir())
    if len(items) == 1 and items[0].is_dir():
        return items[0]
    return base


def load_foods(data_dir: Path) -> Dict[str, str]:
    """Load fdc_id → description from food.csv."""
    foods = {}
    with open(data_dir / 'food.csv', encoding='utf-8') as f:
        for row in csv.DictReader(f):
            foods[row['fdc_id']] = row['description'].strip()
    return foods


def load_nutrients(data_dir: Path) -> Dict[str, Dict[str, float]]:
    """
    Load food_nutrient.csv into {fdc_id: {column_name: amount}}.
    Only keeps nutrients in NUTRIENT_MAP.
    """
    nutrients: Dict[str, Dict[str, float]] = {}
    with open(data_dir / 'food_nutrient.csv', encoding='utf-8') as f:
        for row in csv.DictReader(f):
            nid = row['nutrient_id']
            col = NUTRIENT_MAP.get(nid)
            if col is None:
                continue
            fdc_id = row['fdc_id']
            try:
                amount = float(row['amount'])
            except (ValueError, TypeError):
                continue
            if fdc_id not in nutrients:
                nutrients[fdc_id] = {}
            # Don't overwrite sugar_g if already set (2000 takes priority over 1063)
            if col not in nutrients[fdc_id]:
                nutrients[fdc_id][col] = amount
    return nutrients


def build_dish(fdc_id: str, description: str, nutrient_data: Dict[str, float],
               source: str) -> Optional[Dict]:
    """Combine food + nutrient data into canonical dishes row."""
    name = normalize_name(description)
    if not name:
        return None

    calories = clamp_value(nutrient_data.get('calories'))
    if calories is None:
        return None

    return {
        'name': name,
        'calories': calories,
        'protein_g':       clamp_value(nutrient_data.get('protein_g')) or 0.0,
        'fat_g':           clamp_value(nutrient_data.get('fat_g')) or 0.0,
        'carbs_g':         clamp_value(nutrient_data.get('carbs_g')) or 0.0,
        'fiber_g':         clamp_value(nutrient_data.get('fiber_g')),
        'sugar_g':         clamp_value(nutrient_data.get('sugar_g')),
        'sodium_mg':       clamp_value(nutrient_data.get('sodium_mg')),
        'potassium_mg':    clamp_value(nutrient_data.get('potassium_mg')),
        'saturated_fat_g': clamp_value(nutrient_data.get('saturated_fat_g')),
        'trans_fat_g':     clamp_value(nutrient_data.get('trans_fat_g')),
        'cholesterol_mg':  clamp_value(nutrient_data.get('cholesterol_mg')),
        'vitamin_a_mcg':   clamp_value(nutrient_data.get('vitamin_a_mcg')),
        'vitamin_c_mg':    clamp_value(nutrient_data.get('vitamin_c_mg')),
        'vitamin_d_mcg':   clamp_value(nutrient_data.get('vitamin_d_mcg')),
        'calcium_mg':      clamp_value(nutrient_data.get('calcium_mg')),
        'iron_mg':         clamp_value(nutrient_data.get('iron_mg')),
        'data_source':     source,
        'confidence_score': 0.98,   # whole-food data is higher quality than branded
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


def import_dataset(data_dir: Path, engine, model: SentenceTransformer, source: str):
    print(f"\n📂 Dataset directory: {data_dir}")
    print(f"🏷️  data_source label: {source}\n")

    print("Loading food descriptions...")
    foods = load_foods(data_dir)
    print(f"  {len(foods):,} food entries")

    print("Loading nutrient data...")
    nutrients = load_nutrients(data_dir)
    print(f"  {len(nutrients):,} foods with nutrient data\n")

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

    pbar = tqdm(
        foods.items(), desc="Importing", unit=" foods",
        bar_format="{desc}: {n_fmt} foods | ✅ {postfix[0]} inserted | ⏭️ {postfix[1]} skipped | {rate_fmt}",
        postfix=[0, 0],
    )

    for fdc_id, description in pbar:
        total_processed += 1
        nutrient_data = nutrients.get(fdc_id, {})
        dish_data = build_dish(fdc_id, description, nutrient_data, source)

        if not dish_data:
            total_skipped += 1
            pbar.postfix = [f"{total_inserted:,}", f"{total_skipped:,}"]
            continue

        if dish_data['name'].lower() in existing_names:
            total_skipped += 1
            pbar.postfix = [f"{total_inserted:,}", f"{total_skipped:,}"]
            continue

        existing_names.add(dish_data['name'].lower())
        batch_dishes.append(dish_data)

        if len(batch_dishes) >= BATCH_SIZE:
            inserted = process_batch(batch_dishes, model, engine)
            total_inserted += inserted
            batch_dishes = []

        pbar.postfix = [f"{total_inserted:,}", f"{total_skipped:,}"]

    pbar.close()

    if batch_dishes:
        print("\n🔄 Processing final batch...")
        inserted = process_batch(batch_dishes, model, engine)
        total_inserted += inserted

    elapsed = time.time() - start_time
    print(f"\n{'='*70}")
    print(f"✅ Import complete!")
    print(f"   Total processed: {total_processed:,}")
    print(f"   Total inserted:  {total_inserted:,}")
    print(f"   Total skipped:   {total_skipped:,}")
    print(f"   Time elapsed:    {elapsed:.1f}s ({total_processed/max(elapsed,1):.0f} foods/sec)")
    print(f"{'='*70}\n")


def main():
    parser = argparse.ArgumentParser(description='Import USDA whole-food datasets')
    parser.add_argument('dataset_dir', help='Path to extracted dataset directory')
    parser.add_argument('--source', default='USDA_WholeFoods',
                        help='data_source label (default: USDA_WholeFoods)')
    args = parser.parse_args()

    data_dir = find_data_dir(Path(args.dataset_dir))

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

    import_dataset(data_dir, engine, model, args.source)


if __name__ == "__main__":
    main()
