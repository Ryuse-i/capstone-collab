"""ai embedding and retrieval

Revision ID: ef56356f5588
Revises: 818eb20f9107
Create Date: 2026-10-06 04:09:20.187898

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'ef56356f5588'
down_revision: Union[str, Sequence[str], None] = '818eb20f9107'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
