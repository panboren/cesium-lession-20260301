/**
 * Cesium 相关常量定义
 * 集中管理项目中使用的魔法数字，提高代码可维护性
 */

/**
 * 绘图相关常量
 */
export const DRAWING_CONSTANTS = {
  /** 点标记默认像素大小 */
  POINT_PIXEL_SIZE: 50,
  /** 点标记轮廓宽度 */
  POINT_OUTLINE_WIDTH: 5,
  /** 线段默认宽度 */
  LINE_WIDTH: 5,
  /** 多边形轮廓宽度 */
  POLYGON_OUTLINE_WIDTH: 4,
  /** 矩形轮廓宽度 */
  RECTANGLE_OUTLINE_WIDTH: 4,
  /** 圆形轮廓宽度 */
  CIRCLE_OUTLINE_WIDTH: 4,
  /** 飞行距离倍数（包围盒半径的倍数） */
  FLY_DISTANCE_MULTIPLIER: 3,
  /** 飞行动画默认持续时间（秒） */
  FLY_DURATION: 1.5,
  /** 短飞行动画持续时间（秒） */
  SHORT_FLY_DURATION: 0.5,
  /** 默认飞行高度（米） */
  DEFAULT_FLIGHT_HEIGHT: 10000,
  /** 点标记最小像素大小 */
  MIN_POINT_PIXEL_SIZE: 5,
  /** 点标记最大像素大小 */
  MAX_POINT_PIXEL_SIZE: 100
} as const

/**
 * 材质相关常量
 */
export const MATERIAL_CONSTANTS = {
  /** LightWall 波浪频率 1 */
  WAVE_1_FREQUENCY: 12.0,
  /** LightWall 波浪速度 1 */
  WAVE_1_SPEED: 2.5,
  /** LightWall 波浪频率 2 */
  WAVE_2_FREQUENCY: 18.0,
  /** LightWall 波浪速度 2 */
  WAVE_2_SPEED: 2.0,
  /** LightWall 垂直梯度下限 */
  VERTICAL_GRADIENT_LOWER: 0.4,
  /** LightWall 垂直梯度上限 */
  VERTICAL_GRADIENT_UPPER: 0.6,
  /** LightWall 边缘羽化范围 */
  EDGE_FADE_RANGE: 0.5,
  /** Radar 边缘宽度 */
  RADAR_EDGE_WIDTH: 0.8,
  /** Radar 扫描宽度 */
  RADAR_SCAN_WIDTH: 1.0,
  /** Radar 边缘平滑度 */
  RADAR_EDGE_SMOOTHNESS: 0.3,
  /** LightSpread 中心点大小 */
  LIGHT_SPREAD_CENTER_SIZE: 16.0,
  /** LightSpread 边缘衰减宽度 */
  LIGHT_SPREAD_EDGE_FADE_WIDTH: 4.0,
  /** LightSpread 扩展宽度 */
  LIGHT_SPREAD_SPREAD_WIDTH: 24.0,
  /** LightSpread 动画速度 */
  LIGHT_SPREAD_SPEED: 3.0,
  /** FlyLine 尾迹透明度 */
  FLY_LINE_TRAIL_OPACITY: 1.0,
  /** FlyLine 尾迹衰减 */
  FLY_LINE_TRAIL_FADE: 0.9,
  /** FlyLine 粒子大小 */
  FLY_LINE_PARTICLE_SIZE: 8.0,
  /** FlyLine 粒子速度 */
  FLY_LINE_PARTICLE_SPEED: 1.5,
  /** FlyLine 粒子密度 */
  FLY_LINE_PARTICLE_DENSITY: 0.5,
  /** WaterSurface 波浪高度 */
  WATER_WAVE_HEIGHT: 0.02,
  /** 水面透明度 */
  WATER_OPACITY: 0.9,
  /** 水面折射率 */
  WATER_REFRACTION: 0.8
} as const

