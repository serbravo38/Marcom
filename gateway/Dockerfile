FROM python:3.10-slim

WORKDIR /app

# Install requirements
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy source code
COPY . .

# Expose service port
EXPOSE 8000

# Run the app
CMD ["python", "main.py"]
