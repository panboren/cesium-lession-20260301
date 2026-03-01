/**
 * 登录 API
 */

import request from '@/config/axios'
import type { LoginInfo, UserInfo } from '@/types'

/**
 * 登录
 */
export const loginApi = (data: LoginInfo) => {
  return request.post({
    url: '/auth/login',
    data
  })
}

/**
 * 获取用户信息
 */
export const getUserInfoApi = () => {
  return request.get<UserInfo>({
    url: '/auth/info'
  })
}

/**
 * 获取菜单列表
 */
export const getMenuListApi = () => {
  return request.get({
    url: '/auth/menus'
  })
}

/**
 * 退出登录
 */
export const logoutApi = () => {
  return request.post({
    url: '/auth/logout'
  })
}




