# 开发指南

## 开发环境设置

### 1. 安装依赖
```bash
# 使用 npm
npm install

# 使用 pnpm（推荐）
pnpm install

# 使用 yarn
yarn install
```

### 2. 启动开发服务器
```bash
# 仅启动 Vite 开发服务器
npm run dev

# 同时启动 Mock 服务器和 Vite
npm run dev:mock
```

### 3. 构建项目
```bash
# 开发环境构建
npm run build:dev

# 测试环境构建
npm run build:test

# 预发布环境构建
npm run build:staging

# 生产环境构建
npm run build:prod

# 构建并分析体积
npm run build:analyze
```

## 代码规范

### 代码风格
项目使用 ESLint + Prettier 进行代码格式化：

```bash
# 修复代码问题
npm run lint

# 检查代码问题（不修复）
npm run lint:check

# 格式化代码
npm run format

# 检查格式（不修改）
npm run format:check
```

### TypeScript 检查
```bash
# 类型检查
npm run type-check
```

## 项目结构

```
src/
├── api/           # API 接口
├── assets/        # 静态资源
├── components/    # 全局组件
├── config/        # 配置文件
├── composables/   # 组合式函数
├── directives/    # 自定义指令
├── enums/         # 枚举定义
├── hooks/         # Hooks
├── i18n/          # 国际化
├── layout/        # 布局组件
├── locales/       # 语言包
├── plugins/       # 插件
├── router/        # 路由
├── store/         # 状态管理
├── styles/        # 样式
├── types/         # 类型定义
├── utils/         # 工具函数
├── views/         # 页面
├── App.vue        # 根组件
├── main.ts        # 入口文件
└── permission.ts  # 路由守卫
```

## 开发最佳实践

### 1. 组件开发
- 使用 `<script setup>` 语法
- 组件命名使用 PascalCase
- Props 使用 TypeScript 类型定义
- Emits 使用 TypeScript 类型定义

### 2. 状态管理
- 使用 Pinia 管理状态
- 按功能模块拆分 store
- 使用 `persist` 选项持久化状态

### 3. 路由管理
- 静态路由在 `router/index.ts` 定义
- 动态路由由后端返回，在 `permission.ts` 处理
- 使用路由懒加载优化性能

### 4. API 调用
- 统一使用 `@/config/axios` 封装的请求方法
- 错误处理由拦截器统一处理
- 支持请求取消、重试、刷新 Token

### 5. 样式开发
- 使用 SCSS 预处理器
- 遵循 BEM 命名规范
- 优先使用 UnoCSS 原子类

## Git 提交规范

使用语义化提交信息：

```
feat: 新功能
fix: 修复 Bug
docs: 文档更新
style: 代码格式调整
refactor: 重构
perf: 性能优化
test: 测试
chore: 构建/工具链更新
```

## 常见问题

### 1. 启动失败
- 检查 Node.js 版本（>= 18.0.0）
- 删除 `node_modules` 重新安装
- 清除缓存：`rm -rf .vite`

### 2. 类型错误
- 运行 `npm run type-check` 查看具体错误
- 检查 `tsconfig.json` 配置
- 重启 TypeScript 服务

### 3. 样式不生效
- 检查 `styles/variables.scss` 是否正确导入
- 检查 UnoCSS 配置
- 清除浏览器缓存

## 性能优化

### 1. 组件懒加载
```typescript
const AsyncComponent = defineAsyncComponent(() =>
  import('./components/AsyncComponent.vue')
)
```

### 2. 图片优化
使用 `OptimizedImage` 组件自动优化图片：
```vue
<OptimizedImage
  src="/path/to/image.jpg"
  alt="描述"
  :lazy="true"
/>
```

### 3. 代码分割
- 路由按模块分割
- 第三方库独立打包
- 使用 `vite-plugin-compression` 压缩

## 调试技巧

### 1. Vue DevTools
安装 Vue DevTools 浏览器扩展调试 Vue 应用

### 2. Vite 调试
```bash
# 启用调试日志
DEBUG=vite:* npm run dev
```

### 3. Network 调试
查看 Network 面板，检查 API 请求和响应
