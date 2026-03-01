/**
 * 光墙特效
 */

import * as Cesium from 'cesium'

let lightWallTypeNum = 0

/**
 * 光墙材质属性类
 */
export class LightWallMaterialProperty {
  private name: string
  private definitionChanged = new Cesium.Event()
  private params: { uTime: number }
  private timeValue: number = 0
  private intervalId: number | null = null
  private num: number

  constructor() {
    lightWallTypeNum++
    this.num = lightWallTypeNum
    this.name = 'LightWallMaterial' + this.num
    this.params = { uTime: 0 }

    Cesium.Material._materialCache.addMaterial(this.name, {
      fabric: {
        type: this.name,
        uniforms: {
          uTime: 0
        },
        source: `
          czm_material czm_getMaterial(czm_materialInput materialInput)
          {
            czm_material material = czm_getDefaultMaterial(materialInput);
            vec2 st = materialInput.st;

            // 创建流光效果（从上到下流动）
            float flow = fract(st.y + uTime);

            // 四层渐变透明效果
            float alpha1 = smoothstep(0.0, 0.15, flow) * (1.0 - smoothstep(0.15, 0.35, flow));
            float alpha2 = smoothstep(0.25, 0.45, flow) * (1.0 - smoothstep(0.45, 0.65, flow));
            float alpha3 = smoothstep(0.55, 0.75, flow) * (1.0 - smoothstep(0.75, 0.9, flow));
            float alpha4 = smoothstep(0.85, 0.95, flow);

            float alpha = (alpha1 * 0.5 + alpha2 * 0.7 + alpha3 * 0.6 + alpha4 * 0.3);

            // 渐变配色
            vec3 color1 = vec3(0.2, 0.4, 1.0);
            vec3 color2 = vec3(0.0, 0.7, 1.0);
            vec3 color3 = vec3(0.0, 0.9, 0.8);
            vec3 color4 = vec3(0.8, 1.0, 1.0);

            vec3 color;
            if (flow < 0.25) {
              color = mix(color1, color2, flow * 4.0);
            } else if (flow < 0.5) {
              color = mix(color2, color3, (flow - 0.25) * 4.0);
            } else if (flow < 0.75) {
              color = mix(color3, color4, (flow - 0.5) * 4.0);
            } else {
              color = mix(color4, color1, (flow - 0.75) * 4.0);
            }

            material.diffuse = color;
            material.alpha = alpha;
            material.emissive = color * 0.7;

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
    return this.name
  }

  getValue(time: Cesium.JulianDate, result: any): any {
    if (!result) result = {}
    result.uTime = this.params.uTime
    return result
  }

  equals(other: any): boolean {
    return other instanceof LightWallMaterialProperty && this.name === other.name
  }

  destroy(): void {
    this.stopAnimation()
  }
}

/**
 * 光墙特效类
 */
export class LightWallEffect {
  private viewer: Cesium.Viewer
  private entity: Cesium.Entity | null = null
  private material: LightWallMaterialProperty
  private timeValue: number = 0
  private intervalId: number | null = null

  constructor(viewer: Cesium.Viewer) {
    this.viewer = viewer
    this.material = new LightWallMaterialProperty()
  }

  /**
   * 创建光墙
   * @param positions [lon, lat, lon, lat, ...] 格式的经纬度数组
   */
  create(positions: number[], height: number, label?: string): Cesium.Entity {
    // 将 [lon, lat, lon, lat, ...] 转换为 [lon, lat, height, lon, lat, height, ...]
    const wallPositions: number[] = []
    for (let i = 0; i < positions.length; i += 2) {
      wallPositions.push(positions[i], positions[i + 1], height)
    }

    const cartesianPositions = Cesium.Cartesian3.fromDegreesArrayHeights(wallPositions)

    // 使用 Interval 来更新颜色，而不是 CallbackProperty
    this.timeValue = 0

    const materialProperty = new Cesium.ColorMaterialProperty(
      new Cesium.CallbackProperty(() => {
        this.timeValue += 0.02
        if (this.timeValue > 1) {
          this.timeValue = 0
        }
        const flow = this.timeValue

        // 使用雷达扫描的配色方案：根据位置动态变化颜色
        const centerLon = (positions[0] + positions[2]) / 2
        const centerLat = (positions[1] + positions[3]) / 2

        // 颜色随流动位置和时间变化
        let r, g, b
        if (flow < 0.25) {
          r = flow * 4.0
          g = flow * 4.0 * 0.5 + 0.5
          b = 1.0
        } else if (flow < 0.5) {
          const t = (flow - 0.25) * 4
          r = 1.0 - t * 0.5
          g = 0.75 + t * 0.25
          b = 1.0 - t * 0.2
        } else if (flow < 0.75) {
          const t = (flow - 0.5) * 4
          r = 0.5 - t * 0.3
          g = 1.0 - t * 0.2
          b = 0.8 + t * 0.2
        } else {
          const t = (flow - 0.75) * 4
          r = 0.2 + t * 0.3
          g = 0.8 - t * 0.3
          b = 1.0
        }

        return new Cesium.Color(r, g, b, 0.8)
      }, false)
    )

    this.entity = this.viewer.entities.add({
      name: 'lightWall',
      position: Cesium.Cartesian3.fromDegrees(positions[0], positions[1], height),
      wall: {
        positions: cartesianPositions,
        material: materialProperty,
        outline: true,
        outlineColor: Cesium.Color.BLUE,
        outlineWidth: 2
      },
      label: label
        ? {
            text: label,
            font: '16px sans-serif',
            style: Cesium.LabelStyle.FILL_AND_OUTLINE,
            verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
            pixelOffset: new Cesium.Cartesian2(0, -20),
            fillColor: Cesium.Color.WHITE,
            outlineColor: Cesium.Color.BLACK,
            outlineWidth: 2
          }
        : undefined
    })

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
    this.material.destroy()
  }
}
