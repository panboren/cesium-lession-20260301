/**
 * 权限状态管理
 * 参考 yudao-ui-admin-vue3 实现
 */

import { defineStore } from 'pinia'
import { store } from '@/store'
import type { RouteRecordRaw } from 'vue-router'
import { getMenuListApi } from '@/api/login'
import { generateRoute } from '@/utils/routerHelper'

interface PermissionState {
  routers: RouteRecordRaw[]
  addRouters: RouteRecordRaw[]
}

export const usePermissionStore = defineStore('permission', {
  state: (): PermissionState => ({
    routers: [],
    addRouters: []
  }),
  getters: {
    getRouters: (state) => state.routers,
    getAddRouters: (state) => state.addRouters
  },
  actions: {
    async generateRoutes() {
      return new Promise<void>(async (resolve) => {
        try {
          // 从 localStorage 读取菜单（user store 存储的）
          const menuCache = localStorage.getItem('permission-menus')
          let menuList = null

          if (menuCache) {
            menuList = JSON.parse(menuCache)
          } else {
            // 如果缓存没有，从 API 获取
            try {
              menuList = await getMenuListApi()
              // 缓存菜单数据
              localStorage.setItem('permission-menus', JSON.stringify(menuList))
            } catch (apiError) {
              console.warn('从 API 获取菜单失败，使用本地默认菜单:', apiError)
              menuList = this.getDefaultMenus()
              // 缓存默认菜单数据
              localStorage.setItem('permission-menus', JSON.stringify(menuList))
            }
          }

          if (menuList && Array.isArray(menuList) && menuList.length > 0) {
            // 转换为前端路由
            const routerMap = generateRoute(menuList)

            // 动态路由（包括404）
            this.addRouters = routerMap.concat([
              {
                path: '/:path(.*)*',
                component: () => import('@/views/Error/404.vue'),
                name: '404Page',
                meta: {
                  hidden: true
                }
              }
            ] as RouteRecordRaw[])

            // 所有路由（用于菜单渲染）= 静态路由 + 动态路由
            this.routers = routerMap

            resolve()
          } else {
            resolve()
          }
        } catch (error) {
          console.error('生成路由失败:', error)
          resolve()
        }
      })
    },
    resetState() {
      this.routers = []
      this.addRouters = []
      localStorage.removeItem('permission-menus')
    },
    // 默认系统菜单（当 API 不可用时使用）
    getDefaultMenus() {
      return [
        {
          path: '/system',
          name: 'System',
          component: 'Layout',
          redirect: '/system/user',
          meta: {
            title: '系统管理',
            icon: 'Setting',
            alwaysShow: true
          },
          children: [
            {
              path: 'user',
              name: 'SystemUser',
              component: '/views/system/user/index',
              meta: {
                title: '用户管理',
                icon: 'User',
                visible: true,
                keepAlive: true
              }
            },
            {
              path: 'role',
              name: 'SystemRole',
              component: '/views/system/role/index',
              meta: {
                title: '角色管理',
                icon: 'UserFilled',
                visible: true,
                keepAlive: true
              }
            },
            {
              path: 'menu',
              name: 'SystemMenu',
              component: '/views/system/menu/index',
              meta: {
                title: '菜单管理',
                icon: 'Menu',
                visible: true,
                keepAlive: true
              }
            }
          ]
        }
      ]
    }
  }
})

export const usePermissionStoreWithOut = () => {
  return usePermissionStore(store)
}
