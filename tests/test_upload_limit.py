import asyncio
import io

import pytest
from fastapi import HTTPException, UploadFile

from app.api import main
from app.api.main import MAX_UPLOAD_BYTES, upload_meetup_photo


def test_rejects_upload_over_limit(monkeypatch):
    # The size check runs before any database access; fail loudly if that ever changes.
    monkeypatch.setattr(main, "SessionLocal", lambda: pytest.fail("database touched"))
    big = UploadFile(file=io.BytesIO(b"\0" * (MAX_UPLOAD_BYTES + 1)), filename="big.jpg")
    with pytest.raises(HTTPException) as exc:
        asyncio.run(upload_meetup_photo(1, big))
    assert exc.value.status_code == 413
