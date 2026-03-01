/**
 * 路由配置
 * Cesium 3D GIS 平台 - 简化版，只保留 Map3D 页面
 */

import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'

// 静态路由 - 仅保留 Map3D
const routes: RouteRecordRaw[] = [
  {
    path: '/',
    redirect: '/map3d'
  },
  {
    path: '/map3d',
    name: 'Map3D',
    component: () => import('@/views/Map3D/index.vue'),
    meta: {
      title: '3D 地图'
    }
  }
]

const router = createRouter({
  history: createWebHistory(import.meta.env.VITE_BASE_PATH || ''),
  strict: true,
  routes,
  scrollBehavior: () => ({ top: 0 })
})

export default router
