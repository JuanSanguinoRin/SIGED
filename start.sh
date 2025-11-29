#!/bin/bash

# Navigate to the backend directory
cd backend

# Apply database migrations
python manage.py migrate

# Collect static files
python manage.py collectstatic --noinput

# Start Gunicorn server
gunicorn siged.wsgi:application --bind 0.0.0.0:$PORT
