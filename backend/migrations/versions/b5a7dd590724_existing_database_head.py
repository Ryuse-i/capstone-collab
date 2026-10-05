"""Bridge the configured database's existing Alembic head.

Revision ID: b5a7dd590724
Revises: c1a7f3d9e5b2
Create Date: 2026-10-06 00:00:00.000000

The configured database is already stamped at this revision and contains the
account lifecycle and activity-log schema from c1a7f3d9e5b2. The historical
revision file is not present in the repository, so this no-op bridge lets
subsequent additive migrations continue from the verified database head.
"""

from typing import Sequence, Union


revision: str = "b5a7dd590724"
down_revision: Union[str, None] = "c1a7f3d9e5b2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass