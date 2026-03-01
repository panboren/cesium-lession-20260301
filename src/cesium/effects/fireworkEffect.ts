/**
 * 烟花爆炸粒子特效 - Cesium 1.138+
 * 粒子系统 + Entity Point - 节日庆典的绚丽烟花
 */

import * as Cesium from 'cesium'

/**
 * 烟花颜色配置
 */
export interface FireworkColor {
  coreColor: Cesium.Color // 核心颜色
  trailColor: Cesium.Color // 拖尾颜色
  sparkColor: Cesium.Color // 火花颜色
}

/**
 * 烟花配置
 */
export interface FireworkOptions {
  position: {
    longitude: number
    latitude: number
    height: number
  }
  particleCount?: number // 粒子数量
  explosionRadius?: number // 爆炸半径
  heightRange?: { min: number; max: number } // 高度范围
  color?: FireworkColor // 颜色配置
  lifetime?: number // 粒子生命周期
  gravity?: number // 重力
}

/**
 * 烟花粒子类
 */
interface FireworkParticle {
  entity: Cesium.Entity
  position: Cesium.Cartesian3
  velocity: Cesium.Cartesian3
  life: number
  maxLife: number
  color: Cesium.Color
}

/**
 * 烟花爆炸特效类
 */
export class FireworkEffect {
  private viewer: Cesium.Viewer
  private particles: FireworkParticle[] = []
  private isActive: boolean = false
  private updateInterval: number | null = null

  // 默认配置
  private defaultOptions = {
    particleCount: 120,
    explosionRadius: 120,
    heightRange: { min: 600, max: 1200 },
    lifetime: 2.5,
    gravity: 25.0
  }

  constructor(viewer: Cesium.Viewer) {
    this.viewer = viewer
  }

  /**
   * 预设烟花颜色方案
   */
  private getColorPresets(): FireworkColor[] {
    return [
      {
        coreColor: Cesium.Color.fromCssColorString('#ff0000'),
        trailColor: Cesium.Color.fromCssColorString('#ff6600'),
        sparkColor: Cesium.Color.fromCssColorString('#ffcc00')
      },
      {
        coreColor: Cesium.Color.fromCssColorString('#00ff00'),
        trailColor: Cesium.Color.fromCssColorString('#00ff88'),
        sparkColor: Cesium.Color.fromCssColorString('#88ff00')
      },
      {
        coreColor: Cesium.Color.fromCssColorString('#0000ff'),
        trailColor: Cesium.Color.fromCssColorString('#0088ff'),
        sparkColor: Cesium.Color.fromCssColorString('#00ffff')
      },
      {
        coreColor: Cesium.Color.fromCssColorString('#ff00ff'),
        trailColor: Cesium.Color.fromCssColorString('#ff66ff'),
        sparkColor: Cesium.Color.fromCssColorString('#ff00ff')
      },
      {
        coreColor: Cesium.Color.fromCssColorString('#ffff00'),
        trailColor: Cesium.Color.fromCssColorString('#ffcc00'),
        sparkColor: Cesium.Color.fromCssColorString('#ffff88')
      },
      {
        coreColor: Cesium.Color.fromCssColorString('#00ffff'),
        trailColor: Cesium.Color.fromCssColorString('#00ffff'),
        sparkColor: Cesium.Color.fromCssColorString('#88ffff')
      },
      {
        coreColor: Cesium.Color.fromCssColorString('#ff8844'),
        trailColor: Cesium.Color.fromCssColorString('#ffaa44'),
        sparkColor: Cesium.Color.fromCssColorString('#ffcc88')
      },
      {
        coreColor: Cesium.Color.fromCssColorString('#ffffff'),
        trailColor: Cesium.Color.fromCssColorString('#dddddd'),
        sparkColor: Cesium.Color.fromCssColorString('#ffffff')
      }
    ]
  }

