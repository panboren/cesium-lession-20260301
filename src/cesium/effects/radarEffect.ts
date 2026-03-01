/**
 * 雷达扫描特效 - Cesium 1.138+ 优化版本
 */

import * as Cesium from 'cesium'

/**
 * 雷达材质属性类 - 实现MaterialProperty接口
 */
class RadarMaterialProperty implements Cesium.MaterialProperty {
  private _definitionChanged = new Cesium.Event()
  private _time = 0
  private _color: Cesium.Color
  private _scanSpeed: number
  private _ringColor: Cesium.Color
  private _scanColor: Cesium.Color

  constructor(
    color: Cesium.Color,
    scanSpeed: number,
    ringColor?: Cesium.Color,
    scanColor?: Cesium.Color
  ) {
    this._color = color
    this._scanSpeed = scanSpeed
    this._ringColor = ringColor || color
    this._scanColor = scanColor || color
  }

  get definitionChanged(): Cesium.Event {
    return this._definitionChanged
  }

  get isConstant(): boolean {
    return false
  }

  getType(time: Cesium.JulianDate): string {
    return 'Radar'
  }

  getValue(time: Cesium.JulianDate, result?: any): any {
    if (!result) {
      result = {}
    }
    this._time += 0.02
    result.time = this._time
    result.color = this._color
    result.scanSpeed = this._scanSpeed
    result.ringColor = this._ringColor
    result.scanColor = this._scanColor
    return result
  }

  equals(other: Cesium.MaterialProperty | undefined): boolean {
    return (
      other instanceof RadarMaterialProperty &&
      Cesium.Color.equals(other._color, this._color) &&
      other._scanSpeed === this._scanSpeed
    )
  }
}

/**
 * 雷达扫描特效类
 */
export class RadarEffect {
  private viewer: Cesium.Viewer
  private entity: Cesium.Entity | null = null
  private materialProperty: RadarMaterialProperty | null = null

  constructor(viewer: Cesium.Viewer) {
    this.viewer = viewer
  }

  /**
   * 在指定位置创建雷达
   * @param centerLon 中心经度
   * @param centerLat 中心纬度
   * @param radius 半径（米）
   */
  create(
    centerLon: number,
    centerLat: number,
    radius: number = 5000,
    options: {
      color?: Cesium.Color
      scanSpeed?: number
      height?: number
      ringColor?: Cesium.Color
      scanColor?: Cesium.Color
    } = {}
  ): Cesium.Entity {
    // 紫蓝科技配色
    const { color = Cesium.Color.fromCssColorString('#07329f').withAlpha(0.3), scanSpeed = 0.25, height = 100 } = options

    // 扫描线颜色 - 紫色
    const scanColor = options.scanColor || Cesium.Color.fromCssColorString('#550598')

    // 圆环颜色 - 紫色
    const ringColor = options.ringColor || Cesium.Color.fromCssColorString('#550598')

    // 创建材质属性实例
    this.materialProperty = new RadarMaterialProperty(color, scanSpeed, ringColor, scanColor)

    // 创建圆形雷达
    this.entity = this.viewer.entities.add({
      name: 'radar',
      position: Cesium.Cartesian3.fromDegrees(centerLon, centerLat, height),
      ellipse: {
        semiMinorAxis: radius,
        semiMajorAxis: radius,
        material: this.materialProperty,
        height: height,
        outline: true,
        outlineColor: scanColor.withAlpha(0.6),
        outlineWidth: 2
      }
    })

    console.log('[RadarEffect] Tech-style radar created at', centerLon, centerLat, 'radius:', radius)

    return this.entity
  }

  /**
   * 销毁雷达
   */
  destroy(): void {
    if (this.entity) {
      this.viewer.entities.remove(this.entity)
      this.entity = null
    }

    this.materialProperty = null
  }

  /**
   * 更新颜色
   */
  setColor(color: Cesium.Color): void {
    if (this.materialProperty) {
      this.materialProperty._color = color
    }
  }

  /**
   * 更新扫描速度
   */
  setScanSpeed(speed: number): void {
    if (this.materialProperty) {
      this.materialProperty._scanSpeed = speed
    }
  }
}
