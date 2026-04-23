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
COPY scripts/deploy/nginx.docker.conf /etc/nginx/nginx.conf
COPY --from=build /mc_fd/dist /var/www/mc_fd

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
