/**
 * 雨雪天气粒子特效 - Cesium 1.138+
 * 粒子系统 + 物理模拟 - 逼真的降水效果，支持风向和强度控制
 */

import * as Cesium from 'cesium'

/**
 * 风场配置
 */
export interface WindField {
  direction: number // 风向角度（度），0=北，90=东，180=南，270=西
  speed: number // 风速 m/s
  gustiness?: number // 阵风强度 0-1
  turbulence?: number // 湍流强度 0-1
}

/**
 * 雨滴配置
 */
export interface RainOptions {
  intensity?: number // 雨量强度 0-1
  density?: number // 粒子密度
  dropSize?: number // 雨滴大小
  fallSpeed?: number // 下落速度 m/s
  wind?: WindField // 风场配置
  color?: Cesium.Color // 雨滴颜色
  transparency?: number // 透明度 0-1
}

/**
 * 雪花配置
 */
export interface SnowOptions {
  intensity?: number // 雪量强度 0-1
  density?: number // 粒子密度
  flakeSize?: number // 雪花大小
  fallSpeed?: number // 下落速度 m/s
  wind?: WindField // 风场配置
  color?: Cesium.Color // 雪花颜色
  transparency?: number // 透明度 0-1
  swirl?: number // 旋涡强度 0-1
}

/**
 * 天气配置（雨雪同时）
 */
export interface WeatherOptions {
  rain?: RainOptions
  snow?: SnowOptions
  coverageRadius?: number // 覆盖半径（米）
  followCamera?: boolean // 是否跟随相机
}

/**
 * 雨雪天气特效类
 */
export class WeatherEffect {
  private viewer: Cesium.Viewer
  private rainSystem: Cesium.ParticleSystem | null = null
  private snowSystem: Cesium.ParticleSystem | null = null
  private rainTexture: string | null = null
  private snowTexture: string | null = null

  // 默认雨滴配置
  private defaultRainOptions: Required<RainOptions> = {
    intensity: 0.8,
    density: 5000,
    dropSize: 1.5,
    fallSpeed: 20,
    wind: {
      direction: 90,
      speed: 5,
      gustiness: 0.3,
      turbulence: 0.2
    },
    color: Cesium.Color.fromCssColorString('#aaccff'),
    transparency: 0.4
  }

  // 默认雪花配置
  private defaultSnowOptions: Required<SnowOptions> = {
    intensity: 0.8,
    density: 3500,
    flakeSize: 3.5,
    fallSpeed: 2.5,
    wind: {
      direction: 90,
      speed: 3,
      gustiness: 0.4,
      turbulence: 0.5
    },
    color: Cesium.Color.fromCssColorString('#ffffff'),
    transparency: 0.5,
    swirl: 0.8
  }

  // 天气配置
  private weatherOptions: Required<WeatherOptions> = {
    rain: this.defaultRainOptions,
    snow: this.defaultSnowOptions,
    coverageRadius: 2000,
    followCamera: true
  }

  // 时间变量（用于湍流计算）
  private time: number = 0

  constructor(viewer: Cesium.Viewer) {
    this.viewer = viewer
    this.rainTexture = this.createRainTexture()
    this.snowTexture = this.createSnowTexture()
  }

  /**
   * 生成雨滴纹理（细长水滴）
   */
  private createRainTexture(): string {
    const canvas = document.createElement('canvas')
    canvas.width = 32
    canvas.height = 64
    const ctx = canvas.getContext('2d')!

    // 创建雨滴渐变（垂直拉长）
    const gradient = ctx.createLinearGradient(16, 0, 16, 64)
    gradient.addColorStop(0, 'rgba(200, 220, 255, 0)') // 顶部透明
    gradient.addColorStop(0.3, 'rgba(200, 220, 255, 0.8)') // 中上
    gradient.addColorStop(0.7, 'rgba(220, 240, 255, 0.9)') // 中下
    gradient.addColorStop(1, 'rgba(200, 220, 255, 0)') // 底部透明

    ctx.fillStyle = gradient
    ctx.fillRect(14, 0, 4, 64)

    return canvas.toDataURL()
  }

