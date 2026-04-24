from sqlalchemy import create_engine, text
from app.core.settings import settings

engine = create_engine(settings.DATABASE_URL, pool_pre_ping=True, future=True)


def ping_db() -> bool:
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return True
    except Exception:
        return False


def get_or_create_user_id(device_id: str, conn) -> int:
    """
    Look up a user by device_id and return their BigInt PK.
    Creates a new user row if one doesn't exist yet.
    The caller is responsible for committing the connection.
    """
    row = conn.execute(
        text("SELECT id FROM users WHERE device_id = :d"),
        {"d": device_id},
    ).fetchone()
    if row:
        return row[0]
    row = conn.execute(
        text("INSERT INTO users (device_id) VALUES (:d) RETURNING id"),
        {"d": device_id},
    ).fetchone()
    return row[0]
