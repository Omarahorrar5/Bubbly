#!/bin/bash
set -e

# Redirect output to log file for debugging
exec > >(tee -i /var/log/user_data.log) 2>&1

echo "=== Bootstrapping Bubbly App Server ==="

# 1. Update and install packages
sudo apt-get update -y
sudo apt-get install -y ca-certificates curl gnupg postgresql-client

# 2. Install Docker
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt-get update -y
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# 3. Create app directory
sudo mkdir -p /opt/bubbly
sudo chown -R ubuntu:ubuntu /opt/bubbly

# 4. Write SQL Schema file
cat << 'EOF' > /opt/bubbly/schema.sql
${db_schema}
EOF

# 5. Write docker-compose.yml file
cat << 'EOF' > /opt/bubbly/docker-compose.yml
version: '3.8'

services:
  backend:
    image: ${dockerhub_username}/bubbly-backend:latest
    container_name: bubbly-backend
    ports:
      - "3000:3000"
    environment:
      - PORT=3000
      - DB_HOST=${db_host}
      - DB_PORT=${db_port}
      - DB_NAME=${db_name}
      - DB_USER=${db_user}
      - DB_PASSWORD=${db_password}
      - SESSION_SECRET=${session_secret}
      - NODE_ENV=production
      - ML_SERVICE_URL=http://ml-service:5001
    restart: unless-stopped
    networks:
      - bubbly-network

  ml-service:
    image: ${dockerhub_username}/bubbly-ml:latest
    container_name: bubbly-ml
    ports:
      - "5001:5001"
    environment:
      - DB_HOST=${db_host}
      - DB_PORT=${db_port}
      - DB_NAME=${db_name}
      - DB_USER=${db_user}
      - DB_PASSWORD=${db_password}
    restart: unless-stopped
    networks:
      - bubbly-network

  frontend:
    image: ${dockerhub_username}/bubbly-frontend:latest
    container_name: bubbly-frontend
    ports:
      - "80:80"
    depends_on:
      - backend
      - ml-service
    restart: unless-stopped
    networks:
      - bubbly-network

networks:
  bubbly-network:
    driver: bridge
EOF

# 6. Wait for RDS PostgreSQL database to be reachable
echo "Waiting for RDS PostgreSQL database at ${db_host}..."
until pg_isready -h ${db_host} -p ${db_port} -U ${db_user}; do
  echo "Database not ready. Waiting 5s..."
  sleep 5
done
echo "Database is reachable!"

# 7. Execute schema script to initialize database
echo "Executing database schema setup..."
PGPASSWORD='${db_password}' psql -h ${db_host} -p ${db_port} -U ${db_user} -d ${db_name} -f /opt/bubbly/schema.sql
echo "Database schema initialized successfully."

# 8. Start containers
echo "Starting Bubbly Application containers..."
cd /opt/bubbly
sudo docker compose pull || true
sudo docker compose up -d

echo "=== Bootstrapping Completed Successfully ==="
