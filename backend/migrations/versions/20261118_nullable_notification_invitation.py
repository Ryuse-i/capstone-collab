"""Allow general notifications without an invitation reference.

Revision ID: 20261118_notification_nullable
Revises: 68d0b114db45, cc4484d9e3d0
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "20261118_notification_nullable"
down_revision: Union[str, Sequence[str], None] = (
    "68d0b114db45",
    "cc4484d9e3d0",
)
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.alter_column(
        "notifications",
        "invitation_id",
        existing_type=sa.UUID(),
        nullable=True,
    )


def downgrade() -> None:
    has_general_notifications = op.get_bind().execute(
        sa.text(
            "SELECT EXISTS (SELECT 1 FROM notifications WHERE invitation_id IS NULL)"
        )
    ).scalar_one()
    if has_general_notifications:
        raise RuntimeError(
            "Cannot require invitation_id while general notifications exist"
        )

    op.alter_column(
        "notifications",
        "invitation_id",
        existing_type=sa.UUID(),
        nullable=False,
    )
