from app.core.config import Settings


def test_settings_initialization():
    s = Settings()
    assert s.APP_NAME == "Book Club Archivist"
    assert s.DATA_DIR.exists()
    assert s.LOGS_DIR.exists()
    assert s.STORAGE_DIR.exists()
