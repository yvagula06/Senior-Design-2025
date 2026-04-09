from datetime import datetime
from typing import Optional, List
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship
from sqlalchemy import (
    BigInteger,
    String,
    Numeric,
    Boolean,
    Integer,
    ForeignKey,
    Text,
    TIMESTAMP,
    Index,
    CheckConstraint,
    FetchedValue,
    text,
)
from sqlalchemy.dialects.postgresql import JSONB
from pgvector.sqlalchemy import Vector


class Base(DeclarativeBase):
    pass


# ---------------------------------------------------------------------------
# Users
# ---------------------------------------------------------------------------

class User(Base):
    """
    Identity anchor for all user-generated data.
    Uses device_id (mobile UUID generated on first install) — no auth required.
    """
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    device_id: Mapped[str] = mapped_column(String(255), nullable=False, unique=True)
    created_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True), server_default=text("CURRENT_TIMESTAMP"), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True),
        server_default=text("CURRENT_TIMESTAMP"),
        server_onupdate=FetchedValue(),
        nullable=False,
    )

    meal_logs: Mapped[List["MealLog"]] = relationship(back_populates="user")
    vision_estimates: Mapped[List["VisionEstimate"]] = relationship(back_populates="user")
    vision_feedback: Mapped[List["VisionFeedback"]] = relationship(back_populates="user")
    portion_preferences: Mapped[Optional["UserPortionPreference"]] = relationship(
        back_populates="user", uselist=False
    )

    __table_args__ = (Index("idx_users_device_id", "device_id"),)

    def __repr__(self) -> str:
        return f"<User(id={self.id}, device_id='{self.device_id}')>"


# ---------------------------------------------------------------------------
# Nutrition knowledge base
# ---------------------------------------------------------------------------

class Dish(Base):
    """
    Canonical nutrition knowledge base.
    All nutrients are per 100 g unless serving_size_g overrides that reference.
    This is the single authoritative source of truth for nutrition facts.
    """
    __tablename__ = "dishes"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)

    # Core macros — required; label generation fails without these
    calories: Mapped[float] = mapped_column(Numeric(8, 2), nullable=False)
    protein_g: Mapped[float] = mapped_column(Numeric(8, 2), nullable=False)
    fat_g: Mapped[float] = mapped_column(Numeric(8, 2), nullable=False)
    carbs_g: Mapped[float] = mapped_column(Numeric(8, 2), nullable=False)

    # FDA-required micronutrients (nullable — data may be missing from source)
    fiber_g: Mapped[Optional[float]] = mapped_column(Numeric(8, 2), nullable=True)
    sugar_g: Mapped[Optional[float]] = mapped_column(Numeric(8, 2), nullable=True)
    sodium_mg: Mapped[Optional[float]] = mapped_column(Numeric(8, 2), nullable=True)
    potassium_mg: Mapped[Optional[float]] = mapped_column(Numeric(8, 2), nullable=True)
    saturated_fat_g: Mapped[Optional[float]] = mapped_column(Numeric(8, 2), nullable=True)
    trans_fat_g: Mapped[Optional[float]] = mapped_column(Numeric(8, 2), nullable=True)
    cholesterol_mg: Mapped[Optional[float]] = mapped_column(Numeric(8, 2), nullable=True)
    vitamin_a_mcg: Mapped[Optional[float]] = mapped_column(Numeric(8, 2), nullable=True)
    vitamin_c_mg: Mapped[Optional[float]] = mapped_column(Numeric(8, 2), nullable=True)
    vitamin_d_mcg: Mapped[Optional[float]] = mapped_column(Numeric(8, 2), nullable=True)
    calcium_mg: Mapped[Optional[float]] = mapped_column(Numeric(8, 2), nullable=True)
    iron_mg: Mapped[Optional[float]] = mapped_column(Numeric(8, 2), nullable=True)

    # Serving reference
    serving_size_g: Mapped[Optional[float]] = mapped_column(Numeric(8, 2), nullable=True)
    serving_size_unit: Mapped[Optional[str]] = mapped_column(String(50), default="g", nullable=True)

    # Food category — used by DishPrediction response and future filtering
    category_name: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)

    # Provenance metadata
    data_source: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    confidence_score: Mapped[Optional[float]] = mapped_column(Numeric(4, 3), nullable=True)

    # Soft-delete + versioning for future model updates
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    version: Mapped[int] = mapped_column(Integer, nullable=False, default=1)

    created_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True), server_default=text("CURRENT_TIMESTAMP"), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True),
        server_default=text("CURRENT_TIMESTAMP"),
        server_onupdate=FetchedValue(),
        nullable=False,
    )

    variants: Mapped[List["DishVariant"]] = relationship(
        back_populates="dish", cascade="all, delete-orphan", passive_deletes=True
    )
    meal_logs: Mapped[List["MealLog"]] = relationship(back_populates="dish")
    vision_estimates: Mapped[List["VisionEstimate"]] = relationship(
        back_populates="predicted_dish"
    )
    vision_feedback: Mapped[List["VisionFeedback"]] = relationship(
        back_populates="corrected_dish"
    )

    __table_args__ = (
        CheckConstraint("calories >= 0", name="ck_dishes_calories"),
        CheckConstraint("protein_g >= 0", name="ck_dishes_protein"),
        CheckConstraint("fat_g >= 0", name="ck_dishes_fat"),
        CheckConstraint("carbs_g >= 0", name="ck_dishes_carbs"),
        Index("idx_dishes_name", "name"),
        Index("idx_dishes_data_source", "data_source"),
        Index("idx_dishes_active", "is_active", postgresql_where=text("is_active = TRUE")),
    )

    def __repr__(self) -> str:
        return f"<Dish(id={self.id}, name='{self.name}', calories={self.calories})>"


