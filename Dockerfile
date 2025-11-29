# Use an official Python runtime as a parent image
FROM python:3.11-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Set work directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    libpq-dev \
    gcc \
    netcat-openbsd \
    && rm -rf /var/lib/apt/lists/*

# Install python dependencies
COPY backend/requirements.txt /app/backend/requirements.txt
RUN pip install --upgrade pip && pip install -r backend/requirements.txt

# Copy the entire project
COPY . /app/

# Make sure start.sh is executable
RUN chmod +x /app/start.sh

# Expose port (Railway sets PORT env var, but good practice to document)
EXPOSE 8000

# Run the start script
CMD ["/bin/bash", "/app/start.sh"]
