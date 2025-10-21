from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB, ARRAY
from pgvector.sqlalchemy import Vector

# revision identifiers, used by Alembic.
revision = "0001_init"
down_revision = None
branch_labels = None
depends_on = None

def upgrade():
    # Extensions
    op.execute("CREATE EXTENSION IF NOT EXISTS pgcrypto;")
    op.execute("CREATE EXTENSION IF NOT EXISTS vector;")

    dishes = op.create_table(
        "dishes",
        sa.Column("dish_id", sa.dialects.postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("name", sa.Text, nullable=False),
        sa.Column("cuisine", sa.Text, nullable=True),
        sa.Column("aliases", ARRAY(sa.Text), nullable=True),
        sa.Column("macro_priors", JSONB, nullable=True),
        sa.Column("notes", sa.Text, nullable=True),
    )
    op.create_index("ix_dishes_name_lower", "dishes", [sa.text("lower(name)")], unique=False)

    op.create_table(
        "nutrients",
        sa.Column("dish_id", sa.dialects.postgresql.UUID(as_uuid=True), sa.ForeignKey("dishes.dish_id", ondelete="CASCADE"), primary_key=True),
        sa.Column("kcal", sa.Float, nullable=False),
        sa.Column("protein_g", sa.Float, nullable=True),
        sa.Column("carbs_g", sa.Float, nullable=True),
        sa.Column("fat_g", sa.Float, nullable=True),
        sa.Column("fiber_g", sa.Float, nullable=True),
        sa.Column("sugar_g", sa.Float, nullable=True),
        sa.Column("sodium_mg", sa.Float, nullable=True),
        sa.Column("source", sa.Text, nullable=True),
        sa.Column("variance", JSONB, nullable=True),
    )

    op.create_table(
    "embeddings",
    sa.Column(
        "dish_id",
        sa.dialects.postgresql.UUID(as_uuid=True),
        sa.ForeignKey("dishes.dish_id", ondelete="CASCADE"),
        primary_key=True,
    ),
    sa.Column("text", sa.Text, nullable=False),
    sa.Column("vector", Vector(384), nullable=True),  # <-- fixed
    )
    op.execute(
        "CREATE INDEX ix_embeddings_vector ON embeddings USING ivfflat (vector vector_l2_ops) WITH (lists=100);"
    )


    op.create_table(
        "audit_logs",
        sa.Column("id", sa.dialects.postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("query_text", sa.Text, nullable=False),
        sa.Column("target_calories", sa.Float, nullable=False),
        sa.Column("chosen_dishes", JSONB, nullable=True),
        sa.Column("final_label", JSONB, nullable=True),
        sa.Column("confidence", sa.Float, nullable=True),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True), server_default=sa.text("now()"), nullable=False),
    )

def downgrade():
    op.drop_table("audit_logs")
    op.execute("DROP INDEX IF EXISTS ix_embeddings_vector")
    op.drop_table("embeddings")
    op.drop_table("nutrients")
    op.execute("DROP INDEX IF EXISTS ix_dishes_name_lower")
    op.drop_table("dishes")
    op.execute("DROP EXTENSION IF EXISTS vector;")
    op.execute("DROP EXTENSION IF EXISTS pgcrypto;")