<template>
  <div class="layer-panel">
    <div class="panel-header">
      <span class="panel-title">⚙️ 图层控制</span>
    </div>

    <el-collapse v-model="activeLayers" class="layer-collapse">
      <el-collapse-item name="layers">
        <template #title>
          <div class="collapse-title">🗺️ 图层管理</div>
        </template>

        <el-tree
          :data="layerTreeData"
          :props="treeProps"
          show-checkbox
          default-expand-all
          node-key="id"
          @check="handleLayerCheck"
        />
      </el-collapse-item>

      <el-collapse-item name="styles">
        <template #title>
          <div class="collapse-title">🎨 地图样式</div>
        </template>

        <el-form label-width="80px" size="small" class="layer-form">
          <el-form-item
            v-for="styleItem in styleItems"
            :key="styleItem.key"
            :label="styleItem.label"
          >
            <el-slider
              v-model="styleItem.model.value"
              v-bind="styleItem.props"
              @change="handleStyleChange"
            />
          </el-form-item>
        </el-form>
      </el-collapse-item>

      <el-collapse-item name="scene">
        <template #title>
          <div class="collapse-title">🌐 场景设置</div>
        </template>

        <el-form label-width="100px" size="small" class="layer-form">
          <el-form-item label="场景模式">
            <el-select v-model="sceneMode" @change="handleSceneModeChange">
              <el-option
                v-for="modeOption in sceneModeOptions"
                :key="modeOption.value"
                :label="modeOption.label"
                :value="modeOption.value"
              />
            </el-select>
          </el-form-item>
          <el-form-item
            v-for="switchItem in sceneSwitchItems"
            :key="switchItem.key"
            :label="switchItem.label"
          >
            <el-switch
              v-model="switchItem.model.value"
              @change="switchItem.onChange"
            />
          </el-form-item>
        </el-form>
      </el-collapse-item>
    </el-collapse>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { cesiumService } from '@/services/cesiumService'
import * as Cesium from 'cesium'

// ==================== 配置常量 ====================

/** 图层配置 */
const LAYER_CONFIG = {
  imagery: {
    keys: ['gaode-vector', 'gaode-satellite', 'gaode-hybrid'],
    label: '影像图层'
  },
  terrain: {
    keys: ['simple', 'custom', 'cesium-high', 'arcgis'],
    label: '地形图层',
    providerMap: {
      simple: 'simple',
      custom: 'custom',
      'cesium-high': 'cesium-ion',
      arcgis: 'arcgis'
    } as const
  }
} as const

/** 地图样式配置 */
const STYLE_CONFIG = [
  { key: 'brightness', label: '亮度', min: 0, max: 3, step: 0.1, default: 1 },
  { key: 'contrast', label: '对比度', min: 0, max: 3, step: 0.1, default: 1 },
  { key: 'opacity', label: '透明度', min: 0, max: 1, step: 0.1, default: 1 }
] as const

/** 场景模式配置 */
const SCENE_MODE_CONFIG = [
  { label: '3D 模式', value: 'SCENE3D' },
  { label: '2D 模式', value: 'SCENE2D' },
  { label: '2.5D 模式', value: 'COLUMBUS_VIEW' }
] as const

// ==================== 类型定义 ====================

type LayerTreeData = {
  id: string
  label: string
  children?: Array<{ id: string; label: string }>
}

type TerrainProviderType = 'simple' | 'custom' | 'cesium-ion' | 'arcgis' | 'none'

// ==================== 响应式状态 ====================

/** 图层数据 */
const layerTreeData = ref<LayerTreeData[]>([
  {
    id: 'imagery-layers',
    label: LAYER_CONFIG.imagery.label,
    children: [
      { id: 'gaode-vector', label: '高德矢量地图' },
      { id: 'gaode-satellite', label: '高德卫星图' },
      { id: 'gaode-hybrid', label: '高德混合图' }
    ]
  },
  {
    id: 'terrain-layers',
    label: LAYER_CONFIG.terrain.label,
    children: [
      { id: 'simple', label: '简单地形' },
      { id: 'custom', label: '自定义地形（波形）' },
      { id: 'cesium-high', label: 'Cesium Ion 高精度地形' },
      { id: 'arcgis', label: 'ArcGIS 地形' }
    ]
  }
])

/** 激活的折叠面板 */
const activeLayers = ref(['layers'])

