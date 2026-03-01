/**
 * 喷泉/水流特效 - Cesium 1.138+
 * 粒子系统 + 向上发射器 + 重力模拟 + 波浪纹理
 * 城市喷泉、瀑布效果
 * 参考 Three.js Water Shader 的波浪模拟技术
 */

import * as Cesium from 'cesium'

/**
 * 喷泉模式
 */
export enum FountainType {
  FOUNTAIN = 'fountain', // 喷泉 - 向上喷射后落下
  WATERFALL = 'waterfall', // 瀑布 - 从高处流下
  GUSH = 'gush', // 泉涌 - 地面涌出
  RIPPLE = 'ripple' // 水面波纹 - 平静水面
}

/**
 * 喷泉配置
 */
export interface FountainOptions {
  position: {
    longitude: number
    latitude: number
    height: number
  }
  type?: FountainType // 喷泉类型
  height?: number // 喷射高度
  particleCount?: number // 粒子数量
  flowRate?: number // 流量（粒子生成速率）
  waterColor?: Cesium.Color // 水的颜色
  gravity?: number // 重力加速度
  wind?: {
    direction: number // 风向（角度）
    speed: number // 风速
  }
  width?: number // 喷泉/瀑布宽度
  lifeTime?: number // 粒子生命周期
  waveSpeed?: number // 波浪速度（参考 Three.js）
  waveStrength?: number // 波浪强度（参考 Three.js）
  rippleRadius?: number // 波纹半径（用于 RIPPLE 模式）
}

/**
 * 喷泉粒子类
 */
interface FountainParticle {
  entity: Cesium.Entity
  position: Cesium.Cartesian3
  velocity: Cesium.Cartesian3
  life: number
  maxLife: number
  initialVelocity: Cesium.Cartesian3
  wavePhase: number // 波浪相位（参考 Three.js）
  baseSize: number // 基础粒子大小
}

/**
 * 喷泉特效类
 */
export class FountainEffect {
  private viewer: Cesium.Viewer
  private particles: FountainParticle[] = []
  private isActive: boolean = false
  private updateInterval: number | null = null
  private generateInterval: number | null = null
  private time: number = 0 // 时间累积（用于波浪动画）

  // 默认配置
  private defaultOptions = {
    type: FountainType.FOUNTAIN,
    height: 50,
    particleCount: 300,
    flowRate: 10, // 每帧生成10个粒子
    waterColor: Cesium.Color.fromCssColorString('#00aaff').withAlpha(0.8),
    gravity: 9.8,
    wind: { direction: 0, speed: 0 },
    width: 10,
    lifeTime: 3.0,
    waveSpeed: 0.03, // 参考 Three.js WaterRefractionShader
    waveStrength: 0.5, // 参考 Three.js
    rippleRadius: 50
  }

  constructor(viewer: Cesium.Viewer) {
    this.viewer = viewer
  }

  /**
   * 计算波浪位移 - 参考 Three.js Water.js 的 getNoise 函数
   * 使用多层噪声叠加模拟真实水波
   */
  private calculateWaveOffset(
    x: number,
    y: number,
    z: number,
    time: number,
    waveSpeed: number,
    waveStrength: number
  ): { x: number; y: number; z: number } {
    // 参考 Three.js 的多层噪声技术
    // 使用多个不同频率和速度的正弦波叠加
    
    const scale = 0.1
    
    // 第一层波浪
    const uv0 = scale * time * waveSpeed
    const wave1 = Math.sin(x * scale + uv0) * Math.cos(y * scale + uv0 * 0.7)
    
    // 第二层波浪 - 不同频率
    const uv1 = scale * time * waveSpeed * 1.5
    const wave2 = Math.cos(x * scale * 1.3 + uv1) * Math.sin(y * scale * 1.3 + uv1 * 0.8)
    
    // 第三层波浪 - 细节
    const uv2 = scale * time * waveSpeed * 2.0
    const wave3 = Math.sin(x * scale * 2.0 + uv2) * Math.cos(y * scale * 2.0 + uv2 * 0.6)
    
    // 组合波浪
    const combinedWave = (wave1 + wave2 * 0.7 + wave3 * 0.4) * waveStrength
    
    return {
      x: combinedWave * 2,
      y: combinedWave * 2,
      z: Math.sin(time * 2 + x * 0.05 + y * 0.05) * waveStrength * 3
    }
  }

