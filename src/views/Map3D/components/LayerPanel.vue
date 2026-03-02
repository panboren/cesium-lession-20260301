<template>
  <div class="layer-panel">
    <div class="panel-header">
      <span class="panel-title">⚙️ 图层控制</span>
    </div>

    <el-collapse v-model="activeLayers" class="layer-collapse">
      <el-collapse-item name="layers">
        <template #title>
          <div class="collapse-title">
            <span>🗺️ 图层管理</span>
          </div>
        </template>

        <el-tree
          :data="layerTreeData"
          :props="{ children: 'children', label: 'label' }"
          show-checkbox
          default-expand-all
          node-key="id"
          @check="handleLayerCheck"
          class="layer-tree"
        />
      </el-collapse-item>

      <el-collapse-item name="styles">
        <template #title>
          <div class="collapse-title">
            <span>🎨 地图样式</span>
          </div>
        </template>

        <el-form label-width="80px" size="small" class="layer-form">
          <el-form-item label="亮度">
            <el-slider
              v-model="brightness"
              :min="0"
              :max="3"
              :step="0.1"
              @change="handleStyleChange"
            />
          </el-form-item>
          <el-form-item label="对比度">
            <el-slider
              v-model="contrast"
              :min="0"
              :max="3"
              :step="0.1"
              @change="handleStyleChange"
            />
          </el-form-item>
          <el-form-item label="透明度">
            <el-slider
              v-model="opacity"
              :min="0"
              :max="1"
              :step="0.1"
              @change="handleStyleChange"
            />
          </el-form-item>
        </el-form>
      </el-collapse-item>

      <el-collapse-item name="scene">
        <template #title>
          <div class="collapse-title">
            <span>🌐 场景设置</span>
          </div>
        </template>

        <el-form label-width="100px" size="small" class="layer-form">
          <el-form-item label="场景模式">
            <el-select v-model="sceneMode" @change="handleSceneModeChange">
              <el-option label="3D 模式" value="SCENE3D" />
              <el-option label="2D 模式" value="SCENE2D" />
              <el-option label="2.5D 模式" value="COLUMBUS_VIEW" />
            </el-select>
          </el-form-item>
          <el-form-item label="显示地形">
            <el-switch v-model="showTerrain" @change="handleTerrainChange" />
          </el-form-item>
          <el-form-item label="显示大气">
            <el-switch v-model="showAtmosphere" @change="handleAtmosphereChange" />
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

/**
 * 图层数据配置
 */
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

const activeLayers = ref(['layers'])
const brightness = ref(1)
const contrast = ref(1)
const opacity = ref(1)
const sceneMode = ref('SCENE3D')
const showTerrain = ref(false)
const showAtmosphere = ref(true)

/**
 * 图层名称映射
 */
const layerNameMap: Record<string, string> = {
  'gaode-vector': '高德矢量地图',
  'gaode-satellite': '高德卫星图',
  'gaode-hybrid': '高德混合图',
  simple: '简单地形',
  custom: '自定义地形（波形）',
  'cesium-high': 'Cesium Ion 高精度地形',
  arcgis: 'ArcGIS 地形'
}

/**
 * 场景模式映射
 */
const sceneModeMap: Record<string, Cesium.SceneMode> = {
  SCENE3D: Cesium.SceneMode.SCENE3D,
  SCENE2D: Cesium.SceneMode.SCENE2D,
  COLUMBUS_VIEW: Cesium.SceneMode.COLUMBUS_VIEW
}

/**
 * 获取图层名称
 */
const getLayerName = (id: string): string => {
  return layerNameMap[id] || id
}

/**
 * 图层选择处理
 */
const handleLayerCheck = (data: any, checked: any) => {
  const checkedKeys = checked.checkedKeys

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
    showTerrain.value = true
    cesiumService
      .setTerrainProvider('simple')
      .then(() => ElMessage.success('已切换到简单地形'))
      .catch(() => ElMessage.error('简单地形加载失败'))
  } else if (selectedTerrain === 'custom') {
    showTerrain.value = true
    cesiumService
      .setTerrainProvider('custom')
      .then(() => ElMessage.success('已切换到自定义地形'))
      .catch(() => ElMessage.error('自定义地形加载失败'))
  } else if (selectedTerrain === 'cesium-high') {
    showTerrain.value = true
    cesiumService
      .setTerrainProvider('cesium-ion')
      .then(() => ElMessage.success('已切换到 Cesium Ion 高精度地形'))
      .catch(() => ElMessage.error('Cesium Ion 地形加载失败'))
  } else if (selectedTerrain === 'arcgis') {
    showTerrain.value = true
    cesiumService
      .setTerrainProvider('arcgis')
      .then(() => ElMessage.success('已切换到 ArcGIS 地形'))
      .catch(() => ElMessage.error('ArcGIS 地形加载失败'))
  } else {
    showTerrain.value = false
    cesiumService.setTerrainProvider('none')
  }
}

/**
 * 地图样式变化
 */
const handleStyleChange = () => {
  cesiumService.setMapStyle({
    brightness: brightness.value,
    contrast: contrast.value,
    opacity: opacity.value
  })
}

/**
 * 场景模式变化
 */
const handleSceneModeChange = (mode: string) => {
  cesiumService.setSceneMode(sceneModeMap[mode])
}

/**
 * 地形显示变化
 */
const handleTerrainChange = async (show: boolean) => {
  await cesiumService.setTerrain(show)
  ElMessage.success(show ? '地形已开启' : '地形已关闭')
}

/**
 * 大气显示变化
 */
const handleAtmosphereChange = (show: boolean) => {
  cesiumService.setAtmosphere(show)
  ElMessage.success(show ? '大气已开启' : '大气已关闭')
}
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
