import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import './permission'
import { createPinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'
import ElementPlus from 'element-plus'
import 'virtual:uno.css'
import 'element-plus/dist/index.css'
import './styles/index.scss'
import 'virtual:svg-icons-register'
import { useTheme } from '@/utils/theme'

// 按需导入 Element Plus 图标（减少包体积）
import {
  Location,
  Connection,
  Grid,
  CircleCheck,
  Delete,
  FullScreen,
  Aim,
  Moon,
  Sunny
} from '@element-plus/icons-vue'

const app = createApp(App)

// 注册 Element Plus 图标
app.component('Location', Location)
app.component('Connection', Connection)
app.component('Grid', Grid)
app.component('CircleCheck', CircleCheck)
app.component('Delete', Delete)
app.component('FullScreen', FullScreen)
app.component('Aim', Aim)
app.component('Moon', Moon)
app.component('Sunny', Sunny)

const pinia = createPinia()
pinia.use(piniaPluginPersistedstate)

app.use(pinia)
app.use(router)
app.use(ElementPlus)

app.mount('#app')

useTheme().initTheme()
