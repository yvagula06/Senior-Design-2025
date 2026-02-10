"""Add vision feedback and personalization schema

Revision ID: 0002_vision_feedback
Revises: 0001_init
Create Date: 2026-02-08 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB, UUID

# revision identifiers, used by Alembic.
revision = "0002_vision_feedback"
down_revision = "0001_init"
branch_labels = None
depends_on = None


def upgrade():
    """Create tables for Phase 3 feedback collection and personalization."""
    
    # Vision estimates table - stores all vision API estimates
    op.create_table(
        "vision_estimates",
        sa.Column("estimate_id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("user_id", sa.Text, nullable=True),  # For future user auth integration
        sa.Column("session_id", sa.Text, nullable=True),  # Track user sessions
        
        # Estimation inputs
        sa.Column("capture_mode", sa.Text, nullable=False),  # depth, multi_angle, quick
        sa.Column("num_images", sa.Integer, nullable=False),
        sa.Column("device_type", sa.Text, nullable=True),  # ios, android
        sa.Column("has_depth_data", sa.Boolean, default=False),
        
        # Estimation outputs
        sa.Column("predicted_dish", sa.Text, nullable=False),
        sa.Column("predicted_confidence", sa.Float, nullable=True),
        sa.Column("calorie_estimate", sa.Float, nullable=False),
        sa.Column("calorie_range_min", sa.Float, nullable=True),
        sa.Column("calorie_range_max", sa.Float, nullable=True),
        sa.Column("volume_ml", sa.Float, nullable=True),
        sa.Column("volume_confidence", sa.Float, nullable=True),
        
        # Top-K alternatives
        sa.Column("alternative_dishes", JSONB, nullable=True),  # [{name, confidence, calories}]
        
        # Metadata
        sa.Column("estimation_mode", sa.Text, nullable=False),  # depth, multi_angle, reference
        sa.Column("processing_time_ms", sa.Integer, nullable=True),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    
    op.create_index("ix_vision_estimates_user_id", "vision_estimates", ["user_id"])
    op.create_index("ix_vision_estimates_created_at", "vision_estimates", ["created_at"])
    op.create_index("ix_vision_estimates_predicted_dish", "vision_estimates", ["predicted_dish"])
    
    # Vision feedback table - stores user corrections and confirmations
    op.create_table(
        "vision_feedback",
        sa.Column("feedback_id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("estimate_id", UUID(as_uuid=True), sa.ForeignKey("vision_estimates.estimate_id", ondelete="CASCADE"), nullable=False),
        sa.Column("user_id", sa.Text, nullable=True),
        
        # Feedback type
        sa.Column("feedback_type", sa.Text, nullable=False),  # confirmed, corrected_dish, corrected_portion, quick_correction
        
        # User corrections
        sa.Column("confirmed_dish", sa.Text, nullable=True),  # The dish user confirmed/selected
        sa.Column("portion_adjustment", sa.Float, nullable=True),  # Multiplier from slider (0.5, 0.75, 1.0, 1.25, 1.5)
        sa.Column("plate_size", sa.Text, nullable=True),  # standard_plate, small_plate, large_plate, bowl, hand
        
        # Quick correction feedback (thumbs up/down, too high/low)
        sa.Column("quick_feedback", sa.Text, nullable=True),  # accurate, too_high, too_low, wrong_dish
        sa.Column("corrected_calories", sa.Float, nullable=True),  # If user provides manual correction
        
        # Additional context
        sa.Column("notes", sa.Text, nullable=True),  # Optional user notes
        sa.Column("created_at", sa.TIMESTAMP(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    
    op.create_index("ix_vision_feedback_estimate_id", "vision_feedback", ["estimate_id"])
    op.create_index("ix_vision_feedback_user_id", "vision_feedback", ["user_id"])
    op.create_index("ix_vision_feedback_feedback_type", "vision_feedback", ["feedback_type"])
    
    # User portion preferences table - stores personalization data
    op.create_table(
        "user_portion_preferences",
        sa.Column("preference_id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("user_id", sa.Text, nullable=False, unique=True),
        
        # Global personalization
        sa.Column("avg_portion_factor", sa.Float, default=1.0),  # Average portion multiplier for this user
        sa.Column("feedback_count", sa.Integer, default=0),  # Number of feedback entries
        sa.Column("confidence_score", sa.Float, default=0.0),  # How confident we are in personalization
        
        # Per-dish preferences (optional advanced feature)
        sa.Column("dish_preferences", JSONB, nullable=True),  # {dish_name: {avg_factor, count}}
        
        # Per-category preferences
        sa.Column("category_preferences", JSONB, nullable=True),  # {category: {avg_factor, count}}
        
        # Learning metadata
        sa.Column("last_updated", sa.TIMESTAMP(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    
    op.create_index("ix_user_portion_preferences_user_id", "user_portion_preferences", ["user_id"])
    
    # Dish density priors table - refined from feedback data
    op.create_table(
        "dish_density_priors",
        sa.Column("prior_id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("dish_name", sa.Text, nullable=False, unique=True),
        
        # Density info (g/ml)
        sa.Column("density_g_per_ml", sa.Float, nullable=False),
        sa.Column("density_confidence", sa.Float, default=0.5),  # How confident we are in this density
        
        # Volume-to-calorie modeling
        sa.Column("calories_per_100ml", sa.Float, nullable=True),
        sa.Column("sample_count", sa.Integer, default=0),  # Number of feedback samples used
        
        # Category-based grouping
        sa.Column("category", sa.Text, nullable=True),  # e.g., "rice_grains", "pasta", "salad", "curry"
        
        # Learning metadata
        sa.Column("last_updated", sa.TIMESTAMP(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    
    op.create_index("ix_dish_density_priors_dish_name", "dish_density_priors", ["dish_name"])
    op.create_index("ix_dish_density_priors_category", "dish_density_priors", ["category"])


def downgrade():
    """Remove Phase 3 tables."""
    op.execute("DROP INDEX IF EXISTS ix_dish_density_priors_category")
    op.execute("DROP INDEX IF EXISTS ix_dish_density_priors_dish_name")
    op.drop_table("dish_density_priors")
    
    op.execute("DROP INDEX IF EXISTS ix_user_portion_preferences_user_id")
    op.drop_table("user_portion_preferences")
    
    op.execute("DROP INDEX IF EXISTS ix_vision_feedback_feedback_type")
    op.execute("DROP INDEX IF EXISTS ix_vision_feedback_user_id")
    op.execute("DROP INDEX IF EXISTS ix_vision_feedback_estimate_id")
    op.drop_table("vision_feedback")
    
    op.execute("DROP INDEX IF EXISTS ix_vision_estimates_predicted_dish")
    op.execute("DROP INDEX IF EXISTS ix_vision_estimates_created_at")
    op.execute("DROP INDEX IF EXISTS ix_vision_estimates_user_id")
    op.drop_table("vision_estimates")
