/**
 * Cesium 状态管理
 * 统一管理 Cesium 相关的状态
 */

import { defineStore } from 'pinia'
import type { CameraPosition, LayerConfig, DrawResult } from '@/types/cesium'

export const useCesiumStore = defineStore('cesium', {
  state: () => ({
    // 是否已初始化
    initialized: false as boolean,
    // 相机位置
    cameraPosition: null as CameraPosition | null,
    // 图层列表
    layers: [] as LayerConfig[],
    // 绘制结果
    drawResults: [] as DrawResult[],
    // 当前绘制状态
    isDrawing: false as boolean,
    // 场景模式
    sceneMode: 'SCENE3D' as string,
    // 是否显示地形
    showTerrain: false as boolean,
    // 是否显示大气
    showAtmosphere: true as boolean
  }),

  getters: {
    // 获取已激活的图层数量
    activeLayerCount: (state) => state.layers.filter((layer) => layer.visible).length,

    // 获取绘制结果数量
    drawResultCount: (state) => state.drawResults.length
  },

  actions: {
    // 设置初始化状态
    setInitialized(value: boolean) {
      this.initialized = value
    },

    // 设置相机位置
    setCameraPosition(position: CameraPosition | null) {
      this.cameraPosition = position
    },

    // 添加图层
    addLayer(layer: LayerConfig) {
      const exists = this.layers.find((l) => l.id === layer.id)
      if (!exists) {
        this.layers.push(layer)
      }
    },

    // 移除图层
    removeLayer(layerId: string) {
      const index = this.layers.findIndex((l) => l.id === layerId)
      if (index > -1) {
        this.layers.splice(index, 1)
      }
    },

    // 更新图层可见性
    updateLayerVisibility(layerId: string, visible: boolean) {
      const layer = this.layers.find((l) => l.id === layerId)
      if (layer) {
        layer.visible = visible
      }
    },

    // 添加绘制结果
    addDrawResult(result: DrawResult) {
      this.drawResults.push(result)
    },

    // 移除绘制结果
    removeDrawResult(index: number) {
      if (index >= 0 && index < this.drawResults.length) {
        this.drawResults.splice(index, 1)
      }
    },

    // 清空绘制结果
    clearDrawResults() {
      this.drawResults = []
    },

    // 设置绘制状态
    setDrawing(value: boolean) {
      this.isDrawing = value
    },

    // 设置场景模式
    setSceneMode(mode: string) {
      this.sceneMode = mode
    },

    // 切换地形显示
    toggleTerrain(show: boolean) {
      this.showTerrain = show
    },

    // 切换大气显示
    toggleAtmosphere(show: boolean) {
      this.showAtmosphere = show
    }
  },

  persist: {
    key: 'cesium-store',
    storage: sessionStorage
  }
})
