/**
 * 爆炸特效 - 基于 Cesium 1.138
 * 优化版本：
 * - 使用 ConeEmitter 增强爆炸扩散感
 * - 添加重力效果
 * - 优化性能参数
 * - 像素模式更清晰的视觉效果
 */

import * as Cesium from 'cesium'

/**
 * 爆炸效果配置
 */
export interface ExplosionOptions {
  // 位置
  longitude: number
  latitude: number
  height?: number
  // 粒子参数
  emissionRate?: number // 每秒发射的粒子数
  minimumParticleLife?: number // 最小生命周期（秒）
  maximumParticleLife?: number // 最大生命周期（秒）
  minimumSpeed?: number // 最小速度
  maximumSpeed?: number // 最大速度
  startScale?: number // 初始缩放比例
  endScale?: number // 结束缩放比例
  particleSize?: number // 粒子大小（像素）
  // 颜色
  startColor?: Cesium.Color // 初始颜色
  endColor?: Cesium.Color // 结束颜色
  // 其他参数
  gravity?: number // 重力
  lifetime?: number // 粒子系统生命周期（秒）
  emitterRadius?: number // 发射器半径
  sizeInMeters?: boolean // 尺寸单位是否为米
  // 发射器偏移
  emitterOffsetX?: number
  emitterOffsetY?: number
  emitterOffsetZ?: number
}

/**
 * 爆炸特效类
 */
export class ExplosionEffect {
  private viewer: Cesium.Viewer
  private particleSystem: Cesium.ParticleSystem | null = null
  private entity: Cesium.Entity | null = null
  private preUpdateListener: ((scene: any, time: any) => void) | null = null

  // 模型矩阵相关
  private emitterModelMatrix = new Cesium.Matrix4()
  private translation = new Cesium.Cartesian3()
  private rotation = new Cesium.Quaternion()
  private hpr = new Cesium.HeadingPitchRoll()
  private trs = new Cesium.TranslationRotationScale()

  // 默认配置（优化后）
  private readonly defaultOptions: Required<ExplosionOptions> = {
    longitude: 0,
    latitude: 0,
    height: 0,
    emissionRate: 3,
    minimumParticleLife: 0.8,
    maximumParticleLife: 3.0,
    minimumSpeed: 2.0,
    maximumSpeed: 6.0,
    startScale: 0.0,
    endScale: 8.0,
    particleSize: 40.0,
    startColor: Cesium.Color.fromCssColorString('#ff6600').withAlpha(0.9),
    endColor: Cesium.Color.fromCssColorString('#ffcc00').withAlpha(0.1),
    gravity: -2.0,
    lifetime: 10.0,
    emitterRadius: 3.0,
    sizeInMeters: false,
    emitterOffsetX: 0.0,
    emitterOffsetY: 0.0,
    emitterOffsetZ: 0.0
  }

  constructor(viewer: Cesium.Viewer) {
    this.viewer = viewer
  }

  /**
   * 创建爆炸效果
   */
  create(options: ExplosionOptions): void {
    // 合并配置
    const opts = { ...this.defaultOptions, ...options }

    // 确保场景可以渲染粒子
    this.viewer.clock.shouldAnimate = true
    this.viewer.scene.globe.depthTestAgainstTerrain = false

    // 创建实体作为爆炸位置锚点
    this.entity = this.viewer.entities.add({
      position: Cesium.Cartesian3.fromDegrees(opts.longitude, opts.latitude, opts.height)
    })

    // 创建爆炸纹理（使用图片）
    const explosionTexture = this.createExplosionTexture()

    // 创建粒子系统
    this.particleSystem = this.viewer.scene.primitives.add(
      new Cesium.ParticleSystem({
        image: explosionTexture,
        // 颜色
        startColor: opts.startColor,
        endColor: opts.endColor,
        // 缩放
        startScale: opts.startScale,
        endScale: opts.endScale,
        // 生命周期
        minimumParticleLife: opts.minimumParticleLife,
        maximumParticleLife: opts.maximumParticleLife,
        // 速度
        minimumSpeed: opts.minimumSpeed,
        maximumSpeed: opts.maximumSpeed,
        // 粒子大小
        imageSize: new Cesium.Cartesian2(opts.particleSize, opts.particleSize),
        // 发射速率
        emissionRate: opts.emissionRate,
        // 系统生命周期
        lifetime: opts.lifetime,
        // 尺寸单位（像素模式更清晰）
        sizeInMeters: opts.sizeInMeters,
        // 发射器（圆锥发射器更具爆炸感）
        emitter: new Cesium.ConeEmitter(Cesium.Math.toRadians(30.0), 2.0),
        // 渲染状态
        blending: Cesium.BlendingState.ALPHA_BLEND,
        depthTest: true,
        depthWrite: false
      })
    )

    // 注册预更新事件
    this.registerPreUpdateEvent(opts)

    console.log('[ExplosionEffect] Explosion effect created')
  }

