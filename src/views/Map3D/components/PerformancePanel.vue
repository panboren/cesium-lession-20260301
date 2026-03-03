<template>
  <div class="performance-panel" v-if="visible">
    <div class="performance-header">
      <span class="performance-title">⚡ 性能监控</span>
      <el-button
        text
        size="small"
        @click="toggleMonitoring"
        :type="isMonitoring ? 'danger' : 'success'"
      >
        {{ isMonitoring ? '停止' : '开始' }}
      </el-button>
    </div>

    <div class="performance-content">
      <!-- FPS 指标 -->
      <div class="metric-item" :class="getFpsClass(metrics.fps)">
        <div class="metric-label">FPS</div>
        <div class="metric-value">{{ metrics.fps }}</div>
        <div class="metric-indicator" :style="{ width: `${Math.min(metrics.fps / 60 * 100, 100)}%` }"></div>
      </div>

      <!-- 帧时间 -->
      <div class="metric-item">
        <div class="metric-label">帧时间</div>
        <div class="metric-value">{{ metrics.frameTime.toFixed(2) }} ms</div>
      </div>

      <!-- 实体数量 -->
      <div class="metric-item">
        <div class="metric-label">实体</div>
        <div class="metric-value">{{ metrics.entities }}</div>
      </div>

      <!-- Primitive 数量 -->
      <div class="metric-item">
        <div class="metric-label">Primitive</div>
        <div class="metric-value">{{ metrics.primitives }}</div>
      </div>

      <!-- 绘制调用 -->
      <div class="metric-item">
        <div class="metric-label">Draw Calls</div>
        <div class="metric-value">{{ metrics.drawCalls }}</div>
      </div>

      <!-- 纹理数量 -->
      <div class="metric-item">
        <div class="metric-label">纹理</div>
        <div class="metric-value">{{ metrics.textures }}</div>
      </div>
    </div>

    <!-- 性能状态 -->
    <div class="performance-status" :class="statusClass">
      {{ statusText }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue'
import { getCesiumManager } from '@/cesium/core/cesiumManager'
import { createPerformanceMonitor, type PerformanceMetrics } from '@/cesium/utils/performanceMonitor'
import type { PerformanceEventType } from '@/cesium/utils/performanceMonitor'

// Props
defineProps<{
  visible?: boolean
}>()

// 状态
const isMonitoring = ref(false)
const metrics = ref<PerformanceMetrics>({
  fps: 0,
  frameTime: 0,
  drawCalls: 0,
  triangles: 0,
  textures: 0,
  geometries: 0,
  primitives: 0,
  entities: 0
})

const monitor = ref<ReturnType<typeof createPerformanceMonitor> | null>(null)

// 性能状态
const statusClass = computed(() => {
  if (metrics.value.fps < 15) return 'critical'
  if (metrics.value.fps < 30) return 'warning'
  return 'good'
})

const statusText = computed(() => {
  if (metrics.value.fps < 15) return '❌ 性能严重不足'
  if (metrics.value.fps < 30) return '⚠️ 性能较低'
  if (metrics.value.fps < 50) return '✓ 性能正常'
  return '✓✓ 性能优秀'
})

// FPS 状态类
const getFpsClass = (fps: number) => {
  if (fps < 15) return 'critical'
  if (fps < 30) return 'warning'
  return 'good'
}

// 切换监控
const toggleMonitoring = () => {
  if (!monitor.value) {
    const manager = getCesiumManager()
    if (!manager) return

    const viewer = manager.getViewer()
    if (!viewer) return

    monitor.value = createPerformanceMonitor(viewer, {
      updateInterval: 1000,
      fpsWarningThreshold: 30,
      fpsErrorThreshold: 15
    })
  }

  if (isMonitoring.value) {
    monitor.value.stop()
    isMonitoring.value = false
  } else {
    monitor.value.start()
    monitor.value.on('update', handleMetricsUpdate)
    isMonitoring.value = true
  }
}

// 更新指标
const handleMetricsUpdate = (newMetrics: PerformanceMetrics) => {
  metrics.value = newMetrics
}

// 清理
onUnmounted(() => {
  if (monitor.value) {
    monitor.value.destroy()
  }
})
</script>

<style scoped lang="scss">
.performance-panel {
  position: absolute;
  top: 80px;
  right: 20px;
  width: 240px;
  background: rgba(0, 0, 0, 0.85);
  backdrop-filter: blur(10px);
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  z-index: 1000;
  overflow: hidden;
}

.performance-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: linear-gradient(135deg, rgba(66, 133, 244, 0.3), rgba(156, 39, 176, 0.3));
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.performance-title {
  font-size: 14px;
  font-weight: 600;
  color: #fff;
  letter-spacing: 0.5px;
}

.performance-content {
  padding: 12px 16px;
}

.metric-item {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);

  &:last-child {
    border-bottom: none;
  }

  &.good .metric-value {
    color: #4caf50;
  }

  &.warning .metric-value {
    color: #ff9800;
  }

  &.critical .metric-value {
    color: #f44336;
  }
}

.metric-label {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.7);
}

.metric-value {
  font-size: 14px;
  font-weight: 600;
  color: #fff;
}

.metric-indicator {
  position: absolute;
  bottom: 0;
  left: 0;
  height: 2px;
  background: linear-gradient(90deg, #4caf50, #ff9800, #f44336);
  transition: width 0.3s ease;
}

.performance-status {
  padding: 8px 16px;
  font-size: 12px;
  font-weight: 500;
  text-align: center;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(0, 0, 0, 0.3);

  &.good {
    color: #4caf50;
    background: rgba(76, 175, 80, 0.1);
  }

  &.warning {
    color: #ff9800;
    background: rgba(255, 152, 0, 0.1);
  }

  &.critical {
    color: #f44336;
    background: rgba(244, 67, 54, 0.1);
  }
}
</style>
