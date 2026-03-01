/**
 * 插件统一导出
 */

import { createApp } from 'vue'
import setupDirectives from '@/directives'

export function setupPlugins(app: ReturnType<typeof createApp>) {
  // 注册指令
  setupDirectives(app)
}
