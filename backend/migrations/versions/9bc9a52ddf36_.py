"""empty message

Revision ID: 9bc9a52ddf36
Revises: febd23f204df
Create Date: 2026-10-03 21:40:22.942895

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '9bc9a52ddf36'
down_revision: Union[str, Sequence[str], None] = 'febd23f204df'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