class DishVariant(Base):
    """
    Search aliases with vector embeddings for semantic dish retrieval.
    Supports N aliases per dish (e.g., 'tikka masala', 'butter chicken masala').
    """
    __tablename__ = "dish_variants"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    dish_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("dishes.id", ondelete="CASCADE", onupdate="CASCADE"),
        nullable=False,
    )
    variant_text: Mapped[str] = mapped_column(Text, nullable=False)
    # 384-dim matches sentence-transformers/all-MiniLM-L6-v2
    embedding: Mapped[Vector] = mapped_column(Vector(384), nullable=False)
    variant_type: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    language_code: Mapped[str] = mapped_column(String(10), default="en", nullable=False)
    search_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    last_searched_at: Mapped[Optional[datetime]] = mapped_column(
        TIMESTAMP(timezone=True), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True), server_default=text("CURRENT_TIMESTAMP"), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True),
        server_default=text("CURRENT_TIMESTAMP"),
        server_onupdate=FetchedValue(),
        nullable=False,
    )

    dish: Mapped["Dish"] = relationship(back_populates="variants")

    __table_args__ = (
        Index("idx_dish_variants_dish_id", "dish_id"),
        Index("idx_dish_variants_type", "variant_type"),
        Index("idx_dish_variants_variant_text", "variant_text"),
        Index(
            "idx_dish_variants_embedding_hnsw",
            "embedding",
            postgresql_using="hnsw",
            postgresql_with={"m": 16, "ef_construction": 64},
            postgresql_ops={"embedding": "vector_cosine_ops"},
        ),
        Index("uq_dish_variant_text", "dish_id", "variant_text", unique=True),
    )

    def __repr__(self) -> str:
        return f"<DishVariant(id={self.id}, dish_id={self.dish_id}, text='{self.variant_text[:30]}')>"


# ---------------------------------------------------------------------------
# Camera pipeline
# ---------------------------------------------------------------------------

