FROM node:18-alpine

# Install build dependencies and Python for node-gyp
RUN apk add --no-cache \
    dumb-init \
    curl \
    python3 \
    make \
    g++ \
    py3-pip \
    libc6-compat \
    linux-headers

# Set environment variables to skip problematic native modules
ENV npm_config_build_from_source=true
ENV npm_config_target_platform=linux
ENV npm_config_target_arch=x64
ENV npm_config_cache=/tmp/.npm

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies with fallback for native modules
RUN npm ci --only=production --no-optional || npm ci --only=production --ignore-scripts

# Copy source code
COPY . .

# Build the Next.js application
RUN npm run build

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

# Change ownership
RUN chown -R nextjs:nodejs /app
USER nextjs

# Health check using Railway's PORT environment variable
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:${PORT:-3000}/api/health || exit 1

# Use dumb-init to handle signals properly and run production manager
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "scripts/production-manager.js"] 