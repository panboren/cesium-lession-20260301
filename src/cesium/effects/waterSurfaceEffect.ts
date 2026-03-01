/**
 * 水面特效 - Cesium 1.138+
 * 使用 Canvas 动态纹理 + Three.js 算法
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
  waterColor?: Cesium.Color
  waveSpeed?: number
}

/**
 * 水面特效类
 */
export class WaterSurfaceEffect {
  private viewer: Cesium.Viewer
  private entity: Cesium.Entity | null = null
  private isActive: boolean = false
  private time: number = 0
  private canvas: HTMLCanvasElement | null = null
  private updateHandler: any = null

  // 默认配置
  private defaultOptions = {
    radius: 1000,
    waterColor: Cesium.Color.fromCssColorString('#0088cc').withAlpha(0.8),
    waveSpeed: 1.0
  }

  constructor(viewer: Cesium.Viewer) {
    this.viewer = viewer
  }

  /**
   * 改进的噪声函数 - 更平滑的波浪
   */
  private getNoise(x: number, y: number, time: number): number {
    // 第一层：低频大波
    const noise1 = Math.sin((x / 200.0) + time / 3.0) * Math.cos((y / 200.0) + time / 4.0)
    // 第二层：中频波
    const noise2 = Math.sin((x / 100.0) - time / 2.0) * Math.cos((y / 100.0) + time / 2.5)
    // 第三层：高频细波
    const noise3 = Math.sin((x / 50.0) + time / 1.5) * Math.sin((y / 50.0) - time / 2.0)
    // 第四层：微细节
    const noise4 = Math.sin((x / 25.0) - time / 1.0) * Math.cos((y / 25.0) + time / 1.2)

    // 加权叠加
    return (noise1 * 0.5 + noise2 * 0.25 + noise3 * 0.15 + noise4 * 0.1)
  }

