import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import './permission'
import { createPinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'
import ElementPlus from 'element-plus'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'
import 'virtual:uno.css'
import 'element-plus/dist/index.css'
import './styles/index.scss'
import 'virtual:svg-icons-register'
import { useTheme } from '@/utils/theme'
import { setupPlugins } from '@/plugins'
import i18n from './i18n'

const app = createApp(App)

// 注册 Element Plus 图标
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component)
}

const pinia = createPinia()
pinia.use(piniaPluginPersistedstate)

app.use(pinia)
app.use(router)
app.use(ElementPlus)
app.use(i18n)

setupPlugins(app)

app.mount('#app')

useTheme().initTheme()
