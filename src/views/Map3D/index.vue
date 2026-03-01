<template>
  <div class="map-3d-container">
    <!-- Cesium 3D 地图 -->
    <CesiumViewer
      :initial-latitude="39.9075"
      :initial-longitude="116.3912"
      :initial-height="2000"
      @ready="onMapReady"
      @draw="onDraw"
      @camera-change="onCameraChange"
    />

    <!-- 图层控制面板 -->
    <div class="layer-panel">
      <el-collapse v-model="activeLayers">
        <el-collapse-item title="图层管理" name="layers">
          <el-tree
            :data="layerTreeData"
            :props="{ children: 'children', label: 'label' }"
            show-checkbox
            default-expand-all
            node-key="id"
            @check="onLayerCheck"
          />
        </el-collapse-item>

        <el-collapse-item title="地图样式" name="styles">
          <el-form label-width="80px" size="small">
            <el-form-item label="亮度">
              <el-slider v-model="brightness" :min="0" :max="3" :step="0.1" @change="onStyleChange" />
            </el-form-item>
            <el-form-item label="对比度">
              <el-slider v-model="contrast" :min="0" :max="3" :step="0.1" @change="onStyleChange" />
            </el-form-item>
            <el-form-item label="透明度">
              <el-slider v-model="opacity" :min="0" :max="1" :step="0.1" @change="onStyleChange" />
            </el-form-item>
          </el-form>
        </el-collapse-item>

        <el-collapse-item title="场景设置" name="scene">
          <el-form label-width="100px" size="small">
            <el-form-item label="场景模式">
              <el-select v-model="sceneMode" @change="onSceneModeChange">
                <el-option label="3D 模式" value="SCENE3D" />
                <el-option label="2D 模式" value="SCENE2D" />
                <el-option label="2.5D 模式" value="COLUMBUS_VIEW" />
              </el-select>
            </el-form-item>
            <el-form-item label="显示地形">
              <el-switch v-model="showTerrain" @change="onTerrainChange" />
            </el-form-item>
            <el-form-item label="显示大气">
              <el-switch v-model="showAtmosphere" @change="onAtmosphereChange" />
            </el-form-item>
          </el-form>
        </el-collapse-item>

        <el-collapse-item title="特效展示" name="effects">
          <el-form label-width="100px" size="small">
            <el-form-item label="特效主题">
              <el-select v-model="effectTheme" @change="onEffectThemeChange">
                <el-option label="青色科技" value="cyan" />
                <el-option label="紫蓝科技" value="purple-blue" />
                <el-option label="霓虹赛博" value="neon-cyber" />
                <el-option label="黄金未来" value="golden-future" />
                <el-option label="极光幻彩" value="aurora" />
                <el-option label="量子深空" value="quantum" />
                <el-option label="烈焰红莲" value="fire" />
              </el-select>
            </el-form-item>
            <el-form-item label="雷达扫描">
              <el-switch v-model="showRadar" @change="onRadarChange" />
            </el-form-item>
            <el-form-item label="光墙特效">
              <el-switch v-model="showLightWall" @change="onLightWallChange" />
            </el-form-item>
            <el-form-item label="流光扩散">
              <el-switch v-model="showLightSpread" @change="onLightSpreadChange" />
            </el-form-item>
            <el-form-item label="飞线特效">
              <el-switch v-model="showFlyLines" @change="onFlyLinesChange" />
            </el-form-item>
            <el-form-item label="火焰/烟雾">
              <el-switch v-model="showFireSmoke" @change="onFireSmokeChange" />
            </el-form-item>
            <el-form-item label="雨雪天气">
              <el-switch v-model="showWeather" @change="onWeatherChange" />
            </el-form-item>
          </el-form>
        </el-collapse-item>

        <!-- 天气控制面板 -->
        <div v-if="showWeather" class="weather-panel">
          <div class="panel-title">天气控制</div>
          <el-form label-width="80px" size="small">
            <el-form-item label="天气类型">
              <el-radio-group v-model="weatherType" @change="onWeatherTypeChange">
                <el-radio value="rain">雨</el-radio>
                <el-radio value="snow">雪</el-radio>
                <el-radio value="both">雨+雪</el-radio>
              </el-radio-group>
            </el-form-item>
            <el-form-item label="降水量">
              <el-slider
                v-model="rainIntensity"
                :min="0"
                :max="1"
                :step="0.1"
                @change="onIntensityChange"
              />
            </el-form-item>
            <el-form-item label="风向">
              <el-slider
                v-model="windDirection"
                :min="0"
                :max="360"
                :step="10"
                @change="onWindChange"
              />
            </el-form-item>
            <el-form-item label="风速">
              <el-slider
                v-model="windSpeed"
                :min="0"
                :max="20"
                :step="1"
                @change="onWindChange"
              />
            </el-form-item>
          </el-form>
        </div>
      </el-collapse>
    </div>

    <!-- 绘制结果面板 -->
    <div v-if="drawResults.length > 0" class="draw-results-panel">
      <div class="panel-header">
        <span>绘制结果</span>
        <el-button link @click="clearDrawResults">
          <el-icon><Delete /></el-icon>
        </el-button>
      </div>
      <el-scrollbar max-height="400px">
        <div v-for="(item, index) in drawResults" :key="index" class="result-item">
          <div class="result-type">
            <el-tag :type="getDrawTypeColor(item.type)">
              {{ getDrawTypeName(item.type) }}
            </el-tag>
          </div>
          <div class="result-coords">
            坐标点: {{ item.positions?.length || 0 }} 个
          </div>
          <el-button type="primary" link @click="flyToEntity(item)">查看</el-button>
          <el-button type="danger" link @click="removeDrawResult(index)">删除</el-button>
        </div>
      </el-scrollbar>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Delete } from '@element-plus/icons-vue'
