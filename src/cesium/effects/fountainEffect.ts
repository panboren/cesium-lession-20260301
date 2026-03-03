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
  position: Cesium.Cartesian3 // 局部坐标（米）
  velocity: Cesium.Cartesian3 // 局部速度（米/秒）
  startPosition: Cesium.Cartesian3 // 起始地理坐标
  eastNorthUpMatrix: Cesium.Matrix4 // ENU 转换矩阵
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
    particleCount: 500, // 增加粒子数量
    flowRate: 15, // 增加流量
    waterColor: Cesium.Color.fromCssColorString('#00aaff').withAlpha(0.8),
    gravity: 9.8,
    wind: { direction: 0, speed: 0 },
    width: 10,
    lifeTime: 4.0, // 增加生命周期
    waveSpeed: 0.05, // 加快波浪速度
    waveStrength: 0.6, // 增强波浪强度
    rippleRadius: 50
  }

  constructor(viewer: Cesium.Viewer) {
    this.viewer = viewer
  }

  /**
   * 计算波浪位移 - 参考 CesiumMeshVisualizer 的多层噪声技术
   * 使用 Perlin-like 多层噪声叠加模拟真实水波
   */
  private calculateWaveOffset(
    x: number,
    y: number,
    z: number,
    time: number,
    waveSpeed: number,
    waveStrength: number
  ): { x: number; y: number; z: number } {
    // 参考 CesiumMeshVisualizer fluid demo 的噪声技术
    // 使用多个不同频率和速度的正弦波叠加
    
    // 第一层 - 大波浪（低频）
    const freq1 = 0.08
    const phase1 = time * waveSpeed
    const wave1 = Math.sin(x * freq1 + phase1) * Math.cos(y * freq1 + phase1 * 0.8)
    
    // 第二层 - 中等波浪（中频）
    const freq2 = 0.15
    const phase2 = time * waveSpeed * 1.3
    const wave2 = Math.cos(x * freq2 + phase2) * Math.sin(y * freq2 + phase2 * 0.7)
    
    // 第三层 - 细节波浪（高频）
    const freq3 = 0.25
    const phase3 = time * waveSpeed * 1.8
    const wave3 = Math.sin(x * freq3 + phase3) * Math.cos(y * freq3 + phase3 * 0.6)
    
    // 第四层 - 微小细节（超高频）
    const freq4 = 0.5
    const phase4 = time * waveSpeed * 2.2
    const wave4 = Math.cos(x * freq4 + phase4) * Math.sin(y * freq4 + phase4 * 0.5)
    
    // 加权组合波浪（参考 fluid demo 的噪声权重）
    const combinedWave = (wave1 * 1.0 + wave2 * 0.7 + wave3 * 0.4 + wave4 * 0.2) * waveStrength
    
    return {
      x: combinedWave * 1.5,
      y: combinedWave * 1.5,
      z: Math.sin(time * waveSpeed * 3 + x * 0.1 + y * 0.1) * waveStrength * 2
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
        // 参考 CesiumMeshVisualizer 流体模拟的速度场分布
        const angle = (offset / options.particleCount) * Math.PI * 2
        const radius = Math.random() * (width / 2)
        
        // 更自然的水平速度分布
        const horizontalSpeed = radius * (0.3 + Math.random() * 0.7)

        // 向上速度计算（达到指定高度）- 加入更多随机性
        const speedVariation = 0.7 + Math.random() * 0.6
        const verticalSpeed = Math.sqrt(2 * options.gravity * height) * speedVariation

        // 轻微旋转模拟湍流
        const turbulenceAngle = Math.sin(offset * 0.1) * 0.2
        const vx = horizontalSpeed * Math.cos(angle + turbulenceAngle)
        const vy = horizontalSpeed * Math.sin(angle + turbulenceAngle)
        const vz = verticalSpeed

        return new Cesium.Cartesian3(vx, vy, vz)
      }

      case FountainType.WATERFALL: {
        // 瀑布：向下流动，初始有水平速度
        // 参考 fluid demo 的速度场
        const horizontalSpeed = 25 + Math.random() * 35
        const angle = (offset / options.particleCount) * Math.PI * 2
        const spread = Math.random() * (width / 4)

        // 加入湍流效果
        const turbulence = (Math.random() - 0.5) * 5
        const vx = horizontalSpeed * Math.cos(angle) + spread * Math.random() - spread / 2 + turbulence
        const vy = horizontalSpeed * Math.sin(angle) + spread * Math.random() - spread / 2 + turbulence
        const vz = -(8 + Math.random() * 18) // 初始向下速度

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
        // 参考 fluid demo 的扩散效果
        const angle = (offset / options.particleCount) * Math.PI * 2
        const speed = 12 + Math.random() * 22
        const radiusOffset = Math.random() * 10

        // 加入相位偏移模拟波浪传播
        const phase = (offset / options.particleCount) * Math.PI * 2
        const waveOffset = Math.sin(phase + this.time * 2) * 2

        const vx = speed * Math.cos(angle) * (1 + radiusOffset / 50) + waveOffset
        const vy = speed * Math.sin(angle) * (1 + radiusOffset / 50) + waveOffset
        const vz = (Math.random() - 0.5) * 3 // 轻微的垂直波动

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

    // 创建 ENU 转换矩阵（东-北-上坐标系）
    const cartographic = Cesium.Cartographic.fromCartesian(startPosition)
    const eastNorthUpMatrix = Cesium.Transforms.eastNorthUpToFixedFrame(startPosition)

    // 随机偏移起始位置（ENU 坐标系）
    const offsetRadius = Math.random() * (options.width / 4)
    const offsetAngle = Math.random() * Math.PI * 2
    const localOffset = new Cesium.Cartesian3(
      Math.cos(offsetAngle) * offsetRadius,
      Math.sin(offsetAngle) * offsetRadius,
      0
    )

    // 将 ENU 偏移转换为世界坐标
    const worldOffset = Cesium.Matrix4.multiplyByPoint(eastNorthUpMatrix, localOffset, new Cesium.Cartesian3())
    const finalPosition = Cesium.Cartesian3.add(startPosition, worldOffset, new Cesium.Cartesian3())

    // 随机调整透明度，模拟水滴的不同亮度
    const baseAlpha = 0.6 + Math.random() * 0.3
    const baseSize = 3 + Math.random() * 4
    const wavePhase = Math.random() * Math.PI * 2

    // 初始局部位置（ENU 坐标系，米为单位）
    const localPosition = localOffset.clone()

    // 创建粒子实体
    const entity = this.viewer.entities.add({
      position: new Cesium.CallbackProperty(() => {
        const p = this.particles.find((item) => item.entity === entity)
        if (!p) return finalPosition

        // 应用波浪偏移
        const waveOffset = this.calculateWaveOffset(
          p.position.x,
          p.position.y,
          p.position.z,
          this.time,
          options.waveSpeed,
          options.waveStrength
        )

        // 计算偏移后的 ENU 坐标
        const offsetPosition = new Cesium.Cartesian3(
          p.position.x + waveOffset.x,
          p.position.y + waveOffset.y,
          p.position.z + waveOffset.z
        )

        // 将 ENU 坐标转换为世界坐标
        const worldPos = Cesium.Matrix4.multiplyByPoint(p.eastNorthUpMatrix, offsetPosition, new Cesium.Cartesian3())
        return worldPos
      }, false),
      point: {
        pixelSize: new Cesium.CallbackProperty(() => {
          const p = this.particles.find((item) => item.entity === entity)
          if (!p) return baseSize

          // 波浪强度影响粒子大小
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
          if (lifeRatio < 0.15) {
            easedAlpha = baseAlpha * (lifeRatio / 0.15)
          } else if (lifeRatio > 0.85) {
            easedAlpha = baseAlpha * (1 - (lifeRatio - 0.85) / 0.15)
          }

          // 参考 CesiumMeshVisualizer fluid demo 的波浪影响透明度
          const waveOffset = this.calculateWaveOffset(
            p.position.x,
            p.position.y,
            p.position.z,
            this.time,
            options.waveSpeed,
            options.waveStrength
          )

          // 波浪高亮处透明度更高（模拟反光）- 增强 flash 效果
          const highlightFactor = 1 + waveOffset.z * 0.3
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
      position: localPosition, // ENU 坐标
      velocity, // ENU 速度
      startPosition, // 起始地理坐标
      eastNorthUpMatrix, // ENU 转换矩阵
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
          // 找到生命低于 25% 的粒子进行替换
          const replaceIndex = this.particles.findIndex((p) => p.life / p.maxLife < 0.25)
          if (replaceIndex !== -1) {
            const oldParticle = this.particles[replaceIndex]
            this.viewer.entities.remove(oldParticle.entity)
            this.particles.splice(replaceIndex, 1)
            this.generateParticle(options, Math.floor(Math.random() * options.particleCount))
          }
        }
      }
    }, 16) // 约 60fps
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

    // 更新时间累积 - 用于波浪动画（参考 CesiumMeshVisualizer 的 time uniform）
    this.time += dt

    this.particles.forEach((p) => {
      if (p.life > 0) {
        // 重力影响
        p.velocity.z -= options.gravity * dt

        // 风力影响 - 参考 fluid demo 的力施加
        if (options.wind.speed > 0) {
          const windAngle = options.wind.direction * (Math.PI / 180)
          const windForce = options.wind.speed * 0.5
          p.velocity.x += Math.cos(windAngle) * windForce * dt
          p.velocity.y += Math.sin(windAngle) * windForce * dt
        }

        // 空气阻力 - 水滴阻力较小
        const drag = 0.995
        p.velocity = Cesium.Cartesian3.multiplyByScalar(p.velocity, drag, p.velocity)

        // 添加湍流效果 - 参考 fluid demo 的速度场扰动
        if (p.velocity.z > 0) {
          const turbulence = Math.sin(this.time * 5 + p.life * 2) * 0.3
          p.velocity.x += turbulence * dt * 2
          p.velocity.y += Math.cos(this.time * 4 + p.life * 1.5) * 0.3 * dt * 2
        }

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
    const particleCount = this.particles.length

    this.stopUpdateLoop()
    this.stopParticleGeneration()

    // 移除所有粒子实体
    this.particles.forEach((p, index) => {
      try {
        this.viewer.entities.remove(p.entity)
      } catch (e) {
        console.warn(`[FountainEffect] Error removing particle ${index}:`, e)
      }
    })
    this.particles = []

    // 重置时间
    this.time = 0

    this.isActive = false
    console.log(`[FountainEffect] Fountain destroyed, cleared ${particleCount} particle(s)`)
  }
}
