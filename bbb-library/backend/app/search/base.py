from abc import ABC, abstractmethod
from typing import Any, Dict, List


class BaseSearchEngine(ABC):
    """Abstract interface for text/vector index search engine operations."""

    @abstractmethod
    async def search(self, query: str, limit: int = 10) -> List[Dict[str, Any]]:
        """Perform search query and return matching records with scores."""
        pass