import { CesiumViewer } from '@/cesium'
import { getCesiumManager } from '@/cesium/core/cesiumManager'
import { cesiumService } from '@/services/cesiumService'
import {
  effectsManager,
  RadarEffect,
  LightWallEffect,
  LightSpreadEffect,
  PolylineTrailEffect,
  FireSmokeEffect,
  WeatherEffect
} from '@/cesium/effects'
import { registerCustomMaterials, setEffectTheme } from '@/cesium/materials/customMaterials'
import type { DrawResult, CameraPosition } from '@/types/cesium'
import { DrawType } from '@/types/cesium'
import * as Cesium from 'cesium'

/**
 * Refs
 */
const activeLayers = ref(['layers'])
const layerTreeData = ref([
  {
    id: 'imagery-layers',
    label: '影像图层',
    children: [
      { id: 'gaode-vector', label: '高德矢量地图' },
      { id: 'gaode-satellite', label: '高德卫星图' },
      { id: 'gaode-hybrid', label: '高德混合图' }
    ]
  },
  {
    id: 'terrain-layers',
    label: '地形图层',
    children: [
      { id: 'simple', label: '简单地形' },
      { id: 'custom', label: '自定义地形（波形）' },
      { id: 'cesium-high', label: 'Cesium Ion 高精度地形' },
      { id: 'arcgis', label: 'ArcGIS 地形' }
    ]
  }
])
const brightness = ref(1)
const contrast = ref(1)
const opacity = ref(1)
const sceneMode = ref('SCENE3D')
const showTerrain = ref(false)
const currentTerrainType = ref('none')
const showAtmosphere = ref(true)
const showRadar = ref(false)
const showLightWall = ref(false)
const showLightSpread = ref(false)
const showFlyLines = ref(false)
const showFireSmoke = ref(false)
const showWeather = ref(false)
const weatherType = ref('rain')
const rainIntensity = ref(1)
const windDirection = ref(360)
const windSpeed = ref(20)
const effectTheme = ref('cyan')
const drawResults = ref<DrawResult[]>([])
const cameraInfo = ref<CameraPosition | null>(null)

/**
 * 组件挂载
 */
onMounted(() => {
  // Map3D 组件已挂载
})

/**
 * 地图就绪
 */
const onMapReady = () => {
  // 注册自定义材质
  registerCustomMaterials()

  // 初始化特效管理器
  effectsManager.init()
  addSampleMarkers()
}

/**
 * 添加示例标记
 */
