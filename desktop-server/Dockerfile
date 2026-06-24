# Stage 1: Build
FROM node:20-bookworm-slim AS builder

# Install system dependencies for native modules
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    make \
    g++ \
    pkg-config \
    libsqlite3-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install dependencies using BuildKit cache for speed
ENV CI=1
RUN --mount=type=cache,target=/root/.npm \
    npm install

# Copy source and config
COPY . .

# Build the app
RUN npm run build

# Stage 2: Runtime
FROM node:20-bookworm-slim

# Install only the runtime dependencies for native modules
RUN apt-get update && apt-get install -y --no-install-recommends \
    libsqlite3-0 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy only production artifacts from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules

# Expose the mini-server port
EXPOSE 8001

ENV NODE_ENV=production
CMD ["node", "dist/index.js"]
