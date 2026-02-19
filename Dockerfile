# Stage 1: Build frontend
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install dependencies
RUN npm ci --ignore-scripts

# Copy source code
COPY . .

# Build the frontend (full variant)
RUN npx tsc && npx vite build

# Stage 2: Production server
FROM node:20-alpine AS production

WORKDIR /app

# Install only production dependencies for the API server
COPY package.json package-lock.json ./
COPY server/package.json server/package-lock.json* ./server/

RUN cd server && npm ci --omit=dev 2>/dev/null || cd /app/server && npm install --omit=dev

# Copy the built frontend
COPY --from=builder /app/dist ./dist

# Copy API handlers
COPY api ./api

# Copy the server
COPY server ./server

# Copy data files
COPY data ./data

# Copy public assets that might be referenced
COPY public ./public

# Environment
ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

# Health check
HEALTHCHECK --interval=15s --timeout=10s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://localhost:3000/').then(r => r.ok ? process.exit(0) : process.exit(1)).catch(() => process.exit(1))"

CMD ["node", "server/index.mjs"]
