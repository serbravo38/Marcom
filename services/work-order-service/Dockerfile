FROM python:3.10-slim

WORKDIR /app

# Install system dependencies for PostgreSQL client compilation
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Install requirements
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy source code
COPY . .

# Expose service port
EXPOSE 8003

# Run the app
CMD ["python", "main.py"]
