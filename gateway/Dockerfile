FROM python:3.11-slim-bookworm

WORKDIR /app

# Install OS security updates
RUN apt-get update && apt-get upgrade -y \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Install requirements
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt

# Copy source code
COPY . .

# Expose gateway port
EXPOSE 8000

# Run the app
CMD ["python", "main.py"]
