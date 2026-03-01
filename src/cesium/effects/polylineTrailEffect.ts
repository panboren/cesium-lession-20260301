/**
 * 飞线特效 - Cesium 1.138+ 优化版本
 */

import * as Cesium from 'cesium'

/**
 * 飞线材质属性类
 */
class FlyLineMaterialProperty implements Cesium.MaterialProperty {
  private _definitionChanged = new Cesium.Event()
  private _time = 0
  private _color: Cesium.Color
  private _speed: number
  private _percent: number
  private _headColor: Cesium.Color

  constructor(color: Cesium.Color, speed: number, percent: number, headColor?: Cesium.Color) {
    this._color = color
    this._speed = speed
    this._percent = percent
    this._headColor = headColor || color
  }

  get definitionChanged(): Cesium.Event {
    return this._definitionChanged
  }

  get isConstant(): boolean {
    return false
  }

  getType(time: Cesium.JulianDate): string {
    return 'FlyLine'
  }

  getValue(time: Cesium.JulianDate, result?: any): any {
    if (!result) {
      result = {}
    }
    this._time += 0.02
    result.time = this._time
    result.color = this._color
    result.speed = this._speed
    result.percent = this._percent
    result.headColor = this._headColor
    return result
  }

  equals(other: Cesium.MaterialProperty | undefined): boolean {
    return (
      other instanceof FlyLineMaterialProperty &&
      Cesium.Color.equals(other._color, this._color) &&
      other._speed === this._speed &&
      other._percent === this._percent
    )
  }
}

/**
 * 飞线特效类 - 支持自定义流动材质和内置材质
 */
export class PolylineTrailEffect {
  private viewer: Cesium.Viewer
  private entities: Cesium.Entity[] = []

  constructor(viewer: Cesium.Viewer) {
    this.viewer = viewer
  }

  /**
   * 创建飞线 - 使用自定义流动材质
   */
  create(
    startLon: number,
    startLat: number,
    startHeight: number,
    endLon: number,
    endLat: number,
    endHeight: number,
    options: {
      width?: number
      color?: Cesium.Color
      speed?: number
      percent?: number
      useBuiltIn?: boolean
      headColor?: Cesium.Color
    } = {}
  ): Cesium.Entity {
    const {
      width = 4,
      color = Cesium.Color.fromCssColorString('#00f2ff'),
      speed = 1.0,
      percent = 0.4,
      useBuiltIn = false
    } = options

    // 光头颜色 - 高亮青色
    const headColor = options.headColor || Cesium.Color.fromCssColorString('#00ffff')

    let material: any

    if (useBuiltIn) {
      // 使用内置的PolylineGlow材质
      material = new Cesium.PolylineGlowMaterialProperty({
        glowPower: 0.3,
        color: color
      })
    } else {
      // 使用自定义流动材质
      material = new FlyLineMaterialProperty(color, speed, percent, headColor)
    }

    const entity = this.viewer.entities.add({
      name: 'flyLine',
      polyline: {
        positions: [
          Cesium.Cartesian3.fromDegrees(startLon, startLat, startHeight),
          Cesium.Cartesian3.fromDegrees(endLon, endLat, endHeight)
        ],
        width: width,
        material: material
      }
    })

    this.entities.push(entity)
    return entity
  }

  /**
   * 批量创建飞线
   */
  createMultiple(lines: Array<{
    startLon: number
    startLat: number
    startHeight: number
    endLon: number
    endLat: number
    endHeight: number
    width?: number
    color?: Cesium.Color
    speed?: number
  }>): Cesium.Entity[] {
    const created: Cesium.Entity[] = []
    lines.forEach((line) => {
      const entity = this.create(
        line.startLon,
        line.startLat,
        line.startHeight,
        line.endLon,
        line.endLat,
        line.endHeight,
        {
          width: line.width || 4,
          color: line.color || Cesium.Color.CYAN,
          speed: line.speed || 1.0
        }
      )
      created.push(entity)
    })

    console.log('[PolylineTrailEffect] Created', created.length, 'fly lines')

    return created
  }

  /**
   * 销毁所有飞线
   */
  destroy(): void {
    this.entities.forEach((entity) => {
      this.viewer.entities.remove(entity)
    })
    this.entities = []
  }

  /**
   * 获取所有飞线实体
   */
  getEntities(): Cesium.Entity[] {
    return this.entities
  }
}
