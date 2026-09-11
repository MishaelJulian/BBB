from datetime import datetime
from typing import Generic, List, Optional, TypeVar
from pydantic import BaseModel, ConfigDict

T = TypeVar("T")


class BaseResponse(BaseModel):
    """Base schema for general API responses."""

    model_config = ConfigDict(from_attributes=True)


class TimestampedSchema(BaseResponse):
    """Base schema for resources with audit timestamps."""

    created_at: datetime
    updated_at: datetime


class PaginatedResponse(BaseModel, Generic[T]):
    """Generic schema for paginated resource lists."""

    items: List[T]
    total: int
    page: int
    size: int
    pages: int
