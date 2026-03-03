/**
 * Cesium 绘图管理器
 * 提供点、线、面、圆、矩形等几何图形的绘制功能
 */

import * as Cesium from 'cesium'
import { getCesiumManager } from './cesiumManager'
import { DrawType } from '@/types/cesium'
import type { DrawStyle, DrawConfig, DrawEvent } from '@/types/cesium'
import {
  DRAWING_CONSTANTS,
  PRIMITIVE_CONSTANTS
} from '../constants'

/**
 * 动态多边形接口
 * 用于处理 CallbackProperty 更新的多边形
 */
interface DynamicPolygon extends Cesium.PolygonGraphics {
  hierarchy?: Cesium.CallbackProperty
}

/**
 * 动态椭圆接口
 * 用于处理 CallbackProperty 更新的椭圆
 */
interface DynamicEllipse extends Cesium.EllipseGraphics {
  semiMinorAxis?: number
  semiMajorAxis?: number
}

/**
 * 动态线段接口
 * 用于处理 CallbackProperty 更新的线段
 */
interface DynamicPolyline extends Cesium.PolylineGraphics {
  positions?: Cesium.CallbackProperty
}

/**
 * 动态矩形接口
 * 用于处理 CallbackProperty 更新的矩形
 */
interface DynamicRectangle extends Cesium.RectangleGraphics {
  coordinates?: Cesium.Rectangle
}

/**
 * 绘制上下文
 */
interface DrawContext {
  viewer: Cesium.Viewer
  handler: Cesium.ScreenSpaceEventHandler
  config: DrawConfig
  tempPositions: Cesium.Cartesian3[]
  activeEntity: Cesium.Entity | null
  onEntityCreated: (entity: Cesium.Entity) => void
  onFinish: () => void
}

/**
 * 绘制策略基类
 */
abstract class DrawStrategy {
  protected context: DrawContext

  constructor(context: DrawContext) {
    this.context = context
  }

  /**
   * 设置事件处理器
   */
  abstract setupEvents(): void

  /**
   * 清理资源
   */
  cleanup(): void {
    // 子类可覆盖
  }

  /**
   * 获取默认样式
   */
  protected getDefaultStyle(type: DrawType): DrawStyle {
    switch (type) {
      case DrawType.POINT:
        return {
          point: {
            pixelSize: DRAWING_CONSTANTS.POINT_PIXEL_SIZE,
            color: Cesium.Color.YELLOW,
            outlineColor: Cesium.Color.RED,
            outlineWidth: DRAWING_CONSTANTS.POINT_OUTLINE_WIDTH,
            disableDepthTestDistance: Number.POSITIVE_INFINITY
          }
        }
      case DrawType.POLYLINE:
        return {
          line: {
            width: DRAWING_CONSTANTS.LINE_WIDTH,
            material: Cesium.Color.RED,
            clampToGround: false
          }
        }
      case DrawType.POLYGON:
      case DrawType.CIRCLE:
      case DrawType.RECTANGLE:
        return {
          polygon: {
            material: Cesium.Color.RED.withAlpha(0.6),
            outline: true,
            outlineColor: Cesium.Color.WHITE,
            outlineWidth: DRAWING_CONSTANTS.POLYGON_OUTLINE_WIDTH,
            perPositionHeight: false
          }
        }
      default:
        return {}
    }
  }

  /**
   * 从屏幕坐标拾取位置（尝试多种拾取方式提高精度）
   */
  protected pickPosition(windowPosition: Cesium.Cartesian2): Cesium.Cartesian3 | undefined {
    const viewer = this.context.viewer

    // 方法1: 使用 scene.pickPosition（优先级最高，适用于 3D 场景）
    let cartesian = viewer.scene.pickPosition(windowPosition)

    // 方法2: 使用 camera.pickEllipsoid（适用于地球表面）
    if (!cartesian) {
      cartesian = viewer.camera.pickEllipsoid(windowPosition, viewer.scene.globe.ellipsoid)
    }

    // 方法3: 使用 globe.pick（适用于地形）
    if (!cartesian) {
      const ray = viewer.camera.getPickRay(windowPosition)
      cartesian = viewer.scene.globe.pick(ray!, viewer.scene)
    }

    return cartesian || undefined
  }
}

/**
 * 点绘制策略
 */
