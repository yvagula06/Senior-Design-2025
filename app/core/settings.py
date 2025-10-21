from pydantic import AnyHttpUrl
from pydantic_settings import BaseSettings
from typing import List

class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql+psycopg://postgres:postgres@db:5432/nutrition"
    EMBEDDING_MODEL: str = "sentence-transformers/all-MiniLM-L6-v2"
    TOP_K: int = 5
    SIM_THRESHOLD: float = 0.45
    CORS_ORIGINS: List[AnyHttpUrl] = []

    class Config:
        env_file = ".env"

settings = Settings()
