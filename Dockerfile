# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Install build dependencies for better-sqlite3
RUN apk add --no-cache python3 make g++

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy source
COPY . .

# Build backend
RUN npm run build:backend

# Stage 2: Production
FROM node:20-alpine

WORKDIR /app

# Install runtime dependencies for better-sqlite3
RUN apk add --no-cache python3 make g++

# Copy built files and production dependencies
COPY --from=builder /app/backend/dist ./backend/dist
COPY --from=builder /app/backend/schema.sql ./backend/schema.sql
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./

# Create data directory for SQLite
RUN mkdir -p /app/data /app/uploads

# Environment variables
ENV NODE_ENV=production
ENV PORT=8787
ENV DATABASE_URL=file:/app/data/oinbox.db

# Expose port
EXPOSE 8787

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8787/api/health || exit 1

# Start server
CMD ["npm", "run", "start:backend"]