class VisionEstimate(Base):
    """
    Stores every camera-pipeline prediction so results can be audited and
    re-processed when models are updated.
    Images are NOT stored as base64 — only storage path/key references.
    """
    __tablename__ = "vision_estimates"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    user_id: Mapped[Optional[int]] = mapped_column(
        BigInteger, ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )

    # Capture metadata
    capture_mode: Mapped[str] = mapped_column(String(20), nullable=False)
    device_type: Mapped[Optional[str]] = mapped_column(String(10), nullable=True)
    num_images: Mapped[int] = mapped_column(Integer, nullable=False)
    has_depth_data: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    # Storage references — paths or keys only, never base64
    image_storage_keys: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    depth_storage_key: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)

    # Top predicted dish (FK nullable so old estimates survive dish edits)
    predicted_dish_id: Mapped[Optional[int]] = mapped_column(
        BigInteger, ForeignKey("dishes.id", ondelete="SET NULL"), nullable=True
    )
    predicted_dish_name: Mapped[str] = mapped_column(String(255), nullable=False)
    predicted_confidence: Mapped[Optional[float]] = mapped_column(Numeric(4, 3), nullable=True)
    # [{dish_id, dish_name, confidence}, ...]
    alternative_dishes: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)

    # Volume and calorie outputs
    estimation_mode: Mapped[str] = mapped_column(String(20), nullable=False)
    volume_ml: Mapped[Optional[float]] = mapped_column(Numeric(8, 2), nullable=True)
    volume_confidence: Mapped[Optional[float]] = mapped_column(Numeric(4, 3), nullable=True)
    calorie_estimate: Mapped[float] = mapped_column(Numeric(8, 2), nullable=False)
    calorie_range_min: Mapped[Optional[float]] = mapped_column(Numeric(8, 2), nullable=True)
    calorie_range_max: Mapped[Optional[float]] = mapped_column(Numeric(8, 2), nullable=True)

    # Model version tracking — enables future reprocessing
    classifier_version: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    segmentation_version: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    volume_estimator_version: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    processing_time_ms: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True), server_default=text("CURRENT_TIMESTAMP"), nullable=False
    )

    user: Mapped[Optional["User"]] = relationship(back_populates="vision_estimates")
    predicted_dish: Mapped[Optional["Dish"]] = relationship(back_populates="vision_estimates")
    feedback: Mapped[List["VisionFeedback"]] = relationship(
        back_populates="vision_estimate"
    )
    meal_log: Mapped[Optional["MealLog"]] = relationship(back_populates="vision_estimate")

    __table_args__ = (
        CheckConstraint(
            "capture_mode IN ('depth', 'multi_angle', 'single')",
            name="ck_ve_capture_mode",
        ),
        CheckConstraint("calorie_estimate >= 0", name="ck_ve_calorie_estimate"),
        Index("idx_vision_estimates_user_id", "user_id"),
        Index("idx_vision_estimates_created_at", "created_at"),
        Index("idx_vision_estimates_dish_id", "predicted_dish_id"),
    )

    def __repr__(self) -> str:
        return (
            f"<VisionEstimate(id={self.id}, dish='{self.predicted_dish_name}', "
            f"kcal={self.calorie_estimate})>"
        )


# ---------------------------------------------------------------------------
# Meal logging (both paths converge here)
# ---------------------------------------------------------------------------

class MealLog(Base):
    """
    Single source of truth for what the user actually logged/confirmed.
    Stores a frozen snapshot of the nutrition label so future model updates
    do not alter historical records.
    """
    __tablename__ = "meal_logs"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    user_id: Mapped[Optional[int]] = mapped_column(
        BigInteger, ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    # FK nullable — preserves log even if dish is later deactivated/deleted
    dish_id: Mapped[Optional[int]] = mapped_column(
        BigInteger, ForeignKey("dishes.id", ondelete="SET NULL"), nullable=True
    )
    vision_estimate_id: Mapped[Optional[int]] = mapped_column(
        BigInteger, ForeignKey("vision_estimates.id", ondelete="SET NULL"), nullable=True
    )

    # 'manual' or 'camera'
    entry_source: Mapped[str] = mapped_column(String(20), nullable=False)

    # Denormalised display fields — preserved even if dish is later deleted
    logged_dish_name: Mapped[str] = mapped_column(String(255), nullable=False)
    logged_calories: Mapped[float] = mapped_column(Numeric(8, 2), nullable=False)

    # Full FDA label snapshot at time of logging (frozen for history; nullable for manual entries without full label)
    nutrition_label: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)

    serving_multiplier: Mapped[float] = mapped_column(
        Numeric(6, 3), nullable=False, default=1.0
    )
    match_confidence: Mapped[Optional[float]] = mapped_column(Numeric(4, 3), nullable=True)
    model_version: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)

    logged_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True), server_default=text("CURRENT_TIMESTAMP"), nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True), server_default=text("CURRENT_TIMESTAMP"), nullable=False
    )

    user: Mapped[Optional["User"]] = relationship(back_populates="meal_logs")
    dish: Mapped[Optional["Dish"]] = relationship(back_populates="meal_logs")
    vision_estimate: Mapped[Optional["VisionEstimate"]] = relationship(
        back_populates="meal_log"
    )

    __table_args__ = (
        CheckConstraint(
            "entry_source IN ('manual', 'camera')", name="ck_ml_entry_source"
        ),
        CheckConstraint("logged_calories >= 0", name="ck_ml_calories"),
        Index("idx_meal_logs_user_id", "user_id"),
        Index("idx_meal_logs_logged_at", "logged_at"),
        Index("idx_meal_logs_dish_id", "dish_id"),
    )

    def __repr__(self) -> str:
        return (
            f"<MealLog(id={self.id}, dish='{self.logged_dish_name}', "
            f"kcal={self.logged_calories}, source='{self.entry_source}')>"
        )


