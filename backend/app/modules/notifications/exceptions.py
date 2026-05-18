from uuid import UUID


class NotificationNotFound(Exception):
    """Raised when a notification does not exist or does not belong to the requesting user."""

    def __init__(self, notif_id: UUID) -> None:
        self.notif_id = notif_id
        super().__init__(f"Notification {notif_id} not found.")
