/**
 * 自定义材质注册 - Cesium 1.138+ 多主题配色版本
 *
 * 支持多种科技感、绚丽、未来感配色主题
 */

import * as Cesium from 'cesium'

/**
 * 主题配色定义
 */
export const effectThemes = {
  cyan: {
    color: new Cesium.Color(0.0, 1.0, 1.0, 1.0),
    beamColor: new Cesium.Color(0.0, 1.0, 1.0, 1.0),
    scanColor: new Cesium.Color(0.0, 1.0, 1.0, 1.0),
    ringColor: new Cesium.Color(0.0, 0.8, 1.0, 1.0),
    centerColor: new Cesium.Color(0.0, 1.0, 1.0, 1.0),
    waveColor: new Cesium.Color(0.0, 0.85, 1.0, 1.0),
    headColor: new Cesium.Color(0.0, 1.0, 1.0, 1.0)
  },
  'purple-blue': {
    color: new Cesium.Color.fromCssColorString('#07329f'),
    beamColor: new Cesium.Color.fromCssColorString('#550598'),
    scanColor: new Cesium.Color.fromCssColorString('#550598'),
    ringColor: new Cesium.Color.fromCssColorString('#550598'),
    centerColor: new Cesium.Color.fromCssColorString('#550598'),
    waveColor: new Cesium.Color.fromCssColorString('#550598'),
    headColor: new Cesium.Color.fromCssColorString('#550598')
  },
  'neon-cyber': {
    color: new Cesium.Color.fromCssColorString('#ff00ff'),
    beamColor: new Cesium.Color.fromCssColorString('#00ffff'),
    scanColor: new Cesium.Color.fromCssColorString('#00ffff'),
    ringColor: new Cesium.Color.fromCssColorString('#ff00aa'),
    centerColor: new Cesium.Color.fromCssColorString('#ff00ff'),
    waveColor: new Cesium.Color.fromCssColorString('#00ffff'),
    headColor: new Cesium.Color.fromCssColorString('#00ffff')
  },
  'golden-future': {
    color: new Cesium.Color.fromCssColorString('#ff6b00'),
    beamColor: new Cesium.Color.fromCssColorString('#ffd700'),
    scanColor: new Cesium.Color.fromCssColorString('#ffd700'),
    ringColor: new Cesium.Color.fromCssColorString('#ff8c00'),
    centerColor: new Cesium.Color.fromCssColorString('#ffd700'),
    waveColor: new Cesium.Color.fromCssColorString('#ffa500'),
    headColor: new Cesium.Color.fromCssColorString('#ffd700')
  },
  aurora: {
    color: new Cesium.Color.fromCssColorString('#00ff88'),
    beamColor: new Cesium.Color.fromCssColorString('#88ff00'),
    scanColor: new Cesium.Color.fromCssColorString('#00ffff'),
    ringColor: new Cesium.Color.fromCssColorString('#00ffcc'),
    centerColor: new Cesium.Color.fromCssColorString('#00ffff'),
    waveColor: new Cesium.Color.fromCssColorString('#00ff88'),
    headColor: new Cesium.Color.fromCssColorString('#00ffff')
  },
  quantum: {
    color: new Cesium.Color.fromCssColorString('#8a2be2'),
    beamColor: new Cesium.Color.fromCssColorString('#00bfff'),
    scanColor: new Cesium.Color.fromCssColorString('#00bfff'),
    ringColor: new Cesium.Color.fromCssColorString('#9932cc'),
    centerColor: new Cesium.Color.fromCssColorString('#00bfff'),
    waveColor: new Cesium.Color.fromCssColorString('#9370db'),
    headColor: new Cesium.Color.fromCssColorString('#00bfff')
  }
}

/**
 * 当前主题
 */
let currentTheme: keyof typeof effectThemes = 'cyan'

/**
 * 设置当前主题
 */
