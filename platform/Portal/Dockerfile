FROM node:22-alpine AS build
WORKDIR /build
COPY platform/Portal/package*.json ./
RUN npm ci
COPY platform/Portal/ ./
RUN npm run build
FROM nginxinc/nginx-unprivileged:stable-alpine
COPY --from=build /build/dist/ /opt/portal/
