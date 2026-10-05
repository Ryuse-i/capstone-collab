"""Baseline migration placeholder for the existing remote schema.

Revision ID: 47eda5e86045
Revises: None
Create Date: 2025-01-01 00:00:00.000000

This project’s database was already initialized on the remote test database,
so the migration history needs a local baseline entry before applying newer
schema changes.
"""

from typing import Sequence, Union

from alembic import op


revision: str = "47eda5e86045"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """No-op placeholder to match the existing migration history in the DB."""
    pass


def downgrade() -> None:
    """No-op placeholder."""
    pass
