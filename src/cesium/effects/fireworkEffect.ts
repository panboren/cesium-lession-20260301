/**
 * 烟花特效 - 基于 Cesium 1.138
 * 学习 Three.js 和 Cesium 源码重新实现
 * 使用 ParticleSystem + SphereEmitter + 自定义物理效果
 */

import * as Cesium from 'cesium'

/**
 * 烟花配置
 */
export interface FireworkOptions {
  position: {
    longitude: number
    latitude: number
    height: number
  }
  particleCount?: number // 粒子数量 (500-2000)
  particleSize?: number // 粒子大小 (5-15)
  explosionRadius?: number // 爆炸半径 (米)
  duration?: number // 持续时间（秒）
  colors?: Cesium.Color[] // 粒子颜色数组
  gravity?: number // 重力系数
  drag?: number // 空气阻力
}

/**
 * 烟花特效类
 */
export class FireworkEffect {
  private viewer: Cesium.Viewer
  private particleSystems: Cesium.ParticleSystem[] = []

  // 默认配置（性能优化版）
  private defaultOptions = {
    particleCount: 800, // 减少粒子数量，提升性能
    particleSize: 5.0, // 增大粒子大小补偿视觉效果
    explosionRadius: 100.0,
    duration: 2.0, // 缩短持续时间
    colors: [
      Cesium.Color.RED.withAlpha(1.0),
      Cesium.Color.ORANGE.withAlpha(1.0),
      Cesium.Color.YELLOW.withAlpha(1.0),
      Cesium.Color.LIME.withAlpha(1.0),
      Cesium.Color.CYAN.withAlpha(1.0),
      Cesium.Color.MAGENTA.withAlpha(1.0),
      Cesium.Color.WHITE.withAlpha(1.0)
    ],
    gravity: 15.0, // 增加重力，让粒子更快下落
    drag: 0.02 // 增加阻力，让粒子更快减速
  }

  constructor(viewer: Cesium.Viewer) {
    this.viewer = viewer
  }

  /**
   * 创建烟花爆炸效果（基于 Three.js 和 Cesium 源码优化）
   */
  create(options: FireworkOptions): void {
    const config = {
      ...this.defaultOptions,
      ...options
    } as Required<FireworkOptions>

    const { longitude, latitude, height } = config.position

    // 使用 eastNorthUpToFixedFrame 创建模型矩阵
    const position = Cesium.Cartesian3.fromDegrees(longitude, latitude, height)
    const modelMatrix = Cesium.Transforms.eastNorthUpToFixedFrame(position)

    // 随机选择颜色
    const color = config.colors[Math.floor(Math.random() * config.colors.length)]

    // 随机爆炸大小
    const size = Cesium.Math.randomBetween(
      config.explosionRadius * 0.7,
      config.explosionRadius * 1.3
    )

    // 创建粒子爆发（单次爆发，性能更好）
    const bursts = [
      new Cesium.ParticleBurst({
        time: 0.05,
        minimum: config.particleCount,
        maximum: config.particleCount
      })
    ]

    // 计算粒子生命周期
    const minLife = config.duration * 0.5
    const maxLife = config.duration

    // 物理参数 scratch 对象
    const gravityScratch = new Cesium.Cartesian3()

    // 自定义物理效果（重力 + 阻力）
    const updateCallback = (particle: any) => {
      // 应用重力（Y轴向下）
      gravityScratch.x = 0
      gravityScratch.y = -config.gravity * 0.016
      gravityScratch.z = 0

      particle.velocity = Cesium.Cartesian3.add(
        particle.velocity,
        gravityScratch,
        particle.velocity
      )

      // 应用空气阻力
      particle.velocity = Cesium.Cartesian3.multiplyByScalar(
        particle.velocity,
        1.0 - config.drag,
        particle.velocity
      )
    }

    // 创建粒子系统
    const particleSystem = this.viewer.scene.primitives.add(
      new Cesium.ParticleSystem({
        // 粒子纹理
        image: this.createGlowTexture(),

        // 颜色渐变
        startColor: Cesium.Color.clone(color),
        endColor: color.withAlpha(0.0),

        // 尺寸变化 - 先放大后缩小
        startScale: 0.3,
        endScale: 1.2,

        // 粒子生命周期
        minimumParticleLife: minLife,
        maximumParticleLife: maxLife,

        // 速度
        minimumSpeed: 70.0,
        maximumSpeed: 140.0,

        // 粒子大小
        imageSize: new Cesium.Cartesian2(config.particleSize, config.particleSize),

        // 发射器
        emitter: new Cesium.SphereEmitter(0.1),

        // 发射率
        emissionRate: 0,

        // 爆发配置
        bursts: bursts,

        // 持续时间
        lifetime: config.duration + 0.8,

        // 渲染状态
        blending: Cesium.BlendingState.ADDITIVE_BLEND,
        depthTest: false,
        depthWrite: false,

        // 模型矩阵
        modelMatrix: modelMatrix,

        // 自定义物理
        updateCallback: updateCallback
      })
    )

    // 保存引用
    this.particleSystems.push(particleSystem)

    console.log('[FireworkEffect] Firework created (performance optimized)')
    console.log('[FireworkEffect] Position:', longitude.toFixed(4), latitude.toFixed(4), height.toFixed(0))
    console.log('[FireworkEffect] Particles:', config.particleCount)
    console.log('[FireworkEffect] Color:', color.toString())
  }