class PointDrawStrategy extends DrawStrategy {
  setupEvents(): void {
    this.context.handler.setInputAction(
      (click: Cesium.ScreenSpaceEventHandler.ClickedEvent) => {
        const cartesian = this.pickPosition(click.position)
        if (!cartesian) return

        this.context.tempPositions.push(cartesian)

        const style = this.context.config.style || this.getDefaultStyle(DrawType.POINT)

        // 创建 Entity
        const entity = this.context.viewer.entities.add({
          position: cartesian,
          point: style.point,
          properties: this.context.config.properties
        })

        this.context.activeEntity = entity
        this.context.onEntityCreated(entity)
        this.context.onFinish()
      },
      Cesium.ScreenSpaceEventType.LEFT_CLICK
    )
  }
}

/**
 * 线绘制策略
 */
class PolylineDrawStrategy extends DrawStrategy {
  private positions: Cesium.Cartesian3[] = []

  setupEvents(): void {
    const handler = this.context.handler

    // 点击添加点
    handler.setInputAction(
      (click: Cesium.ScreenSpaceEventHandler.ClickedEvent) => {
        const cartesian = this.pickPosition(click.position)
        if (!cartesian) return

        this.positions.push(cartesian)
        this.context.tempPositions = this.positions

        if (this.positions.length === 1) {
          this.createDynamicPolyline()
        }
      },
      Cesium.ScreenSpaceEventType.LEFT_CLICK
    )

    // 移动更新预览
    handler.setInputAction(
      (move: Cesium.ScreenSpaceEventHandler.MotionEvent) => {
        if (this.positions.length > 0) {
          this.updatePolylinePreview(move.endPosition)
        }
      },
      Cesium.ScreenSpaceEventType.MOUSE_MOVE
    )

    // 双击结束绘制
    handler.setInputAction(() => {
      this.context.onFinish()
    }, Cesium.ScreenSpaceEventType.LEFT_DOUBLE_CLICK)
  }

  private createDynamicPolyline(): void {
    const style = this.context.config.style || this.getDefaultStyle(DrawType.POLYLINE)

    const entity = this.context.viewer.entities.add({
      polyline: {
        positions: new Cesium.CallbackProperty(() => this.positions, false),
        width: style.line?.width || PRIMITIVE_CONSTANTS.POLYLINE_DEFAULT_WIDTH,
        material: style.line?.material || Cesium.Color.CYAN,
        clampToGround: style.line?.clampToGround ?? true
      }
    })

    this.context.activeEntity = entity
    this.context.onEntityCreated(entity)
  }

  /**
   * 更新线段预览
   */
  private updatePolylinePreview(endPosition: Cesium.Cartesian2): void {
    const cartesian = this.pickPosition(endPosition)
    if (!cartesian || !this.context.activeEntity) return

    const previewPositions = [...this.positions, cartesian]
    const dynamicPolyline = this.context.activeEntity.polyline as DynamicPolyline
    dynamicPolyline.positions = new Cesium.CallbackProperty(
      () => previewPositions,
      false
    )
  }
}

/**
 * 面绘制策略
 */
class PolygonDrawStrategy extends DrawStrategy {
  private positions: Cesium.Cartesian3[] = []

  setupEvents(): void {
    const handler = this.context.handler

    // 点击添加点
    handler.setInputAction(
      (click: Cesium.ScreenSpaceEventHandler.ClickedEvent) => {
        const cartesian = this.pickPosition(click.position)
        if (!cartesian) return

        this.positions.push(cartesian)
        this.context.tempPositions = this.positions

        if (this.positions.length === 1) {
          this.createDynamicPolygon()
        }
      },
      Cesium.ScreenSpaceEventType.LEFT_CLICK
    )

    // 移动更新预览
    handler.setInputAction(
      (move: Cesium.ScreenSpaceEventHandler.MotionEvent) => {
        if (this.positions.length > 0) {
          this.updatePolygonPreview(move.endPosition)
        }
      },
      Cesium.ScreenSpaceEventType.MOUSE_MOVE
    )

    // 双击结束绘制
    handler.setInputAction(() => {
      this.context.onFinish()
    }, Cesium.ScreenSpaceEventType.LEFT_DOUBLE_CLICK)
  }

  private createDynamicPolygon(): void {
    const style = this.context.config.style || this.getDefaultStyle(DrawType.POLYGON)

    const entity = this.context.viewer.entities.add({
      polygon: {
        hierarchy: new Cesium.CallbackProperty(() => {
          return this.positions.length >= 3
            ? new Cesium.PolygonHierarchy(this.positions)
            : null
        }, false),
        material: style.polygon?.material || Cesium.Color.CYAN.withAlpha(0.5),
        outline: style.polygon?.outline ?? true,
        outlineColor: style.polygon?.outlineColor || Cesium.Color.CYAN,
        outlineWidth: style.polygon?.outlineWidth || 2,
        perPositionHeight: style.polygon?.perPositionHeight ?? false
      }
    })

    this.context.activeEntity = entity
    this.context.onEntityCreated(entity)
  }

