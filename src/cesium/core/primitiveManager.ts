/**
 * Primitive 管理器
 * 用于大量实体的高性能渲染
 * 使用 Primitive API 替代 Entity API 以获得更好的性能
 */

import * as Cesium from 'cesium'
import { getCesiumManager } from './cesiumManager'
import { logger } from '@/utils/logger'
import { PRIMITIVE_CONSTANTS, PERFORMANCE_CONSTANTS } from '../constants'
import { toCartesian, toCartesianArray } from '../utils/cesiumHelpers'

/**
 * Primitive 实体接口
 */
export interface PrimitiveEntity {
  primitive: Cesium.Primitive | Cesium.BillboardCollection | Cesium.PointPrimitiveCollection
  id: string
  data?: Record<string, unknown>
}

/**
 * 点云选项
 */
export interface PointCloudOptions {
  color?: Cesium.Color
  pixelSize?: number
  outlineColor?: Cesium.Color
  outlineWidth?: number
  disableDepthTestDistance?: number
}

/**
 * Billboard 批量配置
 */
export interface BillboardBatchOptions {
  image?: string
  scale?: number
  disableDepthTestDistance?: number
}

/**
 * Billboard 数据接口
 */
export interface BillboardData {
  id?: string
  name?: string
  type?: string
  properties?: Record<string, unknown>
  [key: string]: unknown
}

/**
 * Primitive 管理器类
 */
export class PrimitiveManager {
  private viewer: Cesium.Viewer | null = null
  private primitives: Map<string, PrimitiveEntity> = new Map()
  private pointCloudCollections: Map<string, Cesium.PointPrimitiveCollection> = new Map()
  private billboardCollections: Map<string, Cesium.BillboardCollection> = new Map()

  constructor() {
    const manager = getCesiumManager()
    if (manager) {
      this.viewer = manager.getViewer()
    }
  }

  /**
   * 创建点云集合
   * 适用于大量点标记的场景
   */
  createPointCloudCollection(collectionId: string, options: PointCloudOptions = {}): Cesium.PointPrimitiveCollection {
    if (!this.viewer) {
      throw new Error('Viewer not initialized')
    }

    const collection = new Cesium.PointPrimitiveCollection()
    collection.pointBillboard = undefined // 禁用 Billboard 以提高性能
    collection.color = options.color || Cesium.Color.WHITE
    collection.pixelSize = options.pixelSize ?? PRIMITIVE_CONSTANTS.POINT_CLOUD_PIXEL_SIZE
    collection.outlineColor = options.outlineColor || Cesium.Color.TRANSPARENT
    collection.outlineWidth = options.outlineWidth || 0
    collection.disableDepthTestDistance = options.disableDepthTestDistance ?? Number.POSITIVE_INFINITY

    this.viewer.scene.primitives.add(collection)
    this.pointCloudCollections.set(collectionId, collection)

    logger.info(`Point cloud collection created: ${collectionId}`)
    return collection
  }

  /**
   * 向点云集合批量添加点
   */
  addPointsToCollection(
    collectionId: string,
    positions: Array<{ longitude: number; latitude: number; height?: number }>,
    options?: PointCloudOptions
  ): Cesium.PointPrimitive[] {
    const collection = this.pointCloudCollections.get(collectionId)
    if (!collection) {
      throw new Error(`Point cloud collection not found: ${collectionId}`)
    }

    const points: Cesium.PointPrimitive[] = []

    for (const pos of positions) {
      const point = collection.add({
        position: toCartesian(pos),
        color: options?.color,
        pixelSize: options?.pixelSize,
        outlineColor: options?.outlineColor,
        outlineWidth: options?.outlineWidth,
        disableDepthTestDistance: options?.disableDepthTestDistance
      })
      points.push(point)
    }

    logger.info(`Added ${points.length} points to collection: ${collectionId}`)
    return points
  }