const addSampleMarkers = async () => {
  // 使用服务层添加标记
  await cesiumService.addMarker(
    {
      longitude: 116.397455,
      latitude: 39.909187,
      height: 100
    },
    {
      name: '天安门',
      color: Cesium.Color.RED,
      pixelSize: 15,
      label: '天安门'
    }
  )

  // 飞向标记位置
  cesiumService.flyTo(
    {
      longitude: 116.397455,
      latitude: 39.909187,
      height: 100
    },
    {
      duration: 2,
      height: 2000
    }
  )
}

/**
 * 图层选择
 */
const onLayerCheck = (data: any, checked: any) => {
  const checkedKeys = checked.checkedKeys
  console.log('[Layer] Checked nodes:', checkedKeys)

  // 影像图层切换（单选逻辑）
  const imageryProviders = ['gaode-vector', 'gaode-satellite', 'gaode-hybrid']
  const selectedImagery = imageryProviders.find((key) => checkedKeys.includes(key))

  if (selectedImagery) {
    cesiumService.setImageryProvider(selectedImagery)
    ElMessage.success(`已切换到 ${getLayerName(selectedImagery)}`)
  }

  // 地形图层切换（单选逻辑）
  const terrainProviders = ['simple', 'custom', 'cesium-high', 'arcgis']
  const selectedTerrain = terrainProviders.find((key) => checkedKeys.includes(key))

  if (selectedTerrain === 'simple') {
    currentTerrainType.value = 'simple'
    showTerrain.value = true
    cesiumService
      .setTerrainProvider('simple')
      .then(() => ElMessage.success('已切换到简单地形'))
      .catch(() => ElMessage.error('简单地形加载失败'))
  } else if (selectedTerrain === 'custom') {
    currentTerrainType.value = 'custom'
    showTerrain.value = true
    cesiumService
      .setTerrainProvider('custom')
      .then(() => ElMessage.success('已切换到自定义地形'))
      .catch(() => ElMessage.error('自定义地形加载失败'))
  } else if (selectedTerrain === 'cesium-high') {
    currentTerrainType.value = 'cesium-ion'
    showTerrain.value = true
    cesiumService
      .setTerrainProvider('cesium-ion')
      .then(() => ElMessage.success('已切换到 Cesium Ion 高精度地形'))
      .catch(() => ElMessage.error('Cesium Ion 地形加载失败'))
  } else if (selectedTerrain === 'arcgis') {
    currentTerrainType.value = 'arcgis'
    showTerrain.value = true
    cesiumService
      .setTerrainProvider('arcgis')
      .then(() => ElMessage.success('已切换到 ArcGIS 地形'))
      .catch(() => ElMessage.error('ArcGIS 地形加载失败'))
  } else {
    // 如果没有选中任何地形图层，禁用地形
    currentTerrainType.value = 'none'
    showTerrain.value = false
    cesiumService.setTerrainProvider('none').then(() => {
      console.log('[Layer] Terrain disabled')
    })
  }
}

/**
 * 获取图层名称
 */
const getLayerName = (id: string): string => {
  const nameMap: Record<string, string> = {
    'gaode-vector': '高德矢量地图',
    'gaode-satellite': '高德卫星图',
    'gaode-hybrid': '高德混合图',
    simple: '简单地形',
    custom: '自定义地形（波形）',
    'cesium-high': 'Cesium Ion 高精度地形',
    arcgis: 'ArcGIS 地形'
  }
  return nameMap[id] || id
}

/**
 * 地图样式变化
 */
const onStyleChange = () => {
  cesiumService.setMapStyle({
    brightness: brightness.value,
    contrast: contrast.value,
    opacity: opacity.value
  })
}

/**
 * 场景模式变化
 */
const onSceneModeChange = (mode: string) => {
  const modeMap: Record<string, Cesium.SceneMode> = {
    SCENE3D: Cesium.SceneMode.SCENE3D,
    SCENE2D: Cesium.SceneMode.SCENE2D,
    COLUMBUS_VIEW: Cesium.SceneMode.COLUMBUS_VIEW
  }

  cesiumService.setSceneMode(modeMap[mode])
}

/**
 * 地形显示变化
 */
const onTerrainChange = async (show: boolean) => {
  await cesiumService.setTerrain(show)
  ElMessage.success(show ? '地形已开启' : '地形已关闭')
}

/**
 * 大气显示变化
 */
