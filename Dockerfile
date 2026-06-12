FROM node:22-alpine

RUN apk add --no-cache nginx

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN cp vite.config.js public/
RUN npx vite build public --outDir /app/dist --emptyOutDir
RUN cp public/anchors.json /app/dist/ && cp public/waypoints.json /app/dist/ && cp public/office.glb /app/dist/

COPY nginx.conf /app/nginx.conf

RUN mkdir -p /run/nginx /tmp/nginx /app/dist

EXPOSE 5173
CMD ["nginx", "-c", "/app/nginx.conf", "-g", "daemon off;"]