export function setEffectTheme(themeName: keyof typeof effectThemes) {
  currentTheme = themeName
  console.log('[CustomMaterials] Theme set to:', themeName)
}

/**
 * 获取当前主题颜色
 */
export function getCurrentThemeColors() {
  return effectThemes[currentTheme]
}

/**
 * 注册所有自定义材质
 */
export function registerCustomMaterials() {
  console.log('[CustomMaterials] Starting to register custom materials...')

  // 获取材质缓存
  const cache = (Cesium.Material as any)._materialCache
  if (!cache) {
    console.error('[CustomMaterials] Material._materialCache not found!')
    return
  }

  const theme = getCurrentThemeColors()

  // 1. 注册光墙材质
  cache.addMaterial('LightWall', {
    fabric: {
      type: 'LightWall',
      uniforms: {
        time: 0.0,
        color: theme.color,
        direction: 1.0,
        beamColor: theme.beamColor
      },
      source: `
        uniform float time;
        uniform vec4 color;
        uniform float direction;
        uniform vec4 beamColor;

        czm_material czm_getMaterial(czm_materialInput materialInput) {
          czm_material material = czm_getDefaultMaterial(materialInput);
          vec2 st = materialInput.st;

          vec4 baseColor = czm_gammaCorrect(color);
          vec4 beamOutColor = czm_gammaCorrect(beamColor);

          // 多层流动波浪
          float wave1 = sin(st.t * 12.0 + time * 2.5 * direction) * 0.5 + 0.5;
          float wave2 = sin(st.t * 18.0 - time * 2.0 * direction + 1.5) * 0.35 + 0.35;
          float wave3 = sin(st.t * 8.0 + time * 1.5 * direction + 0.5) * 0.2 + 0.2;

          // 垂直渐变
          float verticalGrad1 = smoothstep(0.0, 0.4, st.t);
          float verticalGrad2 = smoothstep(1.0, 0.6, st.t);
          float verticalGradient = verticalGrad1 * verticalGrad2;

          // 水平光束
          float beam1 = sin(st.s * 16.0 + time * 4.0) * 0.5 + 0.5;
          float beam2 = sin(st.s * 24.0 - time * 3.0 + 1.0) * 0.3 + 0.3;
          float beam = smoothstep(0.7, 0.9, beam1 + beam2) * 0.8;

          // 垂直扫描线
          float scanLine = smoothstep(0.02, 0.0, abs(st.t - fract(time * 0.8)));
          scanLine *= 0.3;

          // 组合效果
          float waveCombined = (wave1 + wave2 + wave3) / 3.0;
          float alpha = 0.25 + 0.45 * verticalGradient * waveCombined + beam * 0.2 + scanLine;

          // 基础颜色
          material.diffuse = baseColor.rgb * 0.4 * alpha;

          // 发光效果
          float emissionIntensity = wave1 * 0.7 + beam * 1.2 + scanLine * 2.0;
          vec3 emissionColor = mix(baseColor.rgb, beamOutColor.rgb, beam);
          material.emission = emissionColor * emissionIntensity * 0.8;

          material.alpha = alpha * baseColor.a;

          return material;
        }
      `
    },
    translucent: true
  })
  console.log('[CustomMaterials] LightWall registered')

  // 2. 注册雷达材质
  cache.addMaterial('Radar', {
    fabric: {
      type: 'Radar',
      uniforms: {
        time: 0.0,
        color: theme.color,
        scanSpeed: 0.25,
        ringColor: theme.ringColor,
        scanColor: theme.scanColor
      },
      source: `
        uniform float time;
        uniform vec4 color;
        uniform float scanSpeed;
        uniform vec4 ringColor;
        uniform vec4 scanColor;

        czm_material czm_getMaterial(czm_materialInput materialInput) {
          czm_material material = czm_getDefaultMaterial(materialInput);
          vec2 st = materialInput.st;

          // 计算到中心的距离
          float dist = distance(st, vec2(0.5));

          // 圆形遮罩
          float circleMask = 1.0 - smoothstep(0.48, 0.5, dist);
          circleMask *= smoothstep(0.02, 0.08, dist);

          // 计算角度
          float angle = atan(st.y - 0.5, st.x - 0.5);
          float normalizedAngle = (angle + 3.14159265) / 6.2831853;

          // 主扫描线
          float scanPos = fract(time * scanSpeed);
          float scanDiff = abs(normalizedAngle - scanPos);
          if (scanDiff > 0.5) scanDiff = 1.0 - scanDiff;
          float scanWidth = 0.08;
          float scan1 = smoothstep(scanWidth, 0.0, scanDiff);
          float scanGlow = smoothstep(scanWidth * 2.0, scanWidth * 0.5, scanDiff) * 0.5;

          // 次级扫描
          float scan2Pos = fract(time * scanSpeed * 0.6 + 0.5);
          float scan2Diff = abs(normalizedAngle - scan2Pos);
          if (scan2Diff > 0.5) scan2Diff = 1.0 - scan2Diff;
          float scan2 = smoothstep(0.15, 0.0, scan2Diff) * 0.3;

          // 同心圆环
          float ring1 = sin(dist * 40.0 - time * 4.0) * 0.5 + 0.5;
          float ring2 = sin(dist * 60.0 + time * 2.5) * 0.3 + 0.3;
          float ring3 = sin(dist * 80.0 - time * 3.5) * 0.2 + 0.2;
          float ringAlpha = smoothstep(0.5, 0.8, ring1 + ring2 + ring3) * 0.7;

          // 辐射线
          float crossLines = abs(sin(normalizedAngle * 8.0));
          crossLines = smoothstep(0.95, 1.0, crossLines) * 0.15;

          // 距离渐变
          float distGradient = 1.0 - smoothstep(0.0, 0.5, dist);

          // 组合效果
          vec4 scanOutColor = czm_gammaCorrect(scanColor);
          vec4 ringOutColor = czm_gammaCorrect(ringColor);
          vec4 baseOutColor = czm_gammaCorrect(color);

          float baseAlpha = 0.15 * circleMask * (0.5 + 0.5 * distGradient);
          material.diffuse = baseOutColor.rgb * baseAlpha;

          float scanIntensity = scan1 + scanGlow + scan2;
          vec3 scanEmission = scanOutColor.rgb * scanIntensity * 2.0;
          material.emission += scanEmission;

          float ringIntensity = ringAlpha * 0.6;
          vec3 ringEmission = ringOutColor.rgb * ringIntensity;
          material.emission += ringEmission;

          material.emission += baseOutColor.rgb * crossLines * 0.3;

          float totalAlpha = baseAlpha + scanIntensity * 0.8 + ringIntensity + crossLines;
          material.alpha = totalAlpha * circleMask;

          return material;
        }
      `
    },
    translucent: true
  })
  console.log('[CustomMaterials] Radar registered')

  // 3. 注册流光扩散材质
  cache.addMaterial('LightSpread', {
    fabric: {
      type: 'LightSpread',
      uniforms: {
        time: 0.0,
        color: theme.color,
        waveCount: 5,
        centerColor: theme.centerColor,
        waveColor: theme.waveColor
      },
      source: `
        uniform float time;
        uniform vec4 color;
        uniform float waveCount;
        uniform vec4 centerColor;
        uniform vec4 waveColor;

        czm_material czm_getMaterial(czm_materialInput materialInput) {
          czm_material material = czm_getDefaultMaterial(materialInput);
          vec2 st = materialInput.st;

          vec4 baseColor = czm_gammaCorrect(color);
          vec4 centerOutColor = czm_gammaCorrect(centerColor);
          vec4 waveOutColor = czm_gammaCorrect(waveColor);

          float dist = distance(st, vec2(0.5));

          // 中心发光
          float centerGlow = 1.0 - smoothstep(0.0, 0.25, dist);
          float centerGlow2 = exp(-dist * 8.0) * 0.8;
          float combinedCenterGlow = centerGlow + centerGlow2;

          // 多重扩散波纹
          float waves = 0.0;
          for (float i = 0.0; i < 5.0; i++) {
            if (i < waveCount) {
              float waveFreq = 18.0 + i * 6.0;
              float waveSpeed = 3.5 + i * 0.8;
              float wave = sin(dist * waveFreq - time * waveSpeed);
              float waveSharp = smoothstep(0.1, 0.8, wave) * 0.7;
              waves += waveSharp;
            }
          }
          waves /= 5.0;

          // 径向扩散波
          float spread1 = fract(time * 0.5);
          float spreadDist1 = smoothstep(spread1 - 0.18, spread1, dist) * (1.0 - smoothstep(spread1, spread1 + 0.15, dist));

          float spread2 = fract(time * 0.5 + 0.33);
          float spreadDist2 = smoothstep(spread2 - 0.12, spread2, dist) * (1.0 - smoothstep(spread2, spread2 + 0.12, dist));

          // 背景网格
          float gridX = abs(sin(st.s * 30.0));
          float gridY = abs(sin(st.t * 30.0));
          float grid = smoothstep(0.92, 1.0, gridX * gridY) * 0.08;

          // 组合效果
          float alpha = 0.1 + 0.35 * combinedCenterGlow + 0.35 * waves * (spreadDist1 + spreadDist2) + grid;

          vec3 finalDiffuse = mix(baseColor.rgb, centerOutColor.rgb, combinedCenterGlow);
          material.diffuse = finalDiffuse * alpha * 0.5;

          float emissionIntensity = combinedCenterGlow * 1.5 + waves * 0.6 * (spreadDist1 + spreadDist2);
          vec3 emissionColor = mix(baseColor.rgb, waveOutColor.rgb, waves);
          material.emission = emissionColor * emissionIntensity;

          material.alpha = alpha;

          return material;
        }
      `
    },
    translucent: true
  })
  console.log('[CustomMaterials] LightSpread registered')

  // 4. 注册飞线材质
  cache.addMaterial('FlyLine', {
    fabric: {
      type: 'FlyLine',
      uniforms: {
        time: 0.0,
        color: theme.color,
        speed: 1.0,
        percent: 0.4,
        headColor: theme.headColor
      },
      source: `
        uniform float time;
        uniform vec4 color;
        uniform float speed;
        uniform float percent;
        uniform vec4 headColor;

        czm_material czm_getMaterial(czm_materialInput materialInput) {
          czm_material material = czm_getDefaultMaterial(materialInput);
          vec2 st = materialInput.st;

          vec4 baseColor = czm_gammaCorrect(color);
          vec4 headOutColor = czm_gammaCorrect(headColor);

          float flow = fract(time * speed);

          // 光头效果
          float head = smoothstep(flow, flow - 0.08, st.s);
          float tail = smoothstep(flow - percent, flow - percent - 0.1, st.s);
          float line = head - tail;

          // 光头高亮
          float headHighlight = smoothstep(flow - 0.05, flow, st.s) * smoothstep(flow + 0.02, flow, st.s);

          // 渐变效果
          float gradient = 1.0 - (flow - st.s) / percent;
          gradient = clamp(gradient, 0.0, 1.0);

          // 脉动效果
          float pulse = sin(time * 8.0) * 0.1 + 0.9;

          float alpha = line * gradient * pulse;
          float headIntensity = headHighlight * 1.5;

          vec3 finalColor = mix(baseColor.rgb, headOutColor.rgb, headHighlight);

          material.emission = finalColor * (alpha + headIntensity);
          material.diffuse = baseColor.rgb * alpha * 0.2;
          material.alpha = alpha + headIntensity * 0.3;

          return material;
        }
      `
    },
    translucent: true
  })
  console.log('[CustomMaterials] FlyLine registered')

  console.log('[CustomMaterials] All custom materials registered successfully')
}