  /**
   * 更新多边形预览
   */
  private updatePolygonPreview(endPosition: Cesium.Cartesian2): void {
    const cartesian = this.pickPosition(endPosition)
    if (!cartesian || !this.context.activeEntity) return

    const previewPositions = [...this.positions, cartesian]
    const dynamicPolygon = this.context.activeEntity.polygon as DynamicPolygon
    dynamicPolygon.hierarchy = new Cesium.CallbackProperty(
      () => {
        return previewPositions.length >= 3
          ? new Cesium.PolygonHierarchy(previewPositions)
          : null
      },
      false
    )
  }
}

/**
 * 圆绘制策略（使用两点击模式）
 */
class CircleDrawStrategy extends DrawStrategy {
  private centerPosition: Cesium.Cartesian3 | null = null
  private currentRadius = 0
  private clickCount = 0
  private isDrawing = false

  setupEvents(): void {
    const handler = this.context.handler

    // 点击事件
    handler.setInputAction(
      (click: Cesium.ScreenSpaceEventHandler.ClickedEvent) => {
        const cartesian = this.pickPosition(click.position)
        if (!cartesian) return

        this.clickCount++

        if (this.clickCount === 1) {
          // 第一次点击：设置圆心
          this.centerPosition = cartesian
          this.context.tempPositions = [cartesian]
          this.isDrawing = true
          this.createDynamicCircle()
        } else if (this.clickCount === 2 && this.isDrawing) {
          // 第二次点击：结束绘制
          this.finishCircle()
        }
      },
      Cesium.ScreenSpaceEventType.LEFT_CLICK
    )

    // 移动更新半径
    handler.setInputAction(
      (move: Cesium.ScreenSpaceEventHandler.MotionEvent) => {
        if (this.isDrawing && this.centerPosition) {
          const cartesian = this.pickPosition(move.endPosition)
          if (cartesian) {
            this.currentRadius = Cesium.Cartesian3.distance(this.centerPosition, cartesian)
            this.updateCircleRadius()
          }
        }
      },
      Cesium.ScreenSpaceEventType.MOUSE_MOVE
    )
  }

  private createDynamicCircle(): void {
    if (!this.centerPosition) return

    const style = this.context.config.style || this.getDefaultStyle(DrawType.CIRCLE)

    const entity = this.context.viewer.entities.add({
      position: this.centerPosition,
      ellipse: {
        semiMinorAxis: new Cesium.CallbackProperty(() => this.currentRadius, false),
        semiMajorAxis: new Cesium.CallbackProperty(() => this.currentRadius, false),
        height: 0,
        material: style.polygon?.material || Cesium.Color.RED.withAlpha(0.6),
        outline: style.polygon?.outline ?? true,
        outlineColor: style.polygon?.outlineColor || Cesium.Color.WHITE,
        outlineWidth: 4,
        classificationType: Cesium.ClassificationType.TERRAIN
      }
    })

    this.context.activeEntity = entity
    this.context.onEntityCreated(entity)
  }

  private updateCircleRadius(): void {
    if (!this.context.activeEntity) return

    const dynamicEllipse = this.context.activeEntity.ellipse as DynamicEllipse
    dynamicEllipse.semiMinorAxis = this.currentRadius
    dynamicEllipse.semiMajorAxis = this.currentRadius
  }

  private finishCircle(): void {
    if (this.context.activeEntity && this.centerPosition) {
      // 固定半径值
      const dynamicEllipse = this.context.activeEntity.ellipse as DynamicEllipse
      dynamicEllipse.semiMinorAxis = this.currentRadius
      dynamicEllipse.semiMajorAxis = this.currentRadius

      // 添加圆的边界点到 positions 用于计算包围盒
      this.addCircleBoundingPoints()
    }

    this.isDrawing = false
    this.context.onFinish()
  }

  /**
   * 添加圆的边界点用于计算包围盒
   */
  private addCircleBoundingPoints(): void {
    if (!this.centerPosition) return

    const numPoints = 8
    const radius = this.currentRadius
    const cartographic = Cesium.Cartographic.fromCartesian(this.centerPosition)

    for (let i = 0; i < numPoints; i++) {
      const angle = (i / numPoints) * 2 * Math.PI
      const point = Cesium.Cartesian3.fromRadians(
        cartographic.longitude + (radius / 6378137) * Math.cos(angle),
        cartographic.latitude + (radius / 6378137) * Math.sin(angle),
        cartographic.height
      )
      this.context.tempPositions.push(point)
    }
  }
}

