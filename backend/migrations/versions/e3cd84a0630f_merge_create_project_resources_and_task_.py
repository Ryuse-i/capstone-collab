"""merge create_project_resources and task fixes

Revision ID: e3cd84a0630f
Revises: d08a71f4c2b9, 68d0b114db45
Create Date: 2026-10-06 02:14:59.434547

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e3cd84a0630f'
down_revision: Union[str, Sequence[str], None] = ('d08a71f4c2b9', '68d0b114db45')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