/**
 * 坐标常量
 */
export const COORDINATES = {
  /** 北京天安门坐标 */
  BEIJING: {
    longitude: 116.3912,
    latitude: 39.9075,
    height: 0
  },
  /** 默认初始视角（北京上空） */
  DEFAULT_INITIAL_VIEW: {
    longitude: 116.3912,
    latitude: 39.9075,
    height: 10000,
    heading: 0,
    pitch: -90,
    roll: 0
  }
} as const

/**
 * 性能相关常量
 */
export const PERFORMANCE_CONSTANTS = {
  /** 实体数量阈值（超过此值建议使用 Primitive） */
  ENTITY_THRESHOLD: 1000,
  /** 大量实体阈值（超过此值强烈建议使用 Primitive） */
  LARGE_ENTITY_THRESHOLD: 5000,
  /** 默认目标帧率 */
  DEFAULT_TARGET_FPS: 60,
  /** FPS 警告阈值 */
  FPS_WARNING_THRESHOLD: 30,
  /** FPS 错误阈值 */
  FPS_ERROR_THRESHOLD: 15,
  /** 性能监控更新间隔（毫秒） */
  PERFORMANCE_UPDATE_INTERVAL: 1000
} as const

/**
 * 网络请求常量
 */
export const NETWORK_CONSTANTS = {
  /** 请求超时时间（毫秒） */
  REQUEST_TIMEOUT: 30000,
  /** 请求重试次数 */
  RETRY_COUNT: 3,
  /** 请求重试延迟（毫秒） */
  RETRY_DELAY: 1000
} as const

/**
 * Primitive 相关常量
 */
export const PRIMITIVE_CONSTANTS = {
  /** 点云默认像素大小 */
  POINT_CLOUD_PIXEL_SIZE: 10,
  /** Billboard 默认缩放 */
  BILLBOARD_DEFAULT_SCALE: 1,
  /** Billboard 最小缩放 */
  BILLBOARD_MIN_SCALE: 0.1,
  /** Billboard 最大缩放 */
  BILLBOARD_MAX_SCALE: 10,
  /** Polyline 默认宽度 */
  POLYLINE_DEFAULT_WIDTH: 2,
  /** Polyline 最小宽度 */
  POLYLINE_MIN_WIDTH: 1,
  /** Polyline 最大宽度 */
  POLYLINE_MAX_WIDTH: 10,
  /** 异步加载（默认启用） */
  ASYNCHRONOUS_LOADING: true
} as const

/**
 * 地形常量
 */
export const TERRAIN_CONSTANTS = {
  /** 自定义地形网格宽度 */
  CUSTOM_TERRAIN_WIDTH: 64,
  /** 自定义地形网格高度 */
  CUSTOM_TERRAIN_HEIGHT: 64,
  /** 地形高度增强倍数 */
  TERRAIN_HEIGHT_MULTIPLIER: 5000,
  /** 地形高度增强偏移 */
  TERRAIN_HEIGHT_OFFSET: 3000
} as const

/**
 * UI 相关常量
 */
export const UI_CONSTANTS = {
  /** 标签字体大小 */
  LABEL_FONT_SIZE: 14,
  /** 标签行高 */
  LABEL_LINE_HEIGHT: 1.5,
  /** 标签像素偏移 */
  LABEL_PIXEL_OFFSET: 20,
  /** 标签轮廓宽度 */
  LABEL_OUTLINE_WIDTH: 2
} as const

/**
 * 主题相关常量
 */
export const THEME_CONSTANTS = {
  /** 主题切换动画持续时间（毫秒） */
  THEME_TRANSITION_DURATION: 300,
  /** 主题默认不透明度 */
  DEFAULT_OPACITY: 0.8,
  /** 主题高亮不透明度 */
  HIGHLIGHT_OPACITY: 1.0,
  /** 主题半透明不透明度 */
  TRANSPARENT_OPACITY: 0.4
} as const
