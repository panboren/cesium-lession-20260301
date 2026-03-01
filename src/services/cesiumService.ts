/**
 * Cesium 业务服务层
 * 封装 Cesium 相关的业务逻辑
 */

import * as Cesium from 'cesium'
import { CesiumManager, getCesiumManager, initCesium as initCesiumManager } from '@/cesium/core/cesiumManager'
import { LayerManager, getLayerManager } from '@/cesium/core/layerManager'
import { DrawManager, getDrawManager } from '@/cesium/core/drawManager'
import { logger } from '@/utils/logger'
import { handleError } from '@/utils/errorHandler'
import type { CesiumConfig, DrawConfig, LayerConfig, DrawResult, Coordinate } from '@/types/cesium'

/**
 * Cesium 服务类
 */
export class CesiumService {
  private static instance: CesiumService | null = null

  private constructor() {
    logger.info('CesiumService created')
  }

  /**
   * 获取单例实例
   */
  static getInstance(): CesiumService {
    if (!CesiumService.instance) {
      CesiumService.instance = new CesiumService()
    }
    return CesiumService.instance
  }

  /**
   * 初始化地图
   */
  async initMap(config?: CesiumConfig, containerId?: string): Promise<Cesium.Viewer | null> {
    try {
      logger.info('Initializing Cesium map', config)
      const viewer = initCesiumManager(config, containerId)
      return viewer
    } catch (error) {
      handleError(error)
      return null
    }
  }

  /**
   * 添加标注点
   */
  async addMarker(
    coordinate: Coordinate,
    options: {
      name?: string
      color?: Cesium.Color
      pixelSize?: number
      label?: string
    } = {}
  ): Promise<Cesium.Entity | null> {
    try {
      const manager = getCesiumManager()
      if (!manager) {
        throw new Error('Cesium Manager not initialized')
      }

      const viewer = manager.getViewer()
      if (!viewer) {
        throw new Error('Cesium Viewer not initialized')
      }

      const entity = viewer.entities.add({
        name: options.name || 'Marker',
        position: Cesium.Cartesian3.fromDegrees(
          coordinate.longitude,
          coordinate.latitude,
          coordinate.height
        ),
        point: {
          pixelSize: options.pixelSize || 10,
          color: options.color || Cesium.Color.RED,
          outlineColor: Cesium.Color.WHITE,
          outlineWidth: 2,
          disableDepthTestDistance: Number.POSITIVE_INFINITY
        },
        ...(options.label && {
          label: {
            text: options.label,
            font: '14px sans-serif',
            style: Cesium.LabelStyle.FILL_AND_OUTLINE,
            outlineWidth: 2,
            verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
            pixelOffset: new Cesium.Cartesian2(0, -20)
          }
        })
      })

      logger.info('Marker added', coordinate, options)
      return entity
    } catch (error) {
      handleError(error)
      return null
    }
  }

  /**
   * 批量添加标注
   */
  async addMarkers(
    coordinates: Coordinate[],
    options: {
      color?: Cesium.Color
      pixelSize?: number
    } = {}
  ): Promise<Cesium.Entity[]> {
    const entities: Cesium.Entity[] = []

    for (const coordinate of coordinates) {
      const entity = await this.addMarker(coordinate, options)
      if (entity) {
        entities.push(entity)
      }
    }

    logger.info(`${entities.length} markers added`)
    return entities
  }

  /**
   * 添加图层
   */
  async addLayer(config: LayerConfig): Promise<Cesium.ImageryLayer | Cesium.DataSource | Cesium.Entity | null> {
    try {
      const layerManager = getLayerManager()
      if (!layerManager) {
        throw new Error('Layer Manager not initialized')
      }
      const layer = await layerManager.addLayer(config)
      logger.info('Layer added', config)
      return layer
    } catch (error) {
      handleError(error)
      return null
    }
  }

  /**
   * 开始绘制
   */
  startDraw(config: DrawConfig): void {
    try {
      const drawManager = getDrawManager()
      if (!drawManager) {
        throw new Error('Draw Manager not initialized')
      }
      drawManager.startDraw(config)
      logger.info('Draw started', config)
    } catch (error) {
      handleError(error)
    }
  }

  /**
   * 飞向指定位置
   */
  flyTo(
    coordinate: Coordinate,
    options: {
      duration?: number
      height?: number
      heading?: number
      pitch?: number
    } = {}
  ): void {
    try {
      const manager = getCesiumManager()
      if (!manager) {
        logger.warn('Cesium Manager not initialized')
        return
      }

      manager.flyTo({
        longitude: coordinate.longitude,
        latitude: coordinate.latitude,
        height: options.height || coordinate.height || 10000,
        heading: options.heading || 0,
        pitch: options.pitch || -90,
        duration: options.duration || 3
      })

      logger.info('Fly to', coordinate, options)
    } catch (error) {
      handleError(error)
    }
  }

  /**
   * 获取当前相机位置
   */
  getCameraPosition(): Coordinate | null {
    try {
      const manager = getCesiumManager()
      if (!manager) return null

      const position = manager.getCameraPosition()
      return {
        longitude: position.longitude,
        latitude: position.latitude,
        height: position.height,
        heading: position.heading,
        pitch: position.pitch,
        roll: position.roll
      }
    } catch (error) {
      handleError(error, { showMessage: false })
      return null
    }
  }