  /**
   * 计算初始速度向量
   */
  private calculateInitialVelocity(
    options: Required<FountainOptions>,
    offset: number
  ): Cesium.Cartesian3 {
    const cartographic = Cesium.Cartographic.fromCartesian(
      Cesium.Cartesian3.fromDegrees(
        options.position.longitude,
        options.position.latitude,
        options.position.height
      )
    )

    const { type, height, width, wind } = options

    switch (type) {
      case FountainType.FOUNTAIN: {
        // 喷泉：向上喷射，带随机扩散
        const angle = (offset / options.particleCount) * Math.PI * 2
        const radius = Math.random() * (width / 2)
        const horizontalSpeed = radius * (0.5 + Math.random() * 0.5)

        // 向上速度计算（达到指定高度）
        const verticalSpeed = Math.sqrt(2 * options.gravity * height) * (0.8 + Math.random() * 0.4)

        const vx = horizontalSpeed * Math.cos(angle)
        const vy = horizontalSpeed * Math.sin(angle)
        const vz = verticalSpeed

        return new Cesium.Cartesian3(vx, vy, vz)
      }

      case FountainType.WATERFALL: {
        // 瀑布：向下流动，初始有水平速度
        const horizontalSpeed = 20 + Math.random() * 30
        const angle = (offset / options.particleCount) * Math.PI * 2
        const spread = Math.random() * (width / 4)

        const vx = horizontalSpeed * Math.cos(angle) + spread * Math.random() - spread / 2
        const vy = horizontalSpeed * Math.sin(angle) + spread * Math.random() - spread / 2
        const vz = -(5 + Math.random() * 15) // 初始向下速度

        return new Cesium.Cartesian3(vx, vy, vz)
      }

      case FountainType.GUSH: {
        // 泉涌：向上涌出，速度较慢
        const angle = Math.random() * Math.PI * 2
        const radius = Math.random() * (width / 2)
        const speed = 5 + Math.random() * 15

        const vx = speed * Math.cos(angle) * (radius / width)
        const vy = speed * Math.sin(angle) * (radius / width)
        const vz = speed * (0.5 + Math.random() * 0.5)

        return new Cesium.Cartesian3(vx, vy, vz)
      }

      case FountainType.RIPPLE: {
        // 波纹：从中心向外扩散
        const angle = (offset / options.particleCount) * Math.PI * 2
        const speed = 10 + Math.random() * 20
        const radiusOffset = Math.random() * 10

        const vx = speed * Math.cos(angle) * (1 + radiusOffset / 50)
        const vy = speed * Math.sin(angle) * (1 + radiusOffset / 50)
        const vz = (Math.random() - 0.5) * 5 // 轻微的垂直波动

        return new Cesium.Cartesian3(vx, vy, vz)
      }

      default:
        return new Cesium.Cartesian3(0, 0, 0)
    }
  }

