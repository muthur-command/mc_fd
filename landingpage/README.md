# Muthur Command Landing Page

首启引导页前端源码，构建产物供 `landingpage` Go 容器集成。

## 开发

```bash
pnpm install
pnpm dev
```

## 构建

```bash
pnpm build
```

产物输出到 `dist/`，目录结构：

- `index.html`
- `static/images/`、`static/icons/` — 静态资源
- `static/assets/` — Vite 打包的 JS/CSS（由 Go 服务 `/static/` 路由提供）

## 发布

`mc_fd` release 时由 `.github/workflows/release-landingpage-assets.yml` 构建并上传
`muthur_command_frontend_landingpage-<tag>.tar.gz`，`landingpage` 仓库的
`update_frontend.yml` 会下载该包解压到 `rootfs/usr/share/www/`。