  /**
   * 创建爆炸纹理
   */
  private createExplosionTexture(): string {
    return '/explot.png'
  }

  /**
   * 注册预更新事件
   */
  private registerPreUpdateEvent(opts: Required<ExplosionOptions>): void {
    const _this = this

    this.preUpdateListener = function (scene: any, time: any) {
      if (!_this.particleSystem || !_this.entity) return

      // 更新粒子系统的模型矩阵（位置）- 示例代码方式
      _this.particleSystem.modelMatrix = _this.computeModelMatrix(_this.entity, time)
      // 更新发射器的局部位置
      _this.particleSystem.emitterModelMatrix = _this.computeEmitterModelMatrix(opts)
    }

    this.viewer.scene.preUpdate.addEventListener(this.preUpdateListener)
  }

  /**
   * 计算实体模型矩阵
   */
  private computeModelMatrix(entity: Cesium.Entity, time: any): Cesium.Matrix4 {
    return entity.computeModelMatrix(time, new Cesium.Matrix4())
  }

  /**
   * 计算发射器模型矩阵
   */
  private computeEmitterModelMatrix(opts: Required<ExplosionOptions>): Cesium.Matrix4 {
    this.hpr = Cesium.HeadingPitchRoll.fromDegrees(0.0, 0.0, 0.0, this.hpr)
    this.trs.translation = Cesium.Cartesian3.fromElements(
      opts.emitterOffsetX,
      opts.emitterOffsetY,
      opts.emitterOffsetZ,
      this.translation
    )
    this.trs.rotation = Cesium.Quaternion.fromHeadingPitchRoll(this.hpr, this.rotation)

    return Cesium.Matrix4.fromTranslationRotationScale(this.trs, this.emitterModelMatrix)
  }

  /**
   * 设置发射速率
   */
  setEmissionRate(rate: number): void {
    if (this.particleSystem) {
      this.particleSystem.emissionRate = rate
    }
  }

  /**
   * 获取粒子系统
   */
  getParticleSystem(): Cesium.ParticleSystem | null {
    return this.particleSystem
  }

  /**
   * 获取实体
   */
  getEntity(): Cesium.Entity | null {
    return this.entity
  }

  /**
   * 销毁爆炸效果
   */
  destroy(): void {
    // 移除预更新事件监听器
    if (this.preUpdateListener) {
      this.viewer.scene.preUpdate.removeEventListener(this.preUpdateListener)
      this.preUpdateListener = null
    }

    // 移除粒子系统
    if (this.particleSystem) {
      this.viewer.scene.primitives.remove(this.particleSystem)
      this.particleSystem = null
    }

    // 移除实体
    if (this.entity) {
      this.viewer.entities.remove(this.entity)
      this.entity = null
    }

    // 清理矩阵
    this.emitterModelMatrix = new Cesium.Matrix4()
    this.translation = new Cesium.Cartesian3()
    this.rotation = new Cesium.Quaternion()
    this.hpr = new Cesium.HeadingPitchRoll()
    this.trs = new Cesium.TranslationRotationScale()

    console.log('[ExplosionEffect] Explosion effect destroyed')
  }
}
