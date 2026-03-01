/**
 * 指令统一导出
 */

import { createApp } from 'vue'
import permission from './permission'
import appLoading from './loading'
import { vSafeHtml, vSafeText } from '@/utils/xss'
import { vRole } from '@/utils/permission'

export default function setupDirectives(app: ReturnType<typeof createApp>) {
  app.directive('permission', permission)
  app.directive('role', vRole)
  app.directive('app-loading', appLoading)
  app.directive('safe-html', vSafeHtml)
  app.directive('safe-text', vSafeText)
}

