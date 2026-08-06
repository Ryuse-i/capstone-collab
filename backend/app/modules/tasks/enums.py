import enum


# tasks
class Status(str, enum.Enum):
    NOT_STARTED = "not_started"
    IN_PROGRESS = "in_progress"
    SUBMITTED = "submitted"
    COMPLETED = "completed"


class Priority(str, enum.Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


class Complexity(str, enum.Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


class Category(str, enum.Enum):
    DOCUMENT = "document"
    RESEARCH = "research"
    DEVELOPMENT = "development"


# task relations
class Relation(str, enum.Enum):
    BLOCKS = "blocks"
    BLOCKED_BY = "blocked_by"
    RELATED = "related"


# Task submissions
class Result(str, enum.Enum):
    REVISION = "revision"
    ACCEPTED = "accepted"
    PENDING = "pending"


# Assigned Member
class Role(str, enum.Enum):
    LEADER = "leader"
    MEMBER = "member"