  /**
   * 创建 Billboard 集合
   * 适用于大量图标标注
   */
  createBillboardCollection(collectionId: string, options: BillboardBatchOptions = {}): Cesium.BillboardCollection {
    if (!this.viewer) {
      throw new Error('Viewer not initialized')
    }

    const collection = new Cesium.BillboardCollection()
    collection.disableDepthTestDistance = options.disableDepthTestDistance ?? Number.POSITIVE_INFINITY

    this.viewer.scene.primitives.add(collection)
    this.billboardCollections.set(collectionId, collection)

    logger.info(`Billboard collection created: ${collectionId}`)
    return collection
  }

  /**
   * 批量添加 Billboard
   */
  addBillboardsToCollection(
    collectionId: string,
    items: Array<{
      longitude: number
      latitude: number
      height?: number
      image?: string
      scale?: number
      rotation?: number
      data?: BillboardData
    }>,
    defaultOptions?: BillboardBatchOptions
  ): Cesium.Billboard[] {
    const collection = this.billboardCollections.get(collectionId)
    if (!collection) {
      throw new Error(`Billboard collection not found: ${collectionId}`)
    }

    const billboards: Cesium.Billboard[] = []

    for (const item of items) {
      const billboard = collection.add({
        position: toCartesian(item),
        image: item.image || defaultOptions?.image,
        scale: item.scale ?? defaultOptions?.scale ?? PRIMITIVE_CONSTANTS.BILLBOARD_DEFAULT_SCALE,
        rotation: item.rotation || 0,
        disableDepthTestDistance: defaultOptions?.disableDepthTestDistance
      })
      if (item.data) {
        (billboard as Cesium.Billboard & { data: BillboardData }).data = item.data
      }
      billboards.push(billboard)
    }

    logger.info(`Added ${billboards.length} billboards to collection: ${collectionId}`)
    return billboards
  }

  /**
   * 创建 Polyline Geometry Primitive
   * 适用于大量线段的高性能渲染
   */
  createPolylinePrimitive(
    id: string,
    positions: Array<{ longitude: number; latitude: number; height?: number }>,
    options: {
      color?: Cesium.Color
      width?: number
      glowPower?: number
      taperPower?: number
      data?: Record<string, unknown>
    } = {}
  ): void {
    if (!this.viewer) {
      throw new Error('Viewer not initialized')
    }

    const cartesianPositions = toCartesianArray(positions)

    const geometry = new Cesium.PolylineGeometry({
      positions: cartesianPositions,
      width: options.width ?? PRIMITIVE_CONSTANTS.POLYLINE_DEFAULT_WIDTH
    })

    const primitive = new Cesium.Primitive({
      geometryInstances: new Cesium.GeometryInstance({
        geometry,
        id: id,
        attributes: {
          color: Cesium.ColorGeometryInstanceAttribute.fromColor(options.color || Cesium.Color.WHITE)
        }
      }),
      appearance: new Cesium.PolylineMaterialAppearance({
        material: new Cesium.Material({
          fabric: {
            type: 'Color',
            uniforms: {
              color: options.color || Cesium.Color.WHITE
            }
          }
        })
      }),
      asynchronous: PRIMITIVE_CONSTANTS.ASYNCHRONOUS_LOADING // 异步加载提高性能
    })

    this.viewer.scene.primitives.add(primitive)
    this.primitives.set(id, { primitive, id, data: options.data })

    logger.info(`Polyline primitive created: ${id}`)
  }

  /**
   * 批量创建 Polyline Primitive
   */
  createPolylinePrimitives(
    polylines: Array<{
      id: string
      positions: Array<{ longitude: number; latitude: number; height?: number }>
      color?: Cesium.Color
      width?: number
      data?: Record<string, unknown>
    }>
  ): void {
    if (!this.viewer) {
      throw new Error('Viewer not initialized')
    }

    const geometryInstances: Cesium.GeometryInstance[] = []

    for (const polyline of polylines) {
      const cartesianPositions = toCartesianArray(polyline.positions)

      const geometry = new Cesium.PolylineGeometry({
        positions: cartesianPositions,
        width: polyline.width ?? PRIMITIVE_CONSTANTS.POLYLINE_DEFAULT_WIDTH
      })

      geometryInstances.push(
        new Cesium.GeometryInstance({
          geometry,
          id: polyline.id,
          attributes: {
            color: Cesium.ColorGeometryInstanceAttribute.fromColor(polyline.color || Cesium.Color.WHITE)
          }
        })
      )
    }

    // 使用单个 Primitive 批量渲染多条线，性能更优
    const primitive = new Cesium.Primitive({
      geometryInstances,
      appearance: new Cesium.PolylineColorAppearance({
        translucent: true
      }),
      asynchronous: PRIMITIVE_CONSTANTS.ASYNCHRONOUS_LOADING
    })

    this.viewer.scene.primitives.add(primitive)

    for (const polyline of polylines) {
      this.primitives.set(polyline.id, { primitive, id: polyline.id, data: polyline.data })
    }

    logger.info(`Created ${polylines.length} polyline primitives in batch`)
  }

