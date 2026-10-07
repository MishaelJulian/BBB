import os

ASSETS_DIR = os.path.realpath("assets")


def asset_path(*parts: str) -> str:
    """Join parts under assets/ and refuse any result that escapes it (path-injection guard)."""
    path = os.path.realpath(os.path.join(ASSETS_DIR, *parts))
    if not path.startswith(ASSETS_DIR + os.sep):
        raise ValueError(f"path escapes assets/: {path}")
    return path
