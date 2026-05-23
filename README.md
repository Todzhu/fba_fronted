<div align="center">

# BioCloud Frontend

基于 Vue Vben Admin 的生物信息分析云平台前端

简体中文

[![Vue](https://img.shields.io/badge/Vue-3.5%2B-4FC08D)](https://vuejs.org/) [![Ant Design Vue](https://img.shields.io/badge/Ant%20Design%20Vue-4.x-1890ff)](https://antdv.com/) [![Vite](https://img.shields.io/badge/Vite-6.x-646CFF)](https://vitejs.dev/) [![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6)](https://www.typescriptlang.org/) [![pnpm](https://img.shields.io/badge/pnpm-10%2B-F69220)](https://pnpm.io/)

</div>

---

## 📖 项目简介

BioCloud Frontend 是一个面向生物信息学的企业级分析云平台前端，基于 [Vue Vben Admin](https://github.com/vbenjs/vue-vben-admin) 构建。提供完整的用户界面，包括云端分析工具、任务管理、数据管理、系统管理等功能模块。

### 核心特性

- 🚀 **现代技术栈** - Vue 3 + TypeScript + Vite 6，极致的开发体验
- 🎨 **Ant Design Vue** - 企业级 UI 组件库，美观且功能丰富
- ⚡ **高效分析工具** - 配置驱动的分析工具界面，支持动态表单和结果可视化
- 📊 **可视化图表** - 集成 ECharts，支持火山图、PCA、热图等生物信息图表
- 📱 **响应式布局** - 适配桌面端和移动端
- 🔐 **完整权限** - JWT Token + 动态路由 + RBAC 权限控制

---

## 🏗️ 项目架构

### Monorepo 结构

```
fronted/
├── apps/
│   └── web-antdv-next/     # 主应用（Ant Design Vue）
│       ├── src/
│       │   ├── api/        # API 接口封装
│       │   ├── router/     # 路由配置
│       │   ├── store/      # Pinia 状态管理
│       │   └── views/      # 页面视图
│       │       ├── biocloud/     # BioCloud 业务页面
│       │       ├── dashboard/    # 仪表盘
│       │       ├── system/       # 系统管理
│       │       └── ...
│       └── public/         # 静态资源
├── packages/               # 共享包
│   ├── @vben/common-ui/    # 通用组件
│   ├── @vben/hooks/        # Vue Hooks
│   ├── @vben/request/      # HTTP 请求封装
│   └── ...
└── internal/               # 内部工具
```

### 核心模块

| 模块          | 说明                                        |
| ------------- | ------------------------------------------- |
| `biocloud/cloudTools/` | 云端分析工具 - 动态表单、结果展示、任务管理 |
| `biocloud/myData/`     | 我的数据 - 文件上传、数据管理               |
| `biocloud/task/`       | 我的任务 - 任务列表、状态追踪               |
| `biocloud/pipeline/`   | 单细胞流程 - 可视化流程编排                 |
| `system/`              | 系统管理 - 用户、角色、菜单、工具配置等     |

---

## 🚀 快速开始

### 环境要求

- Node.js 20.10+
- pnpm 9.12+

### 安装步骤

**1. 进入前端目录**

```bash
cd fronted
```

**2. 安装依赖**

```bash
pnpm install
```

**3. 配置环境变量**

```bash
# 按需从开发环境配置初始化本地配置
cp apps/web-antdv-next/.env.development apps/web-antdv-next/.env

# 修改 API 地址
# VITE_GLOB_API_URL=http://127.0.0.1:8000
```

**4. 启动开发服务器**

```bash
# 启动 Ant Design Vue 版本
pnpm dev:antd
```

访问 `http://localhost:5173`

---

## 📦 构建部署

### 生产构建

```bash
# 构建
pnpm build:antd

# 预览构建结果
pnpm preview
```

构建产物位于 `apps/web-antdv-next/dist/` 目录。

### Docker 部署

```bash
# 使用 Docker Compose
docker-compose up -d
```

---

## 🔧 功能模块

### 云端分析工具 (CloudTools)

配置驱动的生物信息分析工具界面：

- **动态表单** - 根据工具配置自动渲染输入表单
- **数据输入** - 支持表格编辑、文件上传、示例数据加载
- **结果可视化** - ECharts 图表、图片预览、表格、PDF 查看
- **任务管理** - 实时任务状态、进度追踪

### 我的数据 (MyData)

个人数据管理中心：

- **文件上传** - 支持大文件分片上传
- **文件夹管理** - 树形目录结构
- **文件预览** - CSV、图片、文本预览

### 系统管理 (System)

后台管理功能：

- **用户管理** - 用户 CRUD、状态管理
- **角色管理** - RBAC 权限配置
- **菜单管理** - 动态菜单配置
- **工具管理** - 分析工具配置（JSON Schema 可视化编辑）

---

## 🛠️ 开发指南

### 添加新页面

1. 在 `apps/web-antdv-next/src/views/` 下创建页面组件
2. 在 `apps/web-antdv-next/src/router/routes/modules/` 中添加路由
3. 在后台菜单管理中配置菜单权限

### 添加新 API

在 `apps/web-antdv-next/src/api/` 目录下添加接口文件：

```typescript
import { requestClient } from '#/api/request';

export async function getMyData() {
  return requestClient.get('/api/v1/my-endpoint');
}
```

### 代码规范

```bash
# 代码格式化
pnpm format

# ESLint 检查
pnpm lint

# 类型检查
pnpm check:type
```

---

## 📄 许可证

本项目基于 [MIT](./LICENSE) 许可证开源。

---

## 🔗 相关链接

- [后端项目](../backend/README.md)
- [Vue Vben Admin 文档](https://www.vben.pro/)
- [Ant Design Vue 文档](https://antdv.com/)
- [Vue 3 文档](https://vuejs.org/)
