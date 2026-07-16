"""add_date_to_formfieldtype

Revision ID: 8573c058085e
Revises: ceb88963b2e6
Create Date: 2026-07-16 04:37:01.261370

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa



# revision identifiers, used by Alembic.
revision: str = '8573c058085e'
down_revision: Union[str, Sequence[str], None] = 'ceb88963b2e6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # ALTER TYPE ... ADD VALUE cannot run inside a transaction block in PostgreSQL.
    # We execute it in an autocommit block.
    with op.get_context().autocommit_block():
        op.execute("ALTER TYPE formfieldtype ADD VALUE IF NOT EXISTS 'DATE'")


def downgrade() -> None:
    """Downgrade schema."""
    # PostgreSQL does not support removing values from an ENUM type.
    # Removing a value would require dropping and recreating the type,
    # as well as dropping/recreating all columns referencing it.
    # Thus, this is left as a safe no-op.
    pass
