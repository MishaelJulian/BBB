"""Launch-gate guards (T1): error envelope, origin lock, rate limit, link and cover checks, list cap.
None of these touch the database: they hit unknown routes, parameter validation, or pure functions."""

import asyncio
import json

import pytest
from pydantic import ValidationError

from app.api import main
from app.services.pdf_generator import is_allowed_cover_url


class _Resp:
    def __init__(self, status, headers, body):
        self.status_code, self.headers, self._body = status, headers, body

    def json(self):
        return json.loads(self._body)


def _get(target, headers=None):
    """Minimal ASGI GET (avoids adding httpx just for TestClient)."""
    path, _, query = target.partition("?")
    scope = {
        "type": "http", "http_version": "1.1", "method": "GET", "scheme": "http",
        "path": path, "raw_path": path.encode(), "query_string": query.encode(), "root_path": "",
        "headers": [(k.lower().encode(), v.encode()) for k, v in (headers or {}).items()],
        "client": ("127.0.0.1", 5000), "server": ("test", 80),
    }
    out = {"headers": {}, "body": b""}

    async def receive():
        return {"type": "http.request", "body": b"", "more_body": False}

    async def send(msg):
        if msg["type"] == "http.response.start":
            out["status"] = msg["status"]
            out["headers"] = {k.decode(): v.decode() for k, v in msg["headers"]}
        elif msg["type"] == "http.response.body":
            out["body"] += msg.get("body", b"")

    asyncio.run(main.app(scope, receive, send))
    return _Resp(out["status"], {k.lower(): v for k, v in out["headers"].items()}, out["body"])


class client:
    get = staticmethod(_get)


def test_error_envelope_on_404():
    r = client.get("/no-such-route")
    assert r.status_code == 404
    body = r.json()
    assert body["error"]["type"] == "not_found" and "detail" in body
    assert r.headers["x-content-type-options"] == "nosniff"


def test_books_limit_is_capped():
    r = client.get("/books?limit=5000")
    assert r.status_code == 422 and r.json()["error"]["code"] == "invalid_parameters"


def test_origin_secret_blocks_direct_traffic(monkeypatch):
    monkeypatch.setattr(main.settings, "ORIGIN_SECRET", "s3cret")
    assert client.get("/no-such-route").status_code == 403
    assert client.get("/no-such-route", headers={"x-origin-secret": "s3cret"}).status_code == 404


def test_rate_limit_trips(monkeypatch):
    monkeypatch.setattr(main, "_RATE_LIMITS", {"read": (2, 60.0), "write": (1, 60.0)})
    monkeypatch.setattr(main, "_hits", main.defaultdict(main.deque))
    assert not main._rate_limited("1.2.3.4", "write")
    assert main._rate_limited("1.2.3.4", "write")


@pytest.mark.parametrize("bad", ["javascript:alert(1)", "data:text/html,x", "file:///etc/passwd"])
def test_stored_links_must_be_http(bad):
    with pytest.raises(ValidationError):
        main.BookUpdateRequest(title="t", url=bad)
    assert main.BookUpdateRequest(title="t", url="https://example.org").url == "https://example.org"


def test_cover_host_allow_list():
    assert is_allowed_cover_url("https://i.gr-assets.com/images/x.jpg")
    assert not is_allowed_cover_url("http://i.gr-assets.com/images/x.jpg")
    assert not is_allowed_cover_url("https://169.254.169.254/latest/meta-data")
    assert not is_allowed_cover_url("https://evil-gr-assets.com/x.jpg")