  /**
   * 生成单个粒子
   */
  private generateParticle(options: Required<FountainOptions>, index: number): void {
    const startPosition = Cesium.Cartesian3.fromDegrees(
      options.position.longitude,
      options.position.latitude,
      options.position.height
    )

    // 计算初始速度
    const velocity = this.calculateInitialVelocity(options, index)

    // 随机偏移起始位置
    const offsetRadius = Math.random() * (options.width / 4)
    const offsetAngle = Math.random() * Math.PI * 2
    const east = Cesium.Cartesian3.fromDegrees(
      options.position.longitude + Math.cos(offsetAngle) * 0.0001,
      options.position.latitude,
      options.position.height
    )
    const north = Cesium.Cartesian3.fromDegrees(
      options.position.longitude,
      options.position.latitude + Math.sin(offsetAngle) * 0.0001,
      options.position.height
    )
    const offsetEast = Cesium.Cartesian3.subtract(east, startPosition, new Cesium.Cartesian3())
    const offsetNorth = Cesium.Cartesian3.subtract(north, startPosition, new Cesium.Cartesian3())

    const finalPosition = Cesium.Cartesian3.add(
      startPosition,
      Cesium.Cartesian3.multiplyByScalar(
        Cesium.Cartesian3.add(offsetEast, offsetNorth, new Cesium.Cartesian3()),
        offsetRadius,
        new Cesium.Cartesian3()
      ),
      new Cesium.Cartesian3()
    )

    // 随机调整透明度，模拟水滴的不同亮度
    const baseAlpha = 0.6 + Math.random() * 0.3
    const baseSize = 3 + Math.random() * 4
    const wavePhase = Math.random() * Math.PI * 2

    // 创建粒子实体
    const entity = this.viewer.entities.add({
      position: new Cesium.CallbackProperty(() => {
        const p = this.particles.find((item) => item.entity === entity)
        if (!p) return finalPosition

        // 应用波浪偏移 - 参考 Three.js 的实时波浪计算
        const waveOffset = this.calculateWaveOffset(
          p.position.x,
          p.position.y,
          p.position.z,
          this.time,
          options.waveSpeed,
          options.waveStrength
        )

        return new Cesium.Cartesian3(
          p.position.x + waveOffset.x,
          p.position.y + waveOffset.y,
          p.position.z + waveOffset.z
        )
      }, false),
      point: {
        pixelSize: new Cesium.CallbackProperty(() => {
          const p = this.particles.find((item) => item.entity === entity)
          if (!p) return baseSize

          // 参考 Three.js 的波浪强度影响粒子大小
          const waveOffset = this.calculateWaveOffset(
            p.position.x,
            p.position.y,
            p.position.z,
            this.time,
            options.waveSpeed,
            options.waveStrength
          )
          
          // 波浪影响粒子大小的闪烁效果
          const sizeVariation = 1 + waveOffset.z * 0.1
          return p.baseSize * sizeVariation
        }, false),
        color: new Cesium.CallbackProperty(() => {
          const p = this.particles.find((item) => item.entity === entity)
          if (!p) return options.waterColor.withAlpha(0)
          
          const lifeRatio = p.life / p.maxLife
          
          // 生命周期初期和末期淡出，中间保持稳定
          let easedAlpha = baseAlpha
          if (lifeRatio < 0.2) {
            easedAlpha = baseAlpha * (lifeRatio / 0.2)
          } else if (lifeRatio > 0.8) {
            easedAlpha = baseAlpha * (1 - (lifeRatio - 0.8) / 0.2)
          }

          // 参考 Three.js 的波浪影响透明度 - 模拟水面反光
          const waveOffset = this.calculateWaveOffset(
            p.position.x,
            p.position.y,
            p.position.z,
            this.time,
            options.waveSpeed,
            options.waveStrength
          )
          
          // 波浪高亮处透明度更高（模拟反光）
          const highlightFactor = 1 + waveOffset.z * 0.2
          easedAlpha = Math.min(1, easedAlpha * highlightFactor)
          
          return options.waterColor.withAlpha(easedAlpha)
        }, false),
        outlineColor: Cesium.Color.TRANSPARENT,
        outlineWidth: 0,
        disableDepthTestDistance: Number.POSITIVE_INFINITY
      }
    })

    // 随机生命周期
    const lifeTime = options.lifeTime * (0.8 + Math.random() * 0.4)

    this.particles.push({
      entity,
      position: finalPosition,
      velocity,
      life: lifeTime,
      maxLife: lifeTime,
      initialVelocity: velocity.clone(),
      wavePhase,
      baseSize
    })
  }

  /**
   * 启动粒子生成
   */
  private startParticleGeneration(options: Required<FountainOptions>): void {
    let generatedCount = 0

    this.generateInterval = setInterval(() => {
      if (generatedCount < options.particleCount) {
        // 每帧生成多个粒子以快速达到稳定状态
        for (let i = 0; i < options.flowRate && generatedCount < options.particleCount; i++) {
          this.generateParticle(options, generatedCount++)
        }
      } else {
        // 达到目标数量后，随机替换老粒子
        for (let i = 0; i < Math.ceil(options.flowRate / 2); i++) {
          // 找到生命低于30%的粒子进行替换
          const replaceIndex = this.particles.findIndex((p) => p.life / p.maxLife < 0.3)
          if (replaceIndex !== -1) {
            const oldParticle = this.particles[replaceIndex]
            this.viewer.entities.remove(oldParticle.entity)
            this.particles.splice(replaceIndex, 1)
            this.generateParticle(options, Math.floor(Math.random() * options.particleCount))
          }
        }
      }
    }, 16) // 约60fps
  }

