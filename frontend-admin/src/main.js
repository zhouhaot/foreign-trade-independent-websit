import { createApp } from 'vue'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'
import zhCn from 'element-plus/dist/locale/zh-cn.mjs'
import { createPinia } from 'pinia'
import router from './router'
import App from './App.vue'

const app = createApp(App)

// Element Plus
app.use(ElementPlus, { locale: zhCn })

// Icons
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component)
}

// Pinia + Router
app.use(createPinia())
app.use(router)

app.mount('#app')
