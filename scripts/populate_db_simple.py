"""
Simple script to populate database with test dishes using existing schema.
Works with dishes/nutrients/embeddings schema from Alembic migration 0001.
"""
import os
import sys
from sqlalchemy import create_engine, text
from sentence_transformers import SentenceTransformer

# Sample dishes to get started
SAMPLE_DISHES = [
    {
        "name": "Chicken Tikka Masala",
        "cuisine": "Indian",
        "kcal": 500,
        "protein_g": 28,
        "carbs_g": 32,
        "fat_g": 26,
        "fiber_g": 4,
        "sugar_g": 6,
        "sodium_mg": 900
    },
    {
        "name": "Grilled Chicken Breast",
        "cuisine": "American",
        "kcal": 165,
        "protein_g": 31,
        "carbs_g": 0,
        "fat_g": 3.6,
        "fiber_g": 0,
        "sugar_g": 0,
        "sodium_mg": 74
    },
    {
        "name": "Caesar Salad",
        "cuisine": "American",
        "kcal": 200,
        "protein_g": 5,
        "carbs_g": 12,
        "fat_g": 15,
        "fiber_g": 3,
        "sugar_g": 2,
        "sodium_mg": 400
    },
    {
        "name": "Spaghetti Carbonara",
        "cuisine": "Italian",
        "kcal": 450,
        "protein_g": 18,
        "carbs_g": 55,
        "fat_g": 18,
        "fiber_g": 3,
        "sugar_g": 3,
        "sodium_mg": 550
    },
    {
        "name": "Big Mac",
        "cuisine": "Fast Food",
        "kcal": 563,
        "protein_g": 26,
        "carbs_g": 46,
        "fat_g": 33,
        "fiber_g": 3,
        "sugar_g": 9,
        "sodium_mg": 1007
    },
    {
        "name": "Pepperoni Pizza",
        "cuisine": "Italian",
        "kcal": 298,
        "protein_g": 12,
        "carbs_g": 36,
        "fat_g": 11,
        "fiber_g": 2,
        "sugar_g": 4,
        "sodium_mg": 698
    },
    {
        "name": "Greek Salad",
        "cuisine": "Greek",
        "kcal": 150,
        "protein_g": 4,
        "carbs_g": 8,
        "fat_g": 12,
        "fiber_g": 3,
        "sugar_g": 4,
        "sodium_mg": 400
    },
    {
        "name": "Fish and Chips",
        "cuisine": "British",
        "kcal": 585,
        "protein_g": 32,
        "carbs_g": 51,
        "fat_g": 29,
        "fiber_g": 4,
        "sugar_g": 2,
        "sodium_mg": 1200
    },
    {
        "name": "Pad Thai",
        "cuisine": "Thai",
        "kcal": 350,
        "protein_g": 15,
        "carbs_g": 40,
        "fat_g": 14,
        "fiber_g": 3,
        "sugar_g": 12,
        "sodium_mg": 800
    },
    {
        "name": "Burrito Bowl",
        "cuisine": "Mexican",
        "kcal": 450,
        "protein_g": 25,
        "carbs_g": 50,
        "fat_g": 15,
        "fiber_g": 10,
        "sugar_g": 5,
        "sodium_mg": 950
    }
]


def main():
    DATABASE_URL = os.getenv("DATABASE_URL")
    if not DATABASE_URL:
        print("❌ ERROR: DATABASE_URL not set")
        sys.exit(1)
    
    print("📦 Loading embedding model...")
    model = SentenceTransformer('sentence-transformers/all-MiniLM-L6-v2')
    print("✅ Model loaded\n")
    
    engine = create_engine(DATABASE_URL)
    
    print(f"🚀 Inserting {len(SAMPLE_DISHES)} dishes...\n")
    
    with engine.connect() as conn:
        for dish in SAMPLE_DISHES:
            # Insert dish
            result = conn.execute(
                text("""
                    INSERT INTO dishes (name, cuisine)
                    VALUES (:name, :cuisine)
                    ON CONFLICT DO NOTHING
                    RETURNING dish_id
                """),
                {"name": dish["name"], "cuisine": dish.get("cuisine")}
            )
            
            row = result.fetchone()
            if not row:
                # Dish already exists, get its ID
                result = conn.execute(
                    text("SELECT dish_id FROM dishes WHERE name = :name"),
                    {"name": dish["name"]}
                )
                row = result.fetchone()
            
            dish_id = row[0]
            
            # Insert nutrients
            conn.execute(
                text("""
                    INSERT INTO nutrients (dish_id, kcal, protein_g, carbs_g, fat_g, fiber_g, sugar_g, sodium_mg, source)
                    VALUES (:dish_id, :kcal, :protein_g, :carbs_g, :fat_g, :fiber_g, :sugar_g, :sodium_mg, 'manual')
                    ON CONFLICT (dish_id) DO UPDATE SET
                        kcal = EXCLUDED.kcal,
                        protein_g = EXCLUDED.protein_g,
                        carbs_g = EXCLUDED.carbs_g,
                        fat_g = EXCLUDED.fat_g,
                        fiber_g = EXCLUDED.fiber_g,
                        sugar_g = EXCLUDED.sugar_g,
                        sodium_mg = EXCLUDED.sodium_mg
                """),
                {
                    "dish_id": dish_id,
                    "kcal": dish["kcal"],
                    "protein_g": dish["protein_g"],
                    "carbs_g": dish["carbs_g"],
                    "fat_g": dish["fat_g"],
                    "fiber_g": dish.get("fiber_g"),
                    "sugar_g": dish.get("sugar_g"),
                    "sodium_mg": dish.get("sodium_mg")
                }
            )
            
            # Generate embedding
            search_text = dish["name"].lower()
            embedding = model.encode([search_text])[0].tolist()
            
            # Insert embedding
            conn.execute(
                text("""
                    INSERT INTO embeddings (dish_id, text, vector)
                    VALUES (:dish_id, :text, :vector)
                    ON CONFLICT (dish_id) DO UPDATE SET
                        text = EXCLUDED.text,
                        vector = EXCLUDED.vector
                """),
                {
                    "dish_id": dish_id,
                    "text": search_text,
                    "vector": embedding
                }
            )
            
            print(f"✅ {dish['name']}")
        
        conn.commit()
    
    print(f"\n✅ Successfully inserted {len(SAMPLE_DISHES)} dishes!")
    print("\n📊 Database contents:")
    
    with engine.connect() as conn:
        result = conn.execute(text("SELECT COUNT(*) FROM dishes"))
        dish_count = result.scalar()
        print(f"   Dishes: {dish_count}")
        
        result = conn.execute(text("SELECT COUNT(*) FROM nutrients"))
        nutrient_count = result.scalar()
        print(f"   Nutrients: {nutrient_count}")
        
        result = conn.execute(text("SELECT COUNT(*) FROM embeddings"))
        embedding_count = result.scalar()
        print(f"   Embeddings: {embedding_count}")


if __name__ == "__main__":
    main()
