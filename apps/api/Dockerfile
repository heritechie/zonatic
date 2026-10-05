# syntax=docker/dockerfile:1

# Build stage
FROM python:3.12-slim AS builder

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

# Install uv for fast dependency installation
RUN pip install --no-cache-dir uv

# Copy dependency files
COPY apps/api/pyproject.toml ./pyproject.toml

# Install dependencies using uv
RUN pip install --no-cache-dir uv

# Copy source code
COPY apps/api ./apps/api
COPY apps/__init__.py ./apps/__init__.py

# Install uvicorn FIRST so its console script goes to /usr/local/bin
RUN pip install --no-deps uvicorn[standard]

# Install the package (editable)
RUN pip install --no-cache-dir -e .

# Runtime stage
FROM python:3.12-slim AS runtime

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

WORKDIR /app

# Install runtime dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    libgdal-dev \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user
RUN useradd --create-home --uid 10001 appuser && chown -R appuser:appuser /app
USER appuser

WORKDIR /app

# Copy Python packages from builder
COPY --from=builder /usr/local/lib/python3.12/site-packages /usr/local/lib/python3.12/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin

# Copy application code
COPY --chown=appuser:appuser apps/api ./apps/api
COPY apps/__init__.py ./apps/__init__.py

# Create non-root user
USER appuser

WORKDIR /app

# Expose port
EXPOSE 8000

# Run the application
CMD ["uvicorn", "apps.api.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "4"]