FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

# The repository root is the working directory so the `apps.api` package is
# importable exactly as it is in a developer checkout. /srv rather than /app so
# the in-image path does not echo the old top-level `app/` package.
WORKDIR /srv

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# `apps` and `apps/api` together form the package; `apps/__init__.py` is what
# makes `apps` a regular package instead of a namespace package.
COPY apps/__init__.py ./apps/__init__.py
COPY apps/api ./apps/api

RUN useradd --create-home --uid 10001 appuser && chown -R appuser:appuser /srv
USER appuser

EXPOSE 8000

# Cloud Run injects $PORT (8080 by default) and only routes to that port, so
# the port must come from the environment. The 8000 fallback keeps the local
# docker compose behaviour unchanged.
CMD ["sh", "-c", "exec uvicorn apps.api.main:app --host 0.0.0.0 --port \"${PORT:-8000}\""]

