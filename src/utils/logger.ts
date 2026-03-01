/**
 * 统一日志工具
 * 提供结构化的日志输出，支持日志级别和环境控制
 */

enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  NONE = 4
}

class Logger {
  private level: LogLevel
  private prefix: string

  constructor(prefix: string = '', level: LogLevel = LogLevel.INFO) {
    this.prefix = prefix
    this.level = import.meta.env.DEV ? LogLevel.DEBUG : LogLevel.INFO
  }

  private format(level: string, message: string, ...args: unknown[]): string {
    const timestamp = new Date().toISOString()
    return `[${timestamp}] [${level}]${this.prefix ? ` [${this.prefix}]` : ''} ${message}`
  }

  debug(message: string, ...args: unknown[]): void {
    if (this.level <= LogLevel.DEBUG) {
      console.debug(this.format('DEBUG', message), ...args)
    }
  }

  info(message: string, ...args: unknown[]): void {
    if (this.level <= LogLevel.INFO) {
      console.info(this.format('INFO', message), ...args)
    }
  }

  warn(message: string, ...args: unknown[]): void {
    if (this.level <= LogLevel.WARN) {
      console.warn(this.format('WARN', message), ...args)
    }
  }

  error(message: string, ...args: unknown[]): void {
    if (this.level <= LogLevel.ERROR) {
      console.error(this.format('ERROR', message), ...args)
    }
  }

  createLogger(prefix: string): Logger {
    return new Logger(prefix, this.level)
  }
}

/**
 * 创建日志实例
 */
export function createLogger(prefix: string): Logger {
  return new Logger(prefix)
}

/**
 * 全局日志实例
 */
export const logger = new Logger('APP')
