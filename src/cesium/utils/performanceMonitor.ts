/**
 * Cesium 性能监控工具
 * 监控 FPS、渲染时间、内存使用等性能指标
 */

import * as Cesium from 'cesium'
import { logger } from '@/utils/logger'

/**
 * 性能指标接口
 */
export interface PerformanceMetrics {
  fps: number
  frameTime: number
  drawCalls: number
  triangles: number
  textures: number
  geometries: number
  primitives: number
  entities: number
}

/**
 * 性能监控事件类型
 */
export type PerformanceEventType = 'update' | 'warning' | 'error'

/**
 * 性能监听器回调函数类型
 */
type PerformanceListener = (metrics: PerformanceMetrics) => void

/**
 * 性能监控配置接口
 */
export interface PerformanceMonitorConfig {
  /**
   * 更新间隔（毫秒）
   */
  updateInterval?: number
  /**
   * FPS 警告阈值
   */
  fpsWarningThreshold?: number
  /**
   * FPS 错误阈值
   */
  fpsErrorThreshold?: number
  /**
   * 是否启用内存监控
   */
  enableMemoryMonitoring?: boolean
}

/**
 * 性能监控器类
 */
export class PerformanceMonitor {
  private viewer: Cesium.Viewer
  private updateInterval: number
  private fpsWarningThreshold: number
  private fpsErrorThreshold: number
  private enableMemoryMonitoring: boolean

  private isMonitoring: boolean = false
  private timer: number | null = null
  private lastFrameTime: number = 0
  private frameCount: number = 0
  private lastMetricsTime: number = 0

  private listeners: Map<PerformanceEventType, PerformanceListener[]> = new Map()
  private currentMetrics: PerformanceMetrics = {
    fps: 0,
    frameTime: 0,
    drawCalls: 0,
    triangles: 0,
    textures: 0,
    geometries: 0,
    primitives: 0,
    entities: 0
  }

  constructor(viewer: Cesium.Viewer, config: PerformanceMonitorConfig = {}) {
    this.viewer = viewer
    this.updateInterval = config.updateInterval ?? 1000
    this.fpsWarningThreshold = config.fpsWarningThreshold ?? 30
    this.fpsErrorThreshold = config.fpsErrorThreshold ?? 15
    this.enableMemoryMonitoring = config.enableMemoryMonitoring ?? false
  }

  /**
   * 开始监控
   */
  start(): void {
    if (this.isMonitoring) {
      logger.warn('Performance monitor is already running')
      return
    }

    this.isMonitoring = true
    this.lastFrameTime = performance.now()
    this.lastMetricsTime = performance.now()
    this.frameCount = 0

    // 注册帧回调
    this.viewer.scene.postRender.addEventListener(this.onPostRender.bind(this))

    // 启动定时器更新指标
    this.timer = window.setInterval(() => {
      this.updateMetrics()
    }, this.updateInterval)

    logger.info('Performance monitor started')
  }

  /**
   * 停止监控
   */
  stop(): void {
    if (!this.isMonitoring) {
      return
    }

    this.isMonitoring = false

    // 移除帧回调
    this.viewer.scene.postRender.removeEventListener(this.onPostRender, this)

    // 清除定时器
    if (this.timer !== null) {
      clearInterval(this.timer)
      this.timer = null
    }

    logger.info('Performance monitor stopped')
  }

  /**
   * 帧渲染完成回调
   */
  private onPostRender(): void {
    const now = performance.now()
    this.frameCount++
    this.lastFrameTime = now
  }

  /**
   * 更新性能指标
   */
  private updateMetrics(): void {
    const now = performance.now()
    const deltaTime = now - this.lastMetricsTime

    // 计算 FPS
    if (deltaTime > 0) {
      this.currentMetrics.fps = Math.round((this.frameCount * 1000) / deltaTime)
    }

    // 计算帧时间
    this.currentMetrics.frameTime = deltaTime / this.frameCount

    // 获取渲染统计信息
    const scene = this.viewer.scene
    const context = scene.context

    if (context) {
      const currentState = context._gl.getParameter(context._gl.DRAW_CALLS_WEBGL)
      if (currentState !== undefined) {
        this.currentMetrics.drawCalls = currentState
      }
    }

    // 获取实体数量
    this.currentMetrics.entities = this.viewer.entities.values.length

    // 获取 Primitive 数量
    if (scene.primitives) {
      this.currentMetrics.primitives = scene.primitives.length
    }

    // 获取纹理数量
    this.currentMetrics.textures = context._textureCache?.textureCache?.size ?? 0

    // 重置计数器
    this.frameCount = 0
    this.lastMetricsTime = now

    // 检查性能警告
    this.checkPerformance()

    // 通知监听器
    this.notifyListeners('update', this.currentMetrics)
  }

  /**
   * 检查性能状态
   */
  private checkPerformance(): void {
    const fps = this.currentMetrics.fps

    if (fps < this.fpsErrorThreshold) {
      this.notifyListeners('error', this.currentMetrics)
      logger.error(`Performance critical: FPS = ${fps}`)
    } else if (fps < this.fpsWarningThreshold) {
      this.notifyListeners('warning', this.currentMetrics)
      logger.warn(`Performance warning: FPS = ${fps}`)
    }
  }

  /**
   * 通知监听器
   */
  private notifyListeners(eventType: PerformanceEventType, metrics: PerformanceMetrics): void {
    const listeners = this.listeners.get(eventType) || []
    listeners.forEach(listener => {
      try {
        listener(metrics)
      } catch (error) {
        logger.error('Error in performance listener:', error)
      }
    })
  }

  /**
   * 添加监听器
   */
  on(eventType: PerformanceEventType, listener: PerformanceListener): void {
    const listeners = this.listeners.get(eventType) || []
    listeners.push(listener)
    this.listeners.set(eventType, listeners)
  }

  /**
   * 移除监听器
   */
  off(eventType: PerformanceEventType, listener: PerformanceListener): void {
    const listeners = this.listeners.get(eventType) || []
    const index = listeners.indexOf(listener)
    if (index > -1) {
      listeners.splice(index, 1)
      this.listeners.set(eventType, listeners)
    }
  }

  /**
   * 获取当前性能指标
   */
  getMetrics(): PerformanceMetrics {
    return { ...this.currentMetrics }
  }

  /**
   * 是否正在监控
   */
  isActive(): boolean {
    return this.isMonitoring
  }

  /**
   * 销毁监控器
   */
  destroy(): void {
    this.stop()
    this.listeners.clear()
  }
}

/**
 * 创建性能监控器
 */
export function createPerformanceMonitor(
  viewer: Cesium.Viewer,
  config?: PerformanceMonitorConfig
): PerformanceMonitor {
  return new PerformanceMonitor(viewer, config)
}