const onAtmosphereChange = (show: boolean) => {
  cesiumService.setAtmosphere(show)
  ElMessage.success(show ? '大气已开启' : '大气已关闭')
}

/**
 * 绘制完成
 */
const onDraw = (data: DrawResult) => {
  drawResults.value.push(data)
  ElMessage.success(`绘制完成: ${getDrawTypeName(data.type)}`)
}

/**
 * 相机变化
 */
const onCameraChange = (position: CameraPosition) => {
  cameraInfo.value = position
}

/**
 * 获取绘制类型颜色
 */
const getDrawTypeColor = (type: DrawType): string => {
  const colorMap: Record<DrawType, string> = {
    [DrawType.POINT]: 'success',
    [DrawType.POLYLINE]: 'primary',
    [DrawType.POLYGON]: 'warning',
    [DrawType.CIRCLE]: 'info',
    [DrawType.RECTANGLE]: 'danger'
  }
  return colorMap[type] || 'info'
}

/**
 * 获取绘制类型名称
 */
const getDrawTypeName = (type: DrawType): string => {
  const nameMap: Record<DrawType, string> = {
    [DrawType.POINT]: '点',
    [DrawType.POLYLINE]: '线',
    [DrawType.POLYGON]: '面',
    [DrawType.CIRCLE]: '圆',
    [DrawType.RECTANGLE]: '矩形'
  }
  return nameMap[type] || type
}

/**
 * 飞向实体
 */
const flyToEntity = (item: DrawResult) => {
  if (!item.entity) return

  const position = item.entity.position?.getValue(Cesium.JulianDate.now())
  if (!position) return

  const cartographic = Cesium.Cartographic.fromCartesian(position)
  cesiumService.flyTo(
    {
      longitude: Cesium.Math.toDegrees(cartographic.longitude),
      latitude: Cesium.Math.toDegrees(cartographic.latitude),
      height: Math.max(cartographic.height, 100) // 确保高度至少 100 米
    },
    { duration: 2, height: 2000 } // 相机高度设为 2000 米
  )
}

/**
 * 删除绘制结果
 */
const removeDrawResult = (index: number) => {
  const item = drawResults.value[index]
  if (item.entity) {
    item.entity.entityCollection?.remove(item.entity)
  }
  drawResults.value.splice(index, 1)
  ElMessage.success('已删除')
}

/**
 * 清除所有绘制结果
 */
const clearDrawResults = () => {
  cesiumService.clearAllEntities()
  drawResults.value = []
  ElMessage.success('已清除所有绘制')
}

/**
 * 特效主题定义
 */
