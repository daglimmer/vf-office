# Combined build: Vite frontend + Node.js adapter in one image
# (alternate path: build from adapter/ directory for CI/CD)
# This file is preserved for reference — see Dockerfile at repo root for the combined build

FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY index.js ./
COPY config/ ./config/
COPY public/ ./public/
COPY sources/ ./sources/

EXPOSE 3000
CMD ["node", "index.js"]
