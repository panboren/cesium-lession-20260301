/**
 * Cesium 3D 地图核心配置
 * 负责 Cesium Viewer 的初始化、配置和基础功能
 */

import * as Cesium from 'cesium'
import type { ViewerOptions } from 'cesium'
import { registerCustomMaterials } from '../materials/customMaterials'
import { logger } from '@/utils/logger'
import {
  COORDINATES,
  PERFORMANCE_CONSTANTS
} from '../constants'

/**
 * Cesium 配置接口
 */
export interface CesiumConfig {
  /**
   * 初始视角
   */
  initialView?: {
    longitude: number
    latitude: number
    height?: number
    heading?: number
    pitch?: number
    roll?: number
  }
  /**
   * 地形配置
   */
  terrain?: {
    enabled: boolean
    provider?: Cesium.TerrainProvider
  }
  /**
   * 底图配置
   */
  imageryLayers?: Array<{
    url: string
    name?: string
    show?: boolean
    alpha?: number
    brightness?: number
    contrast?: number
  }>
  /**
   * 性能配置
   */
  performance?: {
    requestRenderMode?: boolean
    maximumRenderTimeChange?: number
    targetFrameRate?: number
  }
  /**
   * 界面配置
   */
  ui?: {
    showTimeline?: boolean
    showAnimation?: boolean
    showBaseLayerPicker?: boolean
    showFullscreenButton?: boolean
    showVRButton?: boolean
    showGeocoder?: boolean
    showHomeButton?: boolean
    showSceneModePicker?: boolean
    showProjectionPicker?: boolean
    showHelpButton?: boolean
  }
}

/**
 * 默认 Cesium 配置
 */
export const DEFAULT_CESIUM_CONFIG: CesiumConfig = {
  initialView: {
    longitude: COORDINATES.DEFAULT_INITIAL_VIEW.longitude,
    latitude: COORDINATES.DEFAULT_INITIAL_VIEW.latitude,
    height: COORDINATES.DEFAULT_INITIAL_VIEW.height,
    heading: COORDINATES.DEFAULT_INITIAL_VIEW.heading,
    pitch: COORDINATES.DEFAULT_INITIAL_VIEW.pitch,
    roll: COORDINATES.DEFAULT_INITIAL_VIEW.roll
  },
  terrain: {
    enabled: false
  },
  imageryLayers: [
    {
      url: 'https://webst02.is.autonavi.com/appmaptile?style=6&x={x}&y={y}&z={z}',
      name: '高德地图',
      show: true
    }
  ],
  performance: {
    requestRenderMode: false,
    maximumRenderTimeChange: Infinity,
    targetFrameRate: PERFORMANCE_CONSTANTS.DEFAULT_TARGET_FPS
  },
  ui: {
    showTimeline: false,
    showAnimation: false,
    showBaseLayerPicker: true,
    showFullscreenButton: true,
    showVRButton: false,
    showGeocoder: true,
    showHomeButton: true,
    showSceneModePicker: true,
    showProjectionPicker: true,
    showHelpButton: false
  }
}

/**
 * Cesium 管理器
 */
export class CesiumManager {
  private viewer: Cesium.Viewer | null = null
  private config: CesiumConfig
  private containers: Map<string, HTMLElement> = new Map()

  constructor(config: CesiumConfig = DEFAULT_CESIUM_CONFIG) {
    this.config = config
  }

