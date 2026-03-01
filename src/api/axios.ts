/**
 * Axios 实例配置
 */

import axios, { type AxiosInstance, type AxiosRequestConfig, type AxiosResponse } from 'axios'
import type { ResponseResult } from '@/types'
import { ElMessage } from 'element-plus'

// 创建 axios 实例
const service: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_BASE_URL || '/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json;charset=UTF-8'
  }
})

// 请求拦截器
service.interceptors.request.use(
  (config: AxiosRequestConfig) => {
    // 可以在这里添加 token
    // const token = localStorage.getItem('token')
    // if (token && config.headers) {
    //   config.headers.Authorization = `Bearer ${token}`
    // }
    return config
  },
  (error: unknown) => {
    console.error('Request error:', error)
    return Promise.reject(error)
  }
)

// 响应拦截器
service.interceptors.response.use(
  (response: AxiosResponse<ResponseResult>) => {
    const { code, data, msg } = response.data

    if (code === 200 || code === 0) {
      return data
    } else {
      ElMessage.error(msg || '请求失败')
      return Promise.reject(new Error(msg || '请求失败'))
    }
  },
  (error: unknown) => {
    if (axios.isAxiosError(error)) {
      if (error.response) {
        const { status } = error.response
        switch (status) {
          case 401:
            ElMessage.error('未授权，请登录')
            break
          case 403:
            ElMessage.error('拒绝访问')
            break
          case 404:
            ElMessage.error('请求地址不存在')
            break
          case 500:
            ElMessage.error('服务器内部错误')
            break
          default:
            ElMessage.error(error.message || '请求失败')
        }
      } else if (error.request) {
        ElMessage.error('网络错误，请检查网络连接')
      } else {
        ElMessage.error('请求失败')
      }
    } else {
      ElMessage.error('请求失败')
    }
    return Promise.reject(error)
  }
)

export default service