  /**
   * 创建烟花爆炸粒子
   */
  private createExplosionParticles(
    position: Cesium.Cartesian3,
    options: Required<FireworkOptions>
  ): void {
    const colorScheme = options.color || this.getColorPresets()[Math.floor(Math.random() * 8)]

    for (let i = 0; i < options.particleCount; i++) {
      // 球面均匀分布 - 使用斐波那契球面分布获得更好的视觉效果
      const phi = Math.acos(1 - 2 * (i + 0.5) / options.particleCount)
      const theta = Math.PI * (1 + Math.sqrt(5)) * (i + 0.5)

      // 径向速度 - 较小的爆炸半径，更真实的速度分布
      const speed = options.explosionRadius * (0.3 + Math.random() * 0.5)

      // 计算速度向量 - 稍微向上的方向
      const vx = speed * Math.sin(phi) * Math.cos(theta)
      const vy = speed * Math.sin(phi) * Math.sin(theta)
      const vz = speed * Math.cos(phi) * 0.2 + Math.random() * 30

      // 随机选择颜色 - 70%核心色，20%拖尾色，10%火花色
      const colorChoice = Math.random()
      let particleColor = colorScheme.coreColor
      if (colorChoice > 0.7) {
        particleColor = colorScheme.trailColor
      } else if (colorChoice > 0.9) {
        particleColor = colorScheme.sparkColor
      }

      // 创建粒子实体 - 更小的粒子尺寸，更真实的视觉效果
      const particleSize = 1.5 + Math.random() * 2.5
      const entity = this.viewer.entities.add({
        position: new Cesium.CallbackProperty(() => {
          const p = this.particles.find((item) => item.entity === entity)
          return p ? p.position : position
        }, false),
        point: {
          pixelSize: particleSize,
          color: new Cesium.CallbackProperty(() => {
            const p = this.particles.find((item) => item.entity === entity)
            if (!p) return particleColor.withAlpha(0)
            const lifeRatio = p.life / p.maxLife
            // 使用缓动函数使淡出更自然 - 保持高透明度以获得真实感
            const easedAlpha = 1 - Math.pow(1 - lifeRatio, 2.5)
            return p.color.withAlpha(easedAlpha)
          }, false),
          outlineColor: Cesium.Color.TRANSPARENT,
          outlineWidth: 0,
          disableDepthTestDistance: Number.POSITIVE_INFINITY // 始终显示
        }
      })

      this.particles.push({
        entity,
        position: Cesium.Cartesian3.clone(position),
        velocity: new Cesium.Cartesian3(vx, vy, vz),
        life: options.lifetime * (0.85 + Math.random() * 0.3),
        maxLife: options.lifetime,
        color: particleColor.clone()
      })
    }
  }

  /**
   * 启动更新循环
   */
  private startUpdateLoop(): void {
    if (this.updateInterval) {
      return
    }

    this.updateInterval = setInterval(() => {
      this.updateParticles(0.016) // 约60fps
    }, 16)
  }

  /**
   * 更新粒子物理状态
   */
  private updateParticles(dt: number): void {
    const particlesToRemove: number[] = []

    this.particles.forEach((p, index) => {
      if (p.life > 0) {
        // 重力影响 - 更强的重力使爆炸更有力
        p.velocity.z -= this.defaultOptions.gravity * dt

        // 更新位置
        p.position.x += p.velocity.x * dt
        p.position.y += p.velocity.y * dt
        p.position.z += p.velocity.z * dt

        // 空气阻力 - 随时间增加阻力
        const lifeRatio = p.life / p.maxLife
        const drag = 0.96 + lifeRatio * 0.03
        p.velocity = Cesium.Cartesian3.multiplyByScalar(p.velocity, drag, p.velocity)

        // 更新生命周期
        p.life -= dt
      } else {
        particlesToRemove.push(index)
      }
    })

    // 批量移除死亡粒子（优化性能）
    if (particlesToRemove.length > 0) {
      particlesToRemove.reverse().forEach((index) => {
        const p = this.particles[index]
        this.viewer.entities.remove(p.entity)
        this.particles.splice(index, 1)
      })
    }

    // 如果所有粒子都消失了，停止更新
    if (this.particles.length === 0 && this.isActive) {
      this.stopUpdateLoop()
      this.isActive = false
      console.log('[FireworkEffect] All particles cleared')
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
   * 发射烟花
   */
  launch(options: FireworkOptions): void {
    // 合并配置
    const config: Required<FireworkOptions> = {
      ...this.defaultOptions,
      ...options,
      color: options.color || this.getColorPresets()[Math.floor(Math.random() * 8)]
    }

    // 计算爆炸位置
    const explosionHeight =
      config.heightRange.min + Math.random() * (config.heightRange.max - config.heightRange.min)
    const position = Cesium.Cartesian3.fromDegrees(
      config.position.longitude,
      config.position.latitude,
      explosionHeight
    )

    // 创建爆炸粒子
    this.createExplosionParticles(position, config)

    this.isActive = true
    console.log('[FireworkEffect] Firework launched at', config.position)

    // 启动更新循环
    this.startUpdateLoop()
  }

  /**
   * 发射多枚烟花
   */
  launchMultiple(count: number, centerPosition: { longitude: number; latitude: number }, options?: Partial<FireworkOptions>): void {
    for (let i = 0; i < count; i++) {
      // 随机偏移位置
      const offset = 0.008 // 约800米范围
      const lon = centerPosition.longitude + (Math.random() - 0.5) * offset
      const lat = centerPosition.latitude + (Math.random() - 0.5) * offset

      // 延迟发射 - 更长的间隔减少同时存在的粒子数量
      setTimeout(() => {
        this.launch({
          position: { longitude: lon, latitude: lat, height: 0 },
          ...options
        })
      }, i * 500) // 每500毫秒发射一枚
    }
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

    // 移除所有粒子实体
    this.particles.forEach((p) => {
      this.viewer.entities.remove(p.entity)
    })
    this.particles = []

    this.isActive = false
    console.log('[FireworkEffect] Firework destroyed')
  }
}
