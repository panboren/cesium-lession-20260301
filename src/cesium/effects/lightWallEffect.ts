/**
 * 光墙特效 - Cesium 1.138+ 优化版本
 */

import * as Cesium from 'cesium'

/**
 * 光墙材质属性类
 */
class LightWallMaterialProperty implements Cesium.MaterialProperty {
  private _definitionChanged = new Cesium.Event()
  private _time = 0
  private _color: Cesium.Color
  private _direction: number
  private _beamColor: Cesium.Color

  constructor(color: Cesium.Color, direction: number, beamColor?: Cesium.Color) {
    this._color = color
    this._direction = direction
    this._beamColor = beamColor || color
  }

  get definitionChanged(): Cesium.Event {
    return this._definitionChanged
  }

  get isConstant(): boolean {
    return false
  }

  getType(time: Cesium.JulianDate): string {
    return 'LightWall'
  }

  getValue(time: Cesium.JulianDate, result?: any): any {
    if (!result) {
      result = {}
    }
    this._time += 0.02
    result.time = this._time
    result.color = this._color
    result.direction = this._direction
    result.beamColor = this._beamColor
    return result
  }

  equals(other: Cesium.MaterialProperty | undefined): boolean {
    return (
      other instanceof LightWallMaterialProperty &&
      Cesium.Color.equals(other._color, this._color) &&
      other._direction === this._direction
    )
  }
}

/**
 * 光墙特效类
 */
export class LightWallEffect {
  private viewer: Cesium.Viewer
  private entity: Cesium.Entity | null = null
  private materialProperty: LightWallMaterialProperty | null = null

  constructor(viewer: Cesium.Viewer) {
    this.viewer = viewer
  }

  /**
   * 创建光墙
   * @param positions [lon, lat, lon, lat, ...] 格式的经纬度数组
   */
  create(
    positions: number[],
    height: number,
    options: {
      color?: Cesium.Color
      direction?: number
      minHeight?: number
      beamColor?: Cesium.Color
    } = {}
  ): Cesium.Entity {
    const { color = Cesium.Color.fromCssColorString('#07329f'), direction = 1.0, minHeight = 0 } = options

    // 光束颜色 - 紫色
    const beamColor = options.beamColor || Cesium.Color.fromCssColorString('#550598')

    // 将 [lon, lat, lon, lat, ...] 转换为 [lon, lat, minHeight, lon, lat, height, ...]
    const wallPositions: number[] = []
    for (let i = 0; i < positions.length; i += 2) {
      wallPositions.push(positions[i], positions[i + 1], minHeight)
    }
    // 闭合路径 - 回到起点
    wallPositions.push(positions[0], positions[1], minHeight)

    const cartesianPositions = Cesium.Cartesian3.fromDegreesArrayHeights(wallPositions)

    // 创建材质属性实例
    this.materialProperty = new LightWallMaterialProperty(color, direction, beamColor)

    this.entity = this.viewer.entities.add({
      name: 'lightWall',
      wall: {
        positions: cartesianPositions,
        maximumHeights: new Array(positions.length / 2 + 1).fill(height),
        material: this.materialProperty,
        outline: true,
        outlineColor: beamColor.withAlpha(0.6),
        outlineWidth: 2
      }
    })

    console.log('[LightWallEffect] Tech-style wall created with', positions.length / 2, 'points, height:', height)

    return this.entity
  }

  /**
   * 销毁光墙
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
   * 更新流动方向
   */
  setDirection(direction: number): void {
    if (this.materialProperty) {
      this.materialProperty._direction = direction
    }
  }
}
