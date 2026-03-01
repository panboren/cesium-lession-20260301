# 贡献指南

感谢你对 MyAdmin Framework 项目的关注！

## 开发环境设置

1. 克隆仓库
```bash
git clone https://github.com/yourusername/my-admin-framework.git
cd my-admin-framework
```

2. 安装依赖
```bash
npm install
# 或
pnpm install
```

3. 启动开发服务器
```bash
npm run dev
```

4. 启动 Mock 服务器（可选）
```bash
npm run mock
```

5. 同时启动开发服务器和 Mock 服务器
```bash
npm run dev:mock
```

## 提交规范

使用 [Conventional Commits](https://www.conventionalcommits.org/) 规范：

- `feat`: 新功能
- `fix`: 修复 bug
- `docs`: 文档更新
- `style`: 代码格式调整（不影响功能）
- `refactor`: 重构（既不是新功能也不是修复 bug）
- `perf`: 性能优化
- `test`: 测试相关
- `chore`: 构建过程或辅助工具的变动

示例：
```
feat: 添加用户管理功能
fix: 修复登录页面样式问题
docs: 更新 README 文档
```

## 代码规范

项目使用 ESLint + Prettier 进行代码规范检查，提交前请运行：

```bash
npm run lint
npm run format
npm run type-check
```

## 目录结构

```
src/
├── api/           # API 接口
├── assets/        # 静态资源
├── components/    # 全局组件
├── config/        # 配置文件
├── composables/   # 组合式函数
├── directives/    # 自定义指令
├── enums/         # 枚举
├── hooks/         # Hooks
├── layout/        # 布局组件
├── locales/       # 国际化文件
├── plugins/       # 插件配置
├── router/        # 路由
├── store/         # 状态管理
├── styles/        # 样式
├── types/         # 类型定义
├── utils/         # 工具函数
├── views/         # 页面视图
├── App.vue
└── main.ts
```

## 问题反馈

如有问题或建议，请在 [Issues](https://github.com/yourusername/my-admin-framework/issues) 中提交。

## Pull Request 流程

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'feat: Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 创建 Pull Request

## 行为准则

请遵守友善、尊重和包容的行为准则。
