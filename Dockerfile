# syntax=docker/dockerfile:1.7
FROM docker.io/library/node:22-alpine AS build

WORKDIR /app
COPY package.json package-lock.json ./
RUN --mount=type=cache,id=silabos-frontend-npm,target=/root/.npm \
    npm ci --prefer-offline --no-audit
COPY . .
ARG VITE_API_URL=""
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build:deploy

FROM docker.io/library/nginx:1.27-alpine

COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY docker/security-headers.conf.template /opt/silabos/security-headers.conf.template
COPY docker/config.js.template /opt/silabos/config.js.template
COPY docker/runtime-config.sh /docker-entrypoint.d/40-silabos-runtime-config.sh
COPY --from=build /app/dist /usr/share/nginx/html
RUN chmod +x /docker-entrypoint.d/40-silabos-runtime-config.sh

EXPOSE 8080
HEALTHCHECK --interval=15s --timeout=3s --start-period=5s --retries=3 \
    CMD wget -qO- http://127.0.0.1:8080/health/live >/dev/null || exit 1
