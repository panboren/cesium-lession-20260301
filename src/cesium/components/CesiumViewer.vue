<template>
  <div class="cesium-viewer-container">
    <div ref="cesiumContainer" class="cesium-container"></div>

    <!-- 地图工具栏 -->
    <div class="cesium-toolbar">
      <div class="toolbar-title">🛠️ 地图工具</div>

      <div class="toolbar-group">
        <el-tooltip content="绘制点" placement="bottom">
          <el-button
            circle
            :icon="Location"
            @click="startDraw('point')"
            :disabled="isDrawing"
          />
        </el-tooltip>

        <el-tooltip content="绘制线" placement="bottom">
          <el-button
            circle
            :icon="Connection"
            @click="startDraw('polyline')"
            :disabled="isDrawing"
          />
        </el-tooltip>

        <el-tooltip content="绘制面" placement="bottom">
          <el-button
            circle
            :icon="Grid"
            @click="startDraw('polygon')"
            :disabled="isDrawing"
          />
        </el-tooltip>

        <el-tooltip content="绘制圆" placement="bottom">
          <el-button
            circle
            :icon="CircleCheck"
            @click="startDraw('circle')"
            :disabled="isDrawing"
          />
        </el-tooltip>

        <el-tooltip content="绘制矩形" placement="bottom">
          <el-button
            circle
            :icon="Grid"
            @click="startDraw('rectangle')"
            :disabled="isDrawing"
          />
        </el-tooltip>
      </div>

      <div class="toolbar-divider"></div>

      <el-tooltip content="清除绘制" placement="bottom">
        <el-button
          circle
          type="danger"
          :icon="Delete"
          @click="clearDraw"
          :disabled="!hasDrawings"
        />
      </el-tooltip>
    </div>

    <!-- 状态栏 -->
    <div class="cesium-statusbar">
      <div class="status-item">
        <span>经度: {{ cameraPosition?.longitude?.toFixed(6) }}</span>
      </div>
      <div class="status-item">
        <span>纬度: {{ cameraPosition?.latitude?.toFixed(6) }}</span>
      </div>
      <div class="status-item">
        <span>高度: {{ cameraPosition?.height?.toFixed(2) }}m</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, computed, nextTick } from 'vue'
import { ElMessage } from 'element-plus'
import { Location, Connection, Grid, CircleCheck, Delete } from '@element-plus/icons-vue'
import { initCesium, getCesiumManager, destroyCesium } from '../core/cesiumManager'
import { initLayerManager, getLayerManager } from '../core/layerManager'
import { initDrawManager, getDrawManager } from '../core/drawManager'
import * as Cesium from 'cesium'
import type { CameraPosition, DrawResult, DrawStyle } from '@/types/cesium'
import { DrawType } from '@/types/cesium'

/**
 * Props
 */
interface Props {
  /**
   * 容器 ID
   */
  containerId?: string
  /**
   * 是否显示工具栏
   */
  showToolbar?: boolean
  /**
   * 是否显示状态栏
   */
  showStatusbar?: boolean
  /**
   * 初始经度
   */
  initialLongitude?: number
  /**
   * 初始纬度
   */
  initialLatitude?: number
  /**
   * 初始高度
   */
  initialHeight?: number
}

const props = withDefaults(defineProps<Props>(), {
  containerId: 'cesiumContainer',
  showToolbar: true,
  showStatusbar: true,
  initialLongitude: 116.3912,
  initialLatitude: 39.9075,
  initialHeight: 10000
})

/**
 * Emits
 */
const emit = defineEmits<{
  (e: 'ready'): void
  (e: 'draw', data: DrawResult): void
  (e: 'cameraChange', position: CameraPosition): void
}>()

/**
 * Refs
 */
const cesiumContainer = ref<HTMLElement>()
const isDrawing = ref(false)
const hasDrawings = ref(false)
const cameraPosition = ref<CameraPosition | null>(null)
let cameraHandler: (() => void) | null = null

/**
 * 初始化 Cesium
 */
const initViewer = async () => {
  try {
    // 等待 DOM 渲染完成
    await nextTick()

    // 确保容器存在
    if (!cesiumContainer.value) {
      throw new Error('Cesium container ref is not available')
    }

    // 生成唯一的容器 ID
    const containerId = `cesium-${Date.now()}`

    // 设置容器 ID
    cesiumContainer.value.id = containerId

    // 初始化 Cesium
    const viewer = initCesium(
      {
        initialView: {
          longitude: props.initialLongitude,
          latitude: props.initialLatitude,
          height: props.initialHeight
        }
      },
      containerId
    )

    // 初始化图层管理器
    initLayerManager()

    // 初始化绘图管理器
    initDrawManager()

    // 监听相机变化
    const manager = getCesiumManager()
    if (manager) {
      const viewer = manager.getViewer()
      if (viewer) {
        cameraHandler = () => {
          cameraPosition.value = manager.getCameraPosition()
          emit('cameraChange', cameraPosition.value)
        }
        viewer.scene.postRender.addEventListener(cameraHandler)
      }
    }

    ElMessage.success('3D 地图初始化成功')
    emit('ready')
  } catch (error) {
    console.error('初始化 Cesium 失败:', error)
    ElMessage.error('3D 地图初始化失败')
  }
}

/**
 * 开始绘制
 */
