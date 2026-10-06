"""paper extract

Revision ID: e4c4ae2db2e9
Revises: ef56356f5588
Create Date: 2026-10-06 18:12:28.176880

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e4c4ae2db2e9'
down_revision: Union[str, Sequence[str], None] = 'ef56356f5588'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
