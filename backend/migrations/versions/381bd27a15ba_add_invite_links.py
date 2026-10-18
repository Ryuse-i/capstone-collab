"""add invite links

Revision ID: 381bd27a15ba
Revises: 559da4da528c
Create Date: 2026-10-19 06:50:35.282002

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = '381bd27a15ba'
down_revision: Union[str, Sequence[str], None] = '559da4da528c'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table('project_invite_links',
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('project_id', sa.UUID(), nullable=False),
    sa.Column('created_by', sa.UUID(), nullable=False),
    sa.Column(
        'role',
        postgresql.ENUM(
            'LEADER', 'ADVISOR', 'MEMBER', 'INSTRUCTOR',
            name='invited_role',
            create_type=False,
        ),
        nullable=False,
    ),
    sa.Column('token_hash', sa.String(length=64), nullable=False),
    sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
    sa.Column('max_uses', sa.Integer(), nullable=True),
    sa.Column('use_count', sa.Integer(), nullable=False),
    sa.Column('revoked_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    sa.ForeignKeyConstraint(['created_by'], ['users.id'], ),
    sa.ForeignKeyConstraint(['project_id'], ['projects.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_project_invite_links_project_id'), 'project_invite_links', ['project_id'], unique=False)
    op.create_index(op.f('ix_project_invite_links_token_hash'), 'project_invite_links', ['token_hash'], unique=True)


def downgrade() -> None:
    op.drop_index(op.f('ix_project_invite_links_token_hash'), table_name='project_invite_links')
    op.drop_index(op.f('ix_project_invite_links_project_id'), table_name='project_invite_links')
    op.drop_table('project_invite_links')
    # don't drop invited_role here: project_invitations still uses it