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
