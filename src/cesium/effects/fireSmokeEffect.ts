/**
 * 火焰/烟雾粒子特效 - Cesium 1.138+
 * 使用 Cesium.ParticleSystem 和程序化纹理生成
 */

import * as Cesium from 'cesium'

/**
 * 火焰/烟雾特效配置选项
 */
export interface FireSmokeOptions {
  // 火焰选项
  fireColor?: Cesium.Color
  fireIntensity?: number
  fireRate?: number
  fireSize?: number
  fireMinimumLife?: number
  fireMaximumLife?: number
  fireSpeed?: number

  // 烟雾选项
  smokeColor?: Cesium.Color
  smokeIntensity?: number
  smokeRate?: number
  smokeSize?: number
  smokeMinimumLife?: number
  smokeMaximumLife?: number

  // 风场选项
  windDirection?: number // 风向角度（度）
  windSpeed?: number // 风速

  // 位置选项
  height?: number // 发射高度
}

/**
 * 火焰/烟雾粒子特效类
 */
export class FireSmokeEffect {
  private viewer: Cesium.Viewer
  private fireSystem: Cesium.ParticleSystem | null = null
  private smokeSystem: Cesium.ParticleSystem | null = null
  private fireEntity: Cesium.Entity | null = null
  private smokeEntity: Cesium.Entity | null = null

  // 默认配置
  private defaultOptions: Required<FireSmokeOptions> = {
    fireColor: Cesium.Color.fromCssColorString('#ff4500'),
    fireIntensity: 0.9,
    fireRate: 60,
    fireSize: 2.5,
    fireMinimumLife: 0.8,
    fireMaximumLife: 1.5,
    fireSpeed: 2.5,

    smokeColor: Cesium.Color.fromCssColorString('#808080'),
    smokeIntensity: 0.5,
    smokeRate: 40,
    smokeSize: 5.0,
    smokeMinimumLife: 2.0,
    smokeMaximumLife: 3.5,

    windDirection: 0,
    windSpeed: 0.8,
    height: 0
  }

  constructor(viewer: Cesium.Viewer) {
    this.viewer = viewer
  }

