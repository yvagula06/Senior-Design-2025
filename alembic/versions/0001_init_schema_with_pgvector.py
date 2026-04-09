"""Canonical initial schema — single source of truth for all tables.

Revision ID : 0001_canonical
Down revision: None

Design decisions
----------------
* All PKs are BIGSERIAL (BigInteger autoincrement) — no UUIDs in the DB.
* Nutrition data lives directly on ``dishes``; no separate nutrients table.
* ``dish_variants`` holds one row per search alias and carries the 384-dim
  vector embedding for the all-MiniLM-L6-v2 sentence-transformer model.
  The HNSW cosine index on ``embedding`` matches the ``<=>`` operator used
  in retrieval_service.py.
* Images are stored by reference (storage keys / paths) in JSONB — never
  as base64 blobs.
* All cross-table FKs that point at master data use SET NULL so historical
  rows (meal_logs, vision_estimates, feedback) survive a dish or user
  deletion.  The one exception is dish_variants → dishes (CASCADE), because
  variants have no meaning without their parent dish.
* ``nutrition_label`` on meal_logs is nullable so manual entries that lack
  a full FDA label are not rejected.
* ``vision_feedback.vision_estimate_id`` is nullable + SET NULL to match the
  optional estimate_id in the VisionFeedbackRequest Pydantic schema.
* A shared PL/pgSQL trigger function (_update_updated_at) keeps
  ``updated_at`` current on every UPDATE; triggers are registered on
  users, dishes, and dish_variants.  ``user_portion_preferences.last_updated``
  is explicitly set by the application service on every write.
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB
from pgvector.sqlalchemy import Vector

revision = "0001_canonical"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ------------------------------------------------------------------
    # Extensions
    # ------------------------------------------------------------------
    op.execute("CREATE EXTENSION IF NOT EXISTS vector;")

    # ------------------------------------------------------------------
    # Shared trigger function — created before any table that uses it
    # ------------------------------------------------------------------
    op.execute("""
        CREATE OR REPLACE FUNCTION _update_updated_at()
        RETURNS TRIGGER AS $$
        BEGIN
            NEW.updated_at = CURRENT_TIMESTAMP;
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
    """)

    # ------------------------------------------------------------------
    # Drop legacy tables from old split-brain schema.
    # Safe on a fresh DB — nothing happens when tables do not exist.
    # ------------------------------------------------------------------
    for tbl in (
        "dish_density_priors",
        "user_portion_preferences",
        "vision_feedback",
        "vision_estimates",
        "audit_logs",
        "embeddings",
        "nutrients",
        "dish_variants",
        "meal_logs",
        "dishes",
        "users",
    ):
        op.execute(f"DROP TABLE IF EXISTS {tbl} CASCADE;")

    # ------------------------------------------------------------------
    # users
    # ------------------------------------------------------------------
    op.create_table(
        "users",
        sa.Column("id", sa.BigInteger, primary_key=True, autoincrement=True),
        sa.Column("device_id", sa.String(255), nullable=False, unique=True),
        sa.Column(
            "created_at",
            sa.TIMESTAMP(timezone=True),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.TIMESTAMP(timezone=True),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
    )
    op.create_index("idx_users_device_id", "users", ["device_id"])
    op.execute("""
        CREATE TRIGGER trg_users_updated_at
        BEFORE UPDATE ON users
        FOR EACH ROW EXECUTE FUNCTION _update_updated_at();
    """)

    # ------------------------------------------------------------------
    # dishes  (flat canonical nutrition table — all nutrients inline)
    # ------------------------------------------------------------------
    op.create_table(
        "dishes",
        sa.Column("id", sa.BigInteger, primary_key=True, autoincrement=True),
        sa.Column("name", sa.String(255), nullable=False),
        # Core macros — required; label generation fails without these
        sa.Column("calories",   sa.Numeric(8, 2), nullable=False),
        sa.Column("protein_g",  sa.Numeric(8, 2), nullable=False),
        sa.Column("fat_g",      sa.Numeric(8, 2), nullable=False),
        sa.Column("carbs_g",    sa.Numeric(8, 2), nullable=False),
        # FDA-required micronutrients (nullable — source data may be missing)
        sa.Column("fiber_g",          sa.Numeric(8, 2), nullable=True),
        sa.Column("sugar_g",          sa.Numeric(8, 2), nullable=True),
        sa.Column("sodium_mg",        sa.Numeric(8, 2), nullable=True),
        sa.Column("potassium_mg",     sa.Numeric(8, 2), nullable=True),
        sa.Column("saturated_fat_g",  sa.Numeric(8, 2), nullable=True),
        sa.Column("trans_fat_g",      sa.Numeric(8, 2), nullable=True),
        sa.Column("cholesterol_mg",   sa.Numeric(8, 2), nullable=True),
        sa.Column("vitamin_a_mcg",    sa.Numeric(8, 2), nullable=True),
        sa.Column("vitamin_c_mg",     sa.Numeric(8, 2), nullable=True),
        sa.Column("vitamin_d_mcg",    sa.Numeric(8, 2), nullable=True),
        sa.Column("calcium_mg",       sa.Numeric(8, 2), nullable=True),
        sa.Column("iron_mg",          sa.Numeric(8, 2), nullable=True),
        # Serving reference
        sa.Column("serving_size_g",    sa.Numeric(8, 2), nullable=True),
        sa.Column("serving_size_unit", sa.String(50), server_default="g", nullable=True),
        # Food category — surfaced in DishPrediction API responses
        sa.Column("category_name", sa.String(100), nullable=True),
        # Provenance metadata
        sa.Column("data_source",      sa.String(100), nullable=True),
        sa.Column("confidence_score", sa.Numeric(4, 3), nullable=True),
        # Soft-delete + versioning for future model-update reprocessing
        sa.Column("is_active", sa.Boolean, nullable=False, server_default="TRUE"),
        sa.Column("version",   sa.Integer, nullable=False, server_default="1"),
        sa.Column(
            "created_at",
            sa.TIMESTAMP(timezone=True),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.TIMESTAMP(timezone=True),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        sa.CheckConstraint("calories  >= 0", name="ck_dishes_calories"),
        sa.CheckConstraint("protein_g >= 0", name="ck_dishes_protein"),
        sa.CheckConstraint("fat_g     >= 0", name="ck_dishes_fat"),
        sa.CheckConstraint("carbs_g   >= 0", name="ck_dishes_carbs"),
    )
    op.create_index("idx_dishes_name",        "dishes", ["name"])
    op.create_index("idx_dishes_data_source", "dishes", ["data_source"])
    op.create_index(
        "idx_dishes_active", "dishes", ["is_active"],
        postgresql_where=sa.text("is_active = TRUE"),
    )
    op.execute("""
        CREATE TRIGGER trg_dishes_updated_at
        BEFORE UPDATE ON dishes
        FOR EACH ROW EXECUTE FUNCTION _update_updated_at();
    """)

    # ------------------------------------------------------------------
    # dish_variants  (search aliases + 384-dim vector embeddings)
    # ------------------------------------------------------------------
    op.create_table(
        "dish_variants",
        sa.Column("id", sa.BigInteger, primary_key=True, autoincrement=True),
        sa.Column(
            "dish_id",
            sa.BigInteger,
            sa.ForeignKey("dishes.id", ondelete="CASCADE", onupdate="CASCADE"),
            nullable=False,
        ),
        sa.Column("variant_text",     sa.Text,        nullable=False),
        sa.Column("embedding",        Vector(384),     nullable=False),
        sa.Column("variant_type",     sa.String(50),   nullable=True),
        sa.Column("language_code",    sa.String(10),   nullable=False, server_default="en"),
        sa.Column("search_count",     sa.Integer,      nullable=False, server_default="0"),
        sa.Column("last_searched_at", sa.TIMESTAMP(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.TIMESTAMP(timezone=True),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.TIMESTAMP(timezone=True),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        sa.UniqueConstraint("dish_id", "variant_text", name="uq_dish_variant_text"),
    )
    op.create_index("idx_dish_variants_dish_id",      "dish_variants", ["dish_id"])
    op.create_index("idx_dish_variants_type",         "dish_variants", ["variant_type"])
    # B-tree for fast exact-match lookups (e.g. dedup checks during import)
    op.create_index("idx_dish_variants_variant_text", "dish_variants", ["variant_text"])
    # HNSW cosine index — must match the <=> operator used in retrieval_service.py
    op.execute("""
        CREATE INDEX idx_dish_variants_embedding_hnsw
        ON dish_variants
        USING hnsw (embedding vector_cosine_ops)
        WITH (m = 16, ef_construction = 64);
    """)
    op.execute("""
        CREATE TRIGGER trg_dish_variants_updated_at
        BEFORE UPDATE ON dish_variants
        FOR EACH ROW EXECUTE FUNCTION _update_updated_at();
    """)

    # ------------------------------------------------------------------
    # vision_estimates  (camera pipeline outputs — images by reference only)
    # ------------------------------------------------------------------
    op.create_table(
        "vision_estimates",
        sa.Column("id", sa.BigInteger, primary_key=True, autoincrement=True),
        sa.Column(
            "user_id",
            sa.BigInteger,
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
        # Capture metadata
        sa.Column("capture_mode",   sa.String(20), nullable=False),
        sa.Column("device_type",    sa.String(10), nullable=True),
        sa.Column("num_images",     sa.Integer,    nullable=False),
        sa.Column("has_depth_data", sa.Boolean,    nullable=False, server_default="FALSE"),
        # Storage references: list of path/key strings — never base64
        sa.Column("image_storage_keys", JSONB,         nullable=True),
        sa.Column("depth_storage_key",  sa.String(500), nullable=True),
        # Top predicted dish (SET NULL so estimates survive dish deletions)
        sa.Column(
            "predicted_dish_id",
            sa.BigInteger,
            sa.ForeignKey("dishes.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("predicted_dish_name",  sa.String(255), nullable=False),
        sa.Column("predicted_confidence", sa.Numeric(4, 3), nullable=True),
        # [{dish_id, dish_name, confidence}, ...]
        sa.Column("alternative_dishes",   JSONB, nullable=True),
        # Estimation outputs
        sa.Column("estimation_mode",   sa.String(20),    nullable=False),
        sa.Column("volume_ml",         sa.Numeric(8, 2), nullable=True),
        sa.Column("volume_confidence", sa.Numeric(4, 3), nullable=True),
        sa.Column("calorie_estimate",  sa.Numeric(8, 2), nullable=False),
        sa.Column("calorie_range_min", sa.Numeric(8, 2), nullable=True),
        sa.Column("calorie_range_max", sa.Numeric(8, 2), nullable=True),
        # Model version tracking — enables future reprocessing passes
        sa.Column("classifier_version",       sa.String(50), nullable=True),
        sa.Column("segmentation_version",     sa.String(50), nullable=True),
        sa.Column("volume_estimator_version", sa.String(50), nullable=True),
        sa.Column("processing_time_ms",       sa.Integer,    nullable=True),
        sa.Column(
            "created_at",
            sa.TIMESTAMP(timezone=True),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        sa.CheckConstraint(
            "capture_mode IN ('depth', 'multi_angle', 'single')",
            name="ck_ve_capture_mode",
        ),
        sa.CheckConstraint("calorie_estimate >= 0", name="ck_ve_calorie_estimate"),
    )
    op.create_index("idx_vision_estimates_user_id",    "vision_estimates", ["user_id"])
    op.create_index("idx_vision_estimates_created_at", "vision_estimates", ["created_at"])
    op.create_index("idx_vision_estimates_dish_id",    "vision_estimates", ["predicted_dish_id"])

    # ------------------------------------------------------------------
    # meal_logs  (manual and camera paths both write here)
    # ------------------------------------------------------------------
    op.create_table(
        "meal_logs",
        sa.Column("id", sa.BigInteger, primary_key=True, autoincrement=True),
        sa.Column(
            "user_id",
            sa.BigInteger,
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column(
            "dish_id",
            sa.BigInteger,
            sa.ForeignKey("dishes.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column(
            "vision_estimate_id",
            sa.BigInteger,
            sa.ForeignKey("vision_estimates.id", ondelete="SET NULL"),
            nullable=True,
        ),
        # 'manual' or 'camera'
        sa.Column("entry_source",     sa.String(20),    nullable=False),
        # Denormalised — preserved even if the dish is later deleted
        sa.Column("logged_dish_name", sa.String(255),   nullable=False),
        sa.Column("logged_calories",  sa.Numeric(8, 2), nullable=False),
        # Frozen FDA label snapshot at the moment of logging.
        # Nullable: manual entries without a full label are valid.
        sa.Column("nutrition_label",    JSONB,            nullable=True),
        sa.Column("serving_multiplier", sa.Numeric(6, 3), nullable=False, server_default="1.0"),
        sa.Column("match_confidence",   sa.Numeric(4, 3), nullable=True),
        sa.Column("model_version",      sa.String(50),    nullable=True),
        sa.Column(
            "logged_at",
            sa.TIMESTAMP(timezone=True),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        sa.Column(
            "created_at",
            sa.TIMESTAMP(timezone=True),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        sa.CheckConstraint(
            "entry_source IN ('manual', 'camera')", name="ck_ml_entry_source"
        ),
        sa.CheckConstraint("logged_calories >= 0", name="ck_ml_calories"),
    )
    op.create_index("idx_meal_logs_user_id",   "meal_logs", ["user_id"])
    op.create_index("idx_meal_logs_logged_at", "meal_logs", ["logged_at"])
    op.create_index("idx_meal_logs_dish_id",   "meal_logs", ["dish_id"])

    # ------------------------------------------------------------------
    # vision_feedback  (user corrections on vision estimates)
    # ------------------------------------------------------------------
    op.create_table(
        "vision_feedback",
        sa.Column("id", sa.BigInteger, primary_key=True, autoincrement=True),
        # Nullable + SET NULL: VisionFeedbackRequest.estimate_id is Optional
        sa.Column(
            "vision_estimate_id",
            sa.BigInteger,
            sa.ForeignKey("vision_estimates.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column(
            "user_id",
            sa.BigInteger,
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
        # The dish the user said it actually was (correction flow)
        sa.Column(
            "corrected_dish_id",
            sa.BigInteger,
            sa.ForeignKey("dishes.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("feedback_type",       sa.String(30),    nullable=False),
        sa.Column("confirmed_dish_name", sa.String(255),   nullable=True),
        sa.Column("portion_adjustment",  sa.Numeric(6, 3), nullable=True),
        sa.Column("plate_size",          sa.String(30),    nullable=True),
        sa.Column("quick_feedback",      sa.String(20),    nullable=True),
        sa.Column("corrected_calories",  sa.Numeric(8, 2), nullable=True),
        sa.Column("notes",               sa.Text,          nullable=True),
        sa.Column(
            "created_at",
            sa.TIMESTAMP(timezone=True),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        sa.CheckConstraint(
            "feedback_type IN ('confirmed', 'corrected_dish', 'corrected_portion', 'quick_correction')",
            name="ck_vf_feedback_type",
        ),
    )
    op.create_index(
        "idx_vision_feedback_estimate_id", "vision_feedback", ["vision_estimate_id"]
    )
    op.create_index("idx_vision_feedback_user_id", "vision_feedback", ["user_id"])

    # ------------------------------------------------------------------
    # user_portion_preferences  (per-user personalisation profile)
    # ------------------------------------------------------------------
    op.create_table(
        "user_portion_preferences",
        sa.Column("id", sa.BigInteger, primary_key=True, autoincrement=True),
        sa.Column(
            "user_id",
            sa.BigInteger,
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
            unique=True,
        ),
        sa.Column("avg_portion_factor", sa.Numeric(6, 3), nullable=False, server_default="1.0"),
        sa.Column("feedback_count",     sa.Integer,       nullable=False, server_default="0"),
        sa.Column("confidence_score",   sa.Numeric(4, 3), nullable=False, server_default="0.0"),
        # {dish_id_str: {avg_factor, count}}
        sa.Column("dish_preferences",     JSONB, nullable=True),
        # {category: {avg_factor, count}}
        sa.Column("category_preferences", JSONB, nullable=True),
        # Set explicitly on every write by the service — no DB trigger needed
        sa.Column(
            "last_updated",
            sa.TIMESTAMP(timezone=True),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        sa.Column(
            "created_at",
            sa.TIMESTAMP(timezone=True),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
    )
    op.create_index(
        "idx_user_portion_preferences_user_id", "user_portion_preferences", ["user_id"]
    )


def downgrade() -> None:
    op.drop_table("user_portion_preferences")
    op.drop_table("vision_feedback")
    op.drop_table("meal_logs")
    op.drop_table("vision_estimates")
    op.drop_table("dish_variants")
    op.drop_table("dishes")
    op.drop_table("users")
    # CASCADE drops all triggers that reference this function
    op.execute("DROP FUNCTION IF EXISTS _update_updated_at CASCADE;")
    op.execute("DROP EXTENSION IF EXISTS vector;")