const startDraw = (type: string) => {
  const drawManager = getDrawManager()
  if (!drawManager) {
    ElMessage.warning('绘图管理器未初始化')
    return
  }

  if (drawManager.isDrawing()) {
    ElMessage.warning('正在绘制中，请先完成当前绘制')
    return
  }

  const drawTypeMap: Record<string, DrawType> = {
    point: DrawType.POINT,
    polyline: DrawType.POLYLINE,
    polygon: DrawType.POLYGON,
    circle: DrawType.CIRCLE,
    rectangle: DrawType.RECTANGLE
  }

  const drawType = drawTypeMap[type]
  const style: DrawStyle = {
    point: {
      pixelSize: 30,
      color: Cesium.Color.RED,
      outlineColor: Cesium.Color.WHITE,
      outlineWidth: 4,
      disableDepthTestDistance: Number.POSITIVE_INFINITY
    },
    line: {
      width: 5,
      material: Cesium.Color.RED,
      clampToGround: false
    },
    polygon: {
      material: Cesium.Color.RED.withAlpha(0.6),
      outline: true,
      outlineColor: Cesium.Color.WHITE,
      outlineWidth: 4,
      perPositionHeight: false
    }
  }

  isDrawing.value = true

  // 定义事件处理函数
  const handleEnd = (event: any) => {
    isDrawing.value = false
    hasDrawings.value = true
    emit('draw', {
      type: event.drawType,
      entity: event.entity,
      positions: event.positions
    })
    // 移除监听器
    drawManager.off('end', handleEnd)
    drawManager.off('cancel', handleCancel)
  }

  const handleCancel = () => {
    isDrawing.value = false
    ElMessage.info('绘制已取消')
    // 移除监听器
    drawManager.off('end', handleEnd)
    drawManager.off('cancel', handleCancel)
  }

  // 注册事件监听器（只注册一次）
  drawManager.on('end', handleEnd)
  drawManager.on('cancel', handleCancel)

  drawManager.startDraw({
    type: drawType,
    style,
    autoFlyTo: true // 绘制完成后自动定位到最佳观察位置
  })
}

/**
 * 清除绘制
 */
const clearDraw = () => {
  const manager = getCesiumManager()
  if (manager) {
    manager.clearEntities()
    hasDrawings.value = false
    ElMessage.success('已清除所有绘制')
  }
}

/**
 * 清理资源
 */
const cleanup = () => {
  // 移除相机事件监听
  const manager = getCesiumManager()
  if (manager && cameraHandler) {
    const viewer = manager.getViewer()
    if (viewer) {
      viewer.scene.postRender.removeEventListener(cameraHandler)
    }
    cameraHandler = null
  }

  // 清理绘图管理器
  const drawManager = getDrawManager()
  if (drawManager) {
    drawManager.destroy()
  }

  // 清理图层管理器
  const layerManager = getLayerManager()
  if (layerManager) {
    layerManager.clearAllLayers()
  }

  // 销毁 Cesium
  destroyCesium()
}

/**
 * 组件挂载
 */
onMounted(() => {
  initViewer()
})

/**
 * 组件卸载
 */
onBeforeUnmount(() => {
  cleanup()
})
</script>

<style scoped lang="scss">
.cesium-viewer-container {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.cesium-container {
  width: 100%;
  height: 100%;
}

.cesium-toolbar {
  position: absolute;
  top: 10px;
  left: 10px;
  z-index: 100;
  padding: 12px 16px;
  background: rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(10px);
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  display: flex;
  align-items: center;
  gap: 12px;

  .toolbar-title {
    font-size: 14px;
    font-weight: 600;
    color: #fff;
    letter-spacing: 0.5px;
    padding-right: 12px;
    border-right: 1px solid rgba(255, 255, 255, 0.2);
  }

  .toolbar-group {
    display: flex;
    gap: 8px;
  }

  .toolbar-divider {
    width: 1px;
    height: 24px;
    background: rgba(255, 255, 255, 0.2);
  }

  :deep(.el-button) {
    background: rgba(66, 133, 244, 0.2);
    border: 1px solid rgba(66, 133, 244, 0.4);
    color: #4285f4;
    transition: all 0.3s ease;

    &:hover {
      background: rgba(66, 133, 244, 0.4);
      border-color: rgba(66, 133, 244, 0.6);
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(66, 133, 244, 0.3);
    }

    &:disabled {
      background: rgba(255, 255, 255, 0.1);
      border-color: rgba(255, 255, 255, 0.2);
      color: rgba(255, 255, 255, 0.3);
      transform: none;
      box-shadow: none;
    }

    &.el-button--danger {
      background: rgba(244, 67, 54, 0.2);
      border-color: rgba(244, 67, 54, 0.4);
      color: #f44336;

      &:hover {
        background: rgba(244, 67, 54, 0.4);
        border-color: rgba(244, 67, 54, 0.6);
        box-shadow: 0 4px 12px rgba(244, 67, 54, 0.3);
      }
    }
  }
}

.cesium-statusbar {
  position: absolute;
  bottom: 10px;
  right: 10px;
  z-index: 100;
  padding: 10px 20px;
  background: rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(10px);
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.9);
  font-size: 13px;
  display: flex;
  gap: 20px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);

  .status-item {
    display: flex;
    align-items: center;

    span {
      font-family: 'Courier New', monospace;
      letter-spacing: 0.5px;
    }
  }
}
</style>
