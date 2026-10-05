"""Fix project_member skills column nullable

Revision ID: 8a3b9c2d1e0f
Revises: fd2f444f6e50
Create Date: 2026-09-18 05:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '8a3b9c2d1e0f'
down_revision: Union[str, Sequence[str], None] = 'fd2f444f6e50'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # First, set any NULL values to an empty array
    op.execute(
        "UPDATE project_members SET skills = '{}'::member_skills[] WHERE skills IS NULL"
    )

    # Then alter the column to be non-nullable
    op.alter_column('project_members', 'skills',
               existing_type=postgresql.ARRAY(postgresql.ENUM('Backend Development', 'Frontend Development', 'Mobile Development', 'IOT Development', 'Database Design', 'System Architecture', 'UI/UX Design', 'Testing and Quality Assurance', 'Literature Review', 'Data Collection', 'Survey and Questionnaire Design', 'Interview and Observation', 'Data Analysis', 'Technical Writing', 'Documentation', 'Diagram and Modeling', 'Editing and Proofreading', 'Financial Documentation', 'Budget Planning ', 'Resource Management', name='member_skills')),
               nullable=False)


def downgrade() -> None:
    """Downgrade schema."""
    # Make the column nullable again
    op.alter_column('project_members', 'skills',
               existing_type=postgresql.ARRAY(postgresql.ENUM('Backend Development', 'Frontend Development', 'Mobile Development', 'IOT Development', 'Database Design', 'System Architecture', 'UI/UX Design', 'Testing and Quality Assurance', 'Literature Review', 'Data Collection', 'Survey and Questionnaire Design', 'Interview and Observation', 'Data Analysis', 'Technical Writing', 'Documentation', 'Diagram and Modeling', 'Editing and Proofreading', 'Financial Documentation', 'Budget Planning ', 'Resource Management', name='member_skills')),
               nullable=True)

    # Note: We don't revert the data change in downgrade as it's safe to keep the empty arrays