  /**
   * 创建 Polygon Geometry Primitive
   * 适用于大量多边形的高性能渲染
   */
  createPolygonPrimitive(
    id: string,
    positions: Array<{ longitude: number; latitude: number; height?: number }>,
    options: {
      materialColor?: Cesium.Color
      outlineColor?: Cesium.Color
      outlineWidth?: number
      height?: number
      perPositionHeight?: boolean
      data?: Record<string, unknown>
    } = {}
  ): void {
    if (!this.viewer) {
      throw new Error('Viewer not initialized')
    }

    const cartesianPositions = toCartesianArray(positions)

    const geometry = new Cesium.PolygonGeometry({
      polygonHierarchy: new Cesium.PolygonHierarchy(cartesianPositions),
      height: options.height || 0,
      perPositionHeight: options.perPositionHeight || false
    })

    const primitive = new Cesium.Primitive({
      geometryInstances: new Cesium.GeometryInstance({
        geometry,
        id,
        attributes: {
          color: Cesium.ColorGeometryInstanceAttribute.fromColor(
            options.materialColor || Cesium.Color.RED.withAlpha(0.6)
          )
        }
      }),
      appearance: new Cesium.MaterialAppearance({
        material: Cesium.Material.fromType('Color', {
          translucent: true,
          uniforms: {
            color: options.materialColor || Cesium.Color.RED.withAlpha(0.6)
          }
        })
      }),
      asynchronous: PRIMITIVE_CONSTANTS.ASYNCHRONOUS_LOADING
    })

    this.viewer.scene.primitives.add(primitive)
    this.primitives.set(id, { primitive, id, data: options.data })

    logger.info(`Polygon primitive created: ${id}`)
  }

  /**
   * 批量创建 Polygon Primitive
   */
  createPolygonPrimitives(
    polygons: Array<{
      id: string
      positions: Array<{ longitude: number; latitude: number; height?: number }>
      color?: Cesium.Color
      height?: number
      data?: Record<string, unknown>
    }>
  ): void {
    if (!this.viewer) {
      throw new Error('Viewer not initialized')
    }

    const geometryInstances: Cesium.GeometryInstance[] = []

    for (const polygon of polygons) {
      const cartesianPositions = toCartesianArray(polygon.positions)

      const geometry = new Cesium.PolygonGeometry({
        polygonHierarchy: new Cesium.PolygonHierarchy(cartesianPositions),
        height: polygon.height || 0
      })

      geometryInstances.push(
        new Cesium.GeometryInstance({
          geometry,
          id: polygon.id,
          attributes: {
            color: Cesium.ColorGeometryInstanceAttribute.fromColor(
              polygon.color || Cesium.Color.RED.withAlpha(0.6)
            )
          }
        })
      )
    }

    // 使用单个 Primitive 批量渲染多个多边形
    const primitive = new Cesium.Primitive({
      geometryInstances,
      appearance: new Cesium.PerInstanceColorAppearance({
        translucent: true,
        closed: false
      }),
      asynchronous: PRIMITIVE_CONSTANTS.ASYNCHRONOUS_LOADING
    })

    this.viewer.scene.primitives.add(primitive)

    for (const polygon of polygons) {
      this.primitives.set(polygon.id, { primitive, id: polygon.id, data: polygon.data })
    }

    logger.info(`Created ${polygons.length} polygon primitives in batch`)
  }

