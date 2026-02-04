#!/bin/sh
set -e

# Wait for database to be available before running migrations
wait_for_db() {
  # Prefer explicit DB host/port, fallback to parsing DATABASE_URL
  DB_HOST=${DB_HOST:-}
  DB_PORT=${DB_PORT:-}

  if [ -z "$DB_HOST" ] && [ -n "$DATABASE_URL" ]; then
    # parse postgres://user:pass@host:port/db
    host_port=$(echo "$DATABASE_URL" | awk -F@ '{print $2}' | awk -F/ '{print $1}')
    DB_HOST=$(echo "$host_port" | awk -F: '{print $1}')
    DB_PORT=$(echo "$host_port" | awk -F: '{print $2}')
  fi

  DB_PORT=${DB_PORT:-5432}

  if [ -n "$DB_HOST" ]; then
    echo "Waiting for database at $DB_HOST:$DB_PORT..."
    until nc -z "$DB_HOST" "$DB_PORT"; do
      echo "Database not ready, sleeping 1s..."
      sleep 1
    done
    echo "Database is available"
  else
    echo "No DB host found in DB_HOST or DATABASE_URL, skipping wait"
  fi
}

if [ -n "$DATABASE_URL" ] || [ -n "$DB_HOST" ]; then
  wait_for_db
fi

echo "Running migrations..."
python manage.py migrate --noinput

echo "Collecting static files..."
python manage.py collectstatic --noinput

echo "Starting Gunicorn..."
exec gunicorn config.wsgi:application --bind 0.0.0.0:8000 --workers ${GUNICORN_WORKERS:-3} --log-level ${GUNICORN_LOG_LEVEL:-info}
