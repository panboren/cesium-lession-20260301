/**
 * Cesium 工具函数集
 * 提供常用的 Cesium 坐标转换和操作辅助函数
 */

import * as Cesium from 'cesium'
import { COORDINATES } from '../constants'
import { logger } from '@/utils/logger'

/**
 * 坐标接口
 */
export interface Coordinate {
  longitude: number
  latitude: number
  height?: number
}

/**
 * 飞行选项接口
 */
export interface FlyToOptions {
  destination?: Coordinate
  orientation?: {
    heading?: number
    pitch?: number
    roll?: number
  }
  duration?: number
}

/**
 * 将坐标转换为笛卡尔坐标
 * @param coordinate 经纬度坐标
 * @returns 笛卡尔坐标
 */
export function toCartesian(coordinate: Coordinate): Cesium.Cartesian3 {
  return Cesium.Cartesian3.fromDegrees(
    coordinate.longitude,
    coordinate.latitude,
    coordinate.height ?? 0
  )
}

/**
 * 批量将坐标转换为笛卡尔坐标
 * @param coordinates 经纬度坐标数组
 * @returns 笛卡尔坐标数组
 */
export function toCartesianArray(coordinates: Coordinate[]): Cesium.Cartesian3[] {
  return coordinates.map(coord => toCartesian(coord))
}

/**
 * 将笛卡尔坐标转换为经纬度坐标
 * @param cartesian 笛卡尔坐标
 * @returns 经纬度坐标
 */
export function fromCartesian(cartesian: Cesium.Cartesian3): Coordinate {
  const cartographic = Cesium.Cartographic.fromCartesian(cartesian)
  return {
    longitude: Cesium.Math.toDegrees(cartographic.longitude),
    latitude: Cesium.Math.toDegrees(cartographic.latitude),
    height: cartographic.height
  }
}

/**
 * 批量将笛卡尔坐标转换为经纬度坐标
 * @param cartographics 笛卡尔坐标数组
 * @returns 经纬度坐标数组
 */
export function fromCartesianArray(cartographics: Cesium.Cartesian3[]): Coordinate[] {
  return cartographics.map(cart => fromCartesian(cart))
}

/**
 * 计算两点之间的距离（米）
 * @param coord1 坐标1
 * @param coord2 坐标2
 * @returns 距离（米）
 */
export function calculateDistance(coord1: Coordinate, coord2: Coordinate): number {
  const cartesian1 = toCartesian(coord1)
  const cartesian2 = toCartesian(coord2)
  return Cesium.Cartesian3.distance(cartesian1, cartesian2)
}

/**
 * 计算两点之间的方位角（度）
 * @param coord1 起点坐标
 * @param coord2 终点坐标
 * @returns 方位角（0-360度）
 */
export function calculateBearing(coord1: Coordinate, coord2: Coordinate): number {
  const lon1 = Cesium.Math.toRadians(coord1.longitude)
  const lat1 = Cesium.Math.toRadians(coord1.latitude)
  const lon2 = Cesium.Math.toRadians(coord2.longitude)
  const lat2 = Cesium.Math.toRadians(coord2.latitude)

  const dLon = lon2 - lon1
  const y = Math.sin(dLon) * Math.cos(lat2)
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon)

  const bearing = Math.atan2(y, x)
  const bearingDegrees = Cesium.Math.toDegrees(bearing)
  return (bearingDegrees + 360) % 360
}

/**
 * 飞向北京
 * @param viewer Cesium Viewer
 * @param duration 飞行动画持续时间（秒）
 */
export function flyToBeijing(viewer: Cesium.Viewer, duration: number = 0.5): void {
  viewer.camera.flyTo({
    destination: Cesium.Cartesian3.fromDegrees(
      COORDINATES.BEIJING.longitude,
      COORDINATES.BEIJING.latitude,
      COORDINATES.DEFAULT_INITIAL_VIEW.height
    ),
    duration
  })
  logger.debug(`Flying to Beijing, duration: ${duration}s`)
}

/**
 * 手动触发渲染
 * @param viewer Cesium Viewer
 */
export function requestRender(viewer: Cesium.Viewer): void {
  if (viewer.scene.requestRenderMode) {
    viewer.scene.requestRender()
  }
}

