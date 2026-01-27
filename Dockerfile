# Use official lightweight Python image
# python:3.10-slim is sufficient and much smaller than full images
FROM python:3.10-slim

# Set working directory to /app
WORKDIR /app

# Install system dependencies required for OpenCV
# libgl1 and libglib2.0-0 are often needed for cv2 to work, even in headless environments
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first to leverage Docker layer caching
COPY requirements.txt .

# Install python dependencies
# --no-cache-dir reduces image size
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application code
# This should happen after pip install so that code changes don't invalidate dependency cache
COPY . .

# Expose port 8080 (Google Cloud Run default)
EXPOSE 8080

# Use array syntax for CMD to avoid shell wrapping
# Run uvicorn with host 0.0.0.0 and port 8080
# workers 1 is default, can be increased via Gunicorn if concurrency is high, but Uvicorn is standard for Cloud Run basic usage
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8080"]