# ---------------------------------------------------------------------------
# Feedback & personalisation
# ---------------------------------------------------------------------------

class VisionFeedback(Base):
    """
    User corrections on vision estimates.
    Drives model improvement and per-user personalisation.
    """
    __tablename__ = "vision_feedback"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    vision_estimate_id: Mapped[Optional[int]] = mapped_column(
        BigInteger,
        ForeignKey("vision_estimates.id", ondelete="SET NULL"),
        nullable=True,
    )
    user_id: Mapped[Optional[int]] = mapped_column(
        BigInteger, ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    # FK to dish the user said it actually was (when correcting classification)
    corrected_dish_id: Mapped[Optional[int]] = mapped_column(
        BigInteger, ForeignKey("dishes.id", ondelete="SET NULL"), nullable=True
    )

    feedback_type: Mapped[str] = mapped_column(String(30), nullable=False)
    confirmed_dish_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    portion_adjustment: Mapped[Optional[float]] = mapped_column(Numeric(6, 3), nullable=True)
    plate_size: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)
    quick_feedback: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    corrected_calories: Mapped[Optional[float]] = mapped_column(Numeric(8, 2), nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True), server_default=text("CURRENT_TIMESTAMP"), nullable=False
    )

    vision_estimate: Mapped["VisionEstimate"] = relationship(back_populates="feedback")
    user: Mapped[Optional["User"]] = relationship(back_populates="vision_feedback")
    corrected_dish: Mapped[Optional["Dish"]] = relationship(back_populates="vision_feedback")

    __table_args__ = (
        CheckConstraint(
            "feedback_type IN ('confirmed', 'corrected_dish', 'corrected_portion', 'quick_correction')",
            name="ck_vf_feedback_type",
        ),
        Index("idx_vision_feedback_estimate_id", "vision_estimate_id"),
        Index("idx_vision_feedback_user_id", "user_id"),
    )

    def __repr__(self) -> str:
        return (
            f"<VisionFeedback(id={self.id}, estimate_id={self.vision_estimate_id}, "
            f"type='{self.feedback_type}')>"
        )


class UserPortionPreference(Base):
    """
    Per-user personalisation profile derived from feedback history.
    One row per user (UNIQUE on user_id).
    """
    __tablename__ = "user_portion_preferences"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
    )
    avg_portion_factor: Mapped[float] = mapped_column(
        Numeric(6, 3), nullable=False, default=1.0
    )
    feedback_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    confidence_score: Mapped[float] = mapped_column(Numeric(4, 3), nullable=False, default=0.0)
    # {dish_id_str: {avg_factor, count}}
    dish_preferences: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    # {category: {avg_factor, count}}
    category_preferences: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    last_updated: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True),
        server_default=text("CURRENT_TIMESTAMP"),
        server_onupdate=FetchedValue(),
        nullable=False,
    )
    created_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True), server_default=text("CURRENT_TIMESTAMP"), nullable=False
    )

    user: Mapped["User"] = relationship(back_populates="portion_preferences")

    __table_args__ = (
        Index("idx_user_portion_preferences_user_id", "user_id"),
    )

    def __repr__(self) -> str:
        return f"<UserPortionPreference(user_id={self.user_id}, avg_factor={self.avg_portion_factor})>"