  /**
   * 初始化 Cesium Viewer
   */
  init(containerId: string = 'cesiumContainer'): Cesium.Viewer {
    const container = document.getElementById(containerId)
    if (!container) {
      throw new Error(`Container with id "${containerId}" not found`)
    }

    // 配置 Cesium Ion 访问令牌（可选）
    const token = import.meta.env.VITE_CESIUM_ION_TOKEN
    logger.debug('Cesium Ion token from env:', token ? `${token.substring(0, 20)}...` : 'undefined')
    if (token) {
      Cesium.Ion.defaultAccessToken = token
      logger.debug('Cesium Ion defaultAccessToken set successfully')
    }

    // 注册自定义材质
    registerCustomMaterials()
    logger.debug('Custom materials registered')

    // 创建 Viewer
    this.viewer = new Cesium.Viewer(containerId, {
      ...this.config.ui,
      timeline: this.config.ui?.showTimeline ?? false,
      animation: this.config.ui?.showAnimation ?? false,
      infoBox: false,
      selectionIndicator: false,
      shadows: true,
      shouldAnimate: true
    } as ViewerOptions)

    // 配置性能优化
    if (this.config.performance) {
      this.viewer.scene.requestRenderMode = this.config.performance.requestRenderMode ?? false
      if (this.viewer.scene.requestRenderMode) {
        this.viewer.scene.maximumRenderTimeChange = this.config.performance.maximumRenderTimeChange ?? Infinity
      }
      this.viewer.targetFrameRate = this.config.performance.targetFrameRate ?? 60
    }

    // 添加地形
    if (this.config.terrain?.enabled && this.config.terrain.provider) {
      this.viewer.terrainProvider = this.config.terrain.provider
    }

    // 设置初始视角
    if (this.config.initialView) {
      this.flyTo(this.config.initialView)
    }

    // 添加底图图层
    this.addImageryLayers(this.config.imageryLayers)

    // 移除默认的 Logo（使用 CSS 方式，避免访问私有属性）
    this.hideCredits()

    return this.viewer
  }

  /**
   * 隐藏 Cesium 版权 Logo
   * 使用 CSS 方式隐藏，避免访问私有属性 _cesiumWidget._creditContainer
   */
  private hideCredits(): void {
    // 方式1: 通过 CSS 类隐藏（推荐）
    const style = document.createElement('style')
    style.textContent = `
      .cesium-viewer-bottom {
        display: none !important;
      }
      .cesium-widget-credits {
        display: none !important;
      }
    `
    document.head.appendChild(style)
  }

  /**
   * 添加影像图层
   */
  private addImageryLayers(layers?: CesiumConfig['imageryLayers']): void {
    if (!layers || !this.viewer) return

    layers.forEach((layerConfig) => {
      const layer = this.viewer!.imageryLayers.addImageryProvider(
        new Cesium.UrlTemplateImageryProvider({
          url: layerConfig.url,
          credit: layerConfig.name || ''
        })
      )

      if (layerConfig.show !== undefined) {
        layer.show = layerConfig.show
      }
      if (layerConfig.alpha !== undefined) {
        layer.alpha = layerConfig.alpha
      }
      if (layerConfig.brightness !== undefined) {
        layer.brightness = layerConfig.brightness
      }
      if (layerConfig.contrast !== undefined) {
        layer.contrast = layerConfig.contrast
      }
    })
  }

