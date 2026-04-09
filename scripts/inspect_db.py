"""Quick database inspection for the canonical schema."""

from sqlalchemy import text, inspect
from app.db.session import engine


def inspect_db():
    inspector = inspect(engine)
    for table in ("dishes", "dish_variants", "meal_logs"):
        print(f"\nTable: {table}")
        for col in inspector.get_columns(table):
            print(f"  {col['name']:30s} {col['type']}")

    with engine.connect() as conn:
        print("\n--- Sample dishes ---")
        rows = conn.execute(
            text(
                "SELECT id, name, calories, protein_g, carbs_g, fat_g, potassium_mg "
                "FROM dishes LIMIT 5"
            )
        ).fetchall()
        for r in rows:
            print(
                f"  [{r[0]}] {r[1]:<35} "
                f"cal={r[2]} prot={r[3]} carbs={r[4]} fat={r[5]} K={r[6]}"
            )

        print("\n--- Row counts ---")
        for table in (
            "dishes", "dish_variants", "meal_logs",
            "vision_estimates", "vision_feedback", "users",
        ):
            count = conn.execute(text(f"SELECT COUNT(*) FROM {table}")).scalar()
            print(f"  {table}: {count:,}")


if __name__ == "__main__":
    inspect_db()