  /**
   * 清除所有实体
   */
  clearAllEntities(): void {
    try {
      const manager = getCesiumManager()
      if (!manager) return

      manager.clearEntities()
      logger.info('All entities cleared')
    } catch (error) {
      handleError(error)
    }
  }

  /**
   * 设置场景模式
   */
  setSceneMode(mode: Cesium.SceneMode): void {
    try {
      const manager = getCesiumManager()
      if (!manager) {
        logger.warn('Cesium Manager not initialized')
        return
      }

      const viewer = manager.getViewer()
      if (!viewer) {
        logger.warn('Cesium Viewer not initialized')
        return
      }

      viewer.scene.mode = mode
      logger.info('Scene mode changed', mode)
    } catch (error) {
      handleError(error)
    }
  }

  /**
   * 设置地图样式（亮度、对比度、透明度）
   */
  setMapStyle(options: {
    brightness?: number
    contrast?: number
    opacity?: number
  }): void {
    try {
      const manager = getCesiumManager()
      if (!manager) {
        logger.warn('Cesium Manager not initialized')
        return
      }

      const viewer = manager.getViewer()
      if (!viewer) {
        logger.warn('Cesium Viewer not initialized')
        return
      }

      // 遍历所有影像图层并设置样式
      const imageryLayers = viewer.imageryLayers
      for (let i = 0; i < imageryLayers.length; i++) {
        const layer = imageryLayers.get(i)

        if (options.brightness !== undefined) {
          layer.brightness = options.brightness
        }

        if (options.contrast !== undefined) {
          layer.contrast = options.contrast
        }

        if (options.opacity !== undefined) {
          layer.alpha = options.opacity
        }
      }

      // 设置全局 globe 透明度（影响整个地球）
      if (options.opacity !== undefined) {
        viewer.scene.globe.alpha = options.opacity
      }

      logger.info('Map style applied', options)

      // 触发渲染以更新显示
      if (viewer.scene.requestRenderMode) {
        viewer.scene.requestRender()
      }
    } catch (error) {
      handleError(error)
    }
  }

  /**
   * 设置地形显示
   */
  async setTerrain(show: boolean): Promise<void> {
    try {
      const manager = getCesiumManager()
      if (!manager) {
        logger.warn('Cesium Manager not initialized')
        return
      }

      const viewer = manager.getViewer()
      if (!viewer) {
        logger.warn('Cesium Viewer not initialized')
        return
      }

      console.log('[CesiumService] Setting terrain to:', show)
      console.log('[CesiumService] Current Ion token exists:', !!Cesium.Ion.defaultAccessToken)

      if (show) {
        // 使用 Cesium 推荐的方式：viewer.scene.setTerrain()
        // 参考：https://sandcastle.cesium.com/
        try {
          console.log('[CesiumService] Loading Cesium World Terrain...')

          // 使用 Cesium.Terrain.fromWorldTerrain() 创建地形
          // 这个方法会自动使用配置的 Ion token
          const terrain = await Cesium.Terrain.fromWorldTerrain({
            requestWaterMask: true,
            requestVertexNormals: true
          })

          // 使用 setTerrain 方法设置地形（Cesium 推荐的方式）
          await viewer.scene.setTerrain(terrain)

          console.log('[CesiumService] Cesium World Terrain loaded successfully')
          logger.info('Cesium World Terrain enabled')

          // 启用地形光照效果，使地形更明显
          viewer.scene.globe.enableLighting = true
        } catch (error) {
          console.error('[CesiumService] Failed to load terrain:', error)
          logger.warn('Failed to load terrain, using simple terrain instead', error)

          // 显示错误信息
          handleError(error, {
            showMessage: true,
            message: '地形加载失败。请检查 Cesium Ion token 配置。'
          })

          // 回退到无地形
          await viewer.scene.setTerrain()
          viewer.scene.globe.enableLighting = false
          logger.info('No terrain (fallback)')
        }
      } else {
        // 禁用地形 - 使用 EllipsoidTerrainProvider 替换为平面地球
        console.log('[CesiumService] Removing terrain')
        const ellipsoidProvider = new Cesium.EllipsoidTerrainProvider()
        await viewer.scene.setTerrain(new Cesium.Terrain(ellipsoidProvider))
        viewer.scene.globe.enableLighting = false
        logger.info('Terrain disabled')
      }

      viewer.scene.requestRender()
    } catch (error) {
      console.error('[CesiumService] Error setting terrain:', error)
      logger.error('Error setting terrain:', error)
      handleError(error, {
        showMessage: true,
        message: '地形设置失败'
      })
    }
  }

  /**
   * 设置大气显示
   */
  setAtmosphere(show: boolean): void {
    try {
      const manager = getCesiumManager()
      if (!manager) {
        logger.warn('Cesium Manager not initialized')
        return
      }

      const viewer = manager.getViewer()
      if (!viewer) {
        logger.warn('Cesium Viewer not initialized')
        return
      }

      viewer.scene.skyAtmosphere.show = show
      viewer.scene.skyBox.show = show
      logger.info('Atmosphere', show ? 'enabled' : 'disabled')

      viewer.scene.requestRender()
    } catch (error) {
      handleError(error)
    }
  }
}

/**
 * 导出单例实例
 */
export const cesiumService = CesiumService.getInstance()