  /**
   * 生成雪花纹理（圆形柔和粒子）
   */
  private createSnowTexture(): string {
    const canvas = document.createElement('canvas')
    canvas.width = 64
    canvas.height = 64
    const ctx = canvas.getContext('2d')!

    // 创建柔和的径向渐变
    const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32)
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)') // 中心 - 白色
    gradient.addColorStop(0.3, 'rgba(255, 255, 255, 0.8)') // 中上
    gradient.addColorStop(0.7, 'rgba(240, 240, 255, 0.4)') // 中下
    gradient.addColorStop(1, 'rgba(200, 200, 220, 0)') // 边缘 - 透明

    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, 64, 64)

    return canvas.toDataURL()
  }

  /**
   * 计算风场力（包含高度切变、阵风、湍流）
   */
  private calculateWindForce(
    wind: WindField,
    height: number,
    particleIndex: number
  ): Cesium.Cartesian3 {
    // 高度风切变模型（地面风速小，高空风速大）
    const heightFactor = Math.min(height / 500, 1) * 0.3 + 0.7

    // 阵风模型（正弦波动）
    const gust = 1 + Math.sin(this.time * 2 + particleIndex * 0.1) * (wind.gustiness || 0.3)

    // 湍流（Perlin噪声简化版）
    const turbX = Math.sin(this.time * 3 + particleIndex * 0.5) * (wind.turbulence || 0.2)
    const turbY = Math.cos(this.time * 2.5 + particleIndex * 0.3) * (wind.turbulence || 0.2)

    const windDirectionRad = Cesium.Math.toRadians(wind.direction)

    return new Cesium.Cartesian3(
      (Math.cos(windDirectionRad) * wind.speed * heightFactor * gust + turbX * 5) * 0.1,
      (Math.sin(windDirectionRad) * wind.speed * heightFactor * gust + turbY * 5) * 0.1,
      0
    )
  }

  /**
   * 计算雪花旋涡运动
   */
  private calculateSnowSwirl(
    particle: any,
    swirl: number,
    dt: number
  ): Cesium.Cartesian3 {
    if (swirl <= 0) {
      return new Cesium.Cartesian3(0, 0, 0)
    }

    // 基于粒子索引和时间的旋涡运动
    const particleIndex = particle.mass || 0
    const angle = this.time * 2 + particleIndex * 0.1
    const radius = Math.sin(this.time * 0.5 + particleIndex * 0.05) * swirl * 2

    return new Cesium.Cartesian3(
      Math.cos(angle) * radius * dt,
      Math.sin(angle) * radius * dt,
      0
    )
  }

  /**
   * 获取相机位置的覆盖区域
   */
  private getCoveragePosition(): Cesium.Cartesian3 {
    const camera = this.viewer.camera
    const position = camera.positionWC

    // 获取相机高度，向上偏移使降水从相机上方落下
    const cartographic = Cesium.Cartographic.fromCartesian(position)
    const height = cartographic.height
    // 发射器在相机上方300米
    const emitterHeight = height + 300

    return Cesium.Cartesian3.fromRadians(
      cartographic.longitude,
      cartographic.latitude,
      emitterHeight
    )
  }

  /**
   * 创建雨滴粒子系统
   */
  private createRainSystem(): Cesium.ParticleSystem {
    const position = this.weatherOptions.followCamera
      ? this.getCoveragePosition()
      : Cesium.Cartesian3.fromDegrees(116.39, 39.9, 1000)

    // 使用更小的发射器半径
    const emitter = new Cesium.CircleEmitter(500)

    const rainSystem = new Cesium.ParticleSystem({
      image: this.rainTexture!,
      startColor: this.defaultRainOptions.color.withAlpha(1 - this.defaultRainOptions.transparency),
      endColor: this.defaultRainOptions.color.withAlpha(0),
      startScale: 1.5,
      endScale: 0.8,
      minimumParticleLife: 1.0,
      maximumParticleLife: 3.0,
      minimumSpeed: 0,
      maximumSpeed: 0,
      emissionRate: Math.floor(this.defaultRainOptions.density * this.defaultRainOptions.intensity),
      emitter: emitter,
      emitterModelMatrix: Cesium.Matrix4.fromTranslation(position),
      lifetime: 16.0,
      imageSize: new Cesium.Cartesian2(10, 20),
      updateCallback: (particle, dt) => {
        // 获取粒子高度
        const cartographic = Cesium.Cartographic.fromCartesian(particle.position)
        const height = cartographic.height

        // 重力影响（向下加速）
        const gravity = -this.defaultRainOptions.fallSpeed
        const velocity = new Cesium.Cartesian3(0, 0, gravity * dt)

        // 风力影响 - 使用粒子索引代替 id
        const particleIndex = particle.mass || 0
        const windForce = this.calculateWindForce(this.defaultRainOptions.wind, height, particleIndex)
        Cesium.Cartesian3.add(velocity, windForce, velocity)

        // 应用速度
        Cesium.Cartesian3.add(particle.position, velocity, particle.position)

        // 重置落到地面的粒子 - 重置到发射器高度
        if (height < 0) {
          const emitterPos = this.weatherOptions.followCamera
            ? this.getCoveragePosition()
            : Cesium.Cartesian3.fromDegrees(116.39, 39.9, 1000)
          const emitterCarto = Cesium.Cartographic.fromCartesian(emitterPos)
          cartographic.height = emitterCarto.height + Math.random() * 100
          particle.position = Cesium.Cartographic.toCartesian(cartographic)
        }
      }
    })

    return rainSystem
  }

  /**
   * 创建雪花粒子系统
   */
  private createSnowSystem(): Cesium.ParticleSystem {
    const position = this.weatherOptions.followCamera
      ? this.getCoveragePosition()
      : Cesium.Cartesian3.fromDegrees(116.39, 39.9, 1000)

    // 使用更小的发射器半径
    const emitter = new Cesium.CircleEmitter(500)

    const snowSystem = new Cesium.ParticleSystem({
      image: this.snowTexture!,
      startColor: this.defaultSnowOptions.color.withAlpha(1 - this.defaultSnowOptions.transparency),
      endColor: this.defaultSnowOptions.color.withAlpha(0),
      startScale: 1.5,
      endScale: 0.8,
      minimumParticleLife: 3.0,
      maximumParticleLife: 6.0,
      minimumSpeed: 0,
      maximumSpeed: 0,
      emissionRate: Math.floor(this.defaultSnowOptions.density * this.defaultSnowOptions.intensity),
      emitter: emitter,
      emitterModelMatrix: Cesium.Matrix4.fromTranslation(position),
      lifetime: 16.0,
      imageSize: new Cesium.Cartesian2(this.defaultSnowOptions.flakeSize * 6, this.defaultSnowOptions.flakeSize * 6),
      updateCallback: (particle, dt) => {
        // 获取粒子高度
        const cartographic = Cesium.Cartographic.fromCartesian(particle.position)
        const height = cartographic.height

        // 重力影响（缓慢下落）
        const gravity = -this.defaultSnowOptions.fallSpeed
        const velocity = new Cesium.Cartesian3(0, 0, gravity * dt)

        // 风力影响 - 使用粒子索引代替 id
        const particleIndex = particle.mass || 0
        const windForce = this.calculateWindForce(this.defaultSnowOptions.wind, height, particleIndex)
        Cesium.Cartesian3.add(velocity, windForce, velocity)

        // 旋涡运动（雪花飘舞）
        const swirlForce = this.calculateSnowSwirl(particle, this.defaultSnowOptions.swirl, dt)
        Cesium.Cartesian3.add(velocity, swirlForce, velocity)

        // 应用速度
        Cesium.Cartesian3.add(particle.position, velocity, particle.position)

        // 重置落到地面的粒子 - 重置到发射器高度
        if (height < 0) {
          const emitterPos = this.weatherOptions.followCamera
            ? this.getCoveragePosition()
            : Cesium.Cartesian3.fromDegrees(116.39, 39.9, 1000)
          const emitterCarto = Cesium.Cartographic.fromCartesian(emitterPos)
          cartographic.height = emitterCarto.height + Math.random() * 100
          particle.position = Cesium.Cartographic.toCartesian(cartographic)
        }
      }
    })

    return snowSystem
  }

  /**
   * 创建天气效果
   */
  create(options: WeatherOptions = {}): void {
    // 合并配置
    this.weatherOptions = {
      ...this.weatherOptions,
      ...options,
      rain: { ...this.defaultRainOptions, ...options.rain },
      snow: { ...this.defaultSnowOptions, ...options.snow }
    }

    // 更新默认配置
    if (this.weatherOptions.rain) {
      this.defaultRainOptions = { ...this.defaultRainOptions, ...this.weatherOptions.rain }
    }
    if (this.weatherOptions.snow) {
      this.defaultSnowOptions = { ...this.defaultSnowOptions, ...this.weatherOptions.snow }
    }

    // 创建雨滴系统
    if (this.weatherOptions.rain && this.defaultRainOptions.intensity > 0) {
      this.rainSystem = this.createRainSystem()
      this.viewer.scene.primitives.add(this.rainSystem)
      console.log('[WeatherEffect] Rain created, emission rate:', this.rainSystem.emissionRate)
    }

    // 创建雪花系统
    if (this.weatherOptions.snow && this.defaultSnowOptions.intensity > 0) {
      this.snowSystem = this.createSnowSystem()
      this.viewer.scene.primitives.add(this.snowSystem)
      console.log('[WeatherEffect] Snow created, emission rate:', this.snowSystem.emissionRate)
    }

    // 开始更新循环
    this.startUpdateLoop()
  }

  /**
   * 更新循环（用于更新时间和跟随相机）
   */
  private startUpdateLoop(): void {
    const update = () => {
      this.time += 0.016 // 约60fps

      // 跟随相机
      if (this.weatherOptions.followCamera) {
        const position = this.getCoveragePosition()
        if (this.rainSystem) {
          this.rainSystem.emitterModelMatrix = Cesium.Matrix4.fromTranslation(position)
        }
        if (this.snowSystem) {
          this.snowSystem.emitterModelMatrix = Cesium.Matrix4.fromTranslation(position)
        }
      }

      requestAnimationFrame(update)
    }
    update()
  }

  /**
   * 设置雨量强度
   */
  setRainIntensity(intensity: number): void {
    this.defaultRainOptions.intensity = Math.max(0, Math.min(1, intensity))
    if (this.rainSystem) {
      this.rainSystem.emissionRate = Math.floor(
        this.defaultRainOptions.density * this.defaultRainOptions.intensity
      )
    }
  }

  /**
   * 设置雪量强度
   */
  setSnowIntensity(intensity: number): void {
    this.defaultSnowOptions.intensity = Math.max(0, Math.min(1, intensity))
    if (this.snowSystem) {
      this.snowSystem.emissionRate = Math.floor(
        this.defaultSnowOptions.density * this.defaultSnowOptions.intensity
      )
    }
  }

  /**
   * 设置风场
   */
  setWind(direction: number, speed: number): void {
    this.defaultRainOptions.wind.direction = direction
    this.defaultRainOptions.wind.speed = speed
    this.defaultSnowOptions.wind.direction = direction
    this.defaultSnowOptions.wind.speed = speed
  }

  /**
   * 设置雨滴颜色
   */
  setRainColor(color: Cesium.Color): void {
    this.defaultRainOptions.color = color
    if (this.rainSystem) {
      this.rainSystem.startColor = color.withAlpha(1 - this.defaultRainOptions.transparency)
    }
  }

  /**
   * 设置雪花颜色
   */
  setSnowColor(color: Cesium.Color): void {
    this.defaultSnowOptions.color = color
    if (this.snowSystem) {
      this.snowSystem.startColor = color.withAlpha(1 - this.defaultSnowOptions.transparency)
    }
  }

  /**
   * 销毁天气效果
   */
  destroy(): void {
    let removedCount = 0

    if (this.rainSystem) {
      try {
        this.rainSystem.show = false
        this.rainSystem.lifetime = 0
        this.viewer.scene.primitives.remove(this.rainSystem)
        removedCount++
        console.log('[WeatherEffect] Rain destroyed')
      } catch (e) {
        console.warn('[WeatherEffect] Error removing rain system:', e)
      }
      this.rainSystem = null
    }
    if (this.snowSystem) {
      try {
        this.snowSystem.show = false
        this.snowSystem.lifetime = 0
        this.viewer.scene.primitives.remove(this.snowSystem)
        removedCount++
        console.log('[WeatherEffect] Snow destroyed')
      } catch (e) {
        console.warn('[WeatherEffect] Error removing snow system:', e)
      }
      this.snowSystem = null
    }
    console.log(`[WeatherEffect] Weather destroyed, removed ${removedCount} system(s)`)
  }

  /**
   * 获取雨滴粒子系统
   */
  getRainSystem(): Cesium.ParticleSystem | null {
    return this.rainSystem
  }

  /**
   * 获取雪花粒子系统
   */
  getSnowSystem(): Cesium.ParticleSystem | null {
    return this.snowSystem
  }
}
