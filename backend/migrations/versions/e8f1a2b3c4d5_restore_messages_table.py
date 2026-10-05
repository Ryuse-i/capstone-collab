"""restore messages table

Revision ID: e8f1a2b3c4d5
Revises: d7e4b2a91c3f
Create Date: 2026-09-09 15:25:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "e8f1a2b3c4d5"
down_revision: Union[str, Sequence[str], None] = "d7e4b2a91c3f"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Restore the messages table removed by an earlier meeting migration."""
    op.create_table(
        "messages",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("project_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("sender_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("content", sa.String(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=True,
        ),
        sa.ForeignKeyConstraint(
            ["project_id"],
            ["projects.id"],
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(["sender_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_messages_project_created",
        "messages",
        ["project_id", "created_at"],
    )
    op.create_index("ix_messages_project_id", "messages", ["project_id"])


def downgrade() -> None:
    """Remove the restored messages table."""
    op.drop_index("ix_messages_project_created", table_name="messages")
    op.drop_index("ix_messages_project_id", table_name="messages")
    op.drop_table("messages")
