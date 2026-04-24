"""
Bulk import USDA branded food dishes into the database.

Usage:
    python scripts/import_usda_dishes.py data/usda_branded_foods_reduced.csv

Features:
- Batch processing for memory efficiency
- Automatic embedding generation
- Duplicate detection and skipping
- Progress tracking
"""

import sys
import csv
import time
from pathlib import Path
from typing import List, Dict, Optional
import numpy as np
from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session
from sentence_transformers import SentenceTransformer
from tqdm import tqdm

# Add app to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.db.models import Dish, DishVariant
from app.core.settings import settings

BATCH_SIZE = 1000  # Process 1000 dishes at a time
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
    return name.strip()[:255]  # Max 255 chars per schema


def load_embedding_model() -> SentenceTransformer:
    """Load the sentence-transformers model."""
    print(f"Loading embedding model: {settings.EMBEDDING_MODEL}")
    return SentenceTransformer(settings.EMBEDDING_MODEL)


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
    if calories is None or protein is None or carbs is None or fat is None:
        return None
    
    return {
        'name': full_name,
        'calories': calories,
        'protein_g': protein,
        'fat_g': fat,
        'carbs_g': carbs,
        'fiber_g': normalize_value(row.get('fiber_g')),
        'sugar_g': normalize_value(row.get('sugars_g')),
        'sodium_mg': normalize_value(row.get('sodium_mg')),
        'potassium_mg': normalize_value(row.get('potassium_mg')),
        'data_source': 'USDA',
        'confidence_score': 0.95,
        'is_active': True,
        'version': 1,
        'brand_owner': brand,
        'variant_text': name.lower(),  # Use original name for variant
    }


def import_dishes(csv_path: Path, engine):
    """Import dishes from CSV file."""
    
    if not csv_path.exists():
        print(f"❌ Error: File not found: {csv_path}")
        return
    
    file_size = csv_path.stat().st_size / (1024 * 1024)  # MB
    print(f"\n📂 Reading from: {csv_path}")
    print(f"📦 File size: {file_size:.1f} MB")
    print(f"⏳ Estimated processing time: {file_size * 0.5:.0f}-{file_size:.0f} seconds\n")
    
    print("🤖 Loading embedding model (this may take 10-30 seconds)...")
    model = load_embedding_model()
    print("✅ Model loaded!\n")
    
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
        
        # Progress bar without total (shows spinner + counts)
        pbar = tqdm(desc="Importing", unit=" rows", 
                   bar_format="{desc}: {n_fmt} rows | ✅ {postfix[0]} inserted | ⏭️ {postfix[1]} skipped | {rate_fmt}",
                   postfix=[0, 0])
        
        for row in reader:
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
    print("✅ Import complete!")
    print(f"   Total processed: {total_processed:,}")
    print(f"   Total inserted:  {total_inserted:,}")
    print(f"   Total skipped:   {total_skipped:,}")
    print(f"   Time elapsed:    {elapsed:.1f}s ({total_processed/elapsed:.0f} rows/sec)")
    print(f"{'='*70}")


def process_batch(batch_dishes: List[Dict], model: SentenceTransformer, engine) -> int:
    """Process a batch of dishes: insert dishes and generate variants with embeddings."""
    
    if not batch_dishes:
        return 0
    
    # Generate embeddings for all variant texts in this batch
    variant_texts = [dish['variant_text'] for dish in batch_dishes]
    embeddings = generate_embeddings(variant_texts, model)
    
    with Session(engine) as session:
        try:
            inserted_count = 0
            
            for dish_data, embedding in zip(batch_dishes, embeddings):
                # Extract variant data
                variant_text = dish_data.pop('variant_text')
                brand_owner = dish_data.pop('brand_owner', '')
                
                # Create dish
                dish = Dish(**dish_data)
                session.add(dish)
                session.flush()  # Get dish.id
                
                # Create variant with embedding
                variant = DishVariant(
                    dish_id=dish.id,
                    variant_text=variant_text,
                    embedding=embedding,
                    variant_type='original',
                    language_code='en',
                    search_count=0
                )
                session.add(variant)
                
                # Optionally add brand as additional variant
                if brand_owner and brand_owner.lower() not in variant_text:
                    brand_variant_text = f"{variant_text} {brand_owner.lower()}"
                    brand_embedding = generate_embeddings([brand_variant_text], model)[0]
                    brand_variant = DishVariant(
                        dish_id=dish.id,
                        variant_text=brand_variant_text,
                        embedding=brand_embedding,
                        variant_type='brand_augmented',
                        language_code='en',
                        search_count=0
                    )
                    session.add(brand_variant)
                
                inserted_count += 1
            
            session.commit()
            return inserted_count
            
        except Exception as e:
            session.rollback()
            print(f"❌ Error processing batch: {e}")
            return 0


def main():
    if len(sys.argv) < 2:
        print("Usage: python scripts/import_usda_dishes.py <csv_file>")
        print("Example: python scripts/import_usda_dishes.py data/usda_branded_foods_reduced.csv")
        sys.exit(1)
    
    csv_path = Path(sys.argv[1])
    
    # Create engine
    engine = create_engine(settings.DATABASE_URL, pool_pre_ping=True, future=True)
    
    # Ensure pgvector extension exists
    with engine.connect() as conn:
        conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
        conn.commit()
    
    import_dishes(csv_path, engine)


if __name__ == "__main__":
    main()
