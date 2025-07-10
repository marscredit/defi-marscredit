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

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies with additional npm configurations for native modules
RUN npm ci --only=production --unsafe-perm

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

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

# Use dumb-init to handle signals properly and run production manager
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "scripts/production-manager.js"] 