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

    <!-- 特效控制面板 -->
    <EffectsPanel :ready="mapReady" />

    <!-- 图层控制面板 -->
    <LayerPanel />

    <!-- 绘制结果面板 -->
    <DrawResultsPanel
      :results="drawResults"
      @clear="drawResults = []"
      @remove="drawResults.splice($event, 1)"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { CesiumViewer } from '@/cesium'
import { cesiumService } from '@/services/cesiumService'
import { effectsManager } from '@/cesium/effects'
import { registerCustomMaterials } from '@/cesium/materials/customMaterials'
import type { DrawResult, CameraPosition } from '@/types/cesium'
import { DrawType } from '@/types/cesium'
import * as Cesium from 'cesium'
import EffectsPanel from './components/EffectsPanel.vue'
import DrawResultsPanel from './components/DrawResultsPanel.vue'
import LayerPanel from './components/LayerPanel.vue'

/**
 * Refs
 */
const mapReady = ref(false)
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

  // 标记地图准备完成，通知特效面板
  mapReady.value = true

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
</script>

<style scoped lang="scss">
.map-3d-container {
  width: 100%;
  height: 100vh;
  position: relative;
}
</style>
