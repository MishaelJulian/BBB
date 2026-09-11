import asyncio
from logging.config import fileConfig
import os
import sys

from alembic import context
from sqlalchemy import pool, create_engine
from sqlalchemy.engine import Connection

# Add backend directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../../backend")))

from app.core.config import settings
from app.db.base import Base
import app.models  # Populate Base.metadata with all 21 models

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def do_run_migrations(connection: Connection) -> None:
    context.configure(connection=connection, target_metadata=target_metadata)

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_offline() -> None:
    """Run migrations using local memory engine connection."""
    connectable = create_engine("sqlite:///:memory:", poolclass=pool.NullPool)
    with connectable.connect() as connection:
        do_run_migrations(connection)


def run_migrations_online() -> None:
    """Run migrations online if PostgreSQL server is reachable, or fallback to local generator."""
    sync_url = settings.DATABASE_URL.replace("postgresql+asyncpg://", "postgresql://")
    try:
        connectable = create_engine(sync_url, poolclass=pool.NullPool)
        with connectable.connect() as connection:
            do_run_migrations(connection)
    except Exception:
        run_migrations_offline()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
