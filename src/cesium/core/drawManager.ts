/**
 * Cesium 绘图管理器
 * 提供点、线、面、圆、矩形等几何图形的绘制功能
 */

import * as Cesium from 'cesium'
import { getCesiumManager } from './cesiumManager'
import { DrawType } from '@/types/cesium'
import type { DrawStyle, DrawConfig, DrawEvent } from '@/types/cesium'

/**
 * 绘图管理器
 */
export class DrawManager {
  private viewer: Cesium.Viewer | null = null
  private drawing: boolean = false
  private currentDrawType: DrawType | null = null
  private activeEntity: Cesium.Entity | null = null
  private tempEntities: Cesium.Entity[] = []
  private tempPositions: Cesium.Cartesian3[] = []
  private handler: Cesium.ScreenSpaceEventHandler | null = null
  private eventCallbacks: Map<string, ((event: DrawEvent) => void)[]> = new Map()

  constructor() {
    const manager = getCesiumManager()
    if (manager) {
      this.viewer = manager.getViewer()
    }
  }

  /**
   * 开始绘制
   */
  startDraw(config: DrawConfig): void {
    if (!this.viewer) {
      throw new Error('Cesium Viewer not initialized')
    }

    if (this.drawing) {
      throw new Error('Already drawing')
    }

    this.drawing = true
    this.currentDrawType = config.type
    this.tempPositions = []

    // 创建事件处理器
    this.handler = new Cesium.ScreenSpaceEventHandler(this.viewer.scene.canvas)

    // 根据绘制类型设置事件
    switch (config.type) {
      case DrawType.POINT:
        this.setupPointDraw(config)
        break
      case DrawType.POLYLINE:
        this.setupPolylineDraw(config)
        break
      case DrawType.POLYGON:
        this.setupPolygonDraw(config)
        break
      case DrawType.CIRCLE:
        this.setupCircleDraw(config)
        break
      case DrawType.RECTANGLE:
        this.setupRectangleDraw(config)
        break
      default:
        throw new Error(`Unsupported draw type: ${config.type}`)
    }

    // 触发开始事件
    this.emitEvent({
      type: 'start',
      drawType: config.type
    })
  }

