from abc import ABC, abstractmethod
from typing import Any, Generic, List, Optional, TypeVar
from sqlalchemy.ext.asyncio import AsyncSession

ModelType = TypeVar("ModelType")
CreateSchemaType = TypeVar("CreateSchemaType")
UpdateSchemaType = TypeVar("UpdateSchemaType")


class BaseRepository(ABC, Generic[ModelType, CreateSchemaType, UpdateSchemaType]):
    """Abstract Base Repository enforcing standard data access patterns."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    @abstractmethod
    async def get_by_id(self, id: Any) -> Optional[ModelType]:
        """Fetch a single record by primary key."""
        pass

    @abstractmethod
    async def get_multi(
        self, *, skip: int = 0, limit: int = 100
    ) -> List[ModelType]:
        """Fetch multiple records with pagination."""
        pass

    @abstractmethod
    async def create(self, *, obj_in: CreateSchemaType) -> ModelType:
        """Create a new entity record."""
        pass

    @abstractmethod
    async def update(
        self, *, db_obj: ModelType, obj_in: UpdateSchemaType
    ) -> ModelType:
        """Update an existing entity record."""
        pass

    @abstractmethod
    async def delete(self, *, id: Any) -> Optional[ModelType]:
        """Delete an entity record by primary key."""
        pass
