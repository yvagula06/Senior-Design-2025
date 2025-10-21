from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID, ARRAY, JSONB
from pgvector.sqlalchemy import Vector
from sqlalchemy import ForeignKey, Text, Float, TIMESTAMP, text

class Base(DeclarativeBase):
    pass

class Dish(Base):
    __tablename__ = "dishes"

    dish_id: Mapped[UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    name: Mapped[str] = mapped_column(Text, nullable=False)
    cuisine: Mapped[str] = mapped_column(Text, nullable=True)
    aliases: Mapped[list[str]] = mapped_column(ARRAY(Text), nullable=True)
    macro_priors: Mapped[dict] = mapped_column(JSONB, nullable=True)
    notes: Mapped[str] = mapped_column(Text, nullable=True)

    nutrients: Mapped["Nutrients"] = relationship(back_populates="dish", uselist=False)
    embedding: Mapped["Embedding"] = relationship(back_populates="dish", uselist=False)

    def __repr__(self) -> str:
        return f"<Dish(dish_id={self.dish_id}, name={self.name})>"

class Nutrients(Base):
    __tablename__ = "nutrients"

    dish_id: Mapped[UUID] = mapped_column(ForeignKey("dishes.dish_id", ondelete="CASCADE"), primary_key=True)
    kcal: Mapped[float] = mapped_column(Float, nullable=False)
    protein_g: Mapped[float] = mapped_column(Float, nullable=True)
    carbs_g: Mapped[float] = mapped_column(Float, nullable=True)
    fat_g: Mapped[float] = mapped_column(Float, nullable=True)
    fiber_g: Mapped[float] = mapped_column(Float, nullable=True)
    sugar_g: Mapped[float] = mapped_column(Float, nullable=True)
    sodium_mg: Mapped[float] = mapped_column(Float, nullable=True)
    source: Mapped[str] = mapped_column(Text, nullable=True)
    variance: Mapped[dict] = mapped_column(JSONB, nullable=True)

    dish: Mapped[Dish] = relationship(back_populates="nutrients")

    def __repr__(self) -> str:
        return f"<Nutrients(dish_id={self.dish_id}, kcal={self.kcal})>"

class Embedding(Base):
    __tablename__ = "embeddings"

    dish_id: Mapped[UUID] = mapped_column(ForeignKey("dishes.dish_id", ondelete="CASCADE"), primary_key=True)
    text: Mapped[str] = mapped_column(Text, nullable=False)
    vector: Mapped[Vector] = mapped_column(Vector(384), nullable=True)

    dish: Mapped[Dish] = relationship(back_populates="embedding")

    def __repr__(self) -> str:
        return f"<Embedding(dish_id={self.dish_id}, text={self.text})>"

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    query_text: Mapped[str] = mapped_column(Text, nullable=False)
    target_calories: Mapped[float] = mapped_column(Float, nullable=False)
    chosen_dishes: Mapped[dict] = mapped_column(JSONB, nullable=True)
    final_label: Mapped[dict] = mapped_column(JSONB, nullable=True)
    confidence: Mapped[float] = mapped_column(Float, nullable=True)
    created_at: Mapped[str] = mapped_column(TIMESTAMP(timezone=True), server_default=text("now()"), nullable=False)

    def __repr__(self) -> str:
        return f"<AuditLog(id={self.id}, query_text={self.query_text})>"