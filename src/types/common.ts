/**
 * 通用类型定义
 */

/**
 * 分页参数
 */
export interface PageParams {
  page?: number
  pageSize?: number
  [key: string]: any
}

/**
 * 分页响应
 */
export interface PageResult<T> {
  list: T[]
  total: number
  page: number
  pageSize: number
}

/**
 * API 响应
 */
export interface ApiResponse<T = any> {
  code: number
  message: string
  data: T
  timestamp?: number
}

/**
 * 树节点
 */
export interface TreeNode {
  id: string | number
  label: string
  children?: TreeNode[]
  [key: string]: any
}

/**
 * 选项
 */
export interface Option {
  label: string
  value: string | number
  disabled?: boolean
  [key: string]: any
}

/**
 * 坐标
 */
export interface Coordinate {
  longitude: number
  latitude: number
  height?: number
}

/**
 * 范围
 */
export interface Range {
  min: number
  max: number
}

/**
 * 配置项
 */
export interface ConfigItem {
  key: string
  label: string
  value: any
  type?: 'string' | 'number' | 'boolean' | 'select'
  options?: Option[]
}
