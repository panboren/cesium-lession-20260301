/**
 * 路由守卫
 * 参考 yudao-ui-admin-vue3 实现
 */

import router from '@/router'
import type { RouteRecordRaw } from 'vue-router'
import { getAccessToken } from '@/utils/auth'
import { useUserStoreWithOut } from '@/store/modules/user'
import { usePermissionStoreWithOut } from '@/store/modules/permission'
import { PageEnum } from '@/enums/pageEnum'
import { ElMessage } from 'element-plus'
import NProgress from 'nprogress'
import 'nprogress/nprogress.css'

NProgress.configure({
  showSpinner: false,
  easing: 'ease',
  speed: 500,
  trickleSpeed: 200,
  minimum: 0.3
})

const whiteList = ['/login', '/404', '/403', '/redirect','/home']

router.beforeEach(async (to, from, next) => {
  NProgress.start()

  const token = getAccessToken()

  if (token) {
    if (to.path === PageEnum.LOGIN) {
      next({ path: PageEnum.INDEX, replace: true })
      NProgress.done()
    } else {
      const userStore = useUserStoreWithOut()
      const permissionStore = usePermissionStoreWithOut()

      if (!userStore.getIsSetUser) {
        try {
          await userStore.getUserInfoAction()
          await permissionStore.generateRoutes()

          permissionStore.getAddRouters.forEach((route) => {
            router.addRoute(route as unknown as RouteRecordRaw)
          })

          const redirectPath = from.query.redirect || to.path
          const redirect = decodeURIComponent(redirectPath as string)
          const nextData = to.path === redirect
            ? { ...to, replace: true }
            : { path: redirect }
          next(nextData)
        } catch (error: any) {
          ElMessage.error(error.message || '获取用户信息失败')
          await userStore.resetState()
          next({ path: PageEnum.LOGIN, replace: true })
          NProgress.done()
        }
      } else {
        const permissions = userStore.getPermissions

        if (to.meta?.permissions && !to.meta?.permissions?.some((perm: string) => permissions.has(perm))) {
          ElMessage.error('无权限访问该页面')
          next({ path: '/403', replace: true })
          NProgress.done()
        } else {
          next()
        }
      }
    }
  } else {
    if (whiteList.includes(to.path)) {
      next()
    } else {
      next(`${PageEnum.LOGIN}?redirect=${encodeURIComponent(to.fullPath)}`)
      NProgress.done()
    }
  }
})

router.afterEach((to) => {
  NProgress.done()

  if (to.meta?.title) {
    document.title = `${to.meta.title} - ${import.meta.env.VITE_APP_TITLE || '应用'}`
  }

  window.scrollTo(0, 0)
})

router.onError((error) => {
  console.error('路由错误:', error)
  NProgress.done()
  ElMessage.error('页面加载失败，请刷新重试')
})

export default router

