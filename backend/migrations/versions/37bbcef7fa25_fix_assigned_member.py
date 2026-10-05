"""fix assigned_member

Revision ID: 37bbcef7fa25
Revises: 47eda5e86045
Create Date: 2026-10-05 18:58:59.307736

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '37bbcef7fa25'
down_revision: Union[str, Sequence[str], None] = '47eda5e86045'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.alter_column('supertasks', 'description',
               existing_type=sa.VARCHAR(),
               nullable=True)
    op.alter_column('supertasks', 'project_id',
               existing_type=sa.UUID(),
               nullable=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.alter_column('supertasks', 'project_id',
               existing_type=sa.UUID(),
               nullable=True)
    op.alter_column('supertasks', 'description',
               existing_type=sa.VARCHAR(),
               nullable=False)
