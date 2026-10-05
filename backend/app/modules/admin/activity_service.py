import logging
from uuid import UUID

from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.admin.activity_model import ActivityLog

logger = logging.getLogger(__name__)


class ActivityLogService:
    """Persist a small audit event without failing the associated domain write."""

    @staticmethod
    async def record(
        db: AsyncSession,
        *,
        event_type: str,
        target_type: str,
        actor_id: UUID | None = None,
        target_id: UUID | None = None,
        details: dict | None = None,
    ) -> None:
        try:
            async with db.begin_nested():
                db.add(
                    ActivityLog(
                        event_type=event_type,
                        actor_id=actor_id,
                        target_type=target_type,
                        target_id=target_id,
                        details=details or {},
                    )
                )
                await db.flush()
        except SQLAlchemyError:
            logger.warning(
                "Unable to record activity event %s for %s %s",
                event_type,
                target_type,
                target_id,
                exc_info=True,
            )