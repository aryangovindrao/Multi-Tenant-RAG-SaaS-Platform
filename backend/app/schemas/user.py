"""
User response schemas. `UserOut` is the public shape of a user — note there is
no password field anywhere in the response models, so a hash can never leak.
"""

from __future__ import annotations

import uuid

from pydantic import EmailStr

from app.schemas.base import CamelModel, UTCDateTime


class UserOut(CamelModel):
    id: uuid.UUID
    email: EmailStr
    name: str
    avatar_url: str | None = None
    created_at: UTCDateTime | None = None
