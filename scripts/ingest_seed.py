import csv
import os
import sys
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from app.db.models import Dish, Nutrients, Embedding

# Load DATABASE_URL from environment
DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    print("Error: DATABASE_URL environment variable not set.")
    sys.exit(1)

engine = create_engine(DATABASE_URL, future=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)

def upsert_dish(session, row):
    name_lower = row["name"].lower()
    cuisine = row.get("cuisine")
    aliases = row.get("aliases", "").split(";") if row.get("aliases") else None

    # Check if dish exists
    dish = session.query(Dish).filter(text("lower(name) = :name_lower")).params(name_lower=name_lower).one_or_none()

    if dish:
        # Update existing dish
        dish.name = row["name"]
        dish.cuisine = cuisine
        dish.aliases = aliases
        updated = True
    else:
        # Insert new dish
        dish = Dish(name=row["name"], cuisine=cuisine, aliases=aliases)
        session.add(dish)
        updated = False

    session.flush()  # Ensure dish_id is available

    # Upsert nutrients
    nutrients = session.query(Nutrients).filter_by(dish_id=dish.dish_id).one_or_none()
    if nutrients:
        nutrients.kcal = row["kcal"]
        nutrients.protein_g = row.get("protein_g")
        nutrients.carbs_g = row.get("carbs_g")
        nutrients.fat_g = row.get("fat_g")
        nutrients.fiber_g = row.get("fiber_g")
        nutrients.sugar_g = row.get("sugar_g")
        nutrients.sodium_mg = row.get("sodium_mg")
        nutrients.source = row.get("source")
    else:
        nutrients = Nutrients(
            dish_id=dish.dish_id,
            kcal=row["kcal"],
            protein_g=row.get("protein_g"),
            carbs_g=row.get("carbs_g"),
            fat_g=row.get("fat_g"),
            fiber_g=row.get("fiber_g"),
            sugar_g=row.get("sugar_g"),
            sodium_mg=row.get("sodium_mg"),
            source=row.get("source"),
        )
        session.add(nutrients)

    # Upsert embedding
    embedding_text = f"{row['name']}. Cuisine: {cuisine}. Aliases: {aliases}"
    embedding = session.query(Embedding).filter_by(dish_id=dish.dish_id).one_or_none()
    if embedding:
        embedding.text = embedding_text
    else:
        embedding = Embedding(dish_id=dish.dish_id, text=embedding_text)
        session.add(embedding)

    return updated

def main():
    if len(sys.argv) != 2:
        print("Usage: python -m scripts.ingest_seed <csv_file>")
        sys.exit(1)

    csv_file = sys.argv[1]
    inserted, updated = 0, 0

    with engine.begin() as conn:
        conn.execute(text("CREATE EXTENSION IF NOT EXISTS pgcrypto;"))
        conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector;"))

    with SessionLocal() as session:
        with open(csv_file, newline="", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                row = {k: (float(v) if v.replace(".", "").isdigit() else v) for k, v in row.items()}
                if upsert_dish(session, row):
                    updated += 1
                else:
                    inserted += 1
            session.commit()

    print(f"Inserted: {inserted}, Updated: {updated}")

if __name__ == "__main__":
    main()
