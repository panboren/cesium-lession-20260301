/**
 * 图片优化工具
 */

/**
 * 获取最优图片格式
 * 根据浏览器支持情况返回最佳格式
 */
export function getOptimalImageFormat(): 'webp' | 'jpeg' | 'png' {
  // 检查浏览器是否支持 WebP
  if (supportsWebP()) {
    return 'webp'
  }

  // 检查浏览器是否支持 JPEG
  return 'jpeg'
}

/**
 * 检测浏览器是否支持 WebP
 */
function supportsWebP(): boolean {
  if (typeof document === 'undefined') {
    return false
  }

  const elem = document.createElement('canvas')

  if (elem.getContext && elem.getContext('2d')) {
    return elem.toDataURL('image/webp').indexOf('data:image/webp') === 0
  }

  return false
}
