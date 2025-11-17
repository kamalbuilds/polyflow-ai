# Multi-stage build for PolyFlow AI Engine
FROM node:18-alpine AS base

# Install system dependencies
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    git \
    curl

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Development stage
FROM base AS development
RUN npm ci --include=dev
COPY . .
EXPOSE 3001
CMD ["npm", "run", "dev"]

# Build stage
FROM base AS build
RUN npm ci --include=dev
COPY . .
RUN npm run build

# Production stage
FROM node:18-alpine AS production

# Install production dependencies and security updates
RUN apk add --no-cache \
    dumb-init \
    curl \
    && apk upgrade \
    && addgroup -g 1001 -S nodejs \
    && adduser -S aiengine -u 1001

WORKDIR /app

# Copy package files and install production dependencies
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Copy built application
COPY --from=build --chown=aiengine:nodejs /app/dist ./dist
COPY --from=build --chown=aiengine:nodejs /app/templates ./templates
COPY --from=build --chown=aiengine:nodejs /app/data ./data

# Create necessary directories
RUN mkdir -p /app/logs /app/cache && \
    chown -R aiengine:nodejs /app/logs /app/cache

# Switch to non-root user
USER aiengine

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3001/health || exit 1

# Security and performance settings
ENV NODE_ENV=production
ENV PORT=3001
ENV LOG_LEVEL=info

# Expose port
EXPOSE 3001

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/index.js"]