/** 地图样式状态 */
const brightness = ref(STYLE_CONFIG[0].default)
const contrast = ref(STYLE_CONFIG[1].default)
const opacity = ref(STYLE_CONFIG[2].default)

/** 场景模式状态 */
const sceneMode = ref('SCENE3D')
const showTerrain = ref(false)
const showAtmosphere = ref(true)

// ==================== UI 配置数组 ====================

/** 树组件属性 */
const treeProps = { children: 'children', label: 'label' }

/** 地图样式滑块配置 */
const styleItems = STYLE_CONFIG.map((item) => ({
  key: item.key,
  label: item.label,
  model: {
    brightness,
    contrast,
    opacity
  }[item.key],
  props: {
    min: item.min,
    max: item.max,
    step: item.step
  }
}))

/** 场景模式选项 */
const sceneModeOptions = SCENE_MODE_CONFIG

// ==================== 辅助函数 ====================

/** 获取图层名称 */
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

/** 切换影像图层 */
const switchImageryLayer = (selectedImagery: string) => {
  if (selectedImagery) {
    cesiumService.setImageryProvider(selectedImagery)
    ElMessage.success(`已切换到 ${getLayerName(selectedImagery)}`)
  }
}

/** 切换地形图层 */
const switchTerrainLayer = (selectedTerrain: string) => {
  if (!selectedTerrain) {
    showTerrain.value = false
    cesiumService.setTerrainProvider('none')
    return
  }

  const providerKey = LAYER_CONFIG.terrain.providerMap[selectedTerrain as keyof typeof LAYER_CONFIG.terrain.providerMap] as TerrainProviderType
  showTerrain.value = true

  cesiumService
    .setTerrainProvider(providerKey)
    .then(() => ElMessage.success(`已切换到 ${getLayerName(selectedTerrain)}`))
    .catch(() => ElMessage.error(`${getLayerName(selectedTerrain)}加载失败`))
}

// ==================== 事件处理函数 ====================

/** 图层选择处理 */
const handleLayerCheck = (_data: any, checked: any) => {
  const checkedKeys = checked.checkedKeys as string[]

  // 处理影像图层
  const selectedImagery = LAYER_CONFIG.imagery.keys.find((key) =>
    checkedKeys.includes(key)
  )
  switchImageryLayer(selectedImagery || '')

  // 处理地形图层
  const selectedTerrain = LAYER_CONFIG.terrain.keys.find((key) =>
    checkedKeys.includes(key)
  )
  switchTerrainLayer(selectedTerrain || '')
}

/** 地图样式变化 */
const handleStyleChange = () => {
  cesiumService.setMapStyle({
    brightness: brightness.value,
    contrast: contrast.value,
    opacity: opacity.value
  })
}

/** 场景模式变化 */
const handleSceneModeChange = (mode: string) => {
  const modeMap: Record<string, Cesium.SceneMode> = {
    SCENE3D: Cesium.SceneMode.SCENE3D,
    SCENE2D: Cesium.SceneMode.SCENE2D,
    COLUMBUS_VIEW: Cesium.SceneMode.COLUMBUS_VIEW
  }
  cesiumService.setSceneMode(modeMap[mode])
}

/** 地形显示变化 */
const handleTerrainChange = async (show: boolean) => {
  await cesiumService.setTerrain(show)
  ElMessage.success(show ? '地形已开启' : '地形已关闭')
}

/** 大气显示变化 */
const handleAtmosphereChange = (show: boolean) => {
  cesiumService.setAtmosphere(show)
  ElMessage.success(show ? '大气已开启' : '大气已关闭')
}

// ==================== UI 配置数组 ====================

/** 场景开关配置（放在函数定义之后） */
const sceneSwitchItems = [
  { key: 'terrain', label: '显示地形', model: showTerrain, onChange: handleTerrainChange },
  { key: 'atmosphere', label: '显示大气', model: showAtmosphere, onChange: handleAtmosphereChange }
]
</script>

<style scoped lang="scss">
.layer-panel {
  position: absolute;
  top: 10px;
  right: 10px;
  width: 320px;
  max-height: calc(100vh - 20px);
  background: rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(10px);
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  z-index: 100;
  overflow: hidden;
}
</style>

