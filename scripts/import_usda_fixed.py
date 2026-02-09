"""
Import USDA branded food dishes into the database.
Works with the existing schema: dishes/nutrients/embeddings tables.

Usage:
    python scripts/import_usda_fixed.py data/usda_branded_foods_reduced.csv [--limit N]

Features:
- Batch processing for memory efficiency
- Automatic embedding generation
- Duplicate detection and skipping
- Progress tracking
"""

import sys
import csv
import time
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
    """Parse a USDA CSV row into dish data."""
    name = row.get('food_name', '').strip()
    brand = row.get('brand_owner', '').strip()
    
    if not name:
        return None
    
    # Combine name and brand for better searchability
    full_name = f"{name} ({brand})" if brand else name
    full_name = normalize_name(full_name)
    
    # Parse nutrition values (USDA provides per 100g)
    calories = normalize_value(row.get('energy_kcal'))
    protein = normalize_value(row.get('protein_g'))
    carbs = normalize_value(row.get('carbohydrates_g'))
    fat = normalize_value(row.get('fat_total_g'))
    
    # Skip rows missing critical nutrition data
    if calories is None:
        return None
    
    return {
        'name': full_name,
        'cuisine': brand or 'USDA',
        'kcal': calories,
        'protein_g': protein,
        'carbs_g': carbs,
        'fat_g': fat,
        'fiber_g': normalize_value(row.get('fiber_g')),
        'sugar_g': normalize_value(row.get('sugars_g')),
        'sodium_mg': normalize_value(row.get('sodium_mg')),
        'variant_text': name.lower(),  # Use original name for search
    }


def import_dishes(csv_path: Path, engine, model: SentenceTransformer, limit: Optional[int] = None):
    """Import dishes from CSV file."""
    
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
    """Process a batch of dishes: insert into dishes/nutrients/embeddings tables."""
    
    if not batch_dishes:
        return 0
    
    # Generate embeddings for all variant texts in this batch
    variant_texts = [dish['variant_text'] for dish in batch_dishes]
    embeddings = generate_embeddings(variant_texts, model)
    
    with Session(engine) as session:
        try:
            inserted_count = 0
            
            for dish_data, embedding in zip(batch_dishes, embeddings):
                variant_text = dish_data.pop('variant_text')
                cuisine = dish_data.pop('cuisine', None)
                
                # Extract nutrition data
                kcal = dish_data.pop('kcal')
                protein_g = dish_data.pop('protein_g', None)
                carbs_g = dish_data.pop('carbs_g', None)
                fat_g = dish_data.pop('fat_g', None)
                fiber_g = dish_data.pop('fiber_g', None)
                sugar_g = dish_data.pop('sugar_g', None)
                sodium_mg = dish_data.pop('sodium_mg', None)
                
                # Insert dish
                result = session.execute(
                    text("""
                        INSERT INTO dishes (name, cuisine)
                        VALUES (:name, :cuisine)
                        RETURNING dish_id
                    """),
                    {"name": dish_data['name'], "cuisine": cuisine}
                )
                dish_id = result.fetchone()[0]
                
                # Insert nutrients
                session.execute(
                    text("""
                        INSERT INTO nutrients (dish_id, kcal, protein_g, carbs_g, fat_g, fiber_g, sugar_g, sodium_mg, source)
                        VALUES (:dish_id, :kcal, :protein_g, :carbs_g, :fat_g, :fiber_g, :sugar_g, :sodium_mg, 'USDA')
                    """),
                    {
                        "dish_id": dish_id,
                        "kcal": kcal,
                        "protein_g": protein_g,
                        "carbs_g": carbs_g,
                        "fat_g": fat_g,
                        "fiber_g": fiber_g,
                        "sugar_g": sugar_g,
                        "sodium_mg": sodium_mg
                    }
                )
                
                # Insert embedding
                session.execute(
                    text("""
                        INSERT INTO embeddings (dish_id, text, vector)
                        VALUES (:dish_id, :text, :vector)
                    """),
                    {
                        "dish_id": dish_id,
                        "text": variant_text,
                        "vector": embedding
                    }
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
