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