  /**
   * 生成火焰纹理（使用 Canvas API）- 优化为更柔和的小粒子纹理
   */
  private createFireTexture(): string {
    const canvas = document.createElement('canvas')
    canvas.width = 64
    canvas.height = 64
    const ctx = canvas.getContext('2d')!

    // 创建柔和的径向渐变
    const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32)
    gradient.addColorStop(0, 'rgba(255, 255, 200, 1)') // 中心 - 亮黄色
    gradient.addColorStop(0.3, 'rgba(255, 160, 0, 0.9)') // 橙色
    gradient.addColorStop(0.6, 'rgba(255, 69, 0, 0.6)') // 橙红色
    gradient.addColorStop(1, 'rgba(200, 30, 0, 0)') // 边缘 - 透明

    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, 64, 64)

    return canvas.toDataURL()
  }

  /**
   * 生成烟雾纹理（使用 Canvas API）- 优化为更柔和的小粒子纹理
   */
  private createSmokeTexture(): string {
    const canvas = document.createElement('canvas')
    canvas.width = 64
    canvas.height = 64
    const ctx = canvas.getContext('2d')!

    // 创建柔和的径向渐变
    const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32)
    gradient.addColorStop(0, 'rgba(200, 200, 200, 0.8)') // 中心 - 浅灰色
    gradient.addColorStop(0.5, 'rgba(150, 150, 150, 0.4)') // 中间
    gradient.addColorStop(1, 'rgba(100, 100, 100, 0)') // 边缘 - 透明

    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, 64, 64)

    return canvas.toDataURL()
  }

  /**
   * 计算风场向量
   */
  private calculateWindVector(): Cesium.Cartesian3 {
    const windDirectionRad = Cesium.Math.toRadians(this.defaultOptions.windDirection)
    const x = Math.cos(windDirectionRad) * this.defaultOptions.windSpeed
    const y = Math.sin(windDirectionRad) * this.defaultOptions.windSpeed
    return new Cesium.Cartesian3(x, y, 0)
  }

  /**
   * 在指定位置创建火焰/烟雾
   * @param lon 经度
   * @param lat 纬度
   * @param options 配置选项
   */
  create(
    lon: number,
    lat: number,
    options: FireSmokeOptions = {}
  ): { fire: Cesium.ParticleSystem | null; smoke: Cesium.ParticleSystem | null } {
    // 合并配置
    this.defaultOptions = { ...this.defaultOptions, ...options }

    // 生成纹理
    const fireTextureUrl = this.createFireTexture()
    const smokeTextureUrl = this.createSmokeTexture()

    // 计算风场向量
    const windVector = this.calculateWindVector()

    // 计算发射位置
    const position = Cesium.Cartesian3.fromDegrees(lon, lat, this.defaultOptions.height)

    // 创建火焰粒子系统
    this.fireSystem = new Cesium.ParticleSystem({
      image: fireTextureUrl,
      startColor: Cesium.Color.fromCssColorString('#ffcc00').withAlpha(this.defaultOptions.fireIntensity), // 亮黄色
      endColor: Cesium.Color.fromCssColorString('#ff4500').withAlpha(0.0), // 橙红色
      startScale: 1.5,
      endScale: 4.0,
      minimumParticleLife: this.defaultOptions.fireMinimumLife,
      maximumParticleLife: this.defaultOptions.fireMaximumLife,
      minimumSpeed: 1.0,
      maximumSpeed: this.defaultOptions.fireSpeed,
      emissionRate: this.defaultOptions.fireRate,
      emitter: new Cesium.CircleEmitter(1.5), // 更小的圆形发射器
      emitterModelMatrix: Cesium.Matrix4.fromTranslation(position),
      lifetime: Infinity,
      imageSize: new Cesium.Cartesian2(12, 12), // 固定小尺寸
      updateCallback: (particle, dt) => {
        // 火焰向上快速移动，带轻微闪烁
        const flicker = 1.0 + Math.random() * 0.5
        Cesium.Cartesian3.add(
          particle.position,
          Cesium.Cartesian3.multiplyByScalar(
            new Cesium.Cartesian3(
              windVector.x * 0.2,
              windVector.y * 0.2,
              6.0 * flicker
            ),
            dt,
            new Cesium.Cartesian3()
          ),
          particle.position
        )
      }
    })

    // 创建烟雾粒子系统 - 与火焰从同一位置发射
    this.smokeSystem = new Cesium.ParticleSystem({
      image: smokeTextureUrl,
      startColor: this.defaultOptions.smokeColor.withAlpha(this.defaultOptions.smokeIntensity),
      endColor: Cesium.Color.fromCssColorString('#606060').withAlpha(0.0),
      startScale: 2.0,
      endScale: 8.0,
      minimumParticleLife: this.defaultOptions.smokeMinimumLife,
      maximumParticleLife: this.defaultOptions.smokeMaximumLife,
      minimumSpeed: 0,
      maximumSpeed: 0,
      emissionRate: this.defaultOptions.smokeRate,
      emitter: new Cesium.CircleEmitter(2.0), // 小发射器
      emitterModelMatrix: Cesium.Matrix4.fromTranslation(position), // 使用相同位置
      lifetime: Infinity,
      imageSize: new Cesium.Cartesian2(18, 18), // 固定小尺寸
      updateCallback: (particle, dt) => {
        // 烟雾缓慢上升，受风影响
        Cesium.Cartesian3.add(
          particle.position,
          Cesium.Cartesian3.multiplyByScalar(
            new Cesium.Cartesian3(
              windVector.x,
              windVector.y,
              4.0
            ),
            dt,
            new Cesium.Cartesian3()
          ),
          particle.position
        )
      }
    })

    // 添加粒子系统到场景
    this.viewer.scene.primitives.add(this.fireSystem)
    this.viewer.scene.primitives.add(this.smokeSystem)

    console.log('[FireSmokeEffect] Fire and smoke created at', lon, lat)

    return {
      fire: this.fireSystem,
      smoke: this.smokeSystem
    }
  }

  /**
   * 设置火焰强度
   */
  setFireIntensity(intensity: number): void {
    this.defaultOptions.fireIntensity = intensity
    if (this.fireSystem) {
      this.fireSystem.startColor = this.defaultOptions.fireColor.withAlpha(intensity)
    }
  }

  /**
   * 设置烟雾强度
   */
  setSmokeIntensity(intensity: number): void {
    this.defaultOptions.smokeIntensity = intensity
    if (this.smokeSystem) {
      this.smokeSystem.startColor = this.defaultOptions.smokeColor.withAlpha(intensity)
    }
  }

  /**
   * 设置风场
   */
  setWind(direction: number, speed: number): void {
    this.defaultOptions.windDirection = direction
    this.defaultOptions.windSpeed = speed
    // 风场会在粒子 updateCallback 中自动应用
  }

  /**
   * 设置火焰发射率
   */
  setFireRate(rate: number): void {
    this.defaultOptions.fireRate = rate
    if (this.fireSystem) {
      this.fireSystem.emissionRate = rate
    }
  }

  /**
   * 设置烟雾发射率
   */
  setSmokeRate(rate: number): void {
    this.defaultOptions.smokeRate = rate
    if (this.smokeSystem) {
      this.smokeSystem.emissionRate = rate
    }
  }

  /**
   * 更新火焰颜色
   */
  setFireColor(color: Cesium.Color): void {
    this.defaultOptions.fireColor = color
    if (this.fireSystem) {
      this.fireSystem.startColor = color.withAlpha(this.defaultOptions.fireIntensity)
    }
  }

  /**
   * 更新烟雾颜色
   */
  setSmokeColor(color: Cesium.Color): void {
    this.defaultOptions.smokeColor = color
    if (this.smokeSystem) {
      this.smokeSystem.startColor = color.withAlpha(this.defaultOptions.smokeIntensity)
    }
  }

  /**
   * 销毁特效
   */
  destroy(): void {
    if (this.fireSystem) {
      this.viewer.scene.primitives.remove(this.fireSystem)
      this.fireSystem = null
    }
    if (this.smokeSystem) {
      this.viewer.scene.primitives.remove(this.smokeSystem)
      this.smokeSystem = null
    }
    if (this.fireEntity) {
      this.viewer.entities.remove(this.fireEntity)
      this.fireEntity = null
    }
    this.smokeEntity = null

    console.log('[FireSmokeEffect] Fire and smoke destroyed')
  }
}
