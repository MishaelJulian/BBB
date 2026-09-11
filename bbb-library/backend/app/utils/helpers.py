import re


def slugify(text: str) -> str:
    """Convert text string into sanitized URL slug."""
    text = text.lower().strip()
    text = re.sub(r"[^\w\s-]", "", text)
    return re.sub(r"[\s_-]+", "-", text)
