from abc import ABC
from typing import Generic, TypeVar
from app.repositories.base import BaseRepository

RepoType = TypeVar("RepoType", bound=BaseRepository)


class BaseService(ABC, Generic[RepoType]):
    """Abstract Base Service encapsulating business logic operations."""

    def __init__(self, repository: RepoType) -> None:
        self.repository = repository
