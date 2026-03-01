/**
 * 路由配置
 * 完全参考 yudao-ui-admin-vue3 实现
 */

import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'

// 静态路由
const remainingRouter: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/Login/index.vue'),
    meta: {
      hidden: true,
      title: '登录'
    }
  },
  {
    path: '/404',
    name: 'NotFound',
    component: () => import('@/views/Error/404.vue'),
    meta: {
      hidden: true,
      title: '404'
    }
  },
  {
    path: '/403',
    name: 'NoAccess',
    component: () => import('@/views/Error/403.vue'),
    meta: {
      hidden: true,
      title: '403'
    }
  },

  {
    path: '/',
    redirect: '/home',
  },
  {
    path: '/home',
    name: 'Home',
    component: () => import('@/views/Home/index.vue'),
    meta: {
      title: '首页',
      icon: 'HomeFilled'
    },
  }
]

const router = createRouter({
  history: createWebHistory(import.meta.env.VITE_BASE_PATH || ''),
  strict: true,
  routes: remainingRouter,
  scrollBehavior: () => ({ top: 0 })
})

/**
 * 重置路由
 */
export const resetRouter = () => {
  const resetWhiteNameList = ['Login', 'NotFound', 'NoAccess', 'Home']
  router.getRoutes().forEach((route) => {
    const { name } = route
    if (name && !resetWhiteNameList.includes(name as string)) {
      router.removeRoute(name as string)
    }
  })
}

export default router
