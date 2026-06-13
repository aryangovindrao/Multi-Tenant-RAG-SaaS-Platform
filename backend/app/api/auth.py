"""
Auth API — /auth

Prompt endpoints:
    POST /auth/register   create an account, return tokens + user + orgs
    POST /auth/login      validate credentials, return tokens + user + orgs
    GET  /auth/me         the current user (requires a valid access token)

Frontend-support endpoints (the Next.js app depends on these):
    POST /auth/google             exchange a Google ID token for a session
    POST /auth/refresh            rotate tokens using a refresh token
    POST /auth/logout             stateless ack (client discards tokens)
    POST /auth/forgot-password    always-204 (never reveals if email exists)
    POST /auth/reset-password     accept a reset (stub — wire to email infra)

JWT auth flow: register/login mint an access token (short) + refresh token
(long). The client sends the access token as `Authorization: Bearer ...`;
get_current_user decodes it back into a User on every protected route.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.auth import (
    GoogleAuthRequest,
    LoginRequest,
    LoginResponse,
    RefreshRequest,
    RegisterRequest,
    TokenResponse,
)
from app.schemas.user import UserOut
from app.services import auth_service

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=LoginResponse, status_code=status.HTTP_201_CREATED)
async def register(payload: RegisterRequest, db: AsyncSession = Depends(get_db)):
    return await auth_service.register_user(db, payload)


@router.post("/login", response_model=LoginResponse)
async def login(payload: LoginRequest, db: AsyncSession = Depends(get_db)):
    return await auth_service.login(db, payload)


@router.get("/me", response_model=UserOut)
async def me(current_user: User = Depends(get_current_user)):
    return UserOut.model_validate(current_user)


@router.post("/google", response_model=LoginResponse)
async def google(payload: GoogleAuthRequest, db: AsyncSession = Depends(get_db)):
    return await auth_service.google_auth(db, payload)


@router.post("/refresh", response_model=TokenResponse)
async def refresh(payload: RefreshRequest, db: AsyncSession = Depends(get_db)):
    return await auth_service.refresh_tokens(db, payload.refresh_token)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(_: User = Depends(get_current_user)):
    # JWTs are stateless; the client simply discards them. (A production build
    # would add the token jti to a denylist until it expires.)
    return None


@router.post("/forgot-password", status_code=status.HTTP_204_NO_CONTENT)
async def forgot_password(payload: dict):
    # Intentionally a no-op success regardless of whether the email exists.
    return None


@router.post("/reset-password", status_code=status.HTTP_204_NO_CONTENT)
async def reset_password(payload: dict):
    # Stub: validate the reset token and set the new password once email infra
    # is wired up.
    return None
