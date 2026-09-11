import sys
from pathlib import Path
from loguru import logger
from app.core.config import settings


def setup_logging(log_file: Path = None, level: str = None) -> None:
    """Configure loguru for colored console output and structured JSON log files."""
    log_level = level or settings.LOG_LEVEL
    target_log_file = log_file or (settings.LOGS_DIR / "archivist.json")

    logger.remove()  # Remove default handler

    # Human-readable console handler
    console_format = (
        "<green>{time:YYYY-MM-DD HH:mm:ss}</green> | "
        "<level>{level: <8}</level> | "
        "<cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> - "
        "<level>{message}</level>"
    )
    logger.add(
        sys.stderr,
        format=console_format,
        level=log_level,
        colorize=True,
    )

    # Structured JSON log file handler using loguru native serialize=True
    logger.add(
        str(target_log_file),
        serialize=True,
        level=log_level,
        rotation="10 MB",
        retention="30 days",
        encoding="utf-8",
    )


# Run setup on import
setup_logging()