  /**
   * 设置点绘制
   */
  private setupPointDraw(config: DrawConfig): void {
    if (!this.handler || !this.viewer) return

    this.handler.setInputAction((click: any) => {
      const cartesian = this.pickPosition(click.position)
      if (!cartesian) {
        console.error('[DrawManager] pickPosition returned null for point draw')
        return
      }

      console.log('[DrawManager] Creating point at:', cartesian)

      // 直接使用点击的位置，不修改高度，确保位置完全准确
      this.tempPositions.push(cartesian)

      // 使用原生 Primitive 绘制点
      const pointPrimitive = this.viewer.scene.primitives.add(
        new Cesium.PointPrimitiveCollection({
          blendOption: Cesium.BlendOption.OPAQUE_AND_TRANSLUCENT
        })
      )
      pointPrimitive.add({
        position: cartesian,
        pixelSize: 50,
        color: Cesium.Color.YELLOW,
        outlineColor: Cesium.Color.RED,
        outlineWidth: 5,
        disableDepthTestDistance: Number.POSITIVE_INFINITY
      })
      console.log('[DrawManager] PointPrimitive added:', pointPrimitive)

      // 同时也尝试 Entity 方式
      const entity = this.viewer!.entities.add({
        position: cartesian,
        point: {
          pixelSize: 50,
          color: Cesium.Color.YELLOW,
          outlineColor: Cesium.Color.RED,
          outlineWidth: 5,
          disableDepthTestDistance: Number.POSITIVE_INFINITY
        },
        properties: config.properties
      })
      console.log('[DrawManager] Entity added:', entity)

      // 使用临时实体记录（用于 finishDraw）
      this.tempEntities.push(entity)
      this.activeEntity = entity

      this.finishDraw(config)
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK)
  }

  /**
   * 设置线绘制
   */
  private setupPolylineDraw(config: DrawConfig): void {
    if (!this.handler || !this.viewer) return

    let positions: Cesium.Cartesian3[] = []

    // 点击添加点
    this.handler.setInputAction((click: any) => {
      const cartesian = this.pickPosition(click.position)
      if (!cartesian) return

      positions.push(cartesian)
      this.tempPositions = positions

      if (positions.length === 1) {
        // 创建动态线
        this.activeEntity = this.viewer!.entities.add({
          polyline: {
            positions: new Cesium.CallbackProperty(() => positions, false),
            width: config.style?.line?.width || 3,
            material: config.style?.line?.material || Cesium.Color.CYAN,
            clampToGround: config.style?.line?.clampToGround ?? true
          }
        })
      }
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK)

    // 移动更新预览
    this.handler.setInputAction((move: any) => {
      if (positions.length > 0) {
        const cartesian = this.pickPosition(move.endPosition)
        if (cartesian) {
          const previewPositions = [...positions, cartesian]
          if (this.activeEntity) {
            ;(this.activeEntity.polyline as any).positions = new Cesium.CallbackProperty(() => previewPositions, false)
          }
        }
      }
    }, Cesium.ScreenSpaceEventType.MOUSE_MOVE)

    // 双击结束绘制
    this.handler.setInputAction(() => {
      this.finishDraw(config)
    }, Cesium.ScreenSpaceEventType.LEFT_DOUBLE_CLICK)
  }

  /**
   * 设置面绘制
   */
  private setupPolygonDraw(config: DrawConfig): void {
    if (!this.handler || !this.viewer) return

    let positions: Cesium.Cartesian3[] = []

    // 点击添加点
    this.handler.setInputAction((click: any) => {
      const cartesian = this.pickPosition(click.position)
      if (!cartesian) return

      positions.push(cartesian)
      this.tempPositions = positions

      if (positions.length === 1) {
        // 创建动态面
        this.activeEntity = this.viewer!.entities.add({
          polygon: {
            hierarchy: new Cesium.CallbackProperty(() => {
              return positions.length >= 3 ? new Cesium.PolygonHierarchy(positions) : null
            }, false),
            material: config.style?.polygon?.material || Cesium.Color.CYAN.withAlpha(0.5),
            outline: config.style?.polygon?.outline ?? true,
            outlineColor: config.style?.polygon?.outlineColor || Cesium.Color.CYAN,
            outlineWidth: config.style?.polygon?.outlineWidth || 2,
            perPositionHeight: config.style?.polygon?.perPositionHeight ?? false
          }
        })
      }
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK)

    // 移动更新预览
    this.handler.setInputAction((move: any) => {
      if (positions.length > 0) {
        const cartesian = this.pickPosition(move.endPosition)
        if (cartesian) {
          const previewPositions = [...positions, cartesian]
          if (this.activeEntity) {
            ;(this.activeEntity.polygon as any).hierarchy = new Cesium.CallbackProperty(() => {
              return previewPositions.length >= 3 ? new Cesium.PolygonHierarchy(previewPositions) : null
            }, false)
          }
        }
      }
    }, Cesium.ScreenSpaceEventType.MOUSE_MOVE)

    // 双击结束绘制
    this.handler.setInputAction(() => {
      this.finishDraw(config)
    }, Cesium.ScreenSpaceEventType.LEFT_DOUBLE_CLICK)
  }

  /**
   * 设置圆绘制
   */
  private setupCircleDraw(config: DrawConfig): void {
    if (!this.handler || !this.viewer) return

    let centerPosition: Cesium.Cartesian3 | null = null
    let currentRadius = 0
    let isDrawingCircle = false // 状态标志：是否在绘制圆
    let clickCount = 0 // 点击计数

    // 点击事件处理
    this.handler.setInputAction((click: any) => {
      const cartesian = this.pickPosition(click.position)
      if (!cartesian) return

      clickCount++
      console.log('[DrawManager] Circle click count:', clickCount, 'isDrawingCircle:', isDrawingCircle)

      if (clickCount === 1) {
        // 第一次点击：设置圆心
        centerPosition = cartesian
        this.tempPositions = [cartesian]
        isDrawingCircle = true

        // 创建动态圆
        this.activeEntity = this.viewer!.entities.add({
          position: centerPosition,
          ellipse: {
            semiMinorAxis: new Cesium.CallbackProperty(() => currentRadius, false),
            semiMajorAxis: new Cesium.CallbackProperty(() => currentRadius, false),
            height: 0,
            material: config.style?.polygon?.material || Cesium.Color.RED.withAlpha(0.6),
            outline: config.style?.polygon?.outline ?? true,
            outlineColor: config.style?.polygon?.outlineColor || Cesium.Color.WHITE,
            outlineWidth: 4,
            classificationType: Cesium.ClassificationType.TERRAIN
          }
        })

        console.log('[DrawManager] Circle entity created, move mouse to adjust radius, click again to finish')
      } else if (clickCount === 2 && isDrawingCircle) {
        // 第二次点击：结束绘制
        console.log('[DrawManager] Circle draw finished, radius:', currentRadius)

        // 直接使用当前半径，确保和显示的一致
        const finalRadius = currentRadius
        if (this.activeEntity) {
          ;(this.activeEntity.ellipse as any).semiMinorAxis = finalRadius
          ;(this.activeEntity.ellipse as any).semiMajorAxis = finalRadius
        }

        // 添加圆的边界点到 positions 用于计算包围盒
        if (centerPosition) {
          const numPoints = 8
          const radius = finalRadius
          for (let i = 0; i < numPoints; i++) {
            const angle = (i / numPoints) * 2 * Math.PI
            const cartographic = Cesium.Cartographic.fromCartesian(centerPosition)
            const point = Cesium.Cartesian3.fromRadians(
              cartographic.longitude + (radius / 6378137) * Math.cos(angle),
              cartographic.latitude + (radius / 6378137) * Math.sin(angle),
              cartographic.height
            )
            this.tempPositions.push(point)
          }
        }

        isDrawingCircle = false
        this.finishDraw(config)
      }
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK)

    // 移动更新半径
    this.handler.setInputAction((move: any) => {
      if (isDrawingCircle && centerPosition) {
        const cartesian = this.pickPosition(move.endPosition)
        if (cartesian) {
          currentRadius = Cesium.Cartesian3.distance(centerPosition, cartesian)
          console.log('[DrawManager] Circle radius:', currentRadius)
          if (this.activeEntity) {
            ;(this.activeEntity.ellipse as any).semiMinorAxis = currentRadius
            ;(this.activeEntity.ellipse as any).semiMajorAxis = currentRadius
          }
        }
      }
    }, Cesium.ScreenSpaceEventType.MOUSE_MOVE)
  }

  /**
   * 设置矩形绘制
   */
  private setupRectangleDraw(config: DrawConfig): void {
    if (!this.handler || !this.viewer) return

    let startPosition: Cesium.Cartesian3 | null = null
    let currentRectangle: Cesium.Rectangle | null = null
    let isDrawingRect = false
    let clickCount = 0

    // 点击事件处理
    this.handler.setInputAction((click: any) => {
      const cartesian = this.pickPosition(click.position)
      if (!cartesian) return

      clickCount++
      console.log('[DrawManager] Rectangle click count:', clickCount, 'isDrawingRect:', isDrawingRect)

      if (clickCount === 1) {
        // 第一次点击：设置起点
        startPosition = cartesian
        this.tempPositions = [cartesian]
        isDrawingRect = true

        console.log('[DrawManager] Rectangle start position set, move mouse to adjust size, click again to finish')
      } else if (clickCount === 2 && isDrawingRect) {
        // 第二次点击：结束绘制
        console.log('[DrawManager] Rectangle draw finished')

        // 确保位置信息被记录
        if (startPosition && !currentRectangle) {
          // 如果没有移动鼠标，创建一个默认大小的矩形
          const startCartographic = Cesium.Cartographic.fromCartesian(startPosition)
          const smallOffset = 0.001
          currentRectangle = Cesium.Rectangle.fromCartographicArray([
            startCartographic,
            new Cesium.Cartographic(
              startCartographic.longitude + smallOffset,
              startCartographic.latitude + smallOffset
            )
          ])
        }

        if (currentRectangle && this.activeEntity) {
          ;(this.activeEntity.rectangle as any).coordinates = currentRectangle

          // 添加矩形的四个角点到 tempPositions 用于计算包围盒
          const west = Cesium.Math.toDegrees(currentRectangle.west)
          const south = Cesium.Math.toDegrees(currentRectangle.south)
          const east = Cesium.Math.toDegrees(currentRectangle.east)
          const north = Cesium.Math.toDegrees(currentRectangle.north)

          this.tempPositions = [
            Cesium.Cartesian3.fromDegrees(west, south),
            Cesium.Cartesian3.fromDegrees(east, south),
            Cesium.Cartesian3.fromDegrees(east, north),
            Cesium.Cartesian3.fromDegrees(west, north)
          ]
        }

        isDrawingRect = false
        this.finishDraw(config)
      }
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK)

    // 移动更新矩形
    this.handler.setInputAction((move: any) => {
      if (isDrawingRect && startPosition) {
        const cartesian = this.pickPosition(move.endPosition)
        if (cartesian) {
          const startCartographic = Cesium.Cartographic.fromCartesian(startPosition)
          const endCartographic = Cesium.Cartographic.fromCartesian(cartesian)

          currentRectangle = Cesium.Rectangle.fromCartographicArray([
            startCartographic,
            endCartographic
          ])

          console.log('[DrawManager] Rectangle moving, rectangle:', currentRectangle)

          if (!this.activeEntity && currentRectangle) {
            this.activeEntity = this.viewer!.entities.add({
              rectangle: {
                coordinates: currentRectangle,
                material: config.style?.polygon?.material || Cesium.Color.RED.withAlpha(0.6),
                outline: config.style?.polygon?.outline ?? true,
                outlineColor: config.style?.polygon?.outlineColor || Cesium.Color.WHITE,
                outlineWidth: 4,
                height: 0,
                classificationType: Cesium.ClassificationType.TERRAIN
              }
            })
          } else if (this.activeEntity && currentRectangle) {
            ;(this.activeEntity.rectangle as any).coordinates = currentRectangle
          }
        }
      }
    }, Cesium.ScreenSpaceEventType.MOUSE_MOVE)
  }

  /**
   * 拾取位置
   */
  private pickPosition(windowPosition: Cesium.Cartesian2): Cesium.Cartesian3 | undefined {
    if (!this.viewer) return undefined

    // 尝试多种拾取方式
    // 1. 首先尝试从场景拾取（如果有地形）
    let cartesian = this.viewer.scene.pickPosition(windowPosition)

    // 2. 如果拾取失败，使用椭球面拾取
    if (!cartesian) {
      cartesian = this.viewer.camera.pickEllipsoid(windowPosition, this.viewer.scene.globe.ellipsoid)
    }

    // 3. 如果还是失败，尝试从相机射线计算
    if (!cartesian) {
      const ray = this.viewer.camera.getPickRay(windowPosition)
      cartesian = this.viewer.scene.globe.pick(ray!, this.viewer.scene)
    }

    return cartesian || undefined
  }

  /**
   * 结束绘制
   */
  private finishDraw(config?: DrawConfig): void {
    if (this.activeEntity) {
      this.emitEvent({
        type: 'end',
        drawType: this.currentDrawType!,
        entity: this.activeEntity,
        positions: this.tempPositions
      })

      // 如果配置了自动定位，飞向绘制位置
      if (config?.autoFlyTo && this.tempPositions.length > 0 && this.viewer) {
        // 计算包围盒中心和合适的观察距离
        let boundingSphere: Cesium.BoundingSphere

        if (this.tempPositions.length === 1) {
          // 单点（点绘制）
          boundingSphere = new Cesium.BoundingSphere(this.tempPositions[0], 0)
        } else {
          // 多点（线、面、圆、矩形）
          boundingSphere = Cesium.BoundingSphere.fromPoints(this.tempPositions)
        }

        // 计算合适的观察距离（包围盒半径的 3 倍）
        const distance = boundingSphere.radius * 3
        const center = boundingSphere.center

        this.viewer.camera.flyToBoundingSphere(boundingSphere, {
          offset: new Cesium.HeadingPitchRange(
            0, // heading
            -Cesium.Math.PI_OVER_FOUR, // pitch: 俯视 45 度
            distance // 距离
          ),
          duration: 1.5
        })
      }
    }

    this.reset()
  }

  /**
   * 取消绘制
   */
  cancelDraw(): void {
    this.emitEvent({
      type: 'cancel',
      drawType: this.currentDrawType!
    })

    this.reset()
  }

  /**
   * 重置状态
   */
  private reset(): void {
    // 移除临时实体
    this.tempEntities.forEach(entity => {
      if (this.viewer) {
        this.viewer.entities.remove(entity)
      }
    })
    this.tempEntities = []

    // 移除事件处理器
    if (this.handler) {
      this.handler.destroy()
      this.handler = null
    }

    this.drawing = false
    this.currentDrawType = null
    this.activeEntity = null
    this.tempPositions = []
  }

  /**
   * 监听绘制事件
   */
  on(event: 'start' | 'update' | 'end' | 'cancel', callback: (event: DrawEvent) => void): void {
    const callbacks = this.eventCallbacks.get(event) || []
    callbacks.push(callback)
    this.eventCallbacks.set(event, callbacks)
  }

  /**
   * 取消监听
   */
  off(event: 'start' | 'update' | 'end' | 'cancel', callback: (event: DrawEvent) => void): void {
    const callbacks = this.eventCallbacks.get(event) || []
    const index = callbacks.indexOf(callback)
    if (index > -1) {
      callbacks.splice(index, 1)
    }
    this.eventCallbacks.set(event, callbacks)
  }

  /**
   * 触发事件
   */
  private emitEvent(event: DrawEvent): void {
    const callbacks = this.eventCallbacks.get(event.type) || []
    callbacks.forEach(callback => callback(event))
  }

  /**
   * 是否正在绘制
   */
  isDrawing(): boolean {
    return this.drawing
  }

  /**
   * 获取当前绘制的实体
   */
  getActiveEntity(): Cesium.Entity | null {
    return this.activeEntity
  }

  /**
   * 销毁
   */
  destroy(): void {
    this.cancelDraw()
  }
}

/**
 * 全局绘图管理器实例（模块私有，防止外部直接修改）
 */
let drawManagerInstance: DrawManager | null = null

/**
 * 初始化绘图管理器
 */
export function initDrawManager(): DrawManager {
  if (!drawManagerInstance) {
    drawManagerInstance = new DrawManager()
  }
  return drawManagerInstance
}

/**
 * 获取绘图管理器
 */
export function getDrawManager(): DrawManager | null {
  return drawManagerInstance
}
