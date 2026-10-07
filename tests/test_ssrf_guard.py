import pytest

from app.api.main import _is_public_http_url


@pytest.mark.parametrize("url", [
    "http://localhost:8000/admin",
    "http://127.0.0.1/",
    "http://169.254.169.254/latest/meta-data",
    "http://10.0.0.5/",
    "http://[::1]/",
    "file:///etc/passwd",
    "gopher://example.com",
])
def test_blocks_non_public_urls(url):
    assert not _is_public_http_url(url)
