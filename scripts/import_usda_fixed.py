"""
Import USDA branded food dishes into the canonical flat-schema database.

Canonical schema (no separate nutrients / embeddings tables):
  dishes         — flat nutrition table (all macros/micros inline, per 100 g)
  dish_variants  — one row per search alias, with 384-dim pgvector embedding

Usage:
    python scripts/import_usda_fixed.py data/usda_branded_foods_reduced.csv [--limit N]

Features:
- Batch processing for memory efficiency
- Automatic 384-dim embedding generation (all-MiniLM-L6-v2)
- Duplicate detection and skipping
- Progress tracking
"""

import sys
import csv
import time
import json
import argparse
from pathlib import Path
from typing import List, Dict, Optional
import numpy as np
from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session
from sentence_transformers import SentenceTransformer
from tqdm import tqdm
import os

BATCH_SIZE = 500  # Process 500 dishes at a time
EMBED_BATCH_SIZE = 256  # Encode embeddings in batches of 256


def normalize_value(value: str) -> Optional[float]:
    """Convert string to float, return None if invalid."""
    if not value or value.strip() == '' or value.lower() in ('na', 'n/a', 'null'):
        return None
    try:
        return float(value)
    except (ValueError, TypeError):
        return None


def normalize_name(name: str) -> str:
    """Clean and normalize dish name."""
    return name.strip()[:255]  # Max 255 chars


def clamp_value(value: Optional[float], max_val: float = 999999.99) -> Optional[float]:
    """Clamp numeric values to NUMERIC(8,2) safe range. Drops implausibly large values."""
    if value is None:
        return None
    if abs(value) > max_val:
        return None  # skip garbage data (e.g. per-100g condiment sodium > 999999 mg)
    return value


def load_embedding_model() -> SentenceTransformer:
    """Load the sentence-transformers model."""
    print(f"Loading embedding model: sentence-transformers/all-MiniLM-L6-v2")
    return SentenceTransformer('sentence-transformers/all-MiniLM-L6-v2')


def generate_embeddings(texts: List[str], model: SentenceTransformer) -> List[List[float]]:
    """Generate embeddings for a batch of texts."""
    embeddings = model.encode(texts, normalize_embeddings=False, show_progress_bar=False)
    # Convert to list of lists for pgvector
    if isinstance(embeddings, np.ndarray):
        return [vec.astype(np.float32).tolist() for vec in embeddings]
    return [list(map(float, vec)) for vec in embeddings]


def parse_usda_row(row: Dict[str, str]) -> Optional[Dict]:
    """Parse a USDA CSV row into canonical dishes schema."""
    name = row.get('food_name', '').strip()
    brand = row.get('brand_owner', '').strip()

    if not name:
        return None

    full_name = normalize_name(f"{name} ({brand})" if brand else name)

    # Core macros — calories required; default others to 0 if missing
    calories = normalize_value(row.get('energy_kcal'))
    if calories is None:
        return None

    return {
        # dishes columns (canonical flat schema — no nutrients/embeddings tables)
        'name': full_name,
        'calories': clamp_value(calories),
        'protein_g': clamp_value(normalize_value(row.get('protein_g'))) or 0.0,
        'fat_g': clamp_value(normalize_value(row.get('fat_total_g'))) or 0.0,
        'carbs_g': clamp_value(normalize_value(row.get('carbohydrates_g'))) or 0.0,
        'fiber_g': clamp_value(normalize_value(row.get('fiber_g'))),
        'sugar_g': clamp_value(normalize_value(row.get('sugars_g'))),
        'sodium_mg': clamp_value(normalize_value(row.get('sodium_mg'))),
        'potassium_mg': clamp_value(normalize_value(row.get('potassium_mg'))),
        'saturated_fat_g': clamp_value(normalize_value(row.get('saturated_fat_g'))),
        'trans_fat_g': clamp_value(normalize_value(row.get('trans_fat_g'))),
        'cholesterol_mg': clamp_value(normalize_value(row.get('cholesterol_mg'))),
        'vitamin_a_mcg': clamp_value(normalize_value(row.get('vitamin_a_mcg'))),
        'vitamin_c_mg': clamp_value(normalize_value(row.get('vitamin_c_mg'))),
        'vitamin_d_mcg': clamp_value(normalize_value(row.get('vitamin_d_mcg'))),
        'calcium_mg': clamp_value(normalize_value(row.get('calcium_mg'))),
        'iron_mg': clamp_value(normalize_value(row.get('iron_mg'))),
        'data_source': 'USDA',
        'confidence_score': 0.95,
        'is_active': True,
        'version': 1,
        # variant metadata — extracted during batch insert, not a dishes column
        '_variant_text': name.lower(),
    }