const effectThemes = {
  cyan: {
    color: Cesium.Color.CYAN,
    scanColor: Cesium.Color.fromCssColorString('#00ffff'),
    ringColor: Cesium.Color.fromCssColorString('#00cccc'),
    beamColor: Cesium.Color.fromCssColorString('#00ffff'),
    centerColor: Cesium.Color.fromCssColorString('#00ffff'),
    waveColor: Cesium.Color.fromCssColorString('#00d9ff'),
    headColor: Cesium.Color.fromCssColorString('#00ffff'),
    fireColor: Cesium.Color.fromCssColorString('#00ffff'),
    smokeColor: Cesium.Color.fromCssColorString('#808080'),
    rainColor: Cesium.Color.fromCssColorString('#aaddff'),
    snowColor: Cesium.Color.fromCssColorString('#e0f0ff')
  },
  'purple-blue': {
    color: Cesium.Color.fromCssColorString('#07329f'),
    scanColor: Cesium.Color.fromCssColorString('#550598'),
    ringColor: Cesium.Color.fromCssColorString('#550598'),
    beamColor: Cesium.Color.fromCssColorString('#550598'),
    centerColor: Cesium.Color.fromCssColorString('#550598'),
    waveColor: Cesium.Color.fromCssColorString('#550598'),
    headColor: Cesium.Color.fromCssColorString('#550598'),
    fireColor: Cesium.Color.fromCssColorString('#550598'),
    smokeColor: Cesium.Color.fromCssColorString('#808080'),
    rainColor: Cesium.Color.fromCssColorString('#7788ee'),
    snowColor: Cesium.Color.fromCssColorString('#ddeeff')
  },
  'neon-cyber': {
    color: Cesium.Color.fromCssColorString('#ff00ff'),
    scanColor: Cesium.Color.fromCssColorString('#00ffff'),
    ringColor: Cesium.Color.fromCssColorString('#ff00aa'),
    beamColor: Cesium.Color.fromCssColorString('#00ffff'),
    centerColor: Cesium.Color.fromCssColorString('#ff00ff'),
    waveColor: Cesium.Color.fromCssColorString('#00ffff'),
    headColor: Cesium.Color.fromCssColorString('#00ffff'),
    fireColor: Cesium.Color.fromCssColorString('#ff00ff'),
    smokeColor: Cesium.Color.fromCssColorString('#808080'),
    rainColor: Cesium.Color.fromCssColorString('#ff66ff'),
    snowColor: Cesium.Color.fromCssColorString('#ffe0ff')
  },
  'golden-future': {
    color: Cesium.Color.fromCssColorString('#ff6b00'),
    scanColor: Cesium.Color.fromCssColorString('#ffd700'),
    ringColor: Cesium.Color.fromCssColorString('#ff8c00'),
    beamColor: Cesium.Color.fromCssColorString('#ffd700'),
    centerColor: Cesium.Color.fromCssColorString('#ffd700'),
    waveColor: Cesium.Color.fromCssColorString('#ffa500'),
    headColor: Cesium.Color.fromCssColorString('#ffd700'),
    fireColor: Cesium.Color.fromCssColorString('#ffd700'),
    smokeColor: Cesium.Color.fromCssColorString('#808080'),
    rainColor: Cesium.Color.fromCssColorString('#ffcc88'),
    snowColor: Cesium.Color.fromCssColorString('#ffeecc')
  },
  aurora: {
    color: Cesium.Color.fromCssColorString('#00ff88'),
    scanColor: Cesium.Color.fromCssColorString('#00ffff'),
    ringColor: Cesium.Color.fromCssColorString('#00ffcc'),
    beamColor: Cesium.Color.fromCssColorString('#88ff00'),
    centerColor: Cesium.Color.fromCssColorString('#00ffff'),
    waveColor: Cesium.Color.fromCssColorString('#00ff88'),
    headColor: Cesium.Color.fromCssColorString('#00ffff'),
    fireColor: Cesium.Color.fromCssColorString('#00ff88'),
    smokeColor: Cesium.Color.fromCssColorString('#808080'),
    rainColor: Cesium.Color.fromCssColorString('#88ffcc'),
    snowColor: Cesium.Color.fromCssColorString('#ccffee')
  },
  quantum: {
    color: Cesium.Color.fromCssColorString('#8a2be2'),
    scanColor: Cesium.Color.fromCssColorString('#00bfff'),
    ringColor: Cesium.Color.fromCssColorString('#9932cc'),
    beamColor: Cesium.Color.fromCssColorString('#00bfff'),
    centerColor: Cesium.Color.fromCssColorString('#00bfff'),
    waveColor: Cesium.Color.fromCssColorString('#9370db'),
    headColor: Cesium.Color.fromCssColorString('#00bfff'),
    fireColor: Cesium.Color.fromCssColorString('#8a2be2'),
    smokeColor: Cesium.Color.fromCssColorString('#808080'),
    rainColor: Cesium.Color.fromCssColorString('#9966dd'),
    snowColor: Cesium.Color.fromCssColorString('#ddccff')
  },
  fire: {
    fireColor: Cesium.Color.fromCssColorString('#ff4500'),
    smokeColor: Cesium.Color.fromCssColorString('#808080'),
    color: Cesium.Color.fromCssColorString('#ff4500'),
    scanColor: Cesium.Color.fromCssColorString('#ff4500'),
    ringColor: Cesium.Color.fromCssColorString('#ff6600'),
    beamColor: Cesium.Color.fromCssColorString('#ff4500'),
    centerColor: Cesium.Color.fromCssColorString('#ffcc00'),
    waveColor: Cesium.Color.fromCssColorString('#ff4500'),
    headColor: Cesium.Color.fromCssColorString('#ffcc00'),
    rainColor: Cesium.Color.fromCssColorString('#ffaa66'),
    snowColor: Cesium.Color.fromCssColorString('#ffddcc')
  }
}

