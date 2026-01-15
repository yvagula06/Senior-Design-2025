from datetime import datetime
from typing import Optional
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship
from sqlalchemy import (
    BigInteger,
    String,
    Numeric,
    Boolean,
    Integer,
    ForeignKey,
    Text,
    Float,
    TIMESTAMP,
    Index,
    text,
)
from sqlalchemy.dialects.postgresql import UUID, JSONB
from pgvector.sqlalchemy import Vector


class Base(DeclarativeBase):
    pass


class Dish(Base):
    """
    Canonical dish profiles with complete nutrition facts.
    Each dish represents an authoritative source for nutrition information.
    """
    __tablename__ = "dishes"

    # Primary Key
    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    
    # Canonical dish name
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    
    # Nutrition Facts (per 100g serving unless specified)
    calories: Mapped[float] = mapped_column(Numeric(8, 2), nullable=False)
    protein_g: Mapped[float] = mapped_column(Numeric(8, 2), nullable=False)
    fat_g: Mapped[float] = mapped_column(Numeric(8, 2), nullable=False)
    carbs_g: Mapped[float] = mapped_column(Numeric(8, 2), nullable=False)
    
    # Optional micronutrients
    fiber_g: Mapped[Optional[float]] = mapped_column(Numeric(8, 2), nullable=True)
    sugar_g: Mapped[Optional[float]] = mapped_column(Numeric(8, 2), nullable=True)
    sodium_mg: Mapped[Optional[float]] = mapped_column(Numeric(8, 2), nullable=True)
    saturated_fat_g: Mapped[Optional[float]] = mapped_column(Numeric(8, 2), nullable=True)
    trans_fat_g: Mapped[Optional[float]] = mapped_column(Numeric(8, 2), nullable=True)
    cholesterol_mg: Mapped[Optional[float]] = mapped_column(Numeric(8, 2), nullable=True)
    vitamin_a_mcg: Mapped[Optional[float]] = mapped_column(Numeric(8, 2), nullable=True)
    vitamin_c_mg: Mapped[Optional[float]] = mapped_column(Numeric(8, 2), nullable=True)
    calcium_mg: Mapped[Optional[float]] = mapped_column(Numeric(8, 2), nullable=True)
    iron_mg: Mapped[Optional[float]] = mapped_column(Numeric(8, 2), nullable=True)
    
    # Serving information
    serving_size_g: Mapped[Optional[float]] = mapped_column(Numeric(8, 2), nullable=True)
    serving_size_unit: Mapped[Optional[str]] = mapped_column(String(50), default="g", nullable=True)
    
    # Metadata
    data_source: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    confidence_score: Mapped[Optional[float]] = mapped_column(Numeric(4, 3), nullable=True)
    
    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True), 
        server_default=text("CURRENT_TIMESTAMP"),
        nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True),
        server_default=text("CURRENT_TIMESTAMP"),
        nullable=False
    )
    
    # Audit tracking
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    version: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    
    # Relationships
    variants: Mapped[list["DishVariant"]] = relationship(
        back_populates="dish",
        cascade="all, delete-orphan",
        passive_deletes=True
    )

    # Indexes
    __table_args__ = (
        Index("idx_dishes_name", "name"),
        Index("idx_dishes_data_source", "data_source"),
        Index("idx_dishes_created_at", "created_at", postgresql_ops={"created_at": "DESC"}),
        Index("idx_dishes_active", "is_active", postgresql_where=text("is_active = TRUE")),
    )

    def __repr__(self) -> str:
        return f"<Dish(id={self.id}, name='{self.name}', calories={self.calories})>"


class DishVariant(Base):
    """
    Textual variants with embeddings for similarity-based retrieval.
    Each variant represents a different way users might describe the same dish.
    """
    __tablename__ = "dish_variants"

    # Primary Key
    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    
    # Foreign Key to parent dish
    dish_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("dishes.id", ondelete="CASCADE", onupdate="CASCADE"),
        nullable=False
    )
    
    # Variant text (what the user might type or say)
    variant_text: Mapped[str] = mapped_column(Text, nullable=False)
    
    # Vector embedding for similarity search
    # Dimension should match your embedding model (384 for all-MiniLM-L6-v2)
    embedding: Mapped[Vector] = mapped_column(Vector(384), nullable=False)
    
    # Variant metadata
    variant_type: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    language_code: Mapped[str] = mapped_column(String(10), default="en", nullable=False)
    
    # Usage statistics
    search_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    last_searched_at: Mapped[Optional[datetime]] = mapped_column(
        TIMESTAMP(timezone=True),
        nullable=True
    )
    
    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True),
        server_default=text("CURRENT_TIMESTAMP"),
        nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True),
        server_default=text("CURRENT_TIMESTAMP"),
        nullable=False
    )
    
    # Relationships
    dish: Mapped["Dish"] = relationship(back_populates="variants")

    # Indexes
    __table_args__ = (
        Index("idx_dish_variants_dish_id", "dish_id"),
        Index("idx_dish_variants_text", "variant_text"),
        Index("idx_dish_variants_type", "variant_type"),
        # pgvector HNSW index for similarity search
        Index(
            "idx_dish_variants_embedding_hnsw",
            "embedding",
            postgresql_using="hnsw",
            postgresql_with={"m": 16, "ef_construction": 64},
            postgresql_ops={"embedding": "vector_cosine_ops"}
        ),
        # Unique constraint on (dish_id, variant_text)
        Index("unique_dish_variant", "dish_id", "variant_text", unique=True),
    )

    def __repr__(self) -> str:
        return f"<DishVariant(id={self.id}, dish_id={self.dish_id}, text='{self.variant_text[:30]}...')>"



class AuditLog(Base):
    """
    Audit logs for tracking user queries and system responses.
    Used for monitoring, debugging, and improving prediction accuracy.
    """
    __tablename__ = "audit_logs"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    query_text: Mapped[str] = mapped_column(Text, nullable=False)
    target_calories: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    chosen_dishes: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    final_label: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    confidence: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True),
        server_default=text("CURRENT_TIMESTAMP"),
        nullable=False
    )

    def __repr__(self) -> str:
        return f"<AuditLog(id={self.id}, query='{self.query_text[:30]}...', confidence={self.confidence})>"