/**
 * 矩形绘制策略（使用两点击模式）
 */
class RectangleDrawStrategy extends DrawStrategy {
  private startPosition: Cesium.Cartesian3 | null = null
  private currentRectangle: Cesium.Rectangle | null = null
  private clickCount = 0
  private isDrawing = false

  setupEvents(): void {
    const handler = this.context.handler

    // 点击事件
    handler.setInputAction(
      (click: Cesium.ScreenSpaceEventHandler.ClickedEvent) => {
        const cartesian = this.pickPosition(click.position)
        if (!cartesian) return

        this.clickCount++

        if (this.clickCount === 1) {
          // 第一次点击：设置起点
          this.startPosition = cartesian
          this.context.tempPositions = [cartesian]
          this.isDrawing = true
        } else if (this.clickCount === 2 && this.isDrawing) {
          // 第二次点击：结束绘制
          this.finishRectangle()
        }
      },
      Cesium.ScreenSpaceEventType.LEFT_CLICK
    )

    // 移动更新矩形
    handler.setInputAction(
      (move: Cesium.ScreenSpaceEventHandler.MotionEvent) => {
        if (this.isDrawing && this.startPosition) {
          const cartesian = this.pickPosition(move.endPosition)
          if (cartesian) {
            this.updateRectangle(cartesian)
          }
        }
      },
      Cesium.ScreenSpaceEventType.MOUSE_MOVE
    )
  }

  private updateRectangle(endPosition: Cesium.Cartesian3): void {
    const startCartographic = Cesium.Cartographic.fromCartesian(this.startPosition!)
    const endCartographic = Cesium.Cartographic.fromCartesian(endPosition)

    this.currentRectangle = Cesium.Rectangle.fromCartographicArray([
      startCartographic,
      endCartographic
    ])

    if (!this.context.activeEntity && this.currentRectangle) {
      this.createRectangleEntity()
    } else if (this.context.activeEntity && this.currentRectangle) {
      this.updateRectangleEntity()
    }
  }

  /**
   * 创建矩形实体
   */
  private createRectangleEntity(): void {
    const style = this.context.config.style || this.getDefaultStyle(DrawType.RECTANGLE)

    const entity = this.context.viewer.entities.add({
      rectangle: {
        coordinates: this.currentRectangle!,
        material: style.polygon?.material || Cesium.Color.RED.withAlpha(0.6),
        outline: style.polygon?.outline ?? true,
        outlineColor: style.polygon?.outlineColor || Cesium.Color.WHITE,
        outlineWidth: DRAWING_CONSTANTS.RECTANGLE_OUTLINE_WIDTH,
        height: 0,
        classificationType: Cesium.ClassificationType.TERRAIN
      }
    })

    this.context.activeEntity = entity
    this.context.onEntityCreated(entity)
  }

  /**
   * 更新矩形实体坐标
   */
  private updateRectangleEntity(): void {
    const dynamicRectangle = this.context.activeEntity!.rectangle as DynamicRectangle
    dynamicRectangle.coordinates = this.currentRectangle!
  }

  private finishRectangle(): void {
    // 如果没有移动鼠标，创建一个默认大小的矩形
    if (this.startPosition && !this.currentRectangle) {
      this.createDefaultRectangle()
    }

    if (this.currentRectangle && this.context.activeEntity) {
      this.finalizeRectangle()
    }

    this.isDrawing = false
    this.context.onFinish()
  }

  /**
   * 创建默认大小的矩形
   */
  private createDefaultRectangle(): void {
    const startCartographic = Cesium.Cartographic.fromCartesian(this.startPosition!)
    const smallOffset = 0.001
    this.currentRectangle = Cesium.Rectangle.fromCartographicArray([
      startCartographic,
      new Cesium.Cartographic(
        startCartographic.longitude + smallOffset,
        startCartographic.latitude + smallOffset
      )
    ])
  }

  /**
   * 完成矩形绘制，更新坐标和包围盒
   */
  private finalizeRectangle(): void {
    const dynamicRectangle = this.context.activeEntity!.rectangle as DynamicRectangle
    dynamicRectangle.coordinates = this.currentRectangle!

    // 添加矩形的四个角点到 tempPositions 用于计算包围盒
    const west = Cesium.Math.toDegrees(this.currentRectangle.west)
    const south = Cesium.Math.toDegrees(this.currentRectangle.south)
    const east = Cesium.Math.toDegrees(this.currentRectangle.east)
    const north = Cesium.Math.toDegrees(this.currentRectangle.north)

    this.context.tempPositions = [
      Cesium.Cartesian3.fromDegrees(west, south),
      Cesium.Cartesian3.fromDegrees(east, south),
      Cesium.Cartesian3.fromDegrees(east, north),
      Cesium.Cartesian3.fromDegrees(west, north)
    ]
  }
}

