FROM python:3.11-slim

ENV PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

# system deps for pillow/psycopg2
RUN apt-get update \
    && apt-get install -y --no-install-recommends build-essential libpq-dev gcc curl netcat-openbsd \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --upgrade pip
RUN pip install -r requirements.txt

# Create non-root user and ensure permissions
RUN groupadd -r app && useradd -r -g app -d /home/app -s /sbin/nologin -m app

# Copy application
COPY . .

# Entrypoint will run migrations and collectstatic then start gunicorn
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Ensure app user owns the application files
RUN chown -R app:app /app /entrypoint.sh

# Switch to non-root user for runtime
USER app

EXPOSE 8000

CMD ["/entrypoint.sh"]
