/**
 * 光墙特效
 */

import * as Cesium from 'cesium'

/**
 * 光墙材质属性类
 */
export class LightWallMaterialProperty {
  private name: string
  private definitionChanged = new Cesium.Event()
  private params: { uTime: number }
  private timeValue: number = 0
  private intervalId: number | null = null

  constructor(name: string = 'LightWallMaterial', textureUrl?: string) {
    this.name = name
    this.params = { uTime: 0 }

    // 注册自定义材质
    Cesium.Material.LightWallMaterialType = 'LightWallMaterial'
    Cesium.Material.LightWallMaterialImage = textureUrl || undefined

    if (!Cesium.Material._materialCache.getMaterial(Cesium.Material.LightWallMaterialType)) {
      Cesium.Material._materialCache.addMaterial(Cesium.Material.LightWallMaterialType, {
        fabric: {
          type: Cesium.Material.LightWallMaterialType,
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

              // 多层渐变透明效果
              float alpha1 = smoothstep(0.0, 0.2, flow) * (1.0 - smoothstep(0.2, 0.5, flow));
              float alpha2 = smoothstep(0.3, 0.5, flow) * (1.0 - smoothstep(0.5, 0.7, flow));
              float alpha3 = smoothstep(0.6, 0.8, flow) * (1.0 - smoothstep(0.8, 1.0, flow));

              float alpha = (alpha1 * 0.4 + alpha2 * 0.6 + alpha3 * 0.4);

              // 渐变配色：从深蓝到青绿再到亮白
              vec3 color1 = vec3(0.0, 0.3, 0.8);   // 深蓝
              vec3 color2 = vec3(0.0, 0.8, 0.9);   // 青绿
              vec3 color3 = vec3(0.6, 0.9, 1.0);   // 亮白

              vec3 color;
              if (flow < 0.33) {
                color = mix(color1, color2, flow * 3.0);
              } else if (flow < 0.66) {
                color = mix(color2, color3, (flow - 0.33) * 3.0);
              } else {
                color = mix(color3, color1, (flow - 0.66) * 3.0);
              }

              material.diffuse = color;
              material.alpha = alpha * 0.9;

              // 添加发光效果
              material.emissive = color * alpha * 0.6;

              return material;
            }
          `
        }
      })
    }

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
    return 'LightWallMaterial'
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

  constructor(viewer: Cesium.Viewer) {
    this.viewer = viewer
    this.material = new LightWallMaterialProperty('LightWallMaterial')
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

    // 先用简单颜色测试是否可见
    this.entity = this.viewer.entities.add({
      name: 'lightWall',
      position: Cesium.Cartesian3.fromDegrees(positions[0], positions[1], height),
      wall: {
        positions: cartesianPositions,
        material: Cesium.Color.CYAN.withAlpha(0.8),
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
