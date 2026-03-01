/**
 * 流光扩散特效（六边形光波）
 */

import * as Cesium from 'cesium'

/**
 * 流光扩散材质属性类
 */
export class LightSpreadMaterialProperty {
  private name: string
  private definitionChanged = new Cesium.Event()
  private params: { uTime: number }
  private timeValue: number = 0
  private intervalId: number | null = null

  constructor(name: string = 'LightSpreadMaterial') {
    this.name = name
    this.params = { uTime: 0 }

    Cesium.Material._materialCache.addMaterial('LightSpreadMaterial', {
      fabric: {
        type: 'LightSpreadMaterial',
        uniforms: {
          uTime: 0
        },
        source: `
          czm_material czm_getMaterial(czm_materialInput materialInput)
          {
            czm_material material = czm_getDefaultMaterial(materialInput);
            vec2 st = materialInput.st;

            // 计算到中心的距离
            float dist = distance(st, vec2(0.5));

            // 创建六边形图案
            float hex = 1.0 - smoothstep(0.4, 0.45, dist);

            // 添加扩散动画
            float time = fract(uTime * 0.5);
            float spread = smoothstep(dist, dist + 0.1, time);

            // 组合效果
            float alpha = hex * (1.0 - spread * 0.5);
            material.alpha = alpha;
            material.diffuse = vec3(0.3, 0.8, 1.0) * alpha;

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
      this.timeValue += 0.02
      if (this.timeValue > 2) {
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
    return 'LightSpreadMaterial'
  }

  getValue(time: Cesium.JulianDate, result: any): any {
    if (!result) result = {}
    result.uTime = this.params.uTime
    return result
  }

  equals(other: any): boolean {
    return other instanceof LightSpreadMaterialProperty && this.name === other.name
  }

  destroy(): void {
    this.stopAnimation()
  }
}

/**
 * 流光扩散特效类
 */
export class LightSpreadEffect {
  private viewer: Cesium.Viewer
  private entity: Cesium.Entity | null = null
  private material: LightSpreadMaterialProperty
  private animationId: number | null = null
  private params: {
    minLon: number
    minLat: number
    maxLon: number
    maxLat: number
  }

  constructor(viewer: Cesium.Viewer) {
    this.viewer = viewer
    this.material = new LightSpreadMaterialProperty('LightSpreadMaterial')
    this.params = {
      minLon: 0,
      minLat: 0,
      maxLon: 0,
      maxLat: 0
    }
  }

  /**
   * 创建流光扩散
   */
  create(
    minLon: number,
    minLat: number,
    maxLon: number,
    maxLat: number,
    animate: boolean = true
  ): Cesium.Entity {
    this.params = { minLon, minLat, maxLon, maxLat }
    this.entity = this.viewer.entities.add({
      name: 'lightSpread',
      rectangle: {
        coordinates: Cesium.Rectangle.fromDegrees(minLon, minLat, maxLon, maxLat),
        material: this.material
      }
    })

    if (animate) {
      this.startAnimation()
    }

    return this.entity
  }

  /**
   * 启动扩散动画
   */
  startAnimation(): void {
    if (this.animationId) return

    const stepLon = (this.params.maxLon - this.params.minLon) * 0.1
    const stepLat = (this.params.maxLat - this.params.minLat) * 0.1

    let currentMinLon = this.params.minLon
    let currentMinLat = this.params.minLat
    let currentMaxLon = this.params.maxLon
    let currentMaxLat = this.params.maxLat

    this.animationId = window.setInterval(() => {
      // 扩散效果
      currentMinLon -= stepLon * 0.05
      currentMinLat -= stepLat * 0.05
      currentMaxLon += stepLon * 0.05
      currentMaxLat += stepLat * 0.05

      // 限制扩散范围
      if (currentMaxLon - currentMinLon > this.params.maxLon - this.params.minLon + 0.2) {
        // 重置
        currentMinLon = this.params.minLon
        currentMinLat = this.params.minLat
        currentMaxLon = this.params.maxLon
        currentMaxLat = this.params.maxLat
      }

      if (this.entity) {
        this.entity.rectangle.coordinates = Cesium.Rectangle.fromDegrees(
          currentMinLon,
          currentMinLat,
          currentMaxLon,
          currentMaxLat
        )
      }
    }, 50)
  }

  /**
   * 停止动画
   */
  stopAnimation(): void {
    if (this.animationId) {
      window.clearInterval(this.animationId)
      this.animationId = null
    }
  }

  /**
   * 销毁特效
   */
  destroy(): void {
    this.stopAnimation()
    if (this.entity) {
      this.viewer.entities.remove(this.entity)
      this.entity = null
    }
    this.material.destroy()
  }
}
