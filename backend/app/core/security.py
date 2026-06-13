"""
Purpose
-------
The security backbone shared by every protected endpoint:

  1. Password hashing/verification (bcrypt via passlib).
  2. `get_current_user`  — turns a Bearer access token into a User (authn).
  3. `get_tenant`        — resolves the active organization from the
                           `X-Organization-Id` header AND verifies the user is a
                           member of it. This is the tenant-isolation chokepoint:
                           a request can only ever act inside an org the caller
                           actually belongs to.
  4. `require_role(...)` — RBAC: rejects callers whose role is below a threshold.

Roles are ranked VIEWER < EDITOR < ADMIN, so `require_role(EDITOR)` also admits
admins.

Request flow
    Authorization: Bearer <jwt>  +  X-Organization-Id: <uuid>
        → get_current_user  (who are you?)
        → get_tenant        (are you in this org? what's your role?)
        → require_role      (is your role high enough for this action?)
"""

from __future__ import annotations

import uuid
from dataclasses import dataclass

from fastapi import Depends, Header, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from passlib.context import CryptContext
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models.organization import (
    MemberStatus,
    Organization,
    OrganizationMember,
    Role,
)
from app.models.user import User
from app.utils.jwt import TokenError, verify_token

# ── Password hashing ─────────────────────────────────────────────────────────
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(plain: str) -> str:
    return pwd_context.hash(plain)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


# ── RBAC ranking ─────────────────────────────────────────────────────────────
ROLE_RANK: dict[Role, int] = {Role.VIEWER: 0, Role.EDITOR: 1, Role.ADMIN: 2}


@dataclass
class TenantContext:
    """Everything an authorized, tenant-scoped handler needs."""

    user: User
    organization: Organization
    membership: OrganizationMember

    @property
    def role(self) -> Role:
        return self.membership.role

    @property
    def org_id(self) -> uuid.UUID:
        return self.organization.id


_bearer = HTTPBearer(auto_error=False)


def _credentials_exc(detail: str = "Not authenticated") -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail=detail,
        headers={"WWW-Authenticate": "Bearer"},
    )


async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer),
    db: AsyncSession = Depends(get_db),
) -> User:
    """Authenticate the caller from the Bearer access token."""
    if credentials is None:
        raise _credentials_exc()
    try:
        payload = verify_token(credentials.credentials, expected_type="access")
    except TokenError as exc:
        raise _credentials_exc(str(exc)) from exc

    try:
        user_id = uuid.UUID(payload["sub"])
    except (ValueError, KeyError) as exc:
        raise _credentials_exc("Malformed token subject") from exc

    user = await db.get(User, user_id)
    if user is None or not user.is_active:
        raise _credentials_exc("User not found or inactive")
    return user


async def get_tenant(
    x_organization_id: str = Header(
        ..., alias="X-Organization-Id", description="Active organization id"
    ),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> TenantContext:
    """
    Resolve and authorize the active tenant. Raises 403 if the user is not an
    ACTIVE member of the requested organization — the core isolation guarantee.
    """
    try:
        org_id = uuid.UUID(x_organization_id)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid X-Organization-Id header",
        ) from exc

    result = await db.execute(
        select(OrganizationMember).where(
            OrganizationMember.user_id == user.id,
            OrganizationMember.organization_id == org_id,
            OrganizationMember.status == MemberStatus.ACTIVE,
        )
    )
    membership = result.scalar_one_or_none()
    if membership is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not a member of this organization",
        )

    organization = await db.get(Organization, org_id)
    if organization is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Organization not found"
        )

    return TenantContext(user=user, organization=organization, membership=membership)


def require_role(minimum: Role):
    """
    Dependency factory enforcing a minimum role. Usage:

        @router.post("/invite")
        async def invite(ctx: TenantContext = Depends(require_role(Role.ADMIN))):
            ...
    """

    async def _checker(ctx: TenantContext = Depends(get_tenant)) -> TenantContext:
        if ROLE_RANK[ctx.role] < ROLE_RANK[minimum]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Requires {minimum.value} role or higher",
            )
        return ctx

    return _checker
