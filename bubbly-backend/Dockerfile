# Backend Dockerfile
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN apk add --no-cache postgresql-client
RUN npm ci --only=production

# Copy source code
COPY . .

# Expose port
EXPOSE 3000

# Start the server (runs migrations/setup first, which is safe/non-destructive)
CMD ["sh", "-c", "node utils/db-migrate.js && node utils/db-setup.js && node index.js"]