  /**
   * 启动更新循环
   */
  private startUpdateLoop(): void {
    if (this.updateInterval) {
      return
    }

    this.updateInterval = setInterval(() => {
      this.updateParticles(0.016)
    }, 16)
  }

  /**
   * 更新粒子物理状态
   */
  private updateParticles(dt: number): void {
    const options = this.defaultOptions
    
    // 更新时间累积 - 用于波浪动画（参考 Three.js 的 time uniform）
    this.time += dt

    this.particles.forEach((p) => {
      if (p.life > 0) {
        // 重力影响
        p.velocity.z -= options.gravity * dt

        // 风力影响
        if (options.wind.speed > 0) {
          const windAngle = options.wind.direction * (Math.PI / 180)
          const windForce = options.wind.speed * 0.5
          p.velocity.x += Math.cos(windAngle) * windForce * dt
          p.velocity.y += Math.sin(windAngle) * windForce * dt
        }

        // 空气阻力 - 水滴阻力较小
        const drag = 0.99
        p.velocity = Cesium.Cartesian3.multiplyByScalar(p.velocity, drag, p.velocity)

        // 更新位置
        p.position.x += p.velocity.x * dt
        p.position.y += p.velocity.y * dt
        p.position.z += p.velocity.z * dt

        // 更新生命周期
        p.life -= dt
      }
    })

    // 检查并移除死亡粒子
    for (let i = this.particles.length - 1; i >= 0; i--) {
      if (this.particles[i].life <= 0) {
        this.viewer.entities.remove(this.particles[i].entity)
        this.particles.splice(i, 1)
      }
    }
  }

  /**
   * 停止更新循环
   */
  private stopUpdateLoop(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval)
      this.updateInterval = null
    }
  }

  /**
   * 停止粒子生成
   */
  private stopParticleGeneration(): void {
    if (this.generateInterval) {
      clearInterval(this.generateInterval)
      this.generateInterval = null
    }
  }

  /**
   * 创建喷泉
   */
  create(options: FountainOptions): void {
    // 合并配置
    const config: Required<FountainOptions> = {
      ...this.defaultOptions,
      ...options,
      type: options.type || this.defaultOptions.type,
      waterColor: options.waterColor || this.defaultOptions.waterColor.clone(),
      wind: options.wind || this.defaultOptions.wind
    }

    // 清除之前的粒子
    if (this.particles.length > 0) {
      this.destroy()
    }

    // 重置时间
    this.time = 0

    this.isActive = true

    // 启动粒子生成
    this.startParticleGeneration(config)

    // 启动更新循环
    this.startUpdateLoop()

    console.log(`[FountainEffect] ${config.type} created`, config)
  }

  /**
   * 更新风向和风速
   */
  updateWind(direction: number, speed: number): void {
    this.defaultOptions.wind.direction = direction
    this.defaultOptions.wind.speed = speed
  }

  /**
   * 更新水流量
   */
  updateFlowRate(flowRate: number): void {
    this.defaultOptions.flowRate = flowRate
  }

  /**
   * 更新喷射高度
   */
  updateHeight(height: number): void {
    this.defaultOptions.height = height
  }

  /**
   * 更新波浪参数 - 参考 Three.js 的 uniform 参数
   */
  updateWaveParams(waveSpeed: number, waveStrength: number): void {
    this.defaultOptions.waveSpeed = waveSpeed
    this.defaultOptions.waveStrength = waveStrength
  }

  /**
   * 获取粒子数量
   */
  getParticleCount(): number {
    return this.particles.length
  }

  /**
   * 获取是否活跃
   */
  getActive(): boolean {
    return this.isActive
  }

  /**
   * 销毁特效
   */
  destroy(): void {
    this.stopUpdateLoop()
    this.stopParticleGeneration()

    // 移除所有粒子实体
    this.particles.forEach((p) => {
      this.viewer.entities.remove(p.entity)
    })
    this.particles = []

    // 重置时间
    this.time = 0

    this.isActive = false
    console.log('[FountainEffect] Fountain destroyed')
  }
}
