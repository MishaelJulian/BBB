from abc import ABC, abstractmethod
from typing import Any, Dict, List


class BaseImporter(ABC):
    """Abstract interface for importing structured parsed data into storage repositories."""

    @abstractmethod
    async def import_data(self, data: List[Dict[str, Any]]) -> int:
        """Import structured data records and return imported item count."""
        pass