<style scoped lang="scss">
.panel-header {
  padding: 16px 20px;
  background: linear-gradient(135deg, rgba(66, 133, 244, 0.3), rgba(156, 39, 176, 0.3));
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.panel-title {
  font-size: 16px;
  font-weight: 600;
  color: #fff;
  letter-spacing: 0.5px;
}

.layer-collapse {
  border: none;
}

:deep(.el-collapse-item__wrap) {
  background: transparent;
  border: none;
}

:deep(.el-collapse-item__header) {
  background: transparent;
  border: none;
  color: #fff;
  padding: 12px 20px;
  font-size: 14px;
}

:deep(.el-collapse-item__content) {
  padding: 0 20px 16px 20px;
}

.collapse-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 500;
  color: #fff;
}

.layer-form {
  :deep(.el-form-item) {
    margin-bottom: 12px;
  }

  :deep(.el-form-item__label) {
    color: rgba(255, 255, 255, 0.85);
    font-size: 13px;
  }

  :deep(.el-select),
  :deep(.el-input__wrapper),
  :deep(.el-slider) {
    width: 100%;
  }

  :deep(.el-switch__label) {
    color: rgba(255, 255, 255, 0.7);
  }

  :deep(.el-switch) {
    .el-switch__core {
      background: rgba(255, 255, 255, 0.2);
      border: 1px solid rgba(255, 255, 255, 0.3);

      &::after {
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
      }
    }

    &.is-checked .el-switch__core {
      background: linear-gradient(90deg, #4285f4, #9c27b0);
      border-color: transparent;
    }
  }

  :deep(.el-select) {
    .el-input__wrapper {
      background: rgba(255, 255, 255, 0.1);
      border: 1px solid rgba(255, 255, 255, 0.2);
      box-shadow: none;
      transition: all 0.2s ease;

      &:hover {
        border-color: rgba(255, 255, 255, 0.4);
      }

      &.is-focus {
        border-color: #4285f4;
      }
    }

    .el-input__inner {
      color: rgba(255, 255, 255, 0.85);
      font-size: 13px;

      &::placeholder {
        color: rgba(255, 255, 255, 0.4);
      }
    }
  }
}

:deep(.el-slider) {
  .el-slider__runway {
    background: rgba(255, 255, 255, 0.2);
  }

  .el-slider__bar {
    background: linear-gradient(90deg, #4285f4, #9c27b0);
  }

  .el-slider__button {
    border: 2px solid #4285f4;
  }
}
</style>

<style lang="scss">
// 全局 el-tree 暗黑科技风格覆盖
.el-tree {
  background: transparent !important;
  color: rgba(255, 255, 255, 0.85) !important;

  .el-tree-node__content {
    height: 36px !important;
    padding-right: 8px !important;
    border-radius: 6px;
    transition: all 0.2s ease;

    &:hover {
      background: rgba(255, 255, 255, 0.1) !important;
    }

    &:focus {
      background: rgba(255, 255, 255, 0.1) !important;
    }
  }

  .el-tree-node__label {
    color: rgba(255, 255, 255, 0.85) !important;
    font-size: 13px !important;
  }

  .el-tree-node__expand-icon {
    color: rgba(255, 255, 255, 0.7) !important;
    font-size: 14px;

    &:hover {
      color: #4285f4 !important;
    }

    &.is-leaf {
      color: transparent !important;
    }
  }

  .el-checkbox {
    .el-checkbox__input {
      .el-checkbox__inner {
        background: rgba(255, 255, 255, 0.1) !important;
        border-color: rgba(255, 255, 255, 0.3) !important;
        transition: all 0.2s ease;

        &:hover {
          border-color: #4285f4 !important;
        }
      }

      &.is-checked .el-checkbox__inner {
        background: linear-gradient(135deg, #4285f4, #9c27b0) !important;
        border-color: #4285f4 !important;
      }

      &.is-indeterminate .el-checkbox__inner {
        background: linear-gradient(135deg, #4285f4, #9c27b0) !important;
        border-color: #4285f4 !important;
      }
    }

    .el-checkbox__label {
      color: rgba(255, 255, 255, 0.85) !important;
      font-size: 13px !important;
    }
  }

  // 空状态
  .el-tree__empty-text {
    color: rgba(255, 255, 255, 0.4) !important;
  }

  // 加载状态
  .el-tree-node__loading-icon {
    color: #4285f4 !important;
  }
}
</style>
