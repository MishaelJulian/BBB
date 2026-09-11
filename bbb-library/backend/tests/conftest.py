from typing import AsyncGenerator
import pytest

try:
    from httpx import ASGITransport, AsyncClient
    from app.main import app

    @pytest.fixture
    async def async_client() -> AsyncGenerator[AsyncClient, None]:
        """Provides an async HTTP client for testing API endpoints."""
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            yield client
except ImportError:
    pass
