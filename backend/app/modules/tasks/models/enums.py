import enum


# tasks
class Status(str, enum.Enum):
    NOT_STARTED = "not_started"
    IN_PROGRESS = "in_progress"
    SUBMITTED = "submitted"
    COMPLETED = "completed"
    NONE = "none"


class Priority(str, enum.Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


class Complexity(str, enum.Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    NONE = "none"


class Category(str, enum.Enum):
    DOCUMENT = "document"
    RESEARCH = "research"
    DEVELOPMENT = "development"
    NONE = "none"


# task relations
class Relation(enum.Enum):
    BLOCKS = "blocks"
    BLOCKED_BY = "blocked_by"
    RELATED = "related"


# Task submissions
class Result(enum.Enum):
    REVISION = "revision"
    ACCEPTED = "accepted"
    PENDING = "pending"


# Assigned Member
class Role(enum.Enum):
    LEADER = "leader"
    MEMBER = "MEMBER"
