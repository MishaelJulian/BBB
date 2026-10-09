FROM python:3.11-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app

COPY requirements.txt requirements-api.txt ./
RUN pip install -r requirements.txt -r requirements-api.txt

# F6: run as an unprivileged user (uid 10001). Mounted /data and /app/assets must be writable by it.
RUN useradd --create-home --uid 10001 app && chown app:app /app
COPY --chown=app:app . .
USER app

EXPOSE 8000

CMD ["uvicorn", "app.api.main:app", "--host", "0.0.0.0", "--port", "8000", "--proxy-headers"]
