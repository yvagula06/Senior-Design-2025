"""Query canonical tables for a quick sanity check."""

from sqlalchemy import text
from app.db.session import engine


def query_db():
    with engine.connect() as conn:
        print("=== dishes (first 5) ===")
        rows = conn.execute(
            text("""
                SELECT id, name, calories, protein_g, carbs_g, fat_g,
                       potassium_mg, category_name, data_source
                FROM dishes
                LIMIT 5
            """)
        ).fetchall()
        for r in rows:
            print(
                f"  [{r[0]}] {r[1]:<35} cal={r[2]} prot={r[3]} carbs={r[4]} "
                f"fat={r[5]} K={r[6]} cat={r[7]} src={r[8]}"
            )

        print("\n=== dish_variants (first 5) ===")
        rows = conn.execute(
            text("""
                SELECT dv.id, d.name, dv.variant_text, dv.variant_type
                FROM dish_variants dv
                JOIN dishes d ON d.id = dv.dish_id
                LIMIT 5
            """)
        ).fetchall()
        for r in rows:
            print(f"  [{r[0]}] dish='{r[1]}' variant='{r[2]}' type={r[3]}")

        print("\n=== row counts ===")
        for table in (
            "dishes", "dish_variants", "meal_logs",
            "vision_estimates", "vision_feedback", "users",
        ):
            count = conn.execute(text(f"SELECT COUNT(*) FROM {table}")).scalar()
            print(f"  {table}: {count:,}")


if __name__ == "__main__":
    query_db()
