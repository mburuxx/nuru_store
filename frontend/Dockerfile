# frontend/Dockerfile - multi-stage build for React app served by nginx
FROM node:18-alpine as build
WORKDIR /app

COPY frontend/package*.json ./
# Try a clean CI install; fall back to `npm install` if lockfile and package.json are out of sync
RUN npm ci || npm install --no-audit --no-fund --silent
COPY frontend/ .
RUN npm run build

FROM nginx:stable-alpine
COPY --from=build /app/build /usr/share/nginx/html
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
