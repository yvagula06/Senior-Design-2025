"""Insert sample dishes for testing"""
from app.db.session import engine
from sqlalchemy import text

sample_dishes = [
    ("Grilled Chicken Breast", 165, 31.0, 3.6, 0.0, 0.0, 0.0, 74.0),
    ("Caesar Salad", 190, 4.0, 17.0, 8.0, 2.0, 2.0, 380.0),
    ("Spaghetti Carbonara", 350, 13.0, 15.0, 40.0, 2.0, 1.0, 450.0),
    ("Grilled Salmon", 206, 22.0, 13.0, 0.0, 0.0, 0.0, 59.0),
    ("Greek Yogurt", 97, 10.0, 4.0, 3.6, 0.0, 3.5, 36.0),
    ("Avocado Toast", 240, 6.0, 13.0, 25.0, 7.0, 1.5, 340.0),
    ("Chicken Tikka Masala", 250, 20.0, 15.0, 12.0, 2.0, 6.0, 680.0),
    ("Beef Burger", 295, 17.0, 14.0, 24.0, 1.5, 4.0, 497.0),
    ("Margherita Pizza", 266, 11.0, 10.0, 33.0, 2.0, 4.0, 598.0),
    ("Fruit Smoothie", 150, 3.0, 1.0, 35.0, 4.0, 28.0, 45.0),
]

with engine.begin() as conn:
    # Check if dishes already exist
    result = conn.execute(text("SELECT COUNT(*) FROM dishes"))
    count = result.scalar()
    
    if count > 0:
        print(f"ℹ️  Database already has {count} dishes. Skipping insert.")
    else:
        print("📝 Inserting sample dishes...")
        
        for name, calories, protein, fat, carbs, fiber, sugar, sodium in sample_dishes:
            conn.execute(
                text("""
                    INSERT INTO dishes (name, calories, protein_g, fat_g, carbs_g, fiber_g, sugar_g, sodium_mg)
                    VALUES (:name, :cal, :protein, :fat, :carbs, :fiber, :sugar, :sodium)
                """),
                {
                    "name": name,
                    "cal": calories,
                    "protein": protein,
                    "fat": fat,
                    "carbs": carbs,
                    "fiber": fiber,
                    "sugar": sugar,
                    "sodium": sodium
                }
            )
        
        print(f"✅ Inserted {len(sample_dishes)} dishes successfully!")
        
        # Verify
        result = conn.execute(text("SELECT COUNT(*) FROM dishes"))
        new_count = result.scalar()
        print(f"📊 Total dishes now: {new_count}")
