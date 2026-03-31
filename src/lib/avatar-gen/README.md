# Avatar-gen 集成

基于 [wave-charts/avatar-gen](https://github.com/wave-charts/avatar-gen) 的图层式头像生成逻辑，已移植为 Vue 3 可用的组件与工具。

## 功能

- **确定性生成**：相同 `seed`（如用户名）始终得到相同头像
- **图层组合**：背景、头部、五官、头发、服装等图层按权重随机组合
- **纯前端**：SVG 资源来自 `public/avatar-gen/resource/`，无后端请求

## 目录说明

- `interface/` - 类型定义（图层、颜色、性别等）
- `config/` - 图层列表（refs）与各图层素材配置（layerItemConfigs）、色板（avaiable-colors）
- `utils/` - 播种随机数（seedRandom）、按权重抽样（getRandomInArr）
- `createAvatar.ts` - 生成入口：`createAvatar({ seed, size?, gender? })` 返回 SVG 字符串

## 资源更新

SVG 资源位于 `public/avatar-gen/resource/`，来自 avatar-gen 仓库的 `src/views/AvatarCreator/resource/`。若需更新：

```bash
git clone --depth 1 https://github.com/wave-charts/avatar-gen.git /tmp/avatar-gen
cp -r /tmp/avatar-gen/src/views/AvatarCreator/resource <本项目>/shadcn-vue-admin/public/avatar-gen/
```

## 使用

- 组件：`@/components/avatar-generated.vue`，传入 `name`（seed）、`size` 即可
- 编程：`import { createAvatar } from '@/lib/avatar-gen/createAvatar'`，`await createAvatar({ seed: 'user123', size: 120 })`
