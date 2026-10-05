"""fix task status

Revision ID: 867fd347455f
Revises: 87e73c109b13
Create Date: 2026-08-16 03:35:52.577819

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "867fd347455f"
down_revision: Union[str, Sequence[str], None] = "87e73c109b13"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.execute("ALTER TYPE status RENAME VALUE 'NOT_STARTED' TO 'not_started'")
    op.execute("ALTER TYPE status RENAME VALUE 'IN_PROGRESS' TO 'in_progress'")
    op.execute("ALTER TYPE status RENAME VALUE 'SUBMITTED' TO 'submitted'")
    op.execute("ALTER TYPE status RENAME VALUE 'COMPLETED' TO 'completed'")


def downgrade() -> None:
    """Downgrade schema."""
    op.execute("ALTER TYPE status RENAME VALUE 'not_started' TO 'NOT_STARTED'")
    op.execute("ALTER TYPE status RENAME VALUE 'in_progress' TO 'IN_PROGRESS'")
    op.execute("ALTER TYPE status RENAME VALUE 'submitted' TO 'SUBMITTED'")
    op.execute("ALTER TYPE status RENAME VALUE 'completed' TO 'COMPLETED'")
