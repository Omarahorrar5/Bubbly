FROM python:3.10-slim

WORKDIR /app

# Install system packages required for psycopg2 or other compiles
RUN apt-get update && apt-get install -y \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Install requirements
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy source code
COPY . .

# Expose Flask API port
EXPOSE 5001

# Run the Flask app
CMD ["python", "recommendation_service.py"]
