"""merge migration heads

Revision ID: 68d0b114db45
Revises: 37bbcef7fa25, c1a7f3d9e5b2
Create Date: 2026-10-05 20:10:18.259910

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '68d0b114db45'
down_revision: Union[str, Sequence[str], None] = ('37bbcef7fa25', 'c1a7f3d9e5b2')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
