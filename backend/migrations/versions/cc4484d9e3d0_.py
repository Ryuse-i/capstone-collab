"""empty message

Revision ID: cc4484d9e3d0
Revises: 8da09c6b0e6a
Create Date: 2026-10-21 02:33:26.903835

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'cc4484d9e3d0'
down_revision: Union[str, Sequence[str], None] = '8da09c6b0e6a'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade():
    op.execute("ALTER TYPE member_skills RENAME VALUE 'Budget Planning ' TO 'Budget Planning'")

def downgrade():
    op.execute("ALTER TYPE member_skills RENAME VALUE 'Budget Planning' TO 'Budget Planning '")