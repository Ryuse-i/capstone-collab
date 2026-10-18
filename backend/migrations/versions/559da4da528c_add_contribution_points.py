"""add contribution points

Revision ID: 559da4da528c
Revises: 088900e28848
Create Date: 2026-10-19 05:06:01.338978

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '559da4da528c'
down_revision: Union[str, Sequence[str], None] = '088900e28848'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column(
        "member_snapshots",
        sa.Column(
            "contribution_points",
            sa.Integer(),
            nullable=False,
            server_default="0",
        ),
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column("member_snapshots", "contribution_points")