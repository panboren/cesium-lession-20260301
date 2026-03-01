/**
 * Cesium 特效管理器
 * 管理各种视觉效果：雷达、光墙、流光、粒子等
 */

import * as Cesium from 'cesium'
import { getCesiumManager } from '../core/cesiumManager'
import { logger } from '@/utils/logger'

/**
 * 特效管理器
 */
export class EffectsManager {
  private static instance: EffectsManager | null = null
  private viewer: Cesium.Viewer | null = null
  private effects: Map<string, any> = new Map()

  private constructor() {
    logger.info('EffectsManager created')
  }

  /**
   * 获取单例实例
   */
  static getInstance(): EffectsManager {
    if (!EffectsManager.instance) {
      EffectsManager.instance = new EffectsManager()
    }
    return EffectsManager.instance
  }

  /**
   * 初始化特效管理器
   */
  init(): void {
    const manager = getCesiumManager()
    if (!manager) {
      logger.warn('Cesium Manager not initialized')
      return
    }
    this.viewer = manager.getViewer()
    logger.info('EffectsManager initialized')
  }

  /**
   * 添加特效
   */
  addEffect(name: string, effect: any): void {
    this.effects.set(name, effect)
    logger.info(`Effect added: ${name}`)
  }

  /**
   * 移除特效
   */
  removeEffect(name: string): void {
    const effect = this.effects.get(name)
    if (effect) {
      if (effect.destroy && typeof effect.destroy === 'function') {
        effect.destroy()
      }
      this.effects.delete(name)
      logger.info(`Effect removed: ${name}`)
    }
  }

  /**
   * 清除所有特效
   */
  clearAllEffects(): void {
    this.effects.forEach((effect, name) => {
      if (effect.destroy && typeof effect.destroy === 'function') {
        effect.destroy()
      }
    })
    this.effects.clear()
    logger.info('All effects cleared')
  }

  /**
   * 获取特效
   */
  getEffect(name: string): any {
    return this.effects.get(name)
  }

  /**
   * 获取 viewer
   */
  getViewer(): Cesium.Viewer | null {
    return this.viewer
  }
}

/**
 * 导出单例实例
 */
export const effectsManager = EffectsManager.getInstance()
