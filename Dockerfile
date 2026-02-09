# Multi-stage build for React + Node.js application - OPTIMIZED FOR SIZE

# Stage 1: Build the React frontend
FROM node:18-alpine AS client-build
WORKDIR /app/client

# Copy package files and install dependencies with optimizations
COPY client/package*.json ./
RUN npm install --omit=dev --no-audit --no-fund \
    && npm cache clean --force

# Copy source and build
COPY client/ ./
RUN npm run build \
    && rm -rf node_modules \
    && rm -rf src

# Stage 2: Setup the Node.js backend
FROM node:18-alpine AS server-build
WORKDIR /app

# Install production dependencies only, with optimizations
COPY package*.json ./
RUN npm install --omit=dev --no-audit --no-fund --ignore-scripts \
    && npm cache clean --force

# Rebuild native modules for alpine
RUN npm rebuild better-sqlite3 bcrypt

# Stage 3: Production image - MINIMAL
FROM node:18-alpine
WORKDIR /app

# Install dumb-init for proper signal handling (tiny overhead, better process management)
RUN apk add --no-cache dumb-init

# Create non-root user for security and minimal overhead
RUN addgroup -g 1001 -S nodejs \
    && adduser -S nodejs -u 1001

# Copy backend dependencies (already optimized)
COPY --from=server-build --chown=nodejs:nodejs /app/node_modules ./node_modules

# Copy backend code
COPY --chown=nodejs:nodejs server/ ./server/

# Copy built frontend (already minified)
COPY --from=client-build --chown=nodejs:nodejs /app/client/build ./client/build

# Create directory for database with proper permissions
RUN mkdir -p /app/data \
    && chown -R nodejs:nodejs /app/data

# Set environment variables
ENV NODE_ENV=production \
    PORT=3001 \
    DB_PATH=/app/data/cartrack.db \
    NODE_OPTIONS="--max-old-space-size=256"

RUN chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3001

# Health check (lightweight)
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/api/auth/status', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["node", "server/index.js"]
