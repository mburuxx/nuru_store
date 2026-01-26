#!/bin/sh
set -e

# Optional: wait for DB to be available (simple loop)
if [ -n "$DATABASE_URL" ]; then
  echo "DATABASE_URL present, continuing..."
fi

echo "Running migrations..."
python manage.py migrate --noinput

echo "Collecting static files..."
python manage.py collectstatic --noinput

echo "Starting Gunicorn..."
exec gunicorn config.wsgi:application --bind 0.0.0.0:8000 --workers 3 --log-level info
