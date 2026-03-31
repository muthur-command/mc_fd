# Docker 管理前端插件

这是一个用于管理 Docker 容器、镜像、网络、卷和堆栈的前端插件，参照 Portainer 界面设计。

## 功能特性

### 仪表板 (Dashboard)

- 容器统计（总数、运行中、已停止、已暂停）
- 系统信息（Docker版本、操作系统、架构等）
- 磁盘使用情况（镜像、容器、卷、构建缓存）

### 容器管理 (Containers)

- 容器列表（支持显示所有容器）
- 容器详情查看
- 容器操作（启动、停止、重启、删除）
- 容器日志查看
- 容器实时统计（WebSocket连接，显示CPU、内存、网络、I/O使用情况）

### 镜像管理 (Images)

- 镜像列表
- 拉取镜像
- 构建镜像
- 删除镜像

### 网络管理 (Networks)

- 网络列表
- 创建网络（支持多种驱动类型）
- 删除网络

### 卷管理 (Volumes)

- 卷列表
- 创建卷
- 删除卷

### 堆栈管理 (Stacks)

- 堆栈列表
- 部署堆栈（Docker Compose）
- 停止堆栈
- 删除堆栈

## 安装配置

### 1. 菜单配置

由于系统菜单是从数据库加载的，需要在数据库中添加菜单项。有两种方式：

#### 方式一：使用 SQL 脚本（推荐）

执行后端插件目录中的 SQL 脚本，自动创建所有菜单项：

```bash
# MySQL/MariaDB
mysql -u your_user -p your_database < backend/plugin/docker/sql/mysql/init.sql

# PostgreSQL
psql -U your_user -d your_database -f backend/plugin/docker/sql/postgresql/init.sql
```

SQL 脚本位于后端插件目录：`backend/plugin/docker/sql/{mysql|postgresql}/init.sql`

#### 方式二：通过管理界面手动添加

1. 登录系统，进入 **系统管理 > 菜单配置**
2. 添加主菜单：
   - **菜单标题**: Container
   - **路由名称**: PluginDocker
   - **路由路径**: /plugins/docker
   - **菜单类型**: 目录
   - **图标**: mdi:docker
   - **排序**: 100

3. 在 Container 菜单下添加子菜单：

   **仪表板**:
   - 菜单标题: 仪表板
   - 路由名称: PluginDockerDashboard
   - 路由路径: /plugins/docker/dashboard
   - 菜单类型: 菜单
   - 组件路径: /plugins/docker/views/dashboard
   - 图标: mdi:view-dashboard
   - 排序: 1

   **容器**:
   - 菜单标题: 容器
   - 路由名称: PluginDockerContainers
   - 路由路径: /plugins/docker/containers
   - 菜单类型: 菜单
   - 组件路径: /plugins/docker/views/containers/index
   - 图标: mdi:docker
   - 排序: 2

   **镜像**:
   - 菜单标题: 镜像
   - 路由名称: PluginDockerImages
   - 路由路径: /plugins/docker/images
   - 菜单类型: 菜单
   - 组件路径: /plugins/docker/views/images/index
   - 图标: mdi:image-multiple
   - 排序: 3

   **网络**:
   - 菜单标题: 网络
   - 路由名称: PluginDockerNetworks
   - 路由路径: /plugins/docker/networks
   - 菜单类型: 菜单
   - 组件路径: /plugins/docker/views/networks/index
   - 图标: mdi:network
   - 排序: 4

   **卷**:
   - 菜单标题: 卷
   - 路由名称: PluginDockerVolumes
   - 路由路径: /plugins/docker/volumes
   - 菜单类型: 菜单
   - 组件路径: /plugins/docker/views/volumes/index
   - 图标: mdi:database
   - 排序: 5

   **堆栈**:
   - 菜单标题: 堆栈
   - 路由名称: PluginDockerStacks
   - 路由路径: /plugins/docker/stacks
   - 菜单类型: 菜单
   - 组件路径: /plugins/docker/views/stacks/index
   - 图标: mdi:layers
   - 排序: 6

### 2. 权限配置

确保当前用户角色有访问这些菜单的权限。可以在 **系统管理 > 角色管理** 中配置角色权限。

## 路由说明

所有路由都位于 `/plugins/docker` 路径下：

- `/plugins/docker/dashboard` - 仪表板
- `/plugins/docker/containers` - 容器管理
- `/plugins/docker/images` - 镜像管理
- `/plugins/docker/networks` - 网络管理
- `/plugins/docker/volumes` - 卷管理
- `/plugins/docker/stacks` - 堆栈管理

## API 端点

所有 API 调用都通过 `/api/v1/docker/` 路径，具体接口请参考后端插件的 README.md。

## 注意事项

1. 确保后端 Docker 插件已正确安装并启用
2. 确保运行后端的用户有权限访问 Docker（通常需要加入 docker 组）
3. WebSocket 连接需要确保后端支持 WebSocket 协议
4. 菜单配置中的 `name` 字段必须与路由配置中的 `name` 完全匹配
5. 组件路径必须与实际文件路径匹配（相对于 `src` 目录）

## 技术栈

- Vue 3
- TypeScript
- Ant Design Vue
- Vben Admin Framework
- WebSocket (用于实时监控)
