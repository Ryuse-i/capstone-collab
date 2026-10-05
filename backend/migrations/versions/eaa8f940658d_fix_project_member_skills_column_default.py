"""Fix project_member skills column default

Revision ID: eaa8f940658d
Revises: 8a3b9c2d1e0f
Create Date: 2026-09-18 05:23:40.648953

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'eaa8f940658d'
down_revision: Union[str, Sequence[str], None] = '8a3b9c2d1e0f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Set the default value for skills column to an empty array
    op.alter_column('project_members', 'skills',
               existing_type=postgresql.ARRAY(postgresql.ENUM('Backend Development', 'Frontend Development', 'Mobile Development', 'IOT Development', 'Database Design', 'System Architecture', 'UI/UX Design', 'Testing and Quality Assurance', 'Literature Review', 'Data Collection', 'Survey and Questionnaire Design', 'Interview and Observation', 'Data Analysis', 'Technical Writing', 'Documentation', 'Diagram and Modeling', 'Editing and Proofreading', 'Financial Documentation', 'Budget Planning ', 'Resource Management', name='member_skills')),
               server_default=sa.text("'{}'::member_skills[]"))


def downgrade() -> None:
    """Downgrade schema."""
    # Remove the default value from skills column
    op.alter_column('project_members', 'skills',
               existing_type=postgresql.ARRAY(postgresql.ENUM('Backend Development', 'Frontend Development', 'Mobile Development', 'IOT Development', 'Database Design', 'System Architecture', 'UI/UX Design', 'Testing and Quality Assurance', 'Literature Review', 'Data Collection', 'Survey and Questionnaire Design', 'Interview and Observation', 'Data Analysis', 'Technical Writing', 'Documentation', 'Diagram and Modeling', 'Editing and Proofreading', 'Financial Documentation', 'Budget Planning ', 'Resource Management', name='member_skills')),
               server_default=None)