<template>
  <div v-if="results.length > 0" class="draw-results-panel">
    <div class="panel-header">
      <span class="panel-title">📐 绘制结果</span>
      <el-button link @click="handleClear">
        <el-icon><Delete /></el-icon>
      </el-button>
    </div>
    <el-scrollbar max-height="400px">
      <div v-for="(item, index) in results" :key="index" class="result-item">
        <el-tag :type="getTypeConfig(item.type).color" size="small">
          {{ getTypeConfig(item.type).name }}
        </el-tag>
        <span class="result-coords">
          坐标点: {{ item.positions?.length || 0 }} 个
        </span>
        <el-button type="primary" link size="small" @click="handleFlyTo(item)">查看</el-button>
        <el-button type="danger" link size="small" @click="handleRemove(index)">删除</el-button>
      </div>
    </el-scrollbar>
  </div>
</template>

<script setup lang="ts">
import { ElMessage } from 'element-plus'
import { Delete } from '@element-plus/icons-vue'
import { cesiumService } from '@/services/cesiumService'
import { DrawType } from '@/types/cesium'
import type { DrawResult } from '@/types/cesium'
import * as Cesium from 'cesium'

const props = defineProps<{
  results: DrawResult[]
}>()

const emit = defineEmits<{
  clear: []
  remove: [index: number]
}>()

/**
 * 绘制类型配置
 */
const typeConfigMap: Record<DrawType, { name: string; color: string }> = {
  [DrawType.POINT]: { name: '点', color: 'success' },
  [DrawType.POLYLINE]: { name: '线', color: 'primary' },
  [DrawType.POLYGON]: { name: '面', color: 'warning' },
  [DrawType.CIRCLE]: { name: '圆', color: 'info' },
  [DrawType.RECTANGLE]: { name: '矩形', color: 'danger' }
}

/**
 * 获取绘制类型配置
 */
const getTypeConfig = (type: DrawType) => {
  return typeConfigMap[type] || { name: type, color: 'info' }
}

/**
 * 飞向实体
 */
const handleFlyTo = (item: DrawResult) => {
  if (!item.entity) return

  const position = item.entity.position?.getValue(Cesium.JulianDate.now())
  if (!position) return

  const cartographic = Cesium.Cartographic.fromCartesian(position)
  cesiumService.flyTo(
    {
      longitude: Cesium.Math.toDegrees(cartographic.longitude),
      latitude: Cesium.Math.toDegrees(cartographic.latitude),
      height: Math.max(cartographic.height, 100)
    },
    { duration: 2, height: 2000 }
  )
}

/**
 * 删除绘制结果
 */
const handleRemove = (index: number) => {
  const item = props.results[index]
  if (item?.entity) {
    item.entity.entityCollection?.remove(item.entity)
  }
  emit('remove', index)
  ElMessage.success('已删除')
}

/**
 * 清除所有绘制结果
 */
const handleClear = () => {
  cesiumService.clearAllEntities()
  emit('clear')
  ElMessage.success('已清除所有绘制')
}
</script>

<style scoped lang="scss">
.draw-results-panel {
  position: absolute;
  top: 10px;
  right: 330px;
  width: 280px;
  max-height: calc(100vh - 20px);
  background: rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(10px);
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  padding: 16px;
  z-index: 100;
  overflow: hidden;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  padding-bottom: 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.panel-title {
  font-size: 16px;
  font-weight: 600;
  color: #fff;
  letter-spacing: 0.5px;
}

.result-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);

  &:last-child {
    border-bottom: none;
  }
}

.result-coords {
  flex: 1;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.85);
}

:deep(.el-scrollbar) {
  .el-scrollbar__view {
    padding: 0;
  }
}

:deep(.el-button--small.is-link) {
  padding: 4px 8px;
  font-size: 12px;
}
</style>
