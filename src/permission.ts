/**
 * 路由守卫
 * Cesium 3D GIS 平台 - 简化版，无需登录验证
 */

import router from '@/router'
import NProgress from 'nprogress'
import 'nprogress/nprogress.css'

NProgress.configure({
  showSpinner: false,
  easing: 'ease',
  speed: 500,
  trickleSpeed: 200,
  minimum: 0.3
})

router.beforeEach((to, from, next) => {
  NProgress.start()
  next()
})

router.afterEach((to) => {
  NProgress.done()

  if (to.meta?.title) {
    document.title = `${to.meta.title} - ${import.meta.env.VITE_APP_TITLE || 'ZOOOW Cesium 3D GIS 平台'}`
  }

  window.scrollTo(0, 0)
})

router.onError((error) => {
  console.error('路由错误:', error)
  NProgress.done()
})

export default router

