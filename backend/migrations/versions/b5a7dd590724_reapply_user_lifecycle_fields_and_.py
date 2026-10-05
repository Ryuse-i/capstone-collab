"""reapply user lifecycle fields and activity logs

Revision ID: b5a7dd590724
Revises: 68d0b114db45
Create Date: 2026-10-05 20:41:48.527147

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b5a7dd590724'
down_revision: Union[str, Sequence[str], None] = '68d0b114db45'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("ALTER TABLE public.users ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT false")
    op.execute("ALTER TABLE public.users ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ")
    op.execute("ALTER TABLE public.users ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ")
    op.execute("ALTER TABLE public.users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ")
    op.execute("""
        CREATE TABLE IF NOT EXISTS public.activity_logs (
            id UUID PRIMARY KEY,
            type VARCHAR(50) NOT NULL,
            actor_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
            target_type VARCHAR(50) NOT NULL,
            target_id UUID,
            metadata JSON NOT NULL,
            created_at TIMESTAMPTZ NOT NULL
        )
    """)
    op.execute("CREATE INDEX IF NOT EXISTS ix_activity_logs_type ON public.activity_logs (type)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_activity_logs_created_at ON public.activity_logs (created_at)")


def downgrade() -> None:
    # Intentionally empty: the earlier migrations own these objects.
    pass