  /**
   * 创建高质量光晕粒子纹理（性能优化版）
   */
  private createGlowTexture(): HTMLCanvasElement {
    const canvas = document.createElement('canvas')
    canvas.width = 32
    canvas.height = 32

    const ctx = canvas.getContext('2d')
    if (!ctx) return canvas

    const centerX = 16
    const centerY = 16

    // 简单径向渐变，性能更好
    const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, 16)
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)')
    gradient.addColorStop(0.4, 'rgba(255, 255, 255, 0.4)')
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)')

    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, 32, 32)

    return canvas
  }

  /**
   * 创建多个烟花（连发效果）
   */
  createMultiple(positions: Array<{ longitude: number; latitude: number; height: number }>, delay: number = 0.5): void {
    positions.forEach((pos, index) => {
      setTimeout(() => {
        this.create({ position: pos })
      }, index * delay * 1000)
    })
  }

  /**
   * 发射多个烟花（简化版）
   * @param count 烟花数量
   * @param basePosition 基准位置（不包含高度）
   */
  launchMultiple(count: number, basePosition: { longitude: number; latitude: number }): void {
    const positions: Array<{ longitude: number; latitude: number; height: number }> = []
    for (let i = 0; i < count; i++) {
      positions.push({
        longitude: basePosition.longitude + (Math.random() - 0.5) * 0.01,
        latitude: basePosition.latitude + (Math.random() - 0.5) * 0.01,
        height: 200 + Math.random() * 300
      })
    }
    this.createMultiple(positions, 0.25) // 增加间隔，降低同时存在的烟花数量
  }

  /**
   * 获取是否活跃
   */
  getActive(): boolean {
    return this.particleSystems.length > 0
  }

  /**
   * 销毁特效
   */
  destroy(): void {
    // 移除并销毁所有粒子系统
    this.particleSystems.forEach((ps) => {
      try {
        // 立即隐藏
        ps.show = false
        // 设置生命周期为0，立即停止发射新粒子
        ps.lifetime = 0
        // 从场景中移除
        this.viewer.scene.primitives.remove(ps)
      } catch (e) {
        // 忽略已销毁的错误
      }
    })

    // 清空数组
    this.particleSystems = []

    console.log('[FireworkEffect] Firework destroyed, cleared', this.particleSystems.length, 'systems')
  }
}
