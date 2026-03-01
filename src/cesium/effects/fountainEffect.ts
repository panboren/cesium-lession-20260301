/**
 * 喷泉/水流特效 - Cesium 1.138+
 * 粒子系统 + 向上发射器 + 重力模拟
 * 城市喷泉、瀑布效果
 */

import * as Cesium from 'cesium'

/**
 * 喷泉模式
 */
export enum FountainType {
  FOUNTAIN = 'fountain', // 喷泉 - 向上喷射后落下
  WATERFALL = 'waterfall', // 瀑布 - 从高处流下
  GUSH = 'gush' // 泉涌 - 地面涌出
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
    lifeTime: 3.0
  }

  constructor(viewer: Cesium.Viewer) {
    this.viewer = viewer
  }

  /**
   * 创建粒子纹理 - 水滴形状
   */
  private createWaterTexture(): HTMLCanvasElement {
    const canvas = document.createElement('canvas')
    canvas.width = 64
    canvas.height = 64
    const ctx = canvas.getContext('2d')

    if (ctx) {
      // 绘制水滴形状
      const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32)
      gradient.addColorStop(0, 'rgba(255, 255, 255, 1)')
      gradient.addColorStop(0.3, 'rgba(200, 240, 255, 0.9)')
      gradient.addColorStop(0.7, 'rgba(100, 200, 255, 0.6)')
      gradient.addColorStop(1, 'rgba(50, 150, 255, 0)')

      ctx.fillStyle = gradient
      ctx.beginPath()
      ctx.arc(32, 32, 30, 0, Math.PI * 2)
      ctx.fill()
    }

    return canvas
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
    const alpha = 0.6 + Math.random() * 0.3

    // 创建粒子实体
    const particleSize = 3 + Math.random() * 4
    const entity = this.viewer.entities.add({
      position: new Cesium.CallbackProperty(() => {
        const p = this.particles.find((item) => item.entity === entity)
        return p ? p.position : finalPosition
      }, false),
      point: {
        pixelSize: particleSize,
        color: new Cesium.CallbackProperty(() => {
          const p = this.particles.find((item) => item.entity === entity)
          if (!p) return options.waterColor.withAlpha(0)
          const lifeRatio = p.life / p.maxLife
          // 生命周期初期和末期淡出，中间保持稳定
          let easedAlpha = alpha
          if (lifeRatio < 0.2) {
            easedAlpha = alpha * (lifeRatio / 0.2)
          } else if (lifeRatio > 0.8) {
            easedAlpha = alpha * (1 - (lifeRatio - 0.8) / 0.2)
          }
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
      initialVelocity: velocity.clone()
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

    this.isActive = false
    console.log('[FountainEffect] Fountain destroyed')
  }
}
