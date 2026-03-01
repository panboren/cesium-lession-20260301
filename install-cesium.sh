#!/bin/bash

# Cesium GIS 平台 - 安装脚本

echo "=========================================="
echo "  Cesium GIS 平台 - 安装脚本"
echo "=========================================="
echo ""

# 检查 Node.js 版本
echo "📦 检查 Node.js 版本..."
NODE_VERSION=$(node -v)
echo "当前 Node.js 版本: $NODE_VERSION"

# 检查 npm 版本
echo "📦 检查 npm 版本..."
NPM_VERSION=$(npm -v)
echo "当前 npm 版本: $NPM_VERSION"

# 检查 pnpm（可选）
if command -v pnpm &> /dev/null; then
    echo "✅ 检测到 pnpm"
    PNPM_VERSION=$(pnpm -v)
    echo "当前 pnpm 版本: $PNPM_VERSION"
    USE_PNPM=true
else
    echo "⚠️  未检测到 pnpm，将使用 npm"
    USE_PNPM=false
fi

echo ""
echo "=========================================="
echo "  开始安装依赖..."
echo "=========================================="
echo ""

# 安装依赖
if [ "$USE_PNPM" = true ]; then
    echo "🚀 使用 pnpm 安装依赖..."
    pnpm install
else
    echo "🚀 使用 npm 安装依赖..."
    npm install
fi

echo ""
echo "=========================================="
echo "  安装完成！"
echo "=========================================="
echo ""

# 检查 Cesium 依赖是否安装成功
echo "📋 检查 Cesium 依赖..."
if [ -d "node_modules/cesium" ]; then
    echo "✅ Cesium 安装成功"
else
    echo "❌ Cesium 安装失败"
    exit 1
fi

if [ -d "node_modules/vite-plugin-cesium" ]; then
    echo "✅ vite-plugin-cesium 安装成功"
else
    echo "❌ vite-plugin-cesium 安装失败"
    exit 1
fi

echo ""
echo "=========================================="
echo "  配置说明"
echo "=========================================="
echo ""
echo "1. 配置 Cesium Ion Token（可选）:"
echo "   编辑 .env.cesium 文件"
echo "   VITE_CESIUM_ION_TOKEN=your_token_here"
echo ""
echo "2. 获取 Cesium Ion Token:"
echo "   访问: https://cesium.com/ion/tokens"
echo ""
echo "3. 启动开发服务器:"
echo "   npm run dev"
echo ""
echo "4. 访问 3D 地图:"
echo "   http://localhost:5173/map3d"
echo ""
echo "=========================================="
echo "  详细文档"
echo "=========================================="
echo ""
echo "- 快速开始: docs/CESIUM_GUIDE.md"
echo "- 安装指南: docs/INSTALLATION.md"
echo "- 升级总结: docs/UPGRADE_SUMMARY.md"
echo "- 架构方案: docs/architecture-upgrade-plan.md"
echo ""
echo "=========================================="
echo "  安装完成！"
echo "=========================================="
