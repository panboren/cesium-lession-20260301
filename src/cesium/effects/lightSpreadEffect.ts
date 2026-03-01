/**
 * 流光扩散特效 - Cesium 1.138+ 优化版本
 */

import * as Cesium from 'cesium'

/**
 * 流光扩散材质属性类
 */
class LightSpreadMaterialProperty implements Cesium.MaterialProperty {
  private _definitionChanged = new Cesium.Event()
  private _time = 0
  private _color: Cesium.Color
  private _waveCount: number
  private _centerColor: Cesium.Color
  private _waveColor: Cesium.Color

  constructor(color: Cesium.Color, waveCount: number, centerColor?: Cesium.Color, waveColor?: Cesium.Color) {
    this._color = color
    this._waveCount = waveCount
    this._centerColor = centerColor || color
    this._waveColor = waveColor || color
  }

  get definitionChanged(): Cesium.Event {
    return this._definitionChanged
  }

  get isConstant(): boolean {
    return false
  }

  getType(time: Cesium.JulianDate): string {
    return 'LightSpread'
  }

  getValue(time: Cesium.JulianDate, result?: any): any {
    if (!result) {
      result = {}
    }
    this._time += 0.02
    result.time = this._time
    result.color = this._color
    result.waveCount = this._waveCount
    result.centerColor = this._centerColor
    result.waveColor = this._waveColor
    return result
  }

  equals(other: Cesium.MaterialProperty | undefined): boolean {
    return (
      other instanceof LightSpreadMaterialProperty &&
      Cesium.Color.equals(other._color, this._color) &&
      other._waveCount === this._waveCount
    )
  }
}

/**
 * 流光扩散特效类
 */
export class LightSpreadEffect {
  private viewer: Cesium.Viewer
  private entity: Cesium.Entity | null = null
  private materialProperty: LightSpreadMaterialProperty | null = null

  constructor(viewer: Cesium.Viewer) {
    this.viewer = viewer
  }

  /**
   * 创建流光扩散
   */
  create(
    minLon: number,
    minLat: number,
    maxLon: number,
    maxLat: number,
    options: {
      color?: Cesium.Color
      waveCount?: number
      height?: number
      centerColor?: Cesium.Color
      waveColor?: Cesium.Color
    } = {}
  ): Cesium.Entity {
    const {
      color = Cesium.Color.fromCssColorString('#00ccff'),
      waveCount = 5,
      height = 100
    } = options

    // 中心颜色 - 高亮青色
    const centerColor = options.centerColor || Cesium.Color.fromCssColorString('#00ffff')

    // 波纹颜色
    const waveColor = options.waveColor || Cesium.Color.fromCssColorString('#00d9ff')

    // 创建材质属性实例
    this.materialProperty = new LightSpreadMaterialProperty(color, waveCount, centerColor, waveColor)

    this.entity = this.viewer.entities.add({
      name: 'lightSpread',
      rectangle: {
        coordinates: Cesium.Rectangle.fromDegrees(minLon, minLat, maxLon, maxLat),
        material: this.materialProperty,
        height: height,
        outline: true,
        outlineColor: centerColor.withAlpha(0.6),
        outlineWidth: 2,
        stRotation: 0
      }
    })

    console.log('[LightSpreadEffect] Tech-style light spread created from', minLon, minLat, 'to', maxLon, maxLat)

    return this.entity
  }

  /**
   * 销毁特效
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
   * 更新波纹数量
   */
  setWaveCount(count: number): void {
    if (this.materialProperty) {
      this.materialProperty._waveCount = count
    }
  }
}