/**
 * 绘制管理器
 */
export class DrawManager {
  private viewer: Cesium.Viewer | null = null
  private drawing: boolean = false
  private currentDrawType: DrawType | null = null
  private activeEntity: Cesium.Entity | null = null
  private tempPositions: Cesium.Cartesian3[] = []
  private handler: Cesium.ScreenSpaceEventHandler | null = null
  private eventCallbacks: Map<string, ((event: DrawEvent) => void)[]> = new Map()
  private currentStrategy: DrawStrategy | null = null

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
    this.validateStartDraw(config)
    this.initDrawState(config)
    this.createDrawStrategy(config)
    this.emitStartEvent(config)
  }

  /**
   * 验证开始绘制的条件
   */
  private validateStartDraw(config: DrawConfig): void {
    if (!this.viewer) {
      throw new Error('Cesium Viewer not initialized')
    }

    if (this.drawing) {
      throw new Error('Already drawing')
    }

    if (!Object.values(DrawType).includes(config.type)) {
      throw new Error(`Unsupported draw type: ${config.type}`)
    }
  }

  /**
   * 初始化绘制状态
   */
  private initDrawState(config: DrawConfig): void {
    this.drawing = true
    this.currentDrawType = config.type
    this.tempPositions = []
    this.handler = new Cesium.ScreenSpaceEventHandler(this.viewer.scene.canvas)
  }

  /**
   * 创建绘制策略
   */
  private createDrawStrategy(config: DrawConfig): void {
    const context: DrawContext = {
      viewer: this.viewer!,
      handler: this.handler!,
      config,
      tempPositions: this.tempPositions,
      activeEntity: this.activeEntity,
      onEntityCreated: (entity) => {
        this.activeEntity = entity
      },
      onFinish: () => {
        this.finishDraw(config)
      }
    }

    const strategyFactory = this.getStrategyFactory(config.type)
    this.currentStrategy = strategyFactory(context)
    this.currentStrategy.setupEvents()
  }

  /**
   * 获取策略工厂
   */
  private getStrategyFactory(type: DrawType): (context: DrawContext) => DrawStrategy {
    const strategyMap: Record<DrawType, (context: DrawContext) => DrawStrategy> = {
      [DrawType.POINT]: (ctx) => new PointDrawStrategy(ctx),
      [DrawType.POLYLINE]: (ctx) => new PolylineDrawStrategy(ctx),
      [DrawType.POLYGON]: (ctx) => new PolygonDrawStrategy(ctx),
      [DrawType.CIRCLE]: (ctx) => new CircleDrawStrategy(ctx),
      [DrawType.RECTANGLE]: (ctx) => new RectangleDrawStrategy(ctx)
    }

    return strategyMap[type]
  }

  /**
   * 发送开始事件
   */
  private emitStartEvent(config: DrawConfig): void {
    this.emitEvent({
      type: 'start',
      drawType: config.type
    })
  }

  /**
   * 结束绘制
   */
  private finishDraw(config?: DrawConfig): void {
    if (!this.activeEntity) {
      this.reset()
      return
    }

    this.emitEvent({
      type: 'end',
      drawType: this.currentDrawType!,
      entity: this.activeEntity,
      positions: this.tempPositions
    })

    if (config?.autoFlyTo && this.tempPositions.length > 0 && this.viewer) {
      this.flyToDrawing()
    }

    this.reset()
  }

  /**
   * 飞向绘制位置
   */
  private flyToDrawing(): void {
    let boundingSphere: Cesium.BoundingSphere

    if (this.tempPositions.length === 1) {
      boundingSphere = new Cesium.BoundingSphere(this.tempPositions[0], 0)
    } else {
      boundingSphere = Cesium.BoundingSphere.fromPoints(this.tempPositions)
    }

    const distance = boundingSphere.radius * DRAWING_CONSTANTS.FLY_DISTANCE_MULTIPLIER

    this.viewer!.camera.flyToBoundingSphere(boundingSphere, {
      offset: new Cesium.HeadingPitchRange(0, -Cesium.Math.PI_OVER_FOUR, distance),
      duration: DRAWING_CONSTANTS.FLY_DURATION
    })
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
    if (this.currentStrategy) {
      this.currentStrategy.cleanup()
      this.currentStrategy = null
    }

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
