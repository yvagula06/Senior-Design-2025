from app.db.session import engine
from sqlalchemy import text

def check_dishes():
    with engine.connect() as conn:
        result = conn.execute(text('SELECT COUNT(*) FROM dishes'))
        count = result.scalar()
        print(f"Found {count} dishes in the database.")

if __name__ == "__main__":
    check_dishes()