/**
 * 获取当前主题颜色
 */
const getCurrentThemeColors = () => {
  return effectThemes[effectTheme.value as keyof typeof effectThemes] || effectThemes.cyan
}

/**
 * 特效主题切换
 */
const onEffectThemeChange = () => {
  const themeMap: Record<string, string> = {
    cyan: '青色科技',
    'purple-blue': '紫蓝科技',
    'neon-cyber': '霓虹赛博',
    'golden-future': '黄金未来',
    aurora: '极光幻彩',
    quantum: '量子深空',
    fire: '烈焰红莲'
  }

  const themeName = themeMap[effectTheme.value] || effectTheme.value
  ElMessage.success(`已切换到${themeName}主题`)

  // 设置材质主题
  setEffectTheme(effectTheme.value as any)

  // 如果特效正在显示，重新创建以应用新主题
  if (showRadar.value) {
    onRadarChange(false)
    setTimeout(() => onRadarChange(true), 100)
  }
  if (showLightWall.value) {
    onLightWallChange(false)
    setTimeout(() => onLightWallChange(true), 100)
  }
  if (showLightSpread.value) {
    onLightSpreadChange(false)
    setTimeout(() => onLightSpreadChange(true), 100)
  }
  if (showFlyLines.value) {
    onFlyLinesChange(false)
    setTimeout(() => onFlyLinesChange(true), 100)
  }
  if (showFireSmoke.value) {
    onFireSmokeChange(false)
    setTimeout(() => onFireSmokeChange(true), 100)
  }
  if (showWeather.value) {
    onWeatherChange(false)
    setTimeout(() => onWeatherChange(true), 100)
  }
}

/**
 * 雷达特效切换
 */
const onRadarChange = (show: boolean) => {
  const manager = getCesiumManager()
  if (!manager) return

  if (show) {
    const viewer = manager.getViewer()
    if (!viewer) return

    const theme = getCurrentThemeColors()

    // 在北京位置创建圆形雷达 - 使用主题颜色
    const radarEffect = new RadarEffect(viewer)
    radarEffect.create(116.39, 39.91, 5000, {
      color: theme.color,
      scanSpeed: 0.3,
      height: 100,
      scanColor: theme.scanColor,
      ringColor: theme.ringColor
    })
    effectsManager.addEffect('radar', radarEffect)
    ElMessage.success('雷达特效已开启')

    // 飞到预设视角
    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(116.396187, 39.80553, 10802.43),
      orientation: {
        heading: Cesium.Math.toRadians(0),
        pitch: Cesium.Math.toRadians(-45),
        roll: 0
      },
      duration: 2
    })
  } else {
    effectsManager.removeEffect('radar')
    ElMessage.success('雷达特效已关闭')
  }
}

/**
 * 光墙特效切换
 */
const onLightWallChange = (show: boolean) => {
  const manager = getCesiumManager()
  if (!manager) return

  if (show) {
    const viewer = manager.getViewer()
    if (!viewer) return

    const theme = getCurrentThemeColors()

    // 在北京创建光墙 - 使用主题颜色
    console.log('[Map3D] Creating light wall effect...')
    const lightWallEffect = new LightWallEffect(viewer)
    lightWallEffect.create(
      [116.35, 39.88, 116.43, 39.88, 116.43, 39.93, 116.35, 39.93],
      800,
      {
        color: theme.color,
        direction: 1.0,
        minHeight: 0,
        beamColor: theme.beamColor
      }
    )
    effectsManager.addEffect('lightWall', lightWallEffect)
    console.log('[Map3D] Light wall effect added to manager')

    // 飞到光墙上方观察
    console.log('[Map3D] Flying to light wall position...')
    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(116.396187, 39.80553, 10802.43),
      orientation: {
        heading: Cesium.Math.toRadians(0),
        pitch: Cesium.Math.toRadians(-45),
        roll: 0
      },
      duration: 2
    })

    ElMessage.success('光墙特效已开启')
  } else {
    effectsManager.removeEffect('lightWall')
    ElMessage.success('光墙特效已关闭')
  }
}

/**
 * 流光扩散特效切换
 */
