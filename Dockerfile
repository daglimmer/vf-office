# Combined build: Vite frontend + Node.js adapter in one image
# Serves both static assets and API/WS on port 3000

# === Stage 1: Build Vite frontend ===
FROM node:22-alpine AS builder

WORKDIR /build
COPY package*.json ./
RUN npm install

COPY . .
RUN cp vite.config.js public/ && \
    npx vite build public --base=/office/ --outDir /app/dist --emptyOutDir && \
    cp public/anchors.json /app/dist/ && \
    cp public/waypoints.json /app/dist/ && \
    cp public/office.glb /app/dist/ 2>/dev/null; true

# === Stage 2: Adapter with frontend ===
FROM node:22-alpine

WORKDIR /app

# Install adapter dependencies
COPY adapter/package*.json ./
RUN npm install

# Copy adapter source
COPY adapter/index.js ./
COPY adapter/config/ ./config/
COPY adapter/sources/ ./sources/

# Copy built frontend from builder
COPY --from=builder /app/dist ./public/

EXPOSE 3000
CMD ["node", "index.js"]
