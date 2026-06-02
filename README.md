# Muthur Command Frontend (mc_fd)

Vue 3 + Vite SPA served by nginx in production. MCOS application stack frontend, managed by Supervisor `MCStack`.

[中文](./README-CN.md)

## MCOS integration

| Item | Value |
|------|--------|
| Container name | `mcos_mc_fd` (`supervisor/const.py` `DOCKER_PREFIX`) |
| HTTP port | `80` (`MC_FRONTEND_PORT`) |
| Image | `ghcr.io/muthur-command/muthurcommand-fd` (see `version` repo `images.mc_fd`) |
| OCI label | `io.mcos.type="mc_fd"` |
| Ingress | Supervisor proxies `/mc_fd/web/*` when MC stack is ready |

Landing page static assets for first-boot UI are published from this repo as `muthur_command_frontend_landingpage-*.tar.gz` release assets (consumed by `landingpage/update_frontend.yml`).

## Tech stack

- [Vue 3](https://vuejs.org/) + [Vite](https://vitejs.dev/)
- [shadcn-vue](https://www.shadcn-vue.com) + [Tailwind CSS](https://tailwindcss.com/)
- [Pinia](https://pinia.vuejs.org/) for state

Fork lineage: based on [shadcn-vue-admin](https://github.com/Whbbit1999/shadcn-vue-admin) / [shadcn-admin](https://github.com/satnaing/shadcn-admin); MCOS branding and CI are maintained in `muthur-command/mc_fd`.

## Run locally

```bash
pnpm install
pnpm dev
```

## Build & release

- CI: `.github/workflows/builder.yml` (branch `mc_fd`, `IMAGE_NAME: muthurcommand-fd`)
- Docker: multi-stage `Dockerfile` → nginx serving `/var/www/mc_fd`

## License

[MIT](./LICENSE)
