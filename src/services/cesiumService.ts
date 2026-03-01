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
   * 设置影像图层提供者
   * @param providerType 影像类型: 'gaode-vector' | 'gaode-satellite' | 'gaode-hybrid' | 'bing' | 'osm'
   */
  setImageryProvider(providerType: string): void {
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

      console.log('[CesiumService] Setting imagery provider to:', providerType)

      // 移除所有现有的影像图层（除了基础图层）
      const imageryLayers = viewer.imageryLayers
      console.log('[CesiumService] Before remove, layers count:', imageryLayers.length)
      imageryLayers.removeAll()
      console.log('[CesiumService] After remove, layers count:', imageryLayers.length)

      let provider: Cesium.ImageryProvider

      switch (providerType) {
        case 'gaode-vector':
          // 高德矢量地图 - 使用多个子域名
          provider = new Cesium.UrlTemplateImageryProvider({
            url: 'https://webrd0{s}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}',
            subdomains: ['1', '2', '3', '4'],
            credit: '高德矢量地图',
            maximumLevel: 18
          })
          console.log('[CesiumService] Gaode Vector imagery provider loaded')
          logger.info('Gaode Vector imagery provider enabled')
          break

        case 'gaode-satellite':
          // 高德卫星图 - 使用 wprd 服务器
          provider = new Cesium.UrlTemplateImageryProvider({
            url: 'https://wprd0{s}.is.autonavi.com/appmaptile?x={x}&y={y}&z={z}&lang=zh_cn&size=1&scl=1&style=6',
            subdomains: ['1', '2', '3', '4'],
            credit: '高德卫星图',
            maximumLevel: 18,
            tilingScheme: new Cesium.WebMercatorTilingScheme()
          })
          console.log('[CesiumService] Gaode Satellite imagery provider loaded')
          logger.info('Gaode Satellite imagery provider enabled')
          break

        case 'gaode-hybrid':
          // 高德混合图（卫星图 + 注记）
          const satelliteProvider = new Cesium.UrlTemplateImageryProvider({
            url: 'https://wprd0{s}.is.autonavi.com/appmaptile?x={x}&y={y}&z={z}&lang=zh_cn&size=1&scl=1&style=6',
            subdomains: ['1', '2', '3', '4'],
            credit: '高德卫星图',
            maximumLevel: 18,
            tilingScheme: new Cesium.WebMercatorTilingScheme()
          })
          console.log('[CesiumService] Gaode Hybrid satellite layer loaded')
          // 添加卫星底图
          imageryLayers.addImageryProvider(satelliteProvider)
          // 添加注记图层
          const labelProvider = new Cesium.UrlTemplateImageryProvider({
            url: 'https://webrd0{s}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}',
            subdomains: ['1', '2', '3', '4'],
            credit: '高德注记',
            maximumLevel: 18
          })
          imageryLayers.addImageryProvider(labelProvider)
          console.log('[CesiumService] Gaode Hybrid imagery provider loaded')
          logger.info('Gaode Hybrid imagery provider enabled')
          // 飞向北京
          viewer.camera.flyTo({
            destination: Cesium.Cartesian3.fromDegrees(116.3912, 39.9075, 10000),
            duration: 0.5
          })
          viewer.scene.requestRender()
          return // 已经添加了两个图层，直接返回

        case 'bing':
          // Bing 地图 - 需要配置 Bing Maps Key
          const bingKey = import.meta.env.VITE_BING_MAPS_KEY || ''
          if (!bingKey) {
            console.warn('[CesiumService] Bing Maps Key not configured, falling back to OSM')
            // 如果没有配置 Bing Key，回退到 OSM
            provider = new Cesium.OpenStreetMapImageryProvider({
              url: 'https://tile.openstreetmap.org/'
            })
            console.log('[CesiumService] OSM imagery provider loaded (fallback from Bing)')
            logger.info('OSM imagery provider enabled (fallback from Bing)')
          } else {
            provider = new Cesium.BingMapsImageryProvider({
              url: 'https://dev.virtualearth.net',
              key: bingKey,
              mapStyle: Cesium.BingMapsStyle.AERIAL_WITH_LABELS
            })
            console.log('[CesiumService] Bing imagery provider loaded')
            logger.info('Bing imagery provider enabled')
          }
          break

        case 'osm':
        default:
          // OpenStreetMap
          provider = new Cesium.OpenStreetMapImageryProvider({
            url: 'https://tile.openstreetmap.org/'
          })
          console.log('[CesiumService] OSM imagery provider loaded')
          logger.info('OSM imagery provider enabled')
          break
      }

      imageryLayers.addImageryProvider(provider)
      console.log('[CesiumService] Imagery provider set successfully, layers count:', imageryLayers.length)
      console.log('[CesiumService] First layer ready:', imageryLayers.get(0)?.ready)

      // 影像图层切换后飞向北京
      viewer.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(116.3912, 39.9075, 10000),
        duration: 0.5
      })

      viewer.scene.requestRender()
    } catch (error) {
      console.error('[CesiumService] Error setting imagery provider:', error)
      logger.error('Error setting imagery provider:', error)
      handleError(error, {
        showMessage: true,
        message: '影像图层切换失败'
      })
    }
  }

  /**
   * 地形类型枚举
   */
  static readonly TerrainType = {
    NONE: 'none',
    CESIUM_ION: 'cesium-ion',
    ARCGIS: 'arcgis',
    SIMPLE: 'simple',
    CUSTOM: 'custom'
  } as const

  /**
   * 设置地形显示
   */
  async setTerrain(show: boolean): Promise<void> {
    if (show) {
      await this.setTerrainProvider(CesiumService.TerrainType.CESIUM_ION)
    } else {
      await this.setTerrainProvider(CesiumService.TerrainType.NONE)
    }
  }

  /**
   * 设置地形提供者
   * @param terrainType 地形类型: 'none' | 'cesium-ion' | 'arcgis'
   */
  async setTerrainProvider(terrainType: string): Promise<void> {
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

      console.log('[CesiumService] Setting terrain provider to:', terrainType)

      switch (terrainType) {
        case CesiumService.TerrainType.SIMPLE:
          // 简单地形 - 使用更轻量的 Cesium Ion 地形
          console.log('[CesiumService] Loading Simple Terrain...')
          try {
            const terrain = await Cesium.Terrain.fromWorldTerrain()
            await viewer.scene.setTerrain(terrain)
            viewer.scene.globe.enableLighting = true
            // 启用地形深度测试，使地形更明显
            viewer.scene.globe.depthTestAgainstTerrain = true
            console.log('[CesiumService] Simple Terrain loaded successfully')
            logger.info('Simple Terrain enabled')
          } catch (error) {
            console.error('[CesiumService] Failed to load Simple terrain:', error)
            logger.warn('Failed to load Simple terrain', error)
            handleError(error, {
              showMessage: true,
              message: '简单地形加载失败。请检查 token 配置。'
            })
            throw error
          }
          break

        case CesiumService.TerrainType.CUSTOM:
          // 自定义地形 - 使用正弦波模拟地形，增强高度对比
          console.log('[CesiumService] Loading Custom Terrain...')
          try {
            const width = 64
            const height = 64
            const provider = new Cesium.CustomHeightmapTerrainProvider({
              width,
              height,
              callback: (x: number, y: number, level: number) => {
                const buffer = new Float32Array(width * height)
                for (let yy = 0; yy < height; yy++) {
                  for (let xx = 0; xx < width; xx++) {
                    const u = (x + xx / (width - 1)) / Math.pow(2, level)
                    const v = (y + yy / (height - 1)) / Math.pow(2, level)
                    // 增强波形地形的高度，使其更明显
                    const heightValue = 5000 * (Math.sin(8000 * v) * 0.5 + 0.5) +
                                       3000 * (Math.cos(6000 * u) * 0.5 + 0.5)
                    const index = yy * width + xx
                    buffer[index] = heightValue
                  }
                }
                return buffer
              }
            })
            await viewer.scene.setTerrain(new Cesium.Terrain(provider))
            viewer.scene.globe.enableLighting = true
            viewer.scene.globe.depthTestAgainstTerrain = true
            console.log('[CesiumService] Custom Terrain loaded successfully')
            logger.info('Custom Terrain enabled')
          } catch (error) {
            console.error('[CesiumService] Failed to load Custom terrain:', error)
            logger.warn('Failed to load Custom terrain', error)
            handleError(error, {
              showMessage: true,
              message: '自定义地形加载失败。'
            })
            throw error
          }
          break

        case CesiumService.TerrainType.CESIUM_ION:
          // Cesium Ion 高精度地形（带水体和法线）
          console.log('[CesiumService] Loading Cesium Ion High Precision Terrain...')
          try {
            const terrain = await Cesium.Terrain.fromWorldTerrain({
              requestWaterMask: true,
              requestVertexNormals: true
            })
            await viewer.scene.setTerrain(terrain)
            viewer.scene.globe.enableLighting = true
            viewer.scene.globe.depthTestAgainstTerrain = true
            console.log('[CesiumService] Cesium Ion High Precision Terrain loaded successfully')
            logger.info('Cesium Ion High Precision Terrain enabled')
          } catch (error) {
            console.error('[CesiumService] Failed to load Cesium Ion terrain:', error)
            logger.warn('Failed to load Cesium Ion terrain', error)
            handleError(error, {
              showMessage: true,
              message: 'Cesium Ion 高精度地形加载失败。请检查 token 配置。'
            })
            throw error
          }
          break

        case CesiumService.TerrainType.ARCGIS:
          // ArcGIS 地形
          console.log('[CesiumService] Loading ArcGIS Terrain...')
          try {
            const terrain = new Cesium.Terrain(
              Cesium.ArcGISTiledElevationTerrainProvider.fromUrl(
                'https://elevation3d.arcgis.com/arcgis/rest/services/WorldElevation3D/Terrain3D/ImageServer'
              )
            )
            await viewer.scene.setTerrain(terrain)
            viewer.scene.globe.enableLighting = true
            viewer.scene.globe.depthTestAgainstTerrain = true
            console.log('[CesiumService] ArcGIS Terrain loaded successfully')
            logger.info('ArcGIS Terrain enabled')
          } catch (error) {
            console.error('[CesiumService] Failed to load ArcGIS terrain:', error)
            logger.warn('Failed to load ArcGIS terrain', error)
            handleError(error, {
              showMessage: true,
              message: 'ArcGIS 地形加载失败。'
            })
            throw error
          }
          break

        case CesiumService.TerrainType.NONE:
        default:
          // 无地形（椭球体）
          console.log('[CesiumService] Removing terrain (using EllipsoidTerrainProvider)')
          const ellipsoidProvider = new Cesium.EllipsoidTerrainProvider()
          await viewer.scene.setTerrain(new Cesium.Terrain(ellipsoidProvider))
          viewer.scene.globe.enableLighting = false
          viewer.scene.globe.depthTestAgainstTerrain = false
          console.log('[CesiumService] Terrain disabled')
          logger.info('Terrain disabled')
          break
      }

      // 所有地形切换后都飞向北京
      viewer.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(116.3912, 39.9075, 10000),
        duration: 0.5
      })

      viewer.scene.requestRender()
    } catch (error) {
      console.error('[CesiumService] Error setting terrain provider:', error)
      logger.error('Error setting terrain provider:', error)
      throw error
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
