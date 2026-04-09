"""Inspect all canonical tables — print names, columns, and row counts."""

from sqlalchemy import inspect, text
from app.db.session import engine

CANONICAL_TABLES = [
    "users",
    "dishes",
    "dish_variants",
    "vision_estimates",
    "meal_logs",
    "vision_feedback",
    "user_portion_preferences",
]


def inspect_schema():
    inspector = inspect(engine)
    existing = set(inspector.get_table_names())

    with engine.connect() as conn:
        for table in CANONICAL_TABLES:
            if table not in existing:
                print(f"  \u274c {table!r} \u2014 NOT FOUND (run: alembic upgrade head)")
                continue
            cols = [c["name"] for c in inspector.get_columns(table)]
            count = conn.execute(text(f"SELECT COUNT(*) FROM {table}")).scalar()
            print(f"  \u2705 {table} ({count:,} rows) \u2014 columns: {', '.join(cols)}")


if __name__ == "__main__":
    print("=== Canonical schema inspection ===\n")
    inspect_schema()