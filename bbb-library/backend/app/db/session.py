from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy import create_engine
from app.core.config import settings

# If running asyncpg DB URL
if settings.DATABASE_URL.startswith("postgresql+asyncpg"):
    try:
        engine = create_async_engine(settings.DATABASE_URL, echo=False, future=True)
        AsyncSessionLocal = async_sessionmaker(
            bind=engine,
            class_=AsyncSession,
            expire_on_commit=False,
            autocommit=False,
            autoflush=False,
        )
    except ModuleNotFoundError:
        # Fallback to sync engine if asyncpg driver is not installed locally
        sync_url = settings.DATABASE_URL.replace("postgresql+asyncpg", "postgresql")
        engine = create_engine(sync_url)
        AsyncSessionLocal = None
else:
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
    AsyncSessionLocal = async_sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)


async def get_async_session() -> AsyncGenerator[AsyncSession, None]:
    """Dependency for providing asynchronous SQLAlchemy database sessions."""
    if AsyncSessionLocal:
        async with AsyncSessionLocal() as session:
            try:
                yield session
            finally:
                await session.close()
