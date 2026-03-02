<template>
  <div class="effects-panel">
    <div class="effects-header">
      <span class="effects-title">✨ 特效展示</span>
    </div>

    <el-collapse v-model="activeCollapse" class="effects-collapse">
      <!-- 特效控制面板 -->
      <el-collapse-item name="effects">
        <template #title>
          <div class="collapse-title">
            <span>🎨 特效控制</span>
          </div>
        </template>

        <el-form label-width="100px" size="small" class="effects-form">
          <el-form-item label="特效主题">
            <el-select v-model="theme" @change="handleThemeChange">
              <el-option
                v-for="option in themeOptions"
                :key="option.value"
                :label="option.label"
                :value="option.value"
              />
            </el-select>
          </el-form-item>

          <el-form-item
            v-for="effect in effectItems"
            :key="effect.key"
            :label="effect.label"
          >
            <el-switch
              v-model="effect.model.value"
              @change="effect.onChange"
            />
          </el-form-item>
        </el-form>
      </el-collapse-item>

      <!-- 天气控制面板 -->
      <el-collapse-item v-if="showWeather" name="weather">
        <template #title>
          <div class="collapse-title">
            <span>🌤️ 天气控制</span>
          </div>
        </template>

        <el-form label-width="80px" size="small" class="effects-form">
          <el-form-item label="天气类型">
            <el-radio-group v-model="weatherType" @change="handleWeatherTypeChange">
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
              @change="handleIntensityChange"
            />
          </el-form-item>

          <el-form-item label="风向">
            <el-slider
              v-model="windDirection"
              :min="0"
              :max="360"
              :step="10"
            />
          </el-form-item>

          <el-form-item label="风速">
            <el-slider
              v-model="windSpeed"
              :min="0"
              :max="20"
              :step="1"
              @change="handleWindChange"
            />
          </el-form-item>
        </el-form>
      </el-collapse-item>
    </el-collapse>
  </div>
</template>

<script setup lang="ts">
import { ref, onUnmounted } from 'vue'
import { ElMessage } from 'element-plus'
import { getCesiumManager } from '@/cesium/core/cesiumManager'
import {
  effectsManager,
  RadarEffect,
  LightWallEffect,
  LightSpreadEffect,
  PolylineTrailEffect,
  FireSmokeEffect,
  WeatherEffect,
  FireworkEffect,
  FountainEffect,
  FountainType,
  WaterSurfaceEffect
} from '@/cesium/effects'
import { setEffectTheme } from '@/cesium/materials/customMaterials'
import * as Cesium from 'cesium'

// 定义 props
defineProps<{
  ready: boolean
}>()

// 状态
const activeCollapse = ref(['effects'])
const theme = ref('cyan')
const weatherType = ref('rain')
const rainIntensity = ref(0.5)
const windDirection = ref(360)
const windSpeed = ref(20)

/**
 * 特效状态配置
 */
const showRadar = ref(false)
const showLightWall = ref(false)
const showLightSpread = ref(false)
const showFlyLines = ref(false)
const showFireSmoke = ref(false)
const showWeather = ref(false)
const showFirework = ref(false)
const showFountain = ref(false)
const showWaterSurface = ref(false)

/**
 * 主题选项配置
 */
const themeOptions = [
  { label: '青色科技', value: 'cyan' },
  { label: '紫蓝科技', value: 'purple-blue' },
  { label: '霓虹赛博', value: 'neon-cyber' },
  { label: '黄金未来', value: 'golden-future' },
  { label: '极光幻彩', value: 'aurora' },
  { label: '量子深空', value: 'quantum' },
  { label: '烈焰红莲', value: 'fire' }
]

// 烟花发射定时器
let fireworkInterval: number | null = null

/**
 * 特效主题定义
 */
const effectThemes: Record<string, any> = {
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
  return effectThemes[theme.value] || effectThemes.cyan
}

/**
 * 特效主题切换
 */
