import logging
import sys


def setup_logging() -> None:
    """Configures application-wide logging formats and handlers."""
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
        handlers=[logging.StreamHandler(sys.stdout)],
    )


logger = logging.getLogger("bbb_library")
