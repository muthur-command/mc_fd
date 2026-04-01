FROM guergeiro/pnpm:lts-latest-slim AS build

WORKDIR /mc_fd

COPY . .

RUN pnpm install \
    && pnpm build

FROM nginx

COPY scripts/deploy/nginx.conf /etc/nginx/nginx.conf

COPY --from=build /mc_fd/dist /var/www/mc_fd

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]