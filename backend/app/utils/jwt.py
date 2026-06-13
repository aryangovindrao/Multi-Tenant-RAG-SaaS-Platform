"""
Purpose
-------
Stateless JWT creation and verification. Two token types:
  - access  (short-lived, sent on every request as `Authorization: Bearer …`)
  - refresh (long-lived, used only to mint new access tokens)

The `type` claim distinguishes them so a refresh token can never be replayed as
an access token (and vice-versa).

Functions
    create_access_token(subject, extra) -> (token, expires_at_ms)
    create_refresh_token(subject)       -> str
    verify_token(token, expected_type)  -> dict   (raises on invalid/expired)

Dependencies: python-jose.
"""

from datetime import datetime, timedelta, timezone
from typing import Any

from jose import JWTError, jwt

from app.core.config import settings


class TokenError(Exception):
    """Raised when a token is missing, malformed, expired, or the wrong type."""


def _now() -> datetime:
    return datetime.now(timezone.utc)


def create_access_token(
    subject: str,
    extra_claims: dict[str, Any] | None = None,
) -> tuple[str, int]:
    """
    Build a signed access token for `subject` (the user id).

    Returns the encoded token AND its expiry as epoch **milliseconds** — the
    frontend stores `expiresAt` to know when to refresh proactively.
    """
    expire = _now() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    payload: dict[str, Any] = {
        "sub": subject,
        "type": "access",
        "iat": int(_now().timestamp()),
        "exp": expire,
        **(extra_claims or {}),
    }
    token = jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)
    return token, int(expire.timestamp() * 1000)


def create_refresh_token(subject: str) -> str:
    """Build a long-lived refresh token (no extra claims, type='refresh')."""
    expire = _now() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    payload = {
        "sub": subject,
        "type": "refresh",
        "iat": int(_now().timestamp()),
        "exp": expire,
    }
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


def verify_token(token: str, expected_type: str = "access") -> dict[str, Any]:
    """
    Decode + validate a token. Raises TokenError if the signature is bad, the
    token is expired, or its `type` claim doesn't match `expected_type`.
    """
    try:
        payload = jwt.decode(
            token,
            settings.JWT_SECRET,
            algorithms=[settings.JWT_ALGORITHM],
        )
    except JWTError as exc:
        raise TokenError("Invalid or expired token") from exc

    if payload.get("type") != expected_type:
        raise TokenError(f"Expected a {expected_type} token")
    if "sub" not in payload:
        raise TokenError("Token missing subject")
    return payload
