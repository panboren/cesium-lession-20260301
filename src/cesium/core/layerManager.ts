/**
 * Cesium 图层管理器
 * 负责管理 3D 场景中的各种图层
 */

import * as Cesium from 'cesium'
import { getCesiumManager } from './cesiumManager'
import type {
  LayerType,
  LayerConfig,
  ImageryLayerConfig,
  DataSourceLayerConfig,
  LayerEventType,
  LayerEvent
} from '@/types/cesium'
import mitt from 'mitt'

/**
 * 图层管理器
 */
export class LayerManager {
  private layers: Map<string, LayerConfig> = new Map()
  private imageryLayers: Map<string, Cesium.ImageryLayer> = new Map()
  private dataSources: Map<string, Cesium.DataSource> = new Map()
  private entities: Map<string, Cesium.Entity> = new Map()
  private eventBus: mitt.Emitter = mitt()

  /**
   * 添加图层
   */
  async addLayer(layerConfig: LayerConfig): Promise<Cesium.ImageryLayer | Cesium.DataSource | Cesium.Entity | null> {
    const manager = getCesiumManager()
    const viewer = manager?.getViewer()
    if (!viewer) {
      throw new Error('Cesium Viewer not initialized')
    }

    // 检查图层是否已存在
    if (this.layers.has(layerConfig.id)) {
      throw new Error(`Layer with id "${layerConfig.id}" already exists`)
    }

    let result: Cesium.ImageryLayer | Cesium.DataSource | Cesium.Entity | null = null

    switch (layerConfig.type) {
      case LayerType.IMAGERY:
        result = await this.addImageryLayer(layerConfig as ImageryLayerConfig)
        break

      case LayerType.DATASOURCE:
        result = await this.addDataSourceLayer(layerConfig as DataSourceLayerConfig)
        break

      case LayerType.ENTITY:
        result = this.addEntityLayer(layerConfig)
        break

      default:
        throw new Error(`Unsupported layer type: ${layerConfig.type}`)
    }

    // 存储图层配置
    this.layers.set(layerConfig.id, layerConfig)

    // 触发事件
    this.eventBus.emit('add', {
      type: LayerEventType.ADD,
      layer: layerConfig
    })

    return result
  }

  /**
   * 添加影像图层
   */
  private async addImageryLayer(config: ImageryLayerConfig): Promise<Cesium.ImageryLayer> {
    const manager = getCesiumManager()
    const viewer = manager?.getViewer()
    if (!viewer) throw new Error('Viewer not initialized')

    const provider = config.provider || new Cesium.UrlTemplateImageryProvider({
      url: config.url,
      credit: config.name
    })

    const layer = viewer.imageryLayers.addImageryProvider(provider, config.zIndex)

    // 设置可见性和透明度
    layer.show = config.visible ?? true
    layer.alpha = config.opacity ?? 1

    // 存储图层实例
    this.imageryLayers.set(config.id, layer)
    config.layerInstance = layer

    return layer
  }

  /**
   * 添加数据源图层
   */
  private async addDataSourceLayer(config: DataSourceLayerConfig): Promise<Cesium.DataSource> {
    const manager = getCesiumManager()
    const viewer = manager?.getViewer()
    if (!viewer) throw new Error('Viewer not initialized')

    let dataSource: Cesium.DataSource

    switch (config.dataType) {
      case 'geojson':
        dataSource = await Cesium.GeoJsonDataSource.load(config.url, {
          clampToGround: true
        })
        break

      case 'kml':
        dataSource = await Cesium.KmlDataSource.load(config.url, {
          clampToGround: true
        })
        break

      case 'czml':
        dataSource = await Cesium.CzmlDataSource.load(config.url)
        break

      default:
        throw new Error(`Unsupported data type: ${config.dataType}`)
    }

    await viewer.dataSources.add(dataSource)

    // 设置可见性
    dataSource.show = config.visible ?? true

    // 存储数据源实例
    this.dataSources.set(config.id, dataSource)
    config.dataSourceInstance = dataSource

    return dataSource
  }

  /**
   * 添加实体图层
   */
  private addEntityLayer(config: LayerConfig): Cesium.Entity {
    const manager = getCesiumManager()
    const viewer = manager?.getViewer()
    if (!viewer) throw new Error('Viewer not initialized')

    const entity = viewer.entities.add({
      name: config.name,
      show: config.visible ?? true
    })

    this.entities.set(config.id, entity)

    return entity
  }