const handleThemeChange = () => {
  const themeOption = themeOptions.find(opt => opt.value === theme.value)
  const themeName = themeOption?.label || theme.value
  ElMessage.success(`已切换到${themeName}主题`)

  // 设置材质主题
  setEffectTheme(theme.value as any)

  // 重新创建所有开启的特效以应用新主题
  effectItems.forEach(item => {
    if (item.model.value) {
      item.onChange(false)
      setTimeout(() => item.onChange(true), 100)
    }
  })
}

/**
 * 雷达特效切换
 */
const handleRadarChange = (show: boolean) => {
  showRadar.value = show
  const manager = getCesiumManager()
  if (!manager) return

  if (show) {
    const viewer = manager.getViewer()
    if (!viewer) return

    const colors = getCurrentThemeColors()

    const radarEffect = new RadarEffect(viewer)
    radarEffect.create(116.39, 39.91, 5000, {
      color: colors.color,
      scanSpeed: 0.3,
      height: 100,
      scanColor: colors.scanColor,
      ringColor: colors.ringColor
    })
    effectsManager.addEffect('radar', radarEffect)
    ElMessage.success('雷达特效已开启')

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
const handleLightWallChange = (show: boolean) => {
  showLightWall.value = show
  const manager = getCesiumManager()
  if (!manager) return

  if (show) {
    const viewer = manager.getViewer()
    if (!viewer) return

    const colors = getCurrentThemeColors()

    const lightWallEffect = new LightWallEffect(viewer)
    lightWallEffect.create(
      [116.35, 39.88, 116.43, 39.88, 116.43, 39.93, 116.35, 39.93],
      800,
      {
        color: colors.color,
        direction: 1.0,
        minHeight: 0,
        beamColor: colors.beamColor
      }
    )
    effectsManager.addEffect('lightWall', lightWallEffect)

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
const handleLightSpreadChange = (show: boolean) => {
  showLightSpread.value = show
  const manager = getCesiumManager()
  if (!manager) return

  if (show) {
    const viewer = manager.getViewer()
    if (!viewer) return

    const colors = getCurrentThemeColors()

    const lightSpreadEffect = new LightSpreadEffect(viewer)
    lightSpreadEffect.create(116.35, 39.88, 116.43, 39.93, {
      color: colors.color,
      waveCount: 4,
      height: 100,
      centerColor: colors.centerColor,
      waveColor: colors.waveColor
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
const handleFlyLinesChange = (show: boolean) => {
  showFlyLines.value = show
  const manager = getCesiumManager()
  if (!manager) return

  if (show) {
    const viewer = manager.getViewer()
    if (!viewer) return

    const colors = getCurrentThemeColors()

    const lines: any[] = []

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
        color: colors.color,
        headColor: colors.headColor,
        speed: 1.0 + Math.random() * 0.5
      })
    }

    const flyLineEffect = new PolylineTrailEffect(viewer)
    flyLineEffect.createMultiple(lines)
    effectsManager.addEffect('flyLines', flyLineEffect)
    ElMessage.success('飞线特效已开启')

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
const handleFireSmokeChange = (show: boolean) => {
  showFireSmoke.value = show
  const manager = getCesiumManager()
  if (!manager) return

  if (show) {
    const viewer = manager.getViewer()
    if (!viewer) return

    const colors = getCurrentThemeColors()
    const fireSmokeEffect = new FireSmokeEffect(viewer)

    const fireColor = (colors as any).fireColor || Cesium.Color.fromCssColorString('#ff4500')
    const smokeColor = (colors as any).smokeColor || Cesium.Color.fromCssColorString('#808080')

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

    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(116.392863, 39.907827, 200),
      orientation: {
        heading: Cesium.Math.toRadians(270),
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
const handleWeatherChange = (show: boolean) => {
  showWeather.value = show
  const manager = getCesiumManager()
  if (!manager) return

  if (show) {
    const viewer = manager.getViewer()
    if (!viewer) return

    const weatherEffect = new WeatherEffect(viewer)
    const colors = getCurrentThemeColors()

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
        color: (colors as any).rainColor || Cesium.Color.fromCssColorString('#aaccff'),
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
        color: (colors as any).snowColor || Cesium.Color.fromCssColorString('#ffffff'),
        transparency: 0.5,
        swirl: 0.8
      }
    }

    weatherEffect.create(options)
    effectsManager.addEffect('weather', weatherEffect)

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

    // 展开天气控制面板
    activeCollapse.value = ['effects', 'weather']
  } else {
    effectsManager.removeEffect('weather')
    ElMessage.success('雨雪天气特效已关闭')
  }
}

/**
 * 天气类型变化
 */
const handleWeatherTypeChange = () => {
  if (showWeather.value) {
    handleWeatherChange(false)
    setTimeout(() => handleWeatherChange(true), 100)
  }
}

/**
 * 降水强度变化
 */
const handleIntensityChange = () => {
  const weatherEffect = effectsManager.getEffect('weather') as WeatherEffect
  if (weatherEffect) {
    weatherEffect.setRainIntensity(rainIntensity.value)
    weatherEffect.setSnowIntensity(rainIntensity.value)
  }
}

/**
 * 风场变化
 */
const handleWindChange = () => {
  const weatherEffect = effectsManager.getEffect('weather') as WeatherEffect
  if (weatherEffect) {
    weatherEffect.setWind(windDirection.value, windSpeed.value)
  }
}

/**
 * 烟花庆典特效切换
 */
const handleFireworkChange = (show: boolean) => {
  showFirework.value = show
  const manager = getCesiumManager()
  if (!manager) return

  if (show) {
    const viewer = manager.getViewer()
    if (!viewer) return

    const fireworkEffect = new FireworkEffect(viewer)

    fireworkEffect.launchMultiple(8, {
      longitude: 116.39,
      latitude: 39.9
    })

    effectsManager.addEffect('firework', fireworkEffect)

    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(116.391734, 39.877281, 1778),
      orientation: {
        heading: Cesium.Math.toRadians(0),
        pitch: Cesium.Math.toRadians(-20),
        roll: 0
      },
      duration: 2
    })

    ElMessage.success('烟花庆典特效已开启')

    fireworkInterval = window.setInterval(() => {
      if (!showFirework.value) {
        if (fireworkInterval) {
          clearInterval(fireworkInterval)
          fireworkInterval = null
        }
        return
      }
      const effect = effectsManager.getEffect('firework') as FireworkEffect
      if (effect) {
        effect.launchMultiple(3, {
          longitude: 116.39 + (Math.random() - 0.5) * 0.02,
          latitude: 39.9 + (Math.random() - 0.5) * 0.02
        })
      }
    }, 2500)
  } else {
    effectsManager.removeEffect('firework')
    ElMessage.success('烟花庆典特效已关闭')
  }
}

/**
 * 喷泉/水流特效切换
 */
const handleFountainChange = (show: boolean) => {
  showFountain.value = show
  const manager = getCesiumManager()
  if (!manager) return

  if (show) {
    const viewer = manager.getViewer()
    if (!viewer) return

    const fountainEffect = new FountainEffect(viewer)

    fountainEffect.create({
      position: {
        longitude: 116.3920274,
        latitude: 39.907801,
        height: 0
      },
      type: FountainType.FOUNTAIN,
      height: 50,
      particleCount: 300,
      flowRate: 10,
      waterColor: Cesium.Color.fromCssColorString('#00aaff').withAlpha(0.8),
      gravity: 9.8,
      wind: {
        direction: 45,
        speed: 0
      },
      width: 10,
      lifeTime: 3.0
    })

    effectsManager.addEffect('fountain', fountainEffect)

    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(116.3920274, 39.907801, 150),
      orientation: {
        heading: Cesium.Math.toRadians(0),
        pitch: Cesium.Math.toRadians(-20),
        roll: 0
      },
      duration: 2
    })

    ElMessage.success('喷泉特效已开启')
  } else {
    effectsManager.removeEffect('fountain')
    ElMessage.success('喷泉特效已关闭')
  }
}

/**
 * 真实水面特效切换
 */
const handleWaterSurfaceChange = (show: boolean) => {
  showWaterSurface.value = show
  const manager = getCesiumManager()
  if (!manager) return

  if (show) {
    const viewer = manager.getViewer()
    if (!viewer) return

    const waterSurfaceEffect = new WaterSurfaceEffect(viewer)

    waterSurfaceEffect.create({
      position: {
        longitude: 116.3920274,
        latitude: 39.907801,
        height: 100
      },
      radius: 1000,
      waterColor: Cesium.Color.fromCssColorString('rgba(0, 110, 180, 0.75)'),
      blendColor: Cesium.Color.fromCssColorString('rgba(100, 200, 255, 0.4)'),
      normalMapUrl: 'https://cesium.com/downloads/cesiumjs/releases/1.104/Build/Cesium/Assets/Textures/waterNormals.jpg',
      frequency: 2000.0,
      animationSpeed: 0.005,
      amplitude: 8.0,
      specularIntensity: 8,
      segments: 128
    })

    effectsManager.addEffect('waterSurface', waterSurfaceEffect)

    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(116.3920274, 39.907801, 800),
      orientation: {
        heading: Cesium.Math.toRadians(0),
        pitch: Cesium.Math.toRadians(-45),
        roll: 0
      },
      duration: 2
    })

    ElMessage.success('真实水面特效已开启')
  } else {
    effectsManager.removeEffect('waterSurface')
    ElMessage.success('真实水面特效已关闭')
  }
}

/**
 * 特效控制项配置
 */
const effectItems = [
  { key: 'radar', label: '雷达扫描', model: showRadar, onChange: handleRadarChange },
  { key: 'lightWall', label: '光墙特效', model: showLightWall, onChange: handleLightWallChange },
  { key: 'lightSpread', label: '流光扩散', model: showLightSpread, onChange: handleLightSpreadChange },
  { key: 'flyLines', label: '飞线特效', model: showFlyLines, onChange: handleFlyLinesChange },
  { key: 'fireSmoke', label: '火焰/烟雾', model: showFireSmoke, onChange: handleFireSmokeChange },
  { key: 'weather', label: '雨雪天气', model: showWeather, onChange: handleWeatherChange },
  { key: 'firework', label: '烟花庆典', model: showFirework, onChange: handleFireworkChange },
  { key: 'fountain', label: '喷泉/水流', model: showFountain, onChange: handleFountainChange },
  { key: 'waterSurface', label: '真实水面', model: showWaterSurface, onChange: handleWaterSurfaceChange }
]

/**
 * 清理
 */
onUnmounted(() => {
  if (fireworkInterval) {
    clearInterval(fireworkInterval)
  }
})
</script>

<style scoped lang="scss">
.effects-panel {
  position: absolute;
  top: 80px;
  left: 20px;
  width: 280px;
  background: rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(10px);
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  z-index: 1000;
  overflow: hidden;
}

.effects-header {
  padding: 16px 20px;
  background: linear-gradient(135deg, rgba(66, 133, 244, 0.3), rgba(156, 39, 176, 0.3));
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.effects-title {
  font-size: 16px;
  font-weight: 600;
  color: #fff;
  letter-spacing: 0.5px;
}

.effects-collapse {
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

.effects-form {
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
}

:deep(.el-radio-group) {
  display: flex;
  gap: 12px;

  .el-radio {
    color: rgba(255, 255, 255, 0.85);

    &.is-checked {
      .el-radio__label {
        color: #4285f4;
      }
    }
  }

  .el-radio__label {
    color: rgba(255, 255, 255, 0.7);
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
