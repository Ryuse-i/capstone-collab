"""empty message

Revision ID: 47eda5e86045
Revises: fe31c4846b26
Create Date: 2026-10-04 14:47:18.929666

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '47eda5e86045'
down_revision: Union[str, Sequence[str], None] = 'fe31c4846b26'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