  /**
   * 绘制真实水面纹理
   */
  private drawWaterTexture(): void {
    if (!this.canvas) return

    const ctx = this.canvas.getContext('2d')
    if (!ctx) return

    const size = 512
    const imageData = ctx.createImageData(size, size)
    const data = imageData.data

    // 太阳方向和光强
    const sunAngle = this.time * 0.2
    const sunX = Math.cos(sunAngle) * 0.7
    const sunY = -0.3

    // 逐像素绘制
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const idx = (y * size + x) * 4

        // 归一化坐标
        const nx = x / size
        const ny = y / size

        // 计算波浪噪声
        const noise = this.getNoise(nx * 10, ny * 10, this.time)

        // 计算法线（通过梯度）
        const eps = 0.01
        const nxLeft = this.getNoise((nx - eps) * 10, ny * 10, this.time)
        const nxRight = this.getNoise((nx + eps) * 10, ny * 10, this.time)
        const nyTop = this.getNoise(nx * 10, (ny - eps) * 10, this.time)
        const nyBottom = this.getNoise(nx * 10, (ny + eps) * 10, this.time)

        const normalX = (nxRight - nxLeft) / eps
        const normalY = (nyBottom - nyTop) / eps
        const normalZ = 1.0

        // 法线归一化
        const normalLen = Math.sqrt(normalX * normalX + normalY * normalY + normalZ * normalZ)
        const nX = normalX / normalLen
        const nY = normalY / normalLen
        const nZ = normalZ / normalLen

        // 视线方向（从上方观察）
        const viewX = 0.0
        const viewY = 0.0
        const viewZ = 1.0

        // 菲涅尔效应
        const fresnel = Math.pow(1.0 - Math.max(viewX * nX + viewY * nY + viewZ * nZ, 0), 2.0)

        // 太阳反射
        const reflectX = 2 * (nX * viewX + nY * viewY + nZ * viewZ) * nX - viewX
        const reflectY = 2 * (nX * viewX + nY * viewY + nZ * viewZ) * nY - viewY
        const reflectZ = 2 * (nX * viewX + nY * viewY + nZ * viewZ) * nZ - viewZ

        const sunReflect = Math.max(reflectX * sunX + reflectY * sunY + reflectZ * 0.7, 0)
        const sunSpecular = Math.pow(sunReflect, 128.0) * 0.8

        // 基础水色（深蓝到浅蓝）
        const r = 0
        const g = 0.5 + noise * 0.1 + fresnel * 0.3
        const b = 0.7 + noise * 0.1 + fresnel * 0.2

        // 最终颜色
        data[idx] = Math.min(255, (r + sunSpecular * 2.0) * 255)     // R
        data[idx + 1] = Math.min(255, (g + sunSpecular * 2.0) * 255) // G
        data[idx + 2] = Math.min(255, (b + sunSpecular * 3.0) * 255) // B
        data[idx + 3] = Math.min(255, (0.7 + fresnel * 0.2) * 255)    // A
      }
    }

    ctx.putImageData(imageData, 0, 0)

    // 添加微妙的涟漪叠加
    ctx.globalCompositeOperation = 'overlay'
    for (let i = 0; i < 3; i++) {
      const progress = ((this.time * 0.15 + i / 3) % 1)
      const radius = progress * 250
      const alpha = (1 - progress) * 0.1

      ctx.beginPath()
      ctx.arc(size / 2, size / 2, radius, 0, Math.PI * 2)
      ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`
      ctx.lineWidth = 1
      ctx.stroke()
    }
    ctx.globalCompositeOperation = 'source-over'
  }

  /**
   * 创建水面实体
   */
  create(options: WaterSurfaceOptions): void {
    const config = { ...this.defaultOptions, ...options } as Required<WaterSurfaceOptions>

    if (this.entity) {
      this.destroy()
    }

    const { longitude, latitude, height } = config.position
    const radius = config.radius

    // 创建 Canvas
    this.canvas = document.createElement('canvas')
    this.canvas.width = 512
    this.canvas.height = 512

    // 绘制初始纹理
    this.drawWaterTexture()

    // 创建 CallbackProperty 动态更新
    const imageCallback = () => {
      return this.canvas
    }

    // 计算多边形顶点
    const positions: Cesium.Cartesian3[] = []
    const segments = 64

    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * 2 * Math.PI
      const lon = longitude + (radius / 111000) * Math.cos(angle)
      const lat = latitude + (radius / 111000) * Math.sin(angle)
      positions.push(Cesium.Cartesian3.fromDegrees(lon, lat, height))
    }

    // 添加实体
    this.entity = this.viewer.entities.add({
      polygon: {
        hierarchy: new Cesium.PolygonHierarchy(positions),
        material: new Cesium.ImageMaterialProperty({
          image: new Cesium.CallbackProperty(imageCallback, false),
          transparent: true
        })
      }
    })

    this.isActive = true
    this.time = 0

    // 启动动画
    this.startAnimation(config.waveSpeed)

    console.log('[WaterSurfaceEffect] Water surface created')
    console.log('[WaterSurfaceEffect] Center:', longitude, latitude, 'Height:', height)
  }

  /**
   * 启动动画
   */
  private startAnimation(waveSpeed: number): void {
    if (this.updateHandler) return

    const updateCallback = () => {
      this.time += 0.016 * waveSpeed
      this.drawWaterTexture()
    }

    this.updateHandler = this.viewer.scene.preRender.addEventListener(updateCallback)
    console.log('[WaterSurfaceEffect] Animation started')
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
    if (this.updateHandler) {
      this.viewer.scene.preRender.removeEventListener(this.updateHandler)
      this.updateHandler = null
    }

    if (this.entity) {
      this.viewer.entities.remove(this.entity)
      this.entity = null
    }

    if (this.canvas) {
      this.canvas = null
    }

    this.isActive = false
    this.time = 0
    console.log('[WaterSurfaceEffect] Water surface destroyed')
  }
}
