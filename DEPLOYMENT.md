# 部署指南

## 构建优化

### 1. 代码分割
项目已配置智能代码分割策略：
- **Vue 核心库** (`vue-vendor`): vue, vue-router, pinia
- **UI 库** (`element-plus`): Element Plus 相关
- **图表库** (`echarts`): ECharts 及插件
- **工具库** (`utils`): lodash, dayjs, axios 等
- **编辑器** (`editor`): 富文本编辑器
- **业务模块** (`views-*`): 按页面模块分割

### 2. 图片优化
- 自动压缩图片（JPEG, PNG, GIF, SVG）
- 生成 WebP 格式（比原格式小 25-35%）
- 压缩配置：
  - JPEG: 质量 80%
  - PNG: 质量 60-80%
  - SVG: 移除无用属性

### 3. Gzip/Brotli 压缩
- 同时生成 `.gz` 和 `.br` 文件
- Brotli 比 Gzip 压缩率更高 14-20%
- 阈值：10KB 以上的文件才压缩

### 4. 构建体积分析
运行以下命令查看打包体积分析：
```bash
npm run build:analyze
```
会生成 `dist/stats.html` 文件，可视化显示各模块体积。

## 部署流程

### 1. 构建生产版本
```bash
npm run build:prod
```

### 2. Nginx 配置示例
```nginx
server {
    listen 80;
    server_name example.com;

    root /var/www/my-admin-framework/dist;
    index index.html;

    # 开启 Gzip 压缩
    gzip on;
    gzip_vary on;
    gzip_min_length 1k;
    gzip_comp_level 6;
    gzip_types text/plain text/css text/xml application/json application/javascript application/xml+rss application/rss+xml font/truetype font/opentype application/vnd.ms-fontobject image/svg+xml;

    # 开启 Brotli 压缩（需要安装 ngx_brotli 模块）
    brotli on;
    brotli_comp_level 6;
    brotli_types text/plain text/css application/json application/javascript application/xml+rss text/xml application/xml application/xhtml+xml image/svg+xml;

    # 静态资源缓存
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # HTML 文件不缓存
    location ~* \.html$ {
        add_header Cache-Control "no-cache, no-store, must-revalidate";
    }

    # 路由回退（Vue Router history 模式）
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

### 3. 使用 CDN 加速（可选）

#### 步骤 1: 上传静态资源到 CDN
将 `dist/assets` 目录上传到你的 CDN。

#### 步骤 2: 配置 CDN 地址
修改 `.env.prod`:
```bash
VITE_CDN_URL=https://cdn.example.com/assets
```

#### 步骤 3: 配置 vite.config.ts 添加 CDN 支持
```typescript
build: {
  rollupOptions: {
    output: {
      // 添加 CDN 前缀
      assetFileNames: 'https://cdn.example.com/assets/[ext]/[name]-[hash].[ext]'
    }
  }
}
```

## 性能优化建议

### 1. 路由懒加载
所有页面组件已使用动态导入：
```typescript
component: () => import('@/views/Home/index.vue')
```

### 2. 组件懒加载
对于大型组件，使用 `defineAsyncComponent`:
```typescript
import { defineAsyncComponent } from 'vue'

const HeavyComponent = defineAsyncComponent(() => import('./HeavyComponent.vue'))
```

### 3. 图片懒加载
使用 `loading="lazy"` 属性：
```html
<img loading="lazy" src="image.jpg" alt="description">
```

### 4. 预加载关键资源
在 `index.html` 中添加：
```html
<link rel="preload" href="/js/vue-vendor-[hash].js" as="script">
<link rel="preload" href="/css/index-[hash].css" as="style">
```

### 5. Service Worker 离线缓存
安装 `vite-plugin-pwa` 并配置：
```bash
npm install -D vite-plugin-pwa workbox-window
```

## 监控与分析

### Lighthouse 评分
使用 Chrome DevTools 的 Lighthouse 分析：
1. 打开 Chrome DevTools (F12)
2. 切换到 Lighthouse 标签
3. 点击 Generate report

### 性能指标
- **FCP** (First Contentful Paint): < 1.8s
- **LCP** (Largest Contentful Paint): < 2.5s
- **TTI** (Time to Interactive): < 3.8s
- **CLS** (Cumulative Layout Shift): < 0.1

### 错误监控
集成 Sentry 进行错误监控：
```bash
npm install @sentry/vue @sentry/tracing
```

## SEO 优化

1. robots.txt 已配置
2. 可在 `index.html` 中添加 meta 标签：
```html
<meta name="description" content="管理系统描述">
<meta name="keywords" content="关键词">
<meta property="og:title" content="标题">
<meta property="og:description" content="描述">
```

## 安全配置

### 1. 内容安全策略 (CSP)
```nginx
add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https:;";
```

### 2. HTTPS
强制使用 HTTPS：
```nginx
if ($scheme != "https") {
    return 301 https://$host$request_uri;
}
```
