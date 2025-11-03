from sqlalchemy import text
from app.db.session import engine

def query_db():
    with engine.connect() as conn:
        # Query dishes
        dishes = conn.execute(text('SELECT * FROM dishes')).fetchall()
        print("Dishes:")
        for dish in dishes:
            print(dish)
        
        # Query nutrients
        nutrients = conn.execute(text('SELECT * FROM nutrients')).fetchall()
        print("\nNutrients:")
        for nutrient in nutrients:
            print(nutrient)

if __name__ == "__main__":
    query_db()