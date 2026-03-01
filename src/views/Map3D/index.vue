<template>
  <div class="map-3d-container">
    <!-- Cesium 3D 地图 -->
    <CesiumViewer
      ref="cesiumViewerRef"
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
import { cesiumService } from '@/services/cesiumService'
import type { DrawResult, CameraPosition } from '@/types/cesium'
import { DrawType } from '@/types/cesium'
import * as Cesium from 'cesium'

/**
 * Refs
 */
const cesiumViewerRef = ref<InstanceType<typeof CesiumViewer>>()
const activeLayers = ref(['layers'])
const layerTreeData = ref([
  {
    id: 'imagery-layers',
    label: '影像图层',
    children: [
      { id: 'gaode', label: '高德地图' },
      { id: 'bing', label: 'Bing 地图' },
      { id: 'osm', label: 'OpenStreetMap' }
    ]
  },
  {
    id: 'terrain-layers',
    label: '地形图层',
    children: [
      { id: 'arcgis', label: 'ArcGIS 地形' },
      { id: 'cesium', label: 'Cesium Ion 地形' }
    ]
  }
])
const brightness = ref(1)
const contrast = ref(1)
const opacity = ref(1)
const sceneMode = ref('SCENE3D')
const showTerrain = ref(false)
const showAtmosphere = ref(true)
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
const onLayerCheck = (data: unknown, checked: unknown) => {
  // 图层选择逻辑
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
</style>
