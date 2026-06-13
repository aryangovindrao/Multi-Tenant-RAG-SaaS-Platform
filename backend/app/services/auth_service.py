"""
auth_service — all authentication business logic, kept out of the API layer.

Functions
    register_user(db, payload)          -> LoginResponse
    authenticate_user(db, email, pw)    -> User            (raises 401)
    login(db, payload)                  -> LoginResponse
    google_auth(db, id_token)           -> LoginResponse
    refresh_tokens(db, refresh_token)   -> TokenResponse
    get_current_user(...)               -> re-exported from core.security

JWT authentication flow
    register/login → we mint an access token (30 min) and a refresh token
    (7 days). The frontend stores both; it calls /auth/refresh with the refresh
    token to get a new access token before the old one expires. Every other
    request carries the access token in the Authorization header, which
    core.security.get_current_user decodes back into a User.

Password hashing
    Passwords are never stored in plaintext. register_user runs the password
    through bcrypt (core.security.hash_password); authenticate_user compares a
    login attempt against the stored hash with a constant-time verify.
"""

from __future__ import annotations

import anyio
from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.security import (
    get_current_user,  # noqa: F401  (re-exported for convenience)
    hash_password,
    verify_password,
)
from app.models.user import User
from app.schemas.auth import (
    GoogleAuthRequest,
    LoginRequest,
    LoginResponse,
    RegisterRequest,
    TokenResponse,
)
from app.schemas.user import UserOut
from app.services import organization_service
from app.utils.jwt import (
    TokenError,
    create_access_token,
    create_refresh_token,
    verify_token,
)


def _issue_tokens(user: User) -> TokenResponse:
    """Mint a fresh access+refresh pair for a user."""
    access, expires_at = create_access_token(
        subject=str(user.id), extra_claims={"email": user.email}
    )
    refresh = create_refresh_token(subject=str(user.id))
    return TokenResponse(
        access_token=access, refresh_token=refresh, expires_at=expires_at
    )


async def _build_login_response(db: AsyncSession, user: User) -> LoginResponse:
    """Tokens + user + the orgs they belong to (one round-trip for the UI)."""
    tokens = _issue_tokens(user)
    organizations = await organization_service.list_user_organizations(db, user)
    return LoginResponse(
        access_token=tokens.access_token,
        refresh_token=tokens.refresh_token,
        expires_at=tokens.expires_at,
        user=UserOut.model_validate(user),
        organizations=organizations,
    )


async def register_user(db: AsyncSession, payload: RegisterRequest) -> LoginResponse:
    """
    Create a new account. We deliberately do NOT auto-create an organization —
    the frontend routes new users to an onboarding screen where they name their
    first workspace (POST /organizations).
    """
    existing = await db.scalar(select(User).where(User.email == payload.email))
    if existing is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists",
        )

    user = User(
        email=payload.email,
        name=payload.name,
        hashed_password=hash_password(payload.password),
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return await _build_login_response(db, user)


async def authenticate_user(db: AsyncSession, email: str, password: str) -> User:
    """Validate credentials; raise 401 on any failure (no user enumeration)."""
    user = await db.scalar(select(User).where(User.email == email))
    if (
        user is None
        or user.hashed_password is None
        or not verify_password(password, user.hashed_password)
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Account is disabled"
        )
    return user


async def login(db: AsyncSession, payload: LoginRequest) -> LoginResponse:
    user = await authenticate_user(db, payload.email, payload.password)
    return await _build_login_response(db, user)


def _verify_google_token(id_token_str: str) -> dict:
    """Blocking Google token verification (run in a worker thread)."""
    from google.auth.transport import requests as google_requests
    from google.oauth2 import id_token as google_id_token

    return google_id_token.verify_oauth2_token(
        id_token_str, google_requests.Request(), settings.GOOGLE_CLIENT_ID
    )


async def google_auth(db: AsyncSession, payload: GoogleAuthRequest) -> LoginResponse:
    """
    Exchange a Google ID token (forwarded by the frontend's NextAuth flow) for
    our own session. Creates the user on first sign-in (JIT provisioning).
    """
    if not settings.GOOGLE_CLIENT_ID:
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail="Google sign-in is not configured on the server",
        )
    try:
        info = await anyio.to_thread.run_sync(
            _verify_google_token, payload.id_token
        )
    except Exception as exc:  # google raises ValueError on bad tokens
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Google token",
        ) from exc

    email = info.get("email")
    if not email:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Google token missing email",
        )

    user = await db.scalar(select(User).where(User.email == email))
    if user is None:
        user = User(
            email=email,
            name=info.get("name", email.split("@")[0]),
            avatar_url=info.get("picture"),
            hashed_password=None,  # OAuth-only account
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)

    return await _build_login_response(db, user)


async def refresh_tokens(db: AsyncSession, refresh_token: str) -> TokenResponse:
    """Validate a refresh token and issue a new access+refresh pair."""
    try:
        payload = verify_token(refresh_token, expected_type="refresh")
    except TokenError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token",
        ) from exc

    import uuid

    user = await db.get(User, uuid.UUID(payload["sub"]))
    if user is None or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found"
        )
    return _issue_tokens(user)
