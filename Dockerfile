# ── Django Backend — Production Dockerfile ────────────────────────
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

# System deps — psycopg2 needs libpq-dev
RUN apt-get update && apt-get install -y \
    libpq-dev \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Install Python deps first (layer cache — only rebuilds if requirements change)
COPY requirements.txt .
RUN pip install --upgrade pip && pip install -r requirements.txt

# Copy Django project (frontend excluded via .dockerignore)
COPY . .

# Collect static at build time so the image is self-contained
RUN python manage.py collectstatic --noinput

EXPOSE 8000

# Gunicorn: 3 workers is right for a small VPS; increase with (2 x CPU cores) + 1
CMD ["gunicorn", "config.wsgi:application", \
     "--bind", "0.0.0.0:8000", \
     "--workers", "3", \
     "--timeout", "120", \
     "--access-logfile", "-", \
     "--error-logfile", "-"]