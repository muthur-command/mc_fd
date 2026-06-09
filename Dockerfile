# syntax=docker/dockerfile:1.7
# Multi-stage: minimal runtime (nginx:alpine) + reproducible deps (frozen lockfile).

FROM node:20-alpine AS deps
WORKDIR /mc_fd
RUN corepack enable

COPY package.json pnpm-lock.yaml ./

RUN --mount=type=cache,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile --ignore-scripts

FROM deps AS build
WORKDIR /mc_fd
COPY . .

RUN --mount=type=cache,target=/root/.local/share/pnpm/store \
    pnpm build

FROM nginx:1.27-alpine AS runtime
LABEL \
    io.mcos.type="mc_fd" \
    org.opencontainers.image.title="Muthur Command Frontend (nginx)" \
    org.opencontainers.image.description="Static SPA served by nginx for Muthur Command"
ENV MC_BACKEND_HOST=mc_bd \
    MC_BACKEND_PORT=8001
COPY scripts/deploy/nginx.docker.conf.template /etc/nginx/nginx.conf.template
COPY scripts/deploy/docker-entrypoint.d/40-render-nginx-conf.sh /docker-entrypoint.d/40-render-nginx-conf.sh
RUN chmod +x /docker-entrypoint.d/40-render-nginx-conf.sh
COPY --from=build /mc_fd/dist /var/www/mc_fd

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
