/**
 * Cesium 相关类型定义
 */

import * as Cesium from 'cesium'

/**
 * 绘制类型
 */
export enum DrawType {
  POINT = 'point',
  POLYLINE = 'polyline',
  POLYGON = 'polygon',
  CIRCLE = 'circle',
  RECTANGLE = 'rectangle',
  FREEHAND_LINE = 'freehand_line',
  FREEHAND_POLYGON = 'freehand_polygon'
}

/**
 * 图层类型
 */
export enum LayerType {
  IMAGERY = 'imagery',
  TERRAIN = 'terrain',
  ENTITY = 'entity',
  DATASOURCE = 'datasource',
  MODEL = 'model',
  VECTOR = 'vector'
}

/**
 * 相机位置
 */
export interface CameraPosition {
  longitude: number
  latitude: number
  height: number
  heading: number
  pitch: number
  roll: number
}

/**
 * Cesium 配置
 */
export interface CesiumConfig {
  initialView?: {
    longitude: number
    latitude: number
    height?: number
    heading?: number
    pitch?: number
    roll?: number
  }
  terrain?: {
    enabled: boolean
    provider?: Cesium.TerrainProvider
  }
  performance?: {
    requestRenderMode?: boolean
    maximumRenderTimeChange?: number
    targetFrameRate?: number
  }
  ui?: {
    showTimeline?: boolean
    showAnimation?: boolean
    showBaseLayerPicker?: boolean
    showGeocoder?: boolean
    showHomeButton?: boolean
    showSceneModePicker?: boolean
    showProjectionPicker?: boolean
    showHelpButton?: boolean
  }
}

/**
 * 图层配置
 */
export interface LayerConfig {
  id: string
  name: string
  type: LayerType
  visible?: boolean
  opacity?: number
  zIndex?: number
  properties?: Record<string, unknown>
}

/**
 * 影像图层配置
 */
export interface ImageryLayerConfig extends LayerConfig {
  type: LayerType.IMAGERY
  url: string
  provider?: Cesium.ImageryProvider
  layerInstance?: Cesium.ImageryLayer
}

/**
 * 数据源图层配置
 */
export interface DataSourceLayerConfig extends LayerConfig {
  type: LayerType.DATASOURCE
  url: string
  dataType: 'geojson' | 'kml' | 'czml'
  dataSourceInstance?: Cesium.DataSource
}

/**
 * 图层事件类型
 */
export enum LayerEventType {
  ADD = 'add',
  REMOVE = 'remove',
  UPDATE = 'update',
  VISIBILITY_CHANGE = 'visibility_change'
}

/**
 * 图层事件
 */
export interface LayerEvent {
  type: LayerEventType
  layer: LayerConfig
}

/**
 * 绘制样式
 */
export interface DrawStyle {
  point?: {
    pixelSize?: number
    color?: Cesium.Color
    outlineColor?: Cesium.Color
    outlineWidth?: number
    disableDepthTestDistance?: number
  }
  line?: {
    width?: number
    material?: Cesium.MaterialProperty
    clampToGround?: boolean
  }
  polygon?: {
    material?: Cesium.MaterialProperty
    outline?: boolean
    outlineColor?: Cesium.Color
    outlineWidth?: number
    perPositionHeight?: boolean
  }
}

/**
 * 绘制配置
 */
export interface DrawConfig {
  type: DrawType
  style?: DrawStyle
  editable?: boolean
  properties?: Record<string, unknown>
  autoFlyTo?: boolean // 是否绘制完成后自动飞向目标位置
}

/**
 * 绘制事件
 */
export interface DrawEvent {
  type: 'start' | 'update' | 'end' | 'cancel'
  drawType: DrawType
  entity?: Cesium.Entity
  positions?: Cesium.Cartesian3[]
}

/**
 * 绘制结果
 */
export interface DrawResult {
  type: DrawType
  entity?: Cesium.Entity
  positions?: Cesium.Cartesian3[]
  timestamp: number
}