  /**
   * 飞行到指定位置
   */
  flyTo(destination: {
    longitude: number
    latitude: number
    height?: number
    heading?: number
    pitch?: number
    roll?: number
    duration?: number
  }): void {
    if (!this.viewer) return

    this.viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(
        destination.longitude,
        destination.latitude,
        destination.height || 10000
      ),
      orientation: {
        heading: Cesium.Math.toRadians(destination.heading || 0),
        pitch: Cesium.Math.toRadians(destination.pitch || -90),
        roll: Cesium.Math.toRadians(destination.roll || 0)
      },
      duration: destination.duration || 2
    })
  }

  /**
   * 获取 Viewer 实例
   */
  getViewer(): Cesium.Viewer | null {
    return this.viewer
  }

  /**
   * 获取当前相机位置
   */
  getCameraPosition() {
    if (!this.viewer) return null

    const camera = this.viewer.camera
    const position = camera.positionCartographic

    return {
      longitude: Cesium.Math.toDegrees(position.longitude),
      latitude: Cesium.Math.toDegrees(position.latitude),
      height: position.height,
      heading: Cesium.Math.toDegrees(camera.heading),
      pitch: Cesium.Math.toDegrees(camera.pitch),
      roll: Cesium.Math.toDegrees(camera.roll)
    }
  }

  /**
   * 设置场景模式
   */
  setSceneMode(mode: 'SCENE3D' | 'SCENE2D' | 'COLUMBUS_VIEW' | 'MORPHING'): void {
    if (!this.viewer) return

    const modeMap = {
      SCENE3D: Cesium.SceneMode.SCENE3D,
      SCENE2D: Cesium.SceneMode.SCENE2D,
      COLUMBUS_VIEW: Cesium.SceneMode.COLUMBUS_VIEW,
      MORPHING: Cesium.SceneMode.MORPHING
    }

    this.viewer.scene.mode = modeMap[mode]
  }

  /**
   * 添加实体
   */
  addEntity(entityOptions: Cesium.Entity.ConstructorOptions): Cesium.Entity {
    if (!this.viewer) throw new Error('Viewer not initialized')

    return this.viewer.entities.add(entityOptions)
  }

  /**
   * 移除实体
   */
  removeEntity(entity: Cesium.Entity): void {
    if (!this.viewer) return
    this.viewer.entities.remove(entity)
  }

  /**
   * 清除所有实体
   */
  clearEntities(): void {
    if (!this.viewer) return
    this.viewer.entities.removeAll()
  }

  /**
   * 添加数据源
   */
  addDataSource(dataSource: Cesium.DataSource): Promise<void> {
    if (!this.viewer) return Promise.reject('Viewer not initialized')

    return this.viewer.dataSources.add(dataSource)
  }

  /**
   * 移除数据源
   */
  removeDataSource(dataSource: Cesium.DataSource): Promise<boolean> {
    if (!this.viewer) return Promise.resolve(false)

    return this.viewer.dataSources.remove(dataSource)
  }

  /**
   * 渲染场景
   * 当 requestRenderMode 为 true 时，调用 requestRender() 触发渲染
   * 否则，场景会自动渲染，无需手动调用
   */
  render(): void {
    if (!this.viewer) return
    if (this.viewer.scene.requestRenderMode) {
      this.viewer.scene.requestRender()
    }
  }

  /**
   * 检查是否需要手动触发渲染
   * 在 requestRenderMode 为 true 时返回 true
   */
  needsManualRender(): boolean {
    if (!this.viewer) return false
    return this.viewer.scene.requestRenderMode
  }

  /**
   * 销毁 Viewer
   */
  destroy(): void {
    if (this.viewer) {
      this.viewer.destroy()
      this.viewer = null
    }
    this.containers.clear()
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<CesiumConfig>): void {
    this.config = { ...this.config, ...config }
  }

  /**
   * 获取配置
   */
  getConfig(): CesiumConfig {
    return this.config
  }

  /**
   * 获取场景中的 Primitive 数量
   */
  getPrimitiveCount(): number {
    if (!this.viewer) return 0
    return this.viewer.scene.primitives.length
  }

  /**
   * 获取实体数量
   */
  getEntityCount(): number {
    if (!this.viewer) return 0
    return this.viewer.entities.values.length
  }

  /**
   * 性能优化建议
   * 当实体数量超过阈值时，建议使用 Primitive 替代 Entity
   */
  getPerformanceRecommendation(): { usePrimitive: boolean; reason: string } {
    const entityCount = this.getEntityCount()

    // 当实体数量超过阈值时，建议使用 Primitive
    if (entityCount > PERFORMANCE_CONSTANTS.ENTITY_THRESHOLD) {
      return {
        usePrimitive: true,
        reason: `实体数量 (${entityCount}) 超过推荐阈值 (${PERFORMANCE_CONSTANTS.ENTITY_THRESHOLD})，建议使用 PrimitiveManager 替代 Entity API 以提高渲染性能`
      }
    }

    return {
      usePrimitive: false,
      reason: '当前实体数量在合理范围内'
    }
  }
}

/**
 * 全局 Cesium 管理器实例（模块私有，防止外部直接修改）
 */
let cesiumManagerInstance: CesiumManager | null = null

/**
 * 初始化 Cesium
 */
export function initCesium(config?: CesiumConfig, containerId?: string): Cesium.Viewer {
  if (!cesiumManagerInstance) {
    cesiumManagerInstance = new CesiumManager(config)
  }
  return cesiumManagerInstance.init(containerId)
}

/**
 * 获取 Cesium 管理器
 */
export function getCesiumManager(): CesiumManager | null {
  return cesiumManagerInstance
}

/**
 * 销毁 Cesium
 */
export function destroyCesium(): void {
  if (cesiumManagerInstance) {
    cesiumManagerInstance.destroy()
    cesiumManagerInstance = null
  }
}
