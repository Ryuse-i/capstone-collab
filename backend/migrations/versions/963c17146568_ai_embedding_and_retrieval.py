"""ai embedding and retrieval

Revision ID: 963c17146568
Revises: e3cd84a0630f
Create Date: 2026-10-06 03:07:20.173518

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '963c17146568'
down_revision: Union[str, Sequence[str], None] = 'e3cd84a0630f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
