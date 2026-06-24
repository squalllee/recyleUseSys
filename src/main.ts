import { createApp } from 'vue'
import { createPinia } from 'pinia'
import './style.css'
import App from './App.vue'
import router from './router'
import { useAuthStore } from './stores/auth'

const app = createApp(App)
const pinia = createPinia()
app.use(pinia)
app.use(router)

// Restore auth state from localStorage after Pinia is installed
const auth = useAuthStore()
auth.hydrate()

app.mount('#app')
