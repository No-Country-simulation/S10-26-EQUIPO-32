# ========================================================================
# OpenBridge Backend - Hardened Multi-Stage Dockerfile
# Adheres to CIS Docker Benchmark and NIST SP 800-190
# ========================================================================

# Stage 1: Build stage
FROM python:3.11-slim-bookworm AS builder

WORKDIR /build

RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir --user -r requirements.txt

# Stage 2: Hardened Runtime stage
FROM python:3.11-slim-bookworm AS runner

# Hardening: Run as non-privileged non-root user
RUN groupadd -g 10001 appgroup && \
    useradd -u 10001 -g appgroup -s /sbin/nologin -M appuser

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy installed packages from builder
COPY --from=builder /root/.local /home/appuser/.local
ENV PATH=/home/appuser/.local/bin:$PATH
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Copy application source code
COPY --chown=appuser:appgroup app/ /app/backend/app/
COPY --chown=appuser:appgroup requirements.txt /app/

USER appuser

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

ENTRYPOINT ["uvicorn", "backend.app.main:app", "--host", "0.0.0.0", "--port", "8000"]

