"""No-op placeholder — superseded by 0001_canonical.

All tables previously scaffolded here are created with their final correct
schema in migration 0001_canonical.  This file keeps the revision chain
intact in case any developer's alembic_version table already contains
'0001_canonical' as the current head.

Revision ID : 0002_noop
Down revision: 0001_canonical
"""
from alembic import op  # noqa: F401

revision = "0002_noop"
down_revision = "0001_canonical"
branch_labels = None
depends_on = None


def upgrade() -> None:
    pass  # everything is in 0001_canonical


def downgrade() -> None:
    pass
