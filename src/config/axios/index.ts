/**
 * Axios 请求封装
 */

import service from './service'
import type { RequestConfig } from './config'
import type { AxiosPromise } from 'axios'

export default {
  get<T = any>(config: RequestConfig): AxiosPromise<T> {
    return service({ ...config, method: 'GET' })
  },

  post<T = any>(config: RequestConfig): AxiosPromise<T> {
    return service({ ...config, method: 'POST' })
  },

  put<T = any>(config: RequestConfig): AxiosPromise<T> {
    return service({ ...config, method: 'PUT' })
  },

  delete<T = any>(config: RequestConfig): AxiosPromise<T> {
    return service({ ...config, method: 'DELETE' })
  },

  upload<T = any>(config: RequestConfig): AxiosPromise<T> {
    config.headers = {
      'Content-Type': 'multipart/form-data',
      ...config.headers
    }
    return service({ ...config, method: 'POST' })
  },

  download(config: RequestConfig): AxiosPromise<Blob> {
    config.responseType = 'blob'
    return service({ ...config, method: 'GET' })
  },

  postOriginal<T = any>(config: RequestConfig): AxiosPromise<T> {
    config.isReturnNativeResponse = true
    return service({ ...config, method: 'POST' })
  }
}