  /**
   * 移除 Primitive
   */
  removePrimitive(id: string): boolean {
    const entity = this.primitives.get(id)
    if (!entity) return false

    // 检查是否还有其他 ID 引用该 Primitive
    const otherReferences = Array.from(this.primitives.entries()).filter(
      ([_, e]) => e.primitive === entity.primitive && e.id !== id
    )

    if (otherReferences.length === 0) {
      // 没有其他引用，可以移除 Primitive
      this.viewer?.scene.primitives.remove(entity.primitive)
    }

    this.primitives.delete(id)
    logger.info(`Primitive removed: ${id}`)
    return true
  }

  /**
   * 移除点云集合
   */
  removePointCloudCollection(collectionId: string): boolean {
    const collection = this.pointCloudCollections.get(collectionId)
    if (!collection) return false

    this.viewer?.scene.primitives.remove(collection)
    this.pointCloudCollections.delete(collectionId)
    logger.info(`Point cloud collection removed: ${collectionId}`)
    return true
  }

  /**
   * 移除 Billboard 集合
   */
  removeBillboardCollection(collectionId: string): boolean {
    const collection = this.billboardCollections.get(collectionId)
    if (!collection) return false

    this.viewer?.scene.primitives.remove(collection)
    this.billboardCollections.delete(collectionId)
    logger.info(`Billboard collection removed: ${collectionId}`)
    return true
  }

  /**
   * 清除所有 Primitive
   */
  clearAllPrimitives(): void {
    for (const entity of this.primitives.values()) {
      this.viewer?.scene.primitives.remove(entity.primitive)
    }
    this.primitives.clear()
    logger.info('All primitives cleared')
  }

  /**
   * 清除所有点云集合
   */
  clearAllPointCloudCollections(): void {
    for (const collection of this.pointCloudCollections.values()) {
      this.viewer?.scene.primitives.remove(collection)
    }
    this.pointCloudCollections.clear()
    logger.info('All point cloud collections cleared')
  }

  /**
   * 清除所有 Billboard 集合
   */
  clearAllBillboardCollections(): void {
    for (const collection of this.billboardCollections.values()) {
      this.viewer?.scene.primitives.remove(collection)
    }
    this.billboardCollections.clear()
    logger.info('All billboard collections cleared')
  }

  /**
   * 清除所有
   */
  clearAll(): void {
    this.clearAllPrimitives()
    this.clearAllPointCloudCollections()
    this.clearAllBillboardCollections()
  }

  /**
   * 获取 Primitive 数据
   */
  getPrimitiveData(id: string): Record<string, unknown> | undefined {
    return this.primitives.get(id)?.data
  }

  /**
   * 获取集合统计信息
   */
  getCollectionStats() {
    return {
      pointCloudCollections: {
        count: this.pointCloudCollections.size,
        totalPoints: Array.from(this.pointCloudCollections.values()).reduce((sum, c) => sum + c.length, 0)
      },
      billboardCollections: {
        count: this.billboardCollections.size,
        totalBillboards: Array.from(this.billboardCollections.values()).reduce((sum, c) => sum + c.length, 0)
      },
      primitives: {
        count: this.primitives.size
      }
    }
  }

  /**
   * 销毁管理器
   */
  destroy(): void {
    this.clearAll()
  }
}

/**
 * 全局 Primitive 管理器实例
 */
let primitiveManagerInstance: PrimitiveManager | null = null

/**
 * 初始化 Primitive 管理器
 */
export function initPrimitiveManager(): PrimitiveManager {
  if (!primitiveManagerInstance) {
    primitiveManagerInstance = new PrimitiveManager()
  }
  return primitiveManagerInstance
}

/**
 * 获取 Primitive 管理器
 */
export function getPrimitiveManager(): PrimitiveManager | null {
  return primitiveManagerInstance
}

/**
 * 销毁 Primitive 管理器
 */
export function destroyPrimitiveManager(): void {
  if (primitiveManagerInstance) {
    primitiveManagerInstance.destroy()
    primitiveManagerInstance = null
  }
}