def import_dishes(csv_path: Path, engine, model: SentenceTransformer,
                  limit: Optional[int] = None):
    """Import dishes from CSV file using canonical flat schema."""
    
    if not csv_path.exists():
        print(f"❌ Error: File not found: {csv_path}")
        return
    
    file_size = csv_path.stat().st_size / (1024 * 1024)  # MB
    print(f"\n📂 Reading from: {csv_path}")
    print(f"📦 File size: {file_size:.1f} MB")
    if limit:
        print(f"⚠️  Limiting to {limit:,} dishes")
    print()
    
    # Track existing dishes to avoid duplicates
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
        
        # Progress bar
        pbar = tqdm(desc="Importing", unit=" rows", 
                   bar_format="{desc}: {n_fmt} rows | ✅ {postfix[0]} inserted | ⏭️ {postfix[1]} skipped | {rate_fmt}",
                   postfix=[0, 0])
        
        for row in reader:
            if limit and total_processed >= limit:
                break
                
            total_processed += 1
            
            dish_data = parse_usda_row(row)
            if not dish_data:
                total_skipped += 1
                pbar.postfix = [f"{total_inserted:,}", f"{total_skipped:,}"]
                pbar.update(1)
                continue
            
            # Skip duplicates
            if dish_data['name'].lower() in existing_names:
                total_skipped += 1
                pbar.postfix = [f"{total_inserted:,}", f"{total_skipped:,}"]
                pbar.update(1)
                continue

            existing_names.add(dish_data['name'].lower())
            batch_dishes.append(dish_data)
            
            # Process batch when it reaches BATCH_SIZE
            if len(batch_dishes) >= BATCH_SIZE:
                inserted = process_batch(batch_dishes, model, engine)
                total_inserted += inserted
                batch_dishes = []

            pbar.postfix = [f"{total_inserted:,}", f"{total_skipped:,}"]
            pbar.update(1)

        pbar.close()

        # Process remaining dishes
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
    print(f"   Time elapsed:    {elapsed:.1f}s ({total_processed/max(elapsed, 1):.0f} rows/sec)")
    print(f"{'='*70}")


def process_batch(batch_dishes: List[Dict], model: SentenceTransformer, engine) -> int:
    """Insert a batch of dishes + primary variants into the canonical schema."""

    if not batch_dishes:
        return 0

    # _variant_text is metadata, not a dishes column
    variant_texts = [d['_variant_text'] for d in batch_dishes]
    embeddings = generate_embeddings(variant_texts, model)

    with Session(engine) as session:
        try:
            inserted_count = 0

            for dish_data, embedding in zip(batch_dishes, embeddings):
                variant_text = dish_data.pop('_variant_text')

                # Insert into the flat canonical dishes table
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

                # Insert variant with 384-dim embedding
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


def main():
    parser = argparse.ArgumentParser(description='Import USDA dishes into database')
    parser.add_argument('csv_file', help='Path to USDA CSV file')
    parser.add_argument('--limit', type=int, help='Limit number of dishes to import', default=None)
    
    args = parser.parse_args()
    csv_path = Path(args.csv_file)
    
    # Get database URL from environment
    DATABASE_URL = os.getenv("DATABASE_URL")
    if not DATABASE_URL:
        print("❌ ERROR: DATABASE_URL not set")
        sys.exit(1)
    
    # Create engine
    engine = create_engine(DATABASE_URL, pool_pre_ping=True)
    
    # Ensure pgvector extension exists
    with engine.connect() as conn:
        conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
        conn.commit()
    
    print("🤖 Loading embedding model...")
    model = load_embedding_model()
    print("✅ Model loaded!\n")
    
    import_dishes(csv_path, engine, model, args.limit)


if __name__ == "__main__":
    main()
