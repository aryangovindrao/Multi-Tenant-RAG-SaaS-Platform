"""
Shared Pydantic base. The Next.js frontend speaks camelCase, the Python backend
speaks snake_case — `CamelModel` bridges the two:

  * serialization_alias = camelCase  → responses come out as {"sizeBytes": 123}
  * populate_by_name = True          → we can still construct with snake_case
                                       kwargs (size_bytes=...) in services
  * from_attributes = True           → model_validate(orm_object) works

FastAPI serializes response models with by_alias=True by default, so every
response is automatically camelCase without extra work in the handlers.

`UTCDateTime` is a datetime that always serializes as UTC ISO-8601 with an
explicit offset. SQLite returns naive datetimes that are actually UTC; without
tagging them, the frontend's `new Date(...)` would read them as local time
(e.g. showing "6 hours ago" right after an event). Tagging fixes that and is a
no-op on PostgreSQL, where the values are already timezone-aware.
"""

from datetime import datetime, timezone
from typing import Annotated

from pydantic import BaseModel, ConfigDict, PlainSerializer
from pydantic.alias_generators import to_camel


def _serialize_utc(value: datetime) -> str:
    if value.tzinfo is None:
        value = value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc).isoformat()


UTCDateTime = Annotated[datetime, PlainSerializer(_serialize_utc, return_type=str)]


class CamelModel(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
        from_attributes=True,
    )