  /**
   * 移除图层
   */
  removeLayer(layerId: string): boolean {
    const layerConfig = this.layers.get(layerId)
    if (!layerConfig) {
      return false
    }

    const manager = getCesiumManager()
    const viewer = manager?.getViewer()
    if (!viewer) {
      return false
    }

    let removed = false

    switch (layerConfig.type) {
      case LayerType.IMAGERY:
        const imageryLayer = this.imageryLayers.get(layerId)
        if (imageryLayer) {
          viewer.imageryLayers.remove(imageryLayer)
          this.imageryLayers.delete(layerId)
          removed = true
        }
        break

      case LayerType.DATASOURCE:
        const dataSource = this.dataSources.get(layerId)
        if (dataSource) {
          viewer.dataSources.remove(dataSource)
          this.dataSources.delete(layerId)
          removed = true
        }
        break

      case LayerType.ENTITY:
        const entity = this.entities.get(layerId)
        if (entity) {
          viewer.entities.remove(entity)
          this.entities.delete(layerId)
          removed = true
        }
        break
    }

    if (removed) {
      this.layers.delete(layerId)

      // 触发事件
      this.eventBus.emit('remove', {
        type: LayerEventType.REMOVE,
        layer: layerConfig
      })
    }

    return removed
  }

  /**
   * 获取图层
   */
  getLayer(layerId: string): LayerConfig | undefined {
    return this.layers.get(layerId)
  }

  /**
   * 获取所有图层
   */
  getAllLayers(): LayerConfig[] {
    return Array.from(this.layers.values())
  }

  /**
   * 更新图层可见性
   */
  setLayerVisibility(layerId: string, visible: boolean): void {
    const layerConfig = this.layers.get(layerId)
    if (!layerConfig) {
      throw new Error(`Layer with id "${layerId}" not found`)
    }

    layerConfig.visible = visible

    switch (layerConfig.type) {
      case LayerType.IMAGERY:
        const imageryLayer = this.imageryLayers.get(layerId)
        if (imageryLayer) {
          imageryLayer.show = visible
        }
        break

      case LayerType.DATASOURCE:
        const dataSource = this.dataSources.get(layerId)
        if (dataSource) {
          dataSource.show = visible
        }
        break

      case LayerType.ENTITY:
        const entity = this.entities.get(layerId)
        if (entity) {
          entity.show = visible
        }
        break
    }

    // 触发事件
    this.eventBus.emit('visibility_change', {
      type: LayerEventType.VISIBILITY_CHANGE,
      layer: layerConfig
    })
  }

  /**
   * 更新图层透明度
   */
  setLayerOpacity(layerId: string, opacity: number): void {
    if (opacity < 0 || opacity > 1) {
      throw new Error('Opacity must be between 0 and 1')
    }

    const layerConfig = this.layers.get(layerId)
    if (!layerConfig) {
      throw new Error(`Layer with id "${layerId}" not found`)
    }

    layerConfig.opacity = opacity

    if (layerConfig.type === LayerType.IMAGERY) {
      const imageryLayer = this.imageryLayers.get(layerId)
      if (imageryLayer) {
        imageryLayer.alpha = opacity
      }
    }
  }

  /**
   * 移动图层顺序
   */
  moveLayer(layerId: string, zIndex: number): void {
    const layerConfig = this.layers.get(layerId)
    if (!layerConfig) {
      throw new Error(`Layer with id "${layerId}" not found`)
    }

    if (layerConfig.type === LayerType.IMAGERY) {
      const manager = getCesiumManager()
      const viewer = manager?.getViewer()
      if (!viewer) throw new Error('Viewer not initialized')

      const imageryLayer = this.imageryLayers.get(layerId)
      if (imageryLayer) {
        viewer.imageryLayers.raise(imageryLayer, zIndex)
      }
    }

    layerConfig.zIndex = zIndex
  }

  /**
   * 清空所有图层
   */
  clearAllLayers(): void {
    const manager = getCesiumManager()
    const viewer = manager?.getViewer()
    if (!viewer) return

    // 清空影像图层
    viewer.imageryLayers.removeAll()
    this.imageryLayers.clear()

    // 清空数据源
    viewer.dataSources.removeAll()
    this.dataSources.clear()

    // 清空实体
    viewer.entities.removeAll()
    this.entities.clear()

    // 清空图层配置
    this.layers.clear()
  }

  /**
   * 订阅图层事件
   */
  on(event: LayerEventType, callback: (event: LayerEvent) => void): void {
    this.eventBus.on(event, callback)
  }

  /**
   * 取消订阅图层事件
   */
  off(event: LayerEventType, callback: (event: LayerEvent) => void): void {
    this.eventBus.off(event, callback)
  }
}

/**
 * 全局图层管理器实例（模块私有，防止外部直接修改）
 */
let layerManagerInstance: LayerManager | null = null

/**
 * 初始化图层管理器
 */
export function initLayerManager(): LayerManager {
  if (!layerManagerInstance) {
    layerManagerInstance = new LayerManager()
  }
  return layerManagerInstance
}

/**
 * 获取图层管理器
 */
export function getLayerManager(): LayerManager | null {
  return layerManagerInstance
}