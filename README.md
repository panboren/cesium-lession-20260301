# Cesium 3D GIS 平台

基于 **Vue 3 + TypeScript + Vite + Cesium** 构建的现代化 3D GIS 平台。

## 技术栈

- **Vue**: 3.5.13
- **TypeScript**: 5.6.3
- **Vite**: 6.0.3
- **Cesium**: 1.114.0
- **Element Plus**: 2.9.1
- **UnoCSS**: 0.65.0
- **Pinia**: 3.0.1
- **Axios**: 最新
- **Day.js**: 最新
- **Lodash-es**: 最新

## 快速开始

```bash
# 安装依赖
npm install

# 配置 Cesium Ion Token（可选）
# 编辑 .env.cesium 文件，替换 VITE_CESIUM_ION_TOKEN 为您的 Token
# 申请地址: https://cesium.com/ion/tokens

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build

# 预览生产构建
npm run preview
```

## 项目结构

```
src/
├── api/                # API 接口层
│   ├── axios.ts       # Axios 配置
│   ├── map.ts         # 地图相关 API
│   └── index.ts       # 统一导出
├── cesium/             # Cesium 核心模块
│   ├── core/          # Cesium 管理器（cesiumManager, layerManager, drawManager）
│   ├── components/    # Cesium 组件
│   └── index.ts       # 模块入口
├── components/         # 全局组件
├── layout/            # 布局组件
├── router/            # 路由配置
├── store/             # 状态管理
│   └── modules/
│       ├── app.ts    # 应用状态
│       └── cesium.ts # Cesium 状态
├── styles/            # 样式文件
├── types/             # TypeScript 类型定义
│   ├── cesium.ts      # Cesium 类型
│   ├── cesium-extended.d.ts  # Cesium 扩展类型
│   └── index.d.ts    # 通用类型
├── utils/             # 工具函数
├── views/             # 页面
│   └── Map3D/        # 3D 地图页面
├── App.vue            # 根组件
└── main.ts            # 入口文件
```

## 核心功能

- Cesium 3D 地球引擎
- 图层管理（影像、地形、矢量）
- 绘图工具（点、线、面、圆、矩形）
- 相机控制
- 暗黑模式支持
- 状态管理（Pinia）
- API 封装（Axios）
- 路由懒加载

## 架构优化（企业级标准）

### 已完成优化

1. **代码质量优化**
   - ✅ 修复 vite.config.ts 重复导出
   - ✅ 移除硬编码的 Cesium Ion Token
   - ✅ 清理生产环境 console.log（使用 logger 工具）
   - ✅ 减少 `any` 类型使用（types、utils 优化）
   - ✅ 创建 Cesium 扩展类型定义

2. **性能优化**
   - ✅ Element Plus 图标按需导入
   - ✅ 路由懒加载配置
   - ✅ 安装缺失依赖（axios、dayjs、lodash-es）
   - ✅ 更新 vite.config.ts 优化配置

3. **架构优化**
   - ✅ 全局单例管理器使用模块私有变量（防止外部修改）
   - ✅ 创建 API 层（axios 配置、map 接口）
   - ✅ 创建 Cesium 状态管理模块
   - ✅ 补充类型定义

## 其他命令

```bash
# 代码检查
npm run lint

# 代码格式化
npm run format

# 类型检查
npm run type-check
```

## 浏览器支持

- Chrome >= 87
- Firefox >= 78
- Safari >= 14
- Edge >= 88

## 许可证

MIT License

