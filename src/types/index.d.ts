/**
 * 通用类型定义
 */

export type Nullable<T> = T | null | undefined

export type Recordable<T = unknown> = Record<string, T>

export type TimeoutHandle = ReturnType<typeof setTimeout>

export type IntervalHandle = ReturnType<typeof setInterval>

export type Fn<T = unknown, R = T> = (...arg: T[]) => R

export type TargetContext = '_self' | '_blank'

export type ComponentElRef<T extends HTMLElement = HTMLDivElement> = {
  $el: T
  $props: unknown
} & AnyObject

export interface AnyObject {
  [key: string]: unknown
}

export interface PageParams {
  pageNo: number
  pageSize: number
}

export interface PageResult<T = unknown> {
  list: T[]
  total: number
}

export interface ResponseResult<T = unknown> {
  code: number
  data: T
  msg: string
}

export interface TreeData {
  id: string | number
  label: string
  children?: TreeData[]
  disabled?: boolean
  [key: string]: unknown
}

// 表格列定义
export interface TableColumn {
  field: string
  label?: string
  width?: number | string
  minWidth?: number | string
  fixed?: 'left' | 'right'
  align?: 'left' | 'center' | 'right'
  children?: TableColumn[]
  [key: string]: unknown
}

// 表单定义
export interface FormSchema {
  field: string
  label?: string
  component?: string
  componentProps?: Recordable
  formItemProps?: Recordable
  colProps?: Recordable
  value?: unknown
  rules?: Array<Record<string, unknown>>
  hidden?: boolean
  [key: string]: unknown
}

// 路由元信息
export interface RouteMeta {
  title?: string
  icon?: string
  hidden?: boolean
  noCache?: boolean
  alwaysShow?: boolean
  affix?: boolean
  noTagsView?: boolean
  activeMenu?: string
  canTo?: boolean
  followAuth?: string
  roles?: string[]
  permissions?: string[]
  [key: string]: unknown
}

export interface AppRouteRecordRaw {
  path: string
  name?: string
  component?: unknown
  redirect?: string
  meta?: RouteMeta
  children?: AppRouteRecordRaw[]
  [key: string]: unknown
}

// 用户信息
export interface UserInfo {
  id: number
  username: string
  nickname: string
  avatar: string
  email: string
  mobile: string
  deptId: number
  postIds: number[]
  status: number
  createTime: string
  [key: string]: unknown
}

// 登录信息
export interface LoginInfo {
  username: string
  password: string
  code?: string
  uuid?: string
  tenantId?: string
}
