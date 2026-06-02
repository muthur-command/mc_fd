# Muthur Command Frontend (mc_fd)

Vue 3 + Vite 单页应用，生产环境由 nginx 提供静态资源。MCOS 应用栈前端，由 Supervisor `MCStack` 管理。

## MCOS 集成契约

| 项 | 值 |
|----|-----|
| 容器名 | `mcos_mc_fd`（`supervisor/const.py` `DOCKER_PREFIX`） |
| HTTP 端口 | `80`（`MC_FRONTEND_PORT`） |
| 镜像 | `ghcr.io/muthur-command/muthurcommand-fd`（见 `version` 仓 `images.mc_fd`） |
| OCI 标签 | `io.mcos.type="mc_fd"` |
| Ingress | MC 栈就绪后 Supervisor 代理 `/mc_fd/web/*` |

首启引导页静态资源以 release 资产 `muthur_command_frontend_landingpage-*.tar.gz` 发布，供 `landingpage/update_frontend.yml` 拉取。

## 技术栈

- [Vue 3](https://cn.vuejs.org/) + [Vite](https://cn.vitejs.dev/)
- [shadcn-vue](https://www.shadcn-vue.com) + [Tailwind CSS](https://tailwindcss.com/)
- [Pinia](https://pinia.vuejs.org/) 状态管理

Fork 来源：[shadcn-vue-admin](https://github.com/Whbbit1999/shadcn-vue-admin)；MCOS 品牌与 CI 在 `muthur-command/mc_fd` 维护。

## 本地开发

```bash
pnpm install
pnpm dev
```

## 构建与发布

- CI：`.github/workflows/builder.yml`（默认分支 `mc_fd`，`IMAGE_NAME: muthurcommand-fd`）
- Docker：多阶段 `Dockerfile`，nginx 托管 `/var/www/mc_fd`

## 许可证

[MIT](./LICENSE)
