/**
 * 统一错误处理工具
 * 提供错误捕获、日志记录和用户提示
 */

import { ElMessage } from 'element-plus'
import { logger } from './logger'

/**
 * 错误类型
 */
export enum ErrorType {
  NETWORK = 'NETWORK',
  VALIDATION = 'VALIDATION',
  BUSINESS = 'BUSINESS',
  SYSTEM = 'SYSTEM',
  UNKNOWN = 'UNKNOWN'
}

/**
 * 应用错误类
 */
export class AppError extends Error {
  type: ErrorType
  code?: string
  details?: any

  constructor(
    message: string,
    type: ErrorType = ErrorType.UNKNOWN,
    code?: string,
    details?: any
  ) {
    super(message)
    this.name = 'AppError'
    this.type = type
    this.code = code
    this.details = details
  }
}

/**
 * 错误处理器配置
 */
interface ErrorHandlerConfig {
  showMessage?: boolean
  logError?: boolean
  reportError?: boolean
}

/**
 * 全局错误处理
 */
export function handleError(
  error: Error | AppError | unknown,
  config: ErrorHandlerConfig = {}
): void {
  const {
    showMessage = true,
    logError = true,
    reportError = true
  } = config

  let appError: AppError

  // 转换为 AppError
  if (error instanceof AppError) {
    appError = error
  } else if (error instanceof Error) {
    appError = new AppError(error.message, ErrorType.SYSTEM, undefined, error)
  } else {
    appError = new AppError(String(error), ErrorType.UNKNOWN)
  }

  // 记录日志
  if (logError) {
    logger.error(
      `${appError.type}: ${appError.message}`,
      appError.code,
      appError.details
    )
  }

  // 显示用户提示
  if (showMessage) {
    const messages: Record<ErrorType, string> = {
      [ErrorType.NETWORK]: '网络错误，请检查网络连接',
      [ErrorType.VALIDATION]: '输入数据格式不正确',
      [ErrorType.BUSINESS]: '操作失败，请稍后重试',
      [ErrorType.SYSTEM]: '系统错误，请联系管理员',
      [ErrorType.UNKNOWN]: '发生未知错误'
    }

    ElMessage.error(messages[appError.type] || appError.message)
  }

  // 上报错误（可集成 Sentry 等工具）
  if (reportError && import.meta.env.PROD) {
    // TODO: 集成错误监控工具
    logger.warn('Error reporting not configured')
  }
}

/**
 * 异步错误处理器
 */
export function handleAsyncError<T>(
  promise: Promise<T>,
  config?: ErrorHandlerConfig
): Promise<T | null> {
  return promise.catch((error) => {
    handleError(error, config)
    return null
  })
}

/**
 * 封装异步函数，自动处理错误
 */
export function withErrorHandler<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  config?: ErrorHandlerConfig
): T {
  return ((...args: any[]) => {
    return fn(...args).catch((error) => {
      handleError(error, config)
      throw error
    })
  }) as T
}