const onLightSpreadChange = (show: boolean) => {
  const manager = getCesiumManager()
  if (!manager) return

  if (show) {
    const viewer = manager.getViewer()
    if (!viewer) return

    const theme = getCurrentThemeColors()

    // 在北京创建流光扩散 - 使用主题颜色
    const lightSpreadEffect = new LightSpreadEffect(viewer)
    lightSpreadEffect.create(116.35, 39.88, 116.43, 39.93, {
      color: theme.color,
      waveCount: 4,
      height: 100,
      centerColor: theme.centerColor,
      waveColor: theme.waveColor
    })
    effectsManager.addEffect('lightSpread', lightSpreadEffect)
    ElMessage.success('流光扩散特效已开启')
  } else {
    effectsManager.removeEffect('lightSpread')
    ElMessage.success('流光扩散特效已关闭')
  }
}

/**
 * 飞线特效切换
 */
const onFlyLinesChange = (show: boolean) => {
  const manager = getCesiumManager()
  if (!manager) return

  if (show) {
    const viewer = manager.getViewer()
    if (!viewer) return

    const theme = getCurrentThemeColors()

    // 创建多条飞线 - 使用主题颜色
    const lines: Array<{
      startLon: number
      startLat: number
      startHeight: number
      endLon: number
      endLat: number
      endHeight: number
      width?: number
      color?: Cesium.Color
      speed?: number
    }> = []

    // 生成随机飞线
    for (let i = 0; i < 20; i++) {
      const startLon = 116.35 + Math.random() * 0.08
      const startLat = 39.88 + Math.random() * 0.05
      const endLon = startLon + (Math.random() - 0.5) * 0.02
      const endLat = startLat + (Math.random() - 0.5) * 0.02

      lines.push({
        startLon,
        startLat,
        startHeight: 500,
        endLon,
        endLat,
        endHeight: 2000 + Math.random() * 2000,
        width: 4,
        color: theme.color,
        headColor: theme.headColor,
        speed: 1.0 + Math.random() * 0.5
      })
    }

    const flyLineEffect = new PolylineTrailEffect(viewer)
    flyLineEffect.createMultiple(lines)
    effectsManager.addEffect('flyLines', flyLineEffect)
    ElMessage.success('飞线特效已开启')

    // 飞到预设视角
    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(116.396187, 39.80553, 10802.43),
      orientation: {
        heading: Cesium.Math.toRadians(0),
        pitch: Cesium.Math.toRadians(-45),
        roll: 0
      },
      duration: 2
    })
  } else {
    effectsManager.removeEffect('flyLines')
    ElMessage.success('飞线特效已关闭')
  }
}

/**
 * 火焰/烟雾特效切换
 */
const onFireSmokeChange = (show: boolean) => {
  const manager = getCesiumManager()
  if (!manager) return

  if (show) {
    const viewer = manager.getViewer()
    if (!viewer) return

    // 在指定位置创建火焰/烟雾
    console.log('[Map3D] Creating fire and smoke effect...')
    const theme = getCurrentThemeColors()
    const fireSmokeEffect = new FireSmokeEffect(viewer)

    // 根据主题设置火焰颜色
    const fireColor = (theme as any).fireColor || Cesium.Color.fromCssColorString('#ff4500')
    const smokeColor = (theme as any).smokeColor || Cesium.Color.fromCssColorString('#808080')

    fireSmokeEffect.create(116.3920274, 39.907801, {
      height: 179.26,
      fireColor: fireColor,
      fireIntensity: 1.0,
      smokeColor: smokeColor,
      smokeIntensity: 0.6,
      windDirection: 45,
      windSpeed: 1.5
    })
    effectsManager.addEffect('fireSmoke', fireSmokeEffect)
    console.log('[Map3D] Fire and smoke effect added to manager')

    // 飞到火焰位置附近观察 - 相机在火焰侧面200米处
    console.log('[Map3D] Flying to fire smoke position...')
    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(116.392863, 39.907827, 200), // 约200米水平距离
      orientation: {
        heading: Cesium.Math.toRadians(270), // 朝向火焰（西向）
        pitch: Cesium.Math.toRadians(-15),
        roll: 0
      },
      duration: 2
    })

    ElMessage.success('火焰/烟雾特效已开启')
  } else {
    effectsManager.removeEffect('fireSmoke')
    ElMessage.success('火焰/烟雾特效已关闭')
  }
}

