import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import i18n from './i18n'
import SvgIcon from './components/SvgIcon.vue'
import './assets/main.css'

const app = createApp(App)
app.use(router)
app.use(i18n)
app.component('SvgIcon', SvgIcon)
app.mount('#app')
