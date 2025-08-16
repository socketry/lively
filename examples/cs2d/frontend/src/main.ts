import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import { setupWebSocket } from './services/websocket'
import { setupI18n } from './locales'
import { setupErrorHandler } from './utils/errorHandler'

// Styles
import './styles/main.scss'

// Create Vue app
const app = createApp(App)

// Setup Pinia store
const pinia = createPinia()
app.use(pinia)

// Setup Router
app.use(router)

// Setup i18n
const i18n = setupI18n()
app.use(i18n)

// Setup global error handler
setupErrorHandler(app)

// Initialize WebSocket connection
setupWebSocket()

// Mount app
app.mount('#app')

// Performance monitoring in development
if (import.meta.env.DEV) {
  app.config.performance = true

  // Log performance metrics
  const observer = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      console.log(`[Performance] ${entry.name}: ${entry.duration}ms`)
    }
  })
  observer.observe({ entryTypes: ['measure'] })
}
