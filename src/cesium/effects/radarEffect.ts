/**
 * 雷达扫描特效
 */

import * as Cesium from 'cesium'

/**
 * 雷达材质属性类
 */
export class RadarMaterialProperty {
  private name: string
  private definitionChanged = new Cesium.Event()
  private params: { uTime: number }
  private timeValue: number = 0
  private intervalId: number | null = null

  constructor(name: string = 'RadarMaterial') {
    this.name = name
    this.params = { uTime: 0 }

    Cesium.Material._materialCache.addMaterial('RadarMaterial', {
      fabric: {
        type: 'RadarMaterial',
        uniforms: {
          uTime: 0
        },
        source: `
          czm_material czm_getMaterial(czm_materialInput materialInput)
          {
            // 生成默认的基础材质
            czm_material material = czm_getDefaultMaterial(materialInput);
            // 旋转uv
            vec2 newSt = mat2(
              cos(uTime),-sin(uTime),
              sin(uTime),cos(uTime)
            )*(materialInput.st-0.5);

            newSt = newSt+0.5;

            // 获取st
            vec2 st = newSt;

            // 设置圆，外部透明，内部不透明
            float alpha = 1.0 - step(0.5,distance(st,vec2(0.5))) ;

            // 按照角度来设置强弱
            float angle = atan(st.x-0.5,st.y-0.5);
            // angle是从-pi到pi的，所以如果要设置从0-1的转变，需要加上pi
            float strength = (angle+3.1416)/6.2832;

            // 将强弱与透明度结合
            alpha = alpha*strength;
            material.alpha = alpha;
            material.diffuse = vec3(st.x,st.y,1.0);
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
      this.timeValue += 0.05
      if (this.timeValue > 6.28) {
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
    return 'RadarMaterial'
  }

  getValue(time: Cesium.JulianDate, result: any): any {
    if (!result) result = {}
    result.uTime = this.params.uTime
    return result
  }

  equals(other: any): boolean {
    return other instanceof RadarMaterialProperty && this.name === other.name
  }

  destroy(): void {
    this.stopAnimation()
  }
}

/**
 * 雷达扫描特效类
 */
export class RadarEffect {
  private viewer: Cesium.Viewer
  private entity: Cesium.Entity | null = null
  private material: RadarMaterialProperty

  constructor(viewer: Cesium.Viewer) {
    this.viewer = viewer
    this.material = new RadarMaterialProperty('RadarMaterial')
  }

  /**
   * 在指定位置创建雷达
   */
  create(
    west: number,
    south: number,
    east: number,
    north: number
  ): Cesium.Entity {
    this.entity = this.viewer.entities.add({
      name: 'radar',
      rectangle: {
        coordinates: Cesium.Rectangle.fromDegrees(west, south, east, north),
        material: this.material
      }
    })
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
    this.material.destroy()
  }
}
