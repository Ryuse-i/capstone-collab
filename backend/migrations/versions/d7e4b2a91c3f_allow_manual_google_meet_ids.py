"""allow meetings without provider ids

Revision ID: d7e4b2a91c3f
Revises: c4a8e6b91d2f
Create Date: 2026-09-09 15:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "d7e4b2a91c3f"
down_revision: Union[str, Sequence[str], None] = "2778b6de15bc"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.alter_column(
        "meetings",
        "meeting_id",
        existing_type=sa.String(length=255),
        nullable=True,
    )


def downgrade() -> None:
    op.alter_column(
        "meetings",
        "meeting_id",
        existing_type=sa.String(length=255),
        nullable=False,
    )