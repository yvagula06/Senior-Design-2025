"""
Comprehensive Database Ingestion Script

This script ingests dishes from multiple sources:
1. seed_dishes.csv - Curated dish list
2. fastfood.csv - Fast food items from various chains
3. USDA data (optional - can be added later)

Generates embeddings for dish name variants for semantic search.
"""

import csv
import os
import sys
from pathlib import Path
from typing import List, Dict, Optional
from sqlalchemy import create_engine, text
from sentence_transformers import SentenceTransformer
import json

# Add project root to path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

# Load DATABASE_URL from environment
DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    print("❌ Error: DATABASE_URL environment variable not set.")
    sys.exit(1)

# Initialize
engine = create_engine(DATABASE_URL)
print("🔄 Loading embedding model...")
model = SentenceTransformer('sentence-transformers/all-MiniLM-L6-v2')
print("✅ Model loaded")

def clean_value(value: str) -> Optional[float]:
    """Convert string to float, handling empty/invalid values."""
    if not value or value.strip() == '' or value.strip().lower() in ('na', 'n/a', 'none'):
        return 0.0
    try:
        return float(value.strip())
    except (ValueError, AttributeError):
        return 0.0

def generate_variants(dish_name: str) -> List[str]:
    """Generate name variants for better search matching."""
    variants = [dish_name.lower().strip()]
    
    # Add without special characters
    no_special = dish_name.lower().replace('-', ' ').replace('_', ' ').strip()
    if no_special != variants[0]:
        variants.append(no_special)
    
    # Add shortened versions (remove common words)
    stop_words = ['sandwich', 'burger', 'with', 'and', 'the', '&']
    words = no_special.split()
    if len(words) > 2:
        filtered = ' '.join([w for w in words if w not in stop_words])
        if filtered and filtered not in variants:
            variants.append(filtered)
    
    return list(set(variants))  # Remove duplicates

def insert_dish_with_variants(conn, dish_data: Dict) -> int:
    """Insert a dish and its variants with embeddings."""
    # Insert dish
    result = conn.execute(text('''
        INSERT INTO dishes (
            name, calories, protein_g, fat_g, carbs_g, 
            fiber_g, sugar_g, sodium_mg, saturated_fat_g, cholesterol_mg,
            data_source, confidence_score, is_active, version
        )
        VALUES (
            :name, :calories, :protein, :fat, :carbs,
            :fiber, :sugar, :sodium, :sat_fat, :cholesterol,
            :source, :confidence, TRUE, 1
        )
        RETURNING id
    '''), dish_data)
    
    dish_id = result.fetchone()[0]
    
    # Generate variants and embeddings
    variants = generate_variants(dish_data['name'])
    
    for variant_text in variants:
        embedding = model.encode(variant_text).tolist()
        
        conn.execute(text('''
            INSERT INTO dish_variants (
                dish_id, variant_text, embedding, language_code, search_count
            )
            VALUES (:dish_id, :text, :embedding, 'en', 0)
            ON CONFLICT (dish_id, variant_text) DO NOTHING
        '''), {
            'dish_id': dish_id,
            'text': variant_text,
            'embedding': json.dumps(embedding)
        })
    
    return dish_id

def ingest_seed_dishes(csv_path: Path):
    """Ingest curated seed dishes."""
    print(f"\n📥 Ingesting seed dishes from {csv_path.name}...")
    
    if not csv_path.exists():
        print(f"⚠️  File not found: {csv_path}")
        return 0
    
    count = 0
    with engine.begin() as conn:
        with open(csv_path, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                dish_data = {
                    'name': row['name'],
                    'calories': clean_value(row.get('kcal', 0)),
                    'protein': clean_value(row.get('protein_g', 0)),
                    'fat': clean_value(row.get('fat_g', 0)),
                    'carbs': clean_value(row.get('carbs_g', 0)),
                    'fiber': clean_value(row.get('fiber_g', 0)),
                    'sugar': clean_value(row.get('sugar_g', 0)),
                    'sodium': clean_value(row.get('sodium_mg', 0)),
                    'sat_fat': 0.0,
                    'cholesterol': 0.0,
                    'source': row.get('source', 'seed'),
                    'confidence': 0.9
                }
                
                insert_dish_with_variants(conn, dish_data)
                count += 1
                if count % 10 == 0:
                    print(f"  ✓ {count} dishes inserted...")
    
    print(f"✅ Inserted {count} seed dishes")
    return count

def ingest_fastfood(csv_path: Path):
    """Ingest fast food items."""
    print(f"\n📥 Ingesting fast food items from {csv_path.name}...")
    
    if not csv_path.exists():
        print(f"⚠️  File not found: {csv_path}")
        return 0
    
    count = 0
    with engine.begin() as conn:
        with open(csv_path, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                # Combine restaurant and item name
                restaurant = row.get('restaurant', '').strip()
                item = row.get('item', '').strip()
                full_name = f"{restaurant} {item}" if restaurant else item
                
                if not full_name:
                    continue
                
                dish_data = {
                    'name': full_name,
                    'calories': clean_value(row.get('calories', 0)),
                    'protein': clean_value(row.get('protein', 0)),
                    'fat': clean_value(row.get('total_fat', 0)),
                    'carbs': clean_value(row.get('total_carb', 0)),
                    'fiber': clean_value(row.get('fiber', 0)),
                    'sugar': clean_value(row.get('sugar', 0)),
                    'sodium': clean_value(row.get('sodium', 0)),
                    'sat_fat': clean_value(row.get('sat_fat', 0)),
                    'cholesterol': clean_value(row.get('cholesterol', 0)),
                    'source': 'fastfood',
                    'confidence': 0.85
                }
                
                insert_dish_with_variants(conn, dish_data)
                count += 1
                if count % 50 == 0:
                    print(f"  ✓ {count} dishes inserted...")
    
    print(f"✅ Inserted {count} fast food items")
    return count

def main():
    """Main ingestion pipeline."""
    data_dir = project_root / 'data'
    
    print("=" * 60)
    print("🗄️  COMPREHENSIVE DATABASE INGESTION")
    print("=" * 60)
    
    total_count = 0
    
    # Clear existing data
    print("\n🗑️  Clearing existing data...")
    with engine.begin() as conn:
        conn.execute(text('DELETE FROM dish_variants'))
        conn.execute(text('DELETE FROM dishes'))
    print("✅ Database cleared")
    
    # Ingest seed dishes
    total_count += ingest_seed_dishes(data_dir / 'seed_dishes.csv')
    
    # Ingest fastfood
    total_count += ingest_fastfood(data_dir / 'fastfood.csv')
    
    # Summary
    print("\n" + "=" * 60)
    print(f"✅ INGESTION COMPLETE")
    print(f"📊 Total dishes inserted: {total_count}")
    print("=" * 60)
    
    # Verify
    with engine.connect() as conn:
        result = conn.execute(text('SELECT COUNT(*) FROM dishes'))
        dish_count = result.scalar()
        result = conn.execute(text('SELECT COUNT(*) FROM dish_variants'))
        variant_count = result.scalar()
        print(f"\n🔍 Verification:")
        print(f"   • Dishes in database: {dish_count}")
        print(f"   • Variants created: {variant_count}")
        print(f"   • Avg variants per dish: {variant_count/dish_count if dish_count > 0 else 0:.1f}")

if __name__ == '__main__':
    main()
