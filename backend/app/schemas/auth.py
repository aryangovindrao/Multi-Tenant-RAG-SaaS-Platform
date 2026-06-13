"""
Auth request/response schemas.

Requests
    RegisterRequest   — name + email + password (validated lengths)
    LoginRequest      — email + password
    GoogleAuthRequest — a Google ID token forwarded by the frontend's NextAuth
    RefreshRequest    — a refresh token

Responses
    TokenResponse     — accessToken / refreshToken / expiresAt
    LoginResponse     — tokens + the user + the orgs they belong to (so the
                        frontend can populate its org switcher in one round-trip)
"""

from __future__ import annotations

from pydantic import EmailStr, Field

from app.schemas.base import CamelModel
from app.schemas.organization import OrganizationOut
from app.schemas.user import UserOut


class RegisterRequest(CamelModel):
    name: str = Field(min_length=2, max_length=255)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)


class LoginRequest(CamelModel):
    email: EmailStr
    password: str = Field(min_length=1)


class GoogleAuthRequest(CamelModel):
    id_token: str


class RefreshRequest(CamelModel):
    refresh_token: str


class TokenResponse(CamelModel):
    access_token: str
    refresh_token: str
    expires_at: int  # epoch milliseconds


class LoginResponse(TokenResponse):
    user: UserOut
    organizations: list[OrganizationOut]
