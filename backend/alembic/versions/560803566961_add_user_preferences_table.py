"""add_user_preferences_table

Revision ID: 560803566961
Revises: 
Create Date: 2026-05-15 10:03:14.235826

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import sqlalchemy.dialects.postgresql as pg
import sqlmodel


# revision identifiers, used by Alembic.
revision: str = '560803566961'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        "user_preferences",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("uid", sa.Uuid(), nullable=False),
        sa.Column("key", sa.VARCHAR(), nullable=False),
        sa.Column("value", sa.VARCHAR(), nullable=False),
        sa.Column("created_at", pg.TIMESTAMP(timezone=True), nullable=False),
        sa.Column("updated_at", pg.TIMESTAMP(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("uid", "key", name="uq_user_preference_key")
    )
    op.create_index(op.f("ix_user_preferences_uid"), "user_preferences", ["uid"], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f("ix_user_preferences_uid"), table_name="user_preferences")
    op.drop_table("user_preferences")
