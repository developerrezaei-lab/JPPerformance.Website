FROM node:22-alpine AS build
WORKDIR /build
COPY platform/Portal/package*.json ./
RUN npm ci
COPY platform/Portal/ ./
# Shared authentication module is bundled by Vite from the repository source tree.
COPY site/assets/auth-client.js /site/assets/auth-client.js
RUN npm run build
FROM nginxinc/nginx-unprivileged:stable-alpine
COPY --from=build /build/dist/ /opt/portal/
