/**
 * 水面特效 - Cesium 1.138+
 * 使用 Cesium 内置 Water 材质 + 优化参数
 * 基于 Three.js 和 Cesium 源码分析优化
 */

import * as Cesium from 'cesium'

/**
 * 水面配置
 */
export interface WaterSurfaceOptions {
  position: {
    longitude: number
    latitude: number
    height: number
  }
  radius?: number
  waterColor?: Cesium.Color // 基础水色
  blendColor?: Cesium.Color // 混合色（天空反射）
  normalMapUrl?: string // 法线贴图 URL
  frequency?: number // 波浪频率 (控制波浪密集度)
  animationSpeed?: number // 动画速度 (0-1)
  amplitude?: number // 波浪振幅
  specularIntensity?: number // 高光强度 (0-10)
  segments?: number // 水面细分精度
}

/**
 * 水面特效类
 */
export class WaterSurfaceEffect {
  private viewer: Cesium.Viewer
  private primitive: Cesium.Primitive | null = null
  private isActive: boolean = false

  // 默认配置（精心调优的参数）
  private defaultOptions = {
    radius: 1000,
    waterColor: Cesium.Color.fromCssColorString('rgba(0, 110, 180, 0.75)'),
    blendColor: Cesium.Color.fromCssColorString('rgba(100, 200, 255, 0.4)'),
    normalMapUrl: 'https://cesium.com/downloads/cesiumjs/releases/1.104/Build/Cesium/Assets/Textures/waterNormals.jpg',
    frequency: 2000.0, // 更密集的波浪
    animationSpeed: 0.005, // 平滑的动画
    amplitude: 8.0, // 适中的波浪高度
    specularIntensity: 8, // 明显的高光
    segments: 128 // 更高的细分精度
  }

  // 存储配置用于动态更新
  private currentOptions: Required<WaterSurfaceOptions> | null = null

  constructor(viewer: Cesium.Viewer) {
    this.viewer = viewer
  }

  /**
   * 创建圆形水面顶点
   */
  private createCirclePositions(
    longitude: number,
    latitude: number,
    height: number,
    radius: number,
    segments: number
  ): number[] {
    const positions: number[] = []
    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * 2 * Math.PI
      const lon = longitude + (radius / 111000) * Math.cos(angle)
      const lat = latitude + (radius / 111000) * Math.sin(angle)
      positions.push(lon, lat, height)
    }
    return positions
  }

  /**
   * 创建水面 - 使用 Cesium 内置 Water 材质（优化版）
   */
  create(options: WaterSurfaceOptions): void {
    // 合并配置
    const config = {
      ...this.defaultOptions,
      ...options
    } as Required<WaterSurfaceOptions>
    this.currentOptions = config

    // 清除之前的图元
    if (this.primitive) {
      this.destroy()
    }

    const { longitude, latitude, height } = config.position
    const radius = config.radius
    const segments = config.segments

    // 创建圆形水面顶点
    const positions = this.createCirclePositions(
      longitude,
      latitude,
      height,
      radius,
      segments
    )

    // 创建水面几何体（使用顶点法线格式以支持光照）
    const geometry = Cesium.PolygonGeometry.fromPositions({
      positions: Cesium.Cartesian3.fromDegreesArrayHeights(positions),
      vertexFormat: Cesium.EllipsoidSurfaceAppearance.VERTEX_FORMAT,
      granularity: Cesium.Math.RADIANS_PER_DEGREE // 控制细分精度
    })

    // 创建几何实例
    const geometryInstance = new Cesium.GeometryInstance({
      geometry: geometry,
      id: 'waterSurface',
      attributes: {
        color: Cesium.ColorGeometryInstanceAttribute.fromColor(
          Cesium.Color.WHITE
        )
      }
    })

    // 创建 Water 材质（优化的参数）
    const material = new Cesium.Material({
      fabric: {
        type: 'Water',
        uniforms: {
          baseWaterColor: config.waterColor,
          blendColor: config.blendColor,
          normalMap: config.normalMapUrl,
          frequency: config.frequency,
          animationSpeed: config.animationSpeed,
          amplitude: config.amplitude,
          specularIntensity: config.specularIntensity
        }
      },
      translucent: true
    })

    // 创建外观（优化渲染状态）
    const appearance = new Cesium.EllipsoidSurfaceAppearance({
      material: material,
      translucent: true,
      renderState: {
        cull: {
          enabled: true,
          face: Cesium.CullFace.BACK // 背面剔除
        },
        depthTest: {
          enabled: true
        },
        depthMask: {
          enabled: false // 允许看到水下物体
        },
        blending: Cesium.BlendingState.ALPHA_BLEND // Alpha 混合
      }
    })

    // 创建图元
    this.primitive = new Cesium.Primitive({
      geometryInstances: geometryInstance,
      appearance: appearance,
      asynchronous: false // 同步创建确保立即可见
    })

    // 添加到场景
    this.viewer.scene.primitives.add(this.primitive)
    this.isActive = true

    console.log('[WaterSurfaceEffect] Water surface created (optimized)')
    console.log('[WaterSurfaceEffect] Center:', longitude, latitude, 'Height:', height)
    console.log('[WaterSurfaceEffect] Radius:', radius, 'm')
    console.log('[WaterSurfaceEffect] Segments:', segments)
    console.log('[WaterSurfaceEffect] Parameters:', {
      frequency: config.frequency,
      animationSpeed: config.animationSpeed,
      amplitude: config.amplitude,
      specularIntensity: config.specularIntensity
    })
  }

  /**
   * 更新水面颜色
   */
  updateColor(waterColor: Cesium.Color, blendColor?: Cesium.Color): void {
    if (this.primitive && this.primitive.appearance) {
      const appearance = this.primitive.appearance as any
      if (appearance.material) {
        appearance.material.uniforms.baseWaterColor = waterColor
        if (blendColor) {
          appearance.material.uniforms.blendColor = blendColor
        }
      }
    }
  }

  /**
   * 更新波浪参数
   */
  updateWaveParams(params: {
    frequency?: number
    animationSpeed?: number
    amplitude?: number
  }): void {
    if (this.primitive && this.primitive.appearance) {
      const appearance = this.primitive.appearance as any
      if (appearance.material) {
        const uniforms = appearance.material.uniforms
        if (params.frequency !== undefined) uniforms.frequency = params.frequency
        if (params.animationSpeed !== undefined)
          uniforms.animationSpeed = params.animationSpeed
        if (params.amplitude !== undefined) uniforms.amplitude = params.amplitude
      }
    }
  }

  /**
   * 更新高光强度
   */
  updateSpecularIntensity(intensity: number): void {
    if (this.primitive && this.primitive.appearance) {
      const appearance = this.primitive.appearance as any
      if (appearance.material) {
        appearance.material.uniforms.specularIntensity = intensity
      }
    }
  }

  /**
   * 设置可见性
   */
  setVisible(visible: boolean): void {
    if (this.primitive) {
      this.primitive.show = visible
    }
  }

  /**
   * 获取是否活跃
   */
  getActive(): boolean {
    return this.isActive
  }

  /**
   * 获取当前配置
   */
  getConfig(): Required<WaterSurfaceOptions> | null {
    return this.currentOptions
  }

  /**
   * 销毁特效
   */
  destroy(): void {
    if (this.primitive) {
      this.viewer.scene.primitives.remove(this.primitive)
      this.primitive = null
    }
    this.isActive = false
    this.currentOptions = null

    console.log('[WaterSurfaceEffect] Water surface destroyed')
  }
}
