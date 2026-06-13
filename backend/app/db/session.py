"""
Purpose
-------
Provides the `get_db` FastAPI dependency: one AsyncSession per request, always
closed afterwards, with commit/rollback handled by the caller (services).

Request flow
    handler(db: AsyncSession = Depends(get_db)) →
    session opened → handler/services run → session closed.

Dependencies: app.db.database.
"""

from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import async_session_maker


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Yield a request-scoped async session and guarantee cleanup."""
    async with async_session_maker() as session:
        try:
            yield session
        except Exception:
            # Any unhandled error rolls the transaction back so a failed
            # request never leaves a half-written row committed.
            await session.rollback()
            raise
