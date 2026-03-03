/**
 * Cesium 业务服务层
 * 封装 Cesium 相关的业务逻辑
 */

import * as Cesium from 'cesium'
import { CesiumManager, getCesiumManager, initCesium as initCesiumManager } from '@/cesium/core/cesiumManager'
import { LayerManager, getLayerManager } from '@/cesium/core/layerManager'
import { DrawManager, getDrawManager } from '@/cesium/core/drawManager'
import {
  PrimitiveManager,
  initPrimitiveManager,
  getPrimitiveManager,
  destroyPrimitiveManager
} from '@/cesium/core/primitiveManager'
import type {
  PointCloudOptions,
  BillboardBatchOptions,
  PrimitiveEntity
} from '@/cesium/core/primitiveManager'
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
    // 自动初始化 Primitive 管理器
    initPrimitiveManager()
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
   * 高性能批量添加点（使用 Primitive）
   * 适用于大量点标记（推荐超过 1000 个点时使用）
   */
  async addPointsPrimitive(
    collectionId: string,
    coordinates: Coordinate[],
    options: PointCloudOptions = {}
  ): Promise<Cesium.PointPrimitive[]> {
    try {
      const manager = getPrimitiveManager()
      if (!manager) {
        throw new Error('Primitive Manager not initialized')
      }

      const collection = manager.createPointCloudCollection(collectionId, options)
      const points = manager.addPointsToCollection(
        collectionId,
        coordinates.map(coord => ({
          longitude: coord.longitude,
          latitude: coord.latitude,
          height: coord.height
        })),
        options
      )

      logger.info(`Added ${points.length} points using Primitive API`)
      return points
    } catch (error) {
      handleError(error)
      return []
    }
  }

  /**
   * 高性能批量添加图标（使用 BillboardCollection）
   */
  async addBillboardsPrimitive(
    collectionId: string,
    items: Array<{
      longitude: number
      latitude: number
      height?: number
      image?: string
      scale?: number
      data?: any
    }>,
    options: BillboardBatchOptions = {}
  ): Promise<Cesium.Billboard[]> {
    try {
      const manager = getPrimitiveManager()
      if (!manager) {
        throw new Error('Primitive Manager not initialized')
      }

      manager.createBillboardCollection(collectionId, options)
      const billboards = manager.addBillboardsToCollection(collectionId, items, options)

      logger.info(`Added ${billboards.length} billboards using Primitive API`)
      return billboards
    } catch (error) {
      handleError(error)
      return []
    }
  }

  /**
   * 高性能批量创建线段（使用 PolylineGeometry）
   */
  async addPolylinesPrimitive(
    polylines: Array<{
      id: string
      positions: Coordinate[]
      color?: Cesium.Color
      width?: number
      data?: any
    }>
  ): Promise<void> {
    try {
      const manager = getPrimitiveManager()
      if (!manager) {
        throw new Error('Primitive Manager not initialized')
      }

      manager.createPolylinePrimitives(
        polylines.map(polyline => ({
          id: polyline.id,
          positions: polyline.positions.map(pos => ({
            longitude: pos.longitude,
            latitude: pos.latitude,
            height: pos.height
          })),
          color: polyline.color,
          width: polyline.width,
          data: polyline.data
        }))
      )

      logger.info(`Added ${polylines.length} polylines using Primitive API`)
    } catch (error) {
      handleError(error)
    }
  }

  /**
   * 高性能批量创建多边形（使用 PolygonGeometry）
   */
  async addPolygonsPrimitive(
    polygons: Array<{
      id: string
      positions: Coordinate[]
      color?: Cesium.Color
      height?: number
      data?: any
    }>
  ): Promise<void> {
    try {
      const manager = getPrimitiveManager()
      if (!manager) {
        throw new Error('Primitive Manager not initialized')
      }

      manager.createPolygonPrimitives(
        polygons.map(polygon => ({
          id: polygon.id,
          positions: polygon.positions.map(pos => ({
            longitude: pos.longitude,
            latitude: pos.latitude,
            height: pos.height
          })),
          color: polygon.color,
          height: polygon.height,
          data: polygon.data
        }))
      )

      logger.info(`Added ${polygons.length} polygons using Primitive API`)
    } catch (error) {
      handleError(error)
    }
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
   * 获取性能统计信息
   */
  getPerformanceStats() {
    try {
      const manager = getCesiumManager()
      if (!manager) return null

      const primitiveManager = getPrimitiveManager()
      return {
        entities: manager.getEntityCount(),
        primitives: manager.getPrimitiveCount(),
        recommendation: manager.getPerformanceRecommendation(),
        primitiveCollections: primitiveManager ? primitiveManager.getCollectionStats() : null
      }
    } catch (error) {
      handleError(error, { showMessage: false })
      return null
    }
  }

  /**
   * 手动触发渲染
   * 当 requestRenderMode 为 true 时，需要手动调用此方法来更新场景
   */
  requestRender(): void {
    const manager = getCesiumManager()
    if (manager) {
      manager.render()
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
   * 清除所有 Primitive
   */
  clearAllPrimitives(): void {
    try {
      const manager = getPrimitiveManager()
      if (!manager) return

      manager.clearAll()
      logger.info('All primitives cleared')
    } catch (error) {
      handleError(error)
    }
  }

  /**
   * 清除指定点云集合
   */
  clearPointCloudCollection(collectionId: string): void {
    try {
      const manager = getPrimitiveManager()
      if (!manager) return

      manager.removePointCloudCollection(collectionId)
      logger.info(`Point cloud collection cleared: ${collectionId}`)
    } catch (error) {
      handleError(error)
    }
  }

  /**
   * 清除指定 Billboard 集合
   */
  clearBillboardCollection(collectionId: string): void {
    try {
      const manager = getPrimitiveManager()
      if (!manager) return

      manager.removeBillboardCollection(collectionId)
      logger.info(`Billboard collection cleared: ${collectionId}`)
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
      this.requestRender()
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

      logger.debug('Setting imagery provider to:', providerType)

      // 移除所有现有的影像图层（除了基础图层）
      const imageryLayers = viewer.imageryLayers
      logger.debug('Before remove, layers count:', imageryLayers.length)
      imageryLayers.removeAll()
      logger.debug('After remove, layers count:', imageryLayers.length)

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
          logger.debug('Gaode Vector imagery provider loaded')
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
          logger.debug('Gaode Satellite imagery provider loaded')
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
          logger.debug('Gaode Hybrid satellite layer loaded')
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
          logger.debug('Gaode Hybrid imagery provider loaded')
          logger.info('Gaode Hybrid imagery provider enabled')
          // 飞向北京
      viewer.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(116.3912, 39.9075, 10000),
        duration: 0.5
      })

      this.requestRender()
      return // 已经添加了两个图层，直接返回

        case 'bing':
          // Bing 地图 - 需要配置 Bing Maps Key
          const bingKey = import.meta.env.VITE_BING_MAPS_KEY || ''
          if (!bingKey) {
            logger.warn('Bing Maps Key not configured, falling back to OSM')
            // 如果没有配置 Bing Key，回退到 OSM
            provider = new Cesium.OpenStreetMapImageryProvider({
              url: 'https://tile.openstreetmap.org/'
            })
            logger.debug('OSM imagery provider loaded (fallback from Bing)')
            logger.info('OSM imagery provider enabled (fallback from Bing)')
          } else {
            provider = new Cesium.BingMapsImageryProvider({
              url: 'https://dev.virtualearth.net',
              key: bingKey,
              mapStyle: Cesium.BingMapsStyle.AERIAL_WITH_LABELS
            })
            logger.debug('Bing imagery provider loaded')
            logger.info('Bing imagery provider enabled')
          }
          break

        case 'osm':
        default:
          // OpenStreetMap
          provider = new Cesium.OpenStreetMapImageryProvider({
            url: 'https://tile.openstreetmap.org/'
          })
          logger.debug('OSM imagery provider loaded')
          logger.info('OSM imagery provider enabled')
          break
      }

      imageryLayers.addImageryProvider(provider)
      logger.debug('Imagery provider set successfully, layers count:', imageryLayers.length)
      logger.debug('First layer ready:', imageryLayers.get(0)?.ready)

      // 影像图层切换后飞向北京
      viewer.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(116.3912, 39.9075, 10000),
        duration: 0.5
      })

      this.requestRender()
    } catch (error) {
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

      logger.debug('Setting terrain provider to:', terrainType)

      switch (terrainType) {
        case CesiumService.TerrainType.SIMPLE:
          // 简单地形 - 使用更轻量的 Cesium Ion 地形
          logger.debug('Loading Simple Terrain...')
          try {
            const terrain = await Cesium.Terrain.fromWorldTerrain()
            await viewer.scene.setTerrain(terrain)
            viewer.scene.globe.enableLighting = true
            // 启用地形深度测试，使地形更明显
            viewer.scene.globe.depthTestAgainstTerrain = true
            logger.debug('Simple Terrain loaded successfully')
            logger.info('Simple Terrain enabled')
          } catch (error) {
            logger.error('Failed to load Simple terrain', error)
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
          logger.debug('Loading Custom Terrain...')
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
            logger.debug('Custom Terrain loaded successfully')
            logger.info('Custom Terrain enabled')
          } catch (error) {
            logger.error('Failed to load Custom terrain', error)
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
          logger.debug('Loading Cesium Ion High Precision Terrain...')
          try {
            const terrain = await Cesium.Terrain.fromWorldTerrain({
              requestWaterMask: true,
              requestVertexNormals: true
            })
            await viewer.scene.setTerrain(terrain)
            viewer.scene.globe.enableLighting = true
            viewer.scene.globe.depthTestAgainstTerrain = true
            logger.debug('Cesium Ion High Precision Terrain loaded successfully')
            logger.info('Cesium Ion High Precision Terrain enabled')
          } catch (error) {
            logger.error('Failed to load Cesium Ion terrain', error)
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
          logger.debug('Loading ArcGIS Terrain...')
          try {
            const terrain = new Cesium.Terrain(
              Cesium.ArcGISTiledElevationTerrainProvider.fromUrl(
                'https://elevation3d.arcgis.com/arcgis/rest/services/WorldElevation3D/Terrain3D/ImageServer'
              )
            )
            await viewer.scene.setTerrain(terrain)
            viewer.scene.globe.enableLighting = true
            viewer.scene.globe.depthTestAgainstTerrain = true
            logger.debug('ArcGIS Terrain loaded successfully')
            logger.info('ArcGIS Terrain enabled')
          } catch (error) {
            logger.error('Failed to load ArcGIS terrain', error)
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
          logger.debug('Removing terrain (using EllipsoidTerrainProvider)')
          const ellipsoidProvider = new Cesium.EllipsoidTerrainProvider()
          await viewer.scene.setTerrain(new Cesium.Terrain(ellipsoidProvider))
          viewer.scene.globe.enableLighting = false
          viewer.scene.globe.depthTestAgainstTerrain = false
          logger.debug('Terrain disabled')
          logger.info('Terrain disabled')
          break
      }

      // 所有地形切换后都飞向北京
      viewer.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(116.3912, 39.9075, 10000),
        duration: 0.5
      })

      this.requestRender()
    } catch (error) {
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

      this.requestRender()
    } catch (error) {
      handleError(error)
    }
  }
}

/**
 * 导出单例实例
 */
export const cesiumService = CesiumService.getInstance()
