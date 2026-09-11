from abc import ABC, abstractmethod
from typing import List, Any
from app.schemas.intermediate import IntermediateRecord


class BaseImporter(ABC):
    """Abstract Base Importer interface that all source importers must implement."""

    @property
    @abstractmethod
    def importer_name(self) -> str:
        """Return unique identifier string for importer."""
        pass

    @abstractmethod
    def parse(self, source_input: Any, **kwargs) -> List[IntermediateRecord]:
        """Parse source input into standardized list of IntermediateRecord instances.
        
        Args:
            source_input: File path, URL, or stream to import.
            **kwargs: Source-specific parameters.

        Returns:
            List of IntermediateRecord objects.
        """
        pass
