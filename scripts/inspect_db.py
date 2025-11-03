from sqlalchemy import text, inspect
from app.db.session import engine

def inspect_db():
    inspector = inspect(engine)
    
    print("Table: dishes")
    print("Columns:", inspector.get_columns("dishes"))
    
    print("\nTable: nutrients")
    print("Columns:", inspector.get_columns("nutrients"))
    
    with engine.connect() as conn:
        # Query dishes
        dishes = conn.execute(text('SELECT * FROM dishes')).fetchall()
        if dishes:
            print("\nSample dish record:")
            print(dishes[0]._mapping)

if __name__ == "__main__":
    inspect_db()