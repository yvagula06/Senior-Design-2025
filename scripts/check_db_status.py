"""Quick script to check database status"""
from app.db.session import engine
from sqlalchemy import text

with engine.connect() as conn:
    # Check if dishes table exists and count
    try:
        result = conn.execute(text("SELECT COUNT(*) FROM dishes"))
        count = result.scalar()
        print(f"✅ Total dishes in database: {count}")
        
        # Get a sample if any exist
        if count > 0:
            sample = conn.execute(text("SELECT id, name, calories FROM dishes LIMIT 5")).fetchall()
            print("\nSample dishes:")
            for row in sample:
                print(f"  - {row[0]}: {row[1]} ({row[2]} cal)")
    except Exception as e:
        print(f"❌ Error checking dishes: {e}")
