from abc import ABC, abstractmethod
from typing import Any, Dict, List


class BaseParser(ABC):
    """Abstract interface for parsing raw meetup files, PDFs, or external text sources."""

    @abstractmethod
    async def parse(self, file_path: str) -> List[Dict[str, Any]]:
        """Parse source document into structured dictionary items."""
        pass