/**
 * 雨雪天气特效切换
 */
const onWeatherChange = (show: boolean) => {
  const manager = getCesiumManager()
  if (!manager) return

  if (show) {
    const viewer = manager.getViewer()
    if (!viewer) return

    console.log('[Map3D] Creating weather effect...')
    const weatherEffect = new WeatherEffect(viewer)

    // 获取主题颜色
    const theme = getCurrentThemeColors()

    // 根据天气类型创建效果
    const options: any = {
      coverageRadius: 2000,
      followCamera: true
    }

    if (weatherType.value === 'rain' || weatherType.value === 'both') {
      options.rain = {
        intensity: rainIntensity.value,
        density: 5000,
        dropSize: 1.5,
        fallSpeed: 20,
        wind: {
          direction: windDirection.value,
          speed: windSpeed.value,
          gustiness: 0.3,
          turbulence: 0.2
        },
        color: (theme as any).rainColor || Cesium.Color.fromCssColorString('#aaccff'),
        transparency: 0.4
      }
    }

    if (weatherType.value === 'snow' || weatherType.value === 'both') {
      options.snow = {
        intensity: rainIntensity.value,
        density: 3500,
        flakeSize: 3.5,
        fallSpeed: 2.5,
        wind: {
          direction: windDirection.value,
          speed: windSpeed.value,
          gustiness: 0.4,
          turbulence: 0.5
        },
        color: (theme as any).snowColor || Cesium.Color.fromCssColorString('#ffffff'),
        transparency: 0.5,
        swirl: 0.8
      }
    }

    weatherEffect.create(options)
    effectsManager.addEffect('weather', weatherEffect)
    console.log('[Map3D] Weather effect added to manager')

    // 飞到合适视角观察天气效果
    console.log('[Map3D] Flying to weather position...')




    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(116.399944, 39.850510, 6800),
      orientation: {
        heading: Cesium.Math.toRadians(0),
        pitch: Cesium.Math.toRadians(-30),
        roll: 0
      },
      duration: 2
    })

    ElMessage.success('雨雪天气特效已开启')
  } else {
    effectsManager.removeEffect('weather')
    ElMessage.success('雨雪天气特效已关闭')
  }
}

/**
 * 天气类型变化
 */
const onWeatherTypeChange = () => {
  if (showWeather.value) {
    // 先关闭再重新创建
    onWeatherChange(false)
    setTimeout(() => {
      onWeatherChange(true)
    }, 100)
  }
}

/**
 * 降水强度变化
 */
const onIntensityChange = () => {
  const weatherEffect = effectsManager.getEffect('weather') as WeatherEffect
  if (weatherEffect) {
    weatherEffect.setRainIntensity(rainIntensity.value)
    weatherEffect.setSnowIntensity(rainIntensity.value)
  }
}

/**
 * 风场变化
 */
const onWindChange = () => {
  const weatherEffect = effectsManager.getEffect('weather') as WeatherEffect
  if (weatherEffect) {
    weatherEffect.setWind(windDirection.value, windSpeed.value)
  }
}
</script>

<style scoped lang="scss">
.map-3d-container {
  width: 100%;
  height: 100vh;
  position: relative;
}

.layer-panel,
.draw-results-panel {
  position: absolute;
  top: 10px;
  right: 10px;
  width: 300px;
  max-height: calc(100vh - 20px);
  background: rgba(255, 255, 255, 0.95);
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  padding: 16px;
  z-index: 100;
  overflow-y: auto;
}

.draw-results-panel {
  top: 10px;
  right: 330px;
  width: 250px;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  font-weight: 600;
  font-size: 14px;
}

.result-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 0;
  border-bottom: 1px solid #ebeef5;

  &:last-child {
    border-bottom: none;
  }
}

.result-type {
  min-width: 60px;
}

.result-coords {
  flex: 1;
  font-size: 12px;
  color: #606266;
}

.weather-panel {
  position: absolute;
  top: 10px;
  right: 10px;
  width: 280px;
  background: rgba(255, 255, 255, 0.95);
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  padding: 16px;
  z-index: 100;
}

.panel-title {
  font-weight: 600;
  font-size: 14px;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid #ebeef5;
}
</style>
