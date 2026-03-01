/**
 * 地图相关 API
 */

import request from './axios'

/**
 * 获取地图配置
 */
export function getMapConfig() {
  return request({
    url: '/map/config',
    method: 'get'
  })
}

/**
 * 保存地图配置
 */
export function saveMapConfig(data: Record<string, unknown>) {
  return request({
    url: '/map/config',
    method: 'post',
    data
  })
}

/**
 * 获取图层数据
 */
export function getLayers() {
  return request({
    url: '/map/layers',
    method: 'get'
  })
}

/**
 * 保存绘制数据
 */
export function saveDrawData(data: unknown) {
  return request({
    url: '/map/draw',
    method: 'post',
    data
  })
}

/**
 * 获取绘制数据
 */
export function getDrawData(params?: Record<string, unknown>) {
  return request({
    url: '/map/draw',
    method: 'get',
    params
  })
}
