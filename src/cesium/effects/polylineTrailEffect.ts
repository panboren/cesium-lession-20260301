/**
 * 流光线条特效
 */

import * as Cesium from 'cesium'

let typeNum = 0

/**
 * 流光线条材质属性类
 */
export class PolylineTrailMaterialProperty {
  private color: Cesium.Color
  private num: number
  private definitionChanged = new Cesium.Event()
  private params: { uTime: number }
  private timeValue: number = 0
  private intervalId: number | null = null

  constructor(color: Cesium.Color = new Cesium.Color(0.7, 0.6, 1.0, 1.0)) {
    this.color = color
    typeNum++
    this.num = typeNum
    this.params = { uTime: 0 }

    Cesium.Material._materialCache.addMaterial('PolylineTrailMaterial' + this.num, {
      fabric: {
        type: 'PolylineTrailMaterial' + this.num,
        uniforms: {
          uTime: 0,
          color: this.color
        },
        source: `
          czm_material czm_getMaterial(czm_materialInput materialInput)
          {
            // 生成默认的基础材质
            czm_material material = czm_getDefaultMaterial(materialInput);
            // 获取st
            vec2 st = materialInput.st;
            // 获取当前帧数,10秒内变化从0-1；
            float time = fract(czm_frameNumber / (60.0*10.0));
            time = time * (1.0 + 0.1);
            // 平滑过渡函数
            float alpha = smoothstep(time-0.1,time, st.s) * step(-time,-st.s);
            alpha += 0.05;
            // 设置材质的透明度
            material.alpha = alpha;
            material.diffuse = color.rgb;

            return material;
          }
        `
      }
    })

    this.startAnimation()
  }

  startAnimation(): void {
    if (this.intervalId) return

    this.intervalId = window.setInterval(() => {
      this.timeValue += 0.01
      if (this.timeValue > 1) {
        this.timeValue = 0
      }
      this.params.uTime = this.timeValue
      this.definitionChanged.raiseEvent(this)
    }, 16)
  }

  stopAnimation(): void {
    if (this.intervalId) {
      window.clearInterval(this.intervalId)
      this.intervalId = null
    }
  }

  getType(): string {
    return 'PolylineTrailMaterial' + this.num
  }

  getValue(time: Cesium.JulianDate, result: any): any {
    if (!result) result = {}
    result.uTime = this.params.uTime
    return result
  }

  equals(other: any): boolean {
    return other instanceof PolylineTrailMaterialProperty && this.color.equals(other.color)
  }

  destroy(): void {
    this.stopAnimation()
  }
}

/**
 * 飞线特效类
 */
export class PolylineTrailEffect {
  private viewer: Cesium.Viewer
  private entities: Cesium.Entity[] = []
  private material: PolylineTrailMaterialProperty

  constructor(viewer: Cesium.Viewer, color?: Cesium.Color) {
    this.viewer = viewer
    this.material = new PolylineTrailMaterialProperty(color)
  }

  /**
   * 创建飞线
   */
  create(
    startLon: number,
    startLat: number,
    startHeight: number,
    endLon: number,
    endLat: number,
    endHeight: number,
    width: number = 2
  ): Cesium.Entity {
    const entity = this.viewer.entities.add({
      polyline: {
        positions: [
          Cesium.Cartesian3.fromDegrees(startLon, startLat, startHeight),
          Cesium.Cartesian3.fromDegrees(endLon, endLat, endHeight)
        ],
        width: width,
        material: this.material
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
  }>): Cesium.Entity[] {
    const created: Cesium.Entity[] = []
    lines.forEach((line) => {
      created.push(
        this.create(
          line.startLon,
          line.startLat,
          line.startHeight,
          line.endLon,
          line.endLat,
          line.endHeight,
          line.width
        )
      )
    })
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
    this.material.destroy()
  }
}
