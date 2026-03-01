# MyAdmin 管理系统框架

基于 Vue 3 + TypeScript + Vite + Element Plus + Pinia 构建的现代化企业级管理系统框架。

## 特性

- 🎨 **现代化技术栈**: Vue 3 Composition API + TypeScript + Vite
- 📦 **开箱即用**: 完整的项目结构和配置
- 🔐 **权限管理**: 基于角色的权限控制系统
- 🌍 **国际化**: 支持多语言切换
- 📱 **响应式**: 适配移动端和桌面端
- 🎯 **主题定制**: 支持暗黑模式和自定义主题
- 🚀 **高性能**: 基于 Vite 的极速开发体验
- 📦 **组件丰富**: 封装了大量常用组件
- 🔧 **工具完善**: 完整的工具函数和 Hooks

## 技术栈

- **框架**: Vue 3.5.13
- **语言**: TypeScript 5.6.3
- **构建**: Vite 6.0.3
- **UI库**: Element Plus 2.9.1
- **状态管理**: Pinia 2.3.0
- **路由**: Vue Router 4.5.0
- **HTTP**: Axios 1.7.9
- **样式**: SCSS + UnoCSS
- **工具**: VueUse, dayjs, lodash-es

## 项目结构

```
my-admin-framework/
├── public/                 # 静态资源
├── src/
│   ├── api/               # API 接口
│   ├── assets/            # 资源文件
│   ├── components/        # 全局组件
│   ├── config/            # 配置文件
│   ├── composables/       # 组合式函数
│   ├── directives/        # 自定义指令
│   ├── hooks/             # Hooks
│   ├── layout/            # 布局组件
│   ├── locales/           # 国际化
│   ├── plugins/           # 插件配置
│   ├── router/            # 路由配置
│   ├── store/             # 状态管理
│   ├── styles/            # 样式文件
│   ├── types/             # 类型定义
│   ├── utils/             # 工具函数
│   ├── views/             # 页面视图
│   ├── App.vue            # 根组件
│   ├── main.ts            # 入口文件
│   └── env.d.ts           # 环境变量类型
├── .env                   # 环境变量
├── .env.dev              # 开发环境
├── .env.prod             # 生产环境
├── .gitignore
├ ├── eslint.config.mjs    # ESLint 配置
├ ├── prettier.config.mjs  # Prettier 配置
├ ├── tsconfig.json       # TypeScript 配置
├ ├── uno.config.ts       # UnoCSS 配置
├ ├── vite.config.ts      # Vite 配置
└── package.json           # 依赖配置
```

## 快速开始

### 安装依赖

```bash
npm install
```

### 开发模式

```bash
npm run dev
```

### 构建生产版本

```bash
npm run build
```

### 预览生产构建

```bash
npm run preview
```

### 代码检查

```bash
npm run lint
```

### 代码格式化

```bash
npm run format
```

## 核心功能

### 1. 路由系统

- 静态路由和动态路由
- 路由权限控制
- 路由守卫
- 面包屑导航

### 2. 状态管理

- 用户状态管理
- 权限状态管理
- 应用状态管理
- 标签页状态管理

### 3. API 封装

- Axios 封装
- 请求/响应拦截
- Token 自动处理
- 错误统一处理
- 文件上传/下载

### 4. 组件封装

- 表格组件
- 表单组件
- 对话框组件
- 分页组件
- 图片预览组件

### 5. 工具函数

- 认证工具
- 字典工具
- 加密工具
- 下载工具
- 权限工具
- 表单验证

### 6. Hooks

- useTable - 表格管理
- useMessage - 消息提示
- useCache - 缓存管理
- useCrudSchemas - CRUD 模式

## 开发规范

### 命名规范

- **组件**: PascalCase (如: `UserTable.vue`)
- **文件**: kebab-case (如: `user-table.ts`)
- **变量**: camelCase (如: `userName`)
- **常量**: UPPER_SNAKE_CASE (如: `API_BASE_URL`)

### 代码风格

- 使用 ESLint + Prettier 进行代码检查
- 遵循 Vue 3 Composition API 最佳实践
- 使用 TypeScript 类型定义

### 提交规范

使用语义化提交信息:

- `feat:` 新功能
- `fix:` 修复 Bug
- `docs:` 文档更新
- `style:` 代码格式调整
- `refactor:` 重构
- `test:` 测试
- `chore:` 构建/工具链更新

## 浏览器支持

- Chrome >= 87
- Firefox >= 78
- Safari >= 14
- Edge >= 88

## 许可证

MIT License

## 贡献

欢迎提交 Issue 和 Pull Request!
