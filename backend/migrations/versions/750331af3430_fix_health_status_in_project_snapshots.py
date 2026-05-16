"""fix health_status in project_snapshots
Revision ID: 750331af3430
Revises: b7d24b824503
Create Date: 2026-05-17 01:57:02.608737
"""

from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "750331af3430"
down_revision: Union[str, Sequence[str], None] = "b7d24b824503"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Create enum types FIRST before using them
    health_status_enum = postgresql.ENUM("GOOD", "WARNING", "BAD", name="health_status")
    health_status_enum.create(op.get_bind(), checkfirst=True)

    user_role_enum = postgresql.ENUM("ADMIN", "STUDENT", "INSTRUCTOR", name="user_role")
    user_role_enum.create(op.get_bind(), checkfirst=True)

    op.add_column(
        "project_snapshots",
        sa.Column(
            "health_status",
            sa.Enum("GOOD", "WARNING", "BAD", name="health_status"),
            nullable=False,
        ),
    )
    op.add_column(
        "users", sa.Column("first_name", sa.String(length=150), nullable=False)
    )
    op.add_column(
        "users", sa.Column("last_name", sa.String(length=150), nullable=False)
    )
    op.add_column(
        "users",
        sa.Column(
            "role",
            sa.Enum("ADMIN", "STUDENT", "INSTRUCTOR", name="user_role"),
            nullable=False,
        ),
    )
    op.drop_constraint(op.f("users_username_key"), "users", type_="unique")
    op.drop_column("users", "full_name")
    op.drop_column("users", "username")


def downgrade() -> None:
    """Downgrade schema."""
    op.add_column(
        "users",
        sa.Column(
            "username", sa.VARCHAR(length=50), autoincrement=False, nullable=False
        ),
    )
    op.add_column(
        "users",
        sa.Column(
            "full_name", sa.VARCHAR(length=100), autoincrement=False, nullable=True
        ),
    )
    op.create_unique_constraint(
        op.f("users_username_key"),
        "users",
        ["username"],
        postgresql_nulls_not_distinct=False,
    )
    op.drop_column("users", "role")
    op.drop_column("users", "last_name")
    op.drop_column("users", "first_name")
    op.drop_column("project_snapshots", "health_status")

    # Drop enum types AFTER dropping columns that use them
    postgresql.ENUM(name="user_role").drop(op.get_bind(), checkfirst=True)
    postgresql.ENUM(name="health_status").drop(op.get_bind(), checkfirst=True)
