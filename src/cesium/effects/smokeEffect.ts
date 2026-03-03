/**
 * 烟雾特效 - 基于 Cesium 1.138
 * 学习 Three.js 烟雾效果实现，使用 ParticleSystem + 自定义物理效果
 * 特性：
 * - 支持多个发射源
 * - 风力影响
 * - 颜色渐变
 * - 透明度衰减
 * - 粒子大小随时间变化
 */

import * as Cesium from 'cesium'

/**
 * 烟雾发射器配置
 */
export interface SmokeEmitter {
  id: string
  position: {
    longitude: number
    latitude: number
    height: number
  }
  emissionRate: number // 发射速率（粒子/秒）
  particleSize: number // 粒子大小
  minimumParticleLife: number // 最小生命周期（秒）
  maximumParticleLife: number // 最大生命周期（秒）
  minimumSpeed: number // 最小速度
  maximumSpeed: number // 最大速度
  startOpacity: number // 初始透明度
  endOpacity: number // 结束透明度
  colorStart: Cesium.Color // 初始颜色
  colorEnd: Cesium.Color // 结束颜色
  windSpeed: number // 风速（米/秒）
  windDirection: number // 风向（角度）
  riseSpeed: number // 上升速度（米/秒）
}

/**
 * 烟雾特效类
 */
export class SmokeEffect {
  private viewer: Cesium.Viewer
  private particleSystems: Map<string, Cesium.ParticleSystem> = new Map()
  private emitters: Map<string, SmokeEmitter> = new Map()
  private time: number = 0
  private isActive: boolean = false

  constructor(viewer: Cesium.Viewer) {
    this.viewer = viewer
  }

  /**
   * 添加烟雾发射器
   */
  addEmitter(emitter: SmokeEmitter): void {
    this.emitters.set(emitter.id, emitter)
    console.log(`[SmokeEffect] Added emitter: ${emitter.id}`)
  }

  /**
   * 移除烟雾发射器
   */
  removeEmitter(id: string): void {
    this.emitters.delete(id)
    console.log(`[SmokeEffect] Removed emitter: ${id}`)
  }

  /**
   * 创建烟雾特效
   */
  create(): void {
    if (this.emitters.size === 0) {
      console.error('[SmokeEffect] No emitter found')
      return
    }

    // 为每个发射器创建粒子系统
    this.emitters.forEach((emitter, id) => {
      this.createParticleSystem(id, emitter)
    })

    this.isActive = true

    console.log('[SmokeEffect] Smoke effect created')
  }

  /**
   * 为单个发射器创建粒子系统
   */
  private createParticleSystem(id: string, emitter: SmokeEmitter): void {
    const position = Cesium.Cartesian3.fromDegrees(
      emitter.position.longitude,
      emitter.position.latitude,
      emitter.position.height
    )
    const modelMatrix = Cesium.Transforms.eastNorthUpToFixedFrame(position)

    // 创建粒子系统
    const particleSystem = this.viewer.scene.primitives.add(
      new Cesium.ParticleSystem({
        image: this.createSmokeTexture(),

        // 颜色
        startColor: emitter.colorStart.withAlpha(emitter.startOpacity),
        endColor: emitter.colorEnd.withAlpha(emitter.endOpacity),

        // 尺寸
        startScale: 1.0,
        endScale: 5.0,

        // 生命周期
        minimumParticleLife: emitter.minimumParticleLife,
        maximumParticleLife: emitter.maximumParticleLife,

        // 速度
        minimumSpeed: emitter.minimumSpeed,
        maximumSpeed: emitter.maximumSpeed,

        // 粒子大小
        imageSize: new Cesium.Cartesian2(emitter.particleSize, emitter.particleSize),

        // 发射器
        emitter: new Cesium.CircleEmitter(emitter.particleSize * 2),

        // 发射率
        emissionRate: emitter.emissionRate,

        // 持续时间
        lifetime: 3600.0, // 1小时

        // 渲染状态
        blending: Cesium.BlendingState.ALPHA_BLEND,
        depthTest: false,
        depthWrite: false,

        // 模型矩阵
        modelMatrix: modelMatrix,

        // 自定义物理
        updateCallback: (particle: any, dt: number) => {
          this.updateParticle(particle, dt, emitter)
        }
      })
    )

    this.particleSystems.set(id, particleSystem)
    console.log(`[SmokeEffect] Created particle system for emitter: ${id}`)
  }

  /**
   * 创建烟雾纹理（柔和的圆形渐变）
   */
  private createSmokeTexture(): HTMLCanvasElement {
    const canvas = document.createElement('canvas')
    canvas.width = 64
    canvas.height = 64

    const ctx = canvas.getContext('2d')
    if (!ctx) return canvas

    const centerX = 32
    const centerY = 32

    // 创建多层渐变，模拟烟雾的柔和效果
    for (let i = 0; i < 5; i++) {
      const radius = 28 - i * 4
      const alpha = 0.15 - i * 0.02
      const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius)
      gradient.addColorStop(0, `rgba(255, 255, 255, ${alpha})`)
      gradient.addColorStop(0.5, `rgba(255, 255, 255, ${alpha * 0.5})`)
      gradient.addColorStop(1, 'rgba(255, 255, 255, 0)')

      ctx.fillStyle = gradient
      ctx.fillRect(0, 0, 64, 64)
    }

    return canvas
  }

  /**
   * 更新粒子（自定义物理效果）
   */
  private updateParticle(particle: any, dt: number, emitter: SmokeEmitter): void {
    // 计算风力
    const windAngle = Cesium.Math.toRadians(emitter.windDirection)
    const windX = Math.cos(windAngle) * emitter.windSpeed * dt
    const windZ = Math.sin(windAngle) * emitter.windSpeed * dt
    const windY = emitter.riseSpeed * dt

    // 添加风速到粒子速度
    particle.velocity.x += windX * 0.1
    particle.velocity.y += windY * 0.1
    particle.velocity.z += windZ * 0.1

    // 更新粒子位置
    Cesium.Cartesian3.add(particle.position, particle.velocity, particle.position)
  }

  /**
   * 销毁特效
   */
  destroy(): void {
    this.isActive = false

    let removedCount = 0
    this.particleSystems.forEach((ps, id) => {
      try {
        ps.show = false
        ps.lifetime = 0
        this.viewer.scene.primitives.remove(ps)
        removedCount++
        console.log(`[SmokeEffect] Removed particle system: ${id}`)
      } catch (e) {
        console.warn(`[SmokeEffect] Error removing particle system ${id}:`, e)
      }
    })

    this.particleSystems.clear()
    this.emitters.clear()

    console.log(`[SmokeEffect] Smoke effect destroyed, removed ${removedCount} particle system(s)`)
  }

  /**
   * 获取粒子系统
   */
  getParticleSystem(id?: string): Cesium.ParticleSystem | Map<string, Cesium.ParticleSystem> {
    if (id) {
      return this.particleSystems.get(id) || null
    }
    return this.particleSystems
  }

  /**
   * 检查是否活跃
   */
  getActive(): boolean {
    return this.isActive
  }

  /**
   * 获取发射器数量
   */
  getEmitterCount(): number {
    return this.emitters.size
  }
}
