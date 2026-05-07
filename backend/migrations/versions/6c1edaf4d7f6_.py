"""empty message

Revision ID: 6c1edaf4d7f6
Revises: b63713578c39
Create Date: 2026-05-07 09:09:27.478232

"""

from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "6c1edaf4d7f6"
down_revision: Union[str, Sequence[str], None] = "b63713578c39"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "projects",
        # Changed Integer to UUID and added server_default for automatic generation
        sa.Column(
            "id", sa.UUID(), nullable=False, server_default=sa.text("gen_random_uuid()")
        ),
        sa.Column("name", sa.String(length=150), nullable=False),
        sa.Column(
            "descrption", sa.String(), nullable=False
        ),  # Typo preserved as requested for 4f838b5ed2ed
        sa.Column("created_by", sa.UUID(), nullable=False),
        sa.Column("advisor", sa.UUID(), nullable=False),
        sa.Column("instructor", sa.UUID(), nullable=False),
        sa.Column("created_at", sa.TIMESTAMP(), nullable=False),
        sa.Column("updated_at", sa.TIMESTAMP(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        # Added ForeignKeyConstraints to ensure referential integrity with users table
        sa.ForeignKeyConstraint(["created_by"], ["users.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["advisor"], ["users.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["instructor"], ["users.id"], ondelete="SET NULL"),
    )


def downgrade() -> None:
    op.drop_table("projects")