/**
 * 检查是否需要手动渲染
 * @param viewer Cesium Viewer
 * @returns 是否需要手动渲染
 */
export function needsManualRender(viewer: Cesium.Viewer): boolean {
  return viewer.scene.requestRenderMode
}

/**
 * 创建默认的 Entity 样式配置
 * @param color 颜色
 * @returns 样式配置对象
 */
export function createDefaultPointStyle(color: Cesium.Color = Cesium.Color.RED) {
  return {
    pixelSize: 10,
    color,
    outlineColor: Cesium.Color.WHITE,
    outlineWidth: 2,
    disableDepthTestDistance: Number.POSITIVE_INFINITY
  }
}

/**
 * 创建默认的线段样式配置
 * @param color 颜色
 * @param width 宽度
 * @returns 样式配置对象
 */
export function createDefaultPolylineStyle(color: Cesium.Color = Cesium.Color.CYAN, width: number = 3) {
  return {
    width,
    material: color,
    clampToGround: true
  }
}

/**
 * 创建默认的多边形样式配置
 * @param color 颜色
 * @returns 样式配置对象
 */
export function createDefaultPolygonStyle(color: Cesium.Color = Cesium.Color.RED.withAlpha(0.6)) {
  return {
    material: color,
    outline: true,
    outlineColor: Cesium.Color.WHITE,
    outlineWidth: 2,
    perPositionHeight: false
  }
}

/**
 * 获取当前相机位置
 * @param viewer Cesium Viewer
 * @returns 相机位置信息
 */
export function getCameraPosition(viewer: Cesium.Viewer): Coordinate & {
  heading: number
  pitch: number
  roll: number
} {
  const camera = viewer.camera
  const position = camera.positionCartographic

  return {
    longitude: Cesium.Math.toDegrees(position.longitude),
    latitude: Cesium.Math.toDegrees(position.latitude),
    height: position.height,
    heading: Cesium.Math.toDegrees(camera.heading),
    pitch: Cesium.Math.toDegrees(camera.pitch),
    roll: Cesium.Math.toDegrees(camera.roll)
  }
}

/**
 * 判断点是否在多边形内
 * @param point 待判断的点
 * @param polygon 多边形顶点数组
 * @returns 是否在多边形内
 */
export function isPointInPolygon(point: Coordinate, polygon: Coordinate[]): boolean {
  const x = point.longitude
  const y = point.latitude
  let inside = false

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].longitude
    const yi = polygon[i].latitude
    const xj = polygon[j].longitude
    const yj = polygon[j].latitude

    const intersect =
      yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi
    if (intersect) inside = !inside
  }

  return inside
}

/**
 * 计算多边形的中心点
 * @param polygon 多边形顶点数组
 * @returns 中心点坐标
 */
export function calculatePolygonCenter(polygon: Coordinate[]): Coordinate {
  if (polygon.length === 0) {
    throw new Error('Polygon has no vertices')
  }

  let sumLng = 0
  let sumLat = 0
  let sumHeight = 0

  for (const vertex of polygon) {
    sumLng += vertex.longitude
    sumLat += vertex.latitude
    sumHeight += vertex.height ?? 0
  }

  return {
    longitude: sumLng / polygon.length,
    latitude: sumLat / polygon.length,
    height: sumHeight / polygon.length
  }
}

/**
 * 计算点的缓冲区（圆形）
 * @param center 中心点
 * @param radius 半径（米）
 * @param segments 圆的分段数（默认 64）
 * @returns 缓冲区多边形顶点数组
 */
export function createBufferZone(
  center: Coordinate,
  radius: number,
  segments: number = 64
): Coordinate[] {
  const vertices: Coordinate[] = []
  const cartographicCenter = Cesium.Cartographic.fromDegrees(
    center.longitude,
    center.latitude,
    center.height
  )

  for (let i = 0; i < segments; i++) {
    const angle = (i / segments) * 2 * Math.PI
    const lng = cartographicCenter.longitude + (radius * Math.cos(angle)) / 6378137
    const lat = cartographicCenter.latitude + (radius * Math.sin(angle)) / 6378137

    vertices.push({
      longitude: Cesium.Math.toDegrees(lng),
      latitude: Cesium.Math.toDegrees(lat),
      height: center.height ?? 0
    })
  }

  return vertices
}
