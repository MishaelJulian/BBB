from contextlib import contextmanager
from typing import Generator
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker, Session, DeclarativeBase

from app.core.config import settings
from app.core.logging import logger


def get_engine(db_url: str = None):
    """Create SQLAlchemy engine with appropriate dialect settings."""
    url = db_url or settings.DATABASE_URL
    connect_args = {}

    if url.startswith("sqlite"):
        connect_args["check_same_thread"] = False
        engine = create_engine(url, connect_args=connect_args, echo=settings.DEBUG)

        @event.listens_for(engine, "connect")
        def set_sqlite_pragma(dbapi_connection, connection_record):
            cursor = dbapi_connection.cursor()
            cursor.execute("PRAGMA foreign_keys=ON;")
            cursor.execute("PRAGMA journal_mode=WAL;")
            cursor.close()

    else:
        # PostgreSQL or other engines
        engine = create_engine(
            url,
            pool_pre_ping=True,
            pool_size=10,
            max_overflow=20,
            echo=settings.DEBUG,
        )

    return engine


engine = get_engine()
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@contextmanager
def get_db_session() -> Generator[Session, None, None]:
    """Context manager for acquiring and closing database sessions cleanly."""
    session = SessionLocal()
    try:
        yield session
        session.commit()
    except Exception as e:
        session.rollback()
        logger.error(f"Database session rollback due to error: {e}")
        raise
    finally:
        session.close()


def init_db(target_engine=None) -> None:
    """Initialize database tables using SQLAlchemy models."""
    from app.database.base import Base
    import app.database.models  # Ensure models are imported for metadata registration

    eng = target_engine or engine
    logger.info("Initializing database tables...")
    Base.metadata.create_all(bind=eng)
    logger.info("Database tables initialized successfully.")


def reset_db(target_engine=None) -> None:
    """Drop all tables and recreate them from current models."""
    from app.database.base import Base
    import app.database.models  # Ensure models are imported for metadata registration

    eng = target_engine or engine
    logger.info("Dropping all tables...")
    Base.metadata.drop_all(bind=eng)
    logger.info("Recreating all tables...")
    Base.metadata.create_all(bind=eng)
    logger.info("Database reset complete.")
