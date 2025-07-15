# Dockerfile for Node.js/TypeScript application with Prisma
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files and tsconfig
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm ci && npm cache clean --force

# Copy source code
COPY src/ ./src/
COPY prisma/ ./prisma/
COPY types/ ./types/

# Generate Prisma client
RUN npx prisma generate

# Build TypeScript (if needed)
RUN npm run build || echo "No build script found, skipping build step"

# Create logs directory
RUN mkdir -p logs

# Expose port
EXPOSE 4545

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:4545/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })" || exit 1

# Start the application with Prisma generate at runtime
CMD ["sh", "-c", "npx prisma generate && npm start"] 