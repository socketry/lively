import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { GameNotification } from '@/types/game'

export interface AppState {
  loading: boolean
  title: string
  theme: 'dark' | 'light'
  language: 'en' | 'zh-TW'
  notifications: GameNotification[]
  online: boolean
  fullscreen: boolean
  soundEnabled: boolean
  musicEnabled: boolean
  volume: number
  debugMode: boolean
}

export const useAppStore = defineStore('app', () => {
  // State
  const loading = ref(false)
  const title = ref('CS2D - Counter-Strike 2D')
  const theme = ref<'dark' | 'light'>('dark')
  const language = ref<'en' | 'zh-TW'>('en')
  const notifications = ref<GameNotification[]>([])
  const online = ref(navigator.onLine)
  const fullscreen = ref(false)
  const soundEnabled = ref(true)
  const musicEnabled = ref(true)
  const volume = ref(0.8)
  const debugMode = ref(import.meta.env.DEV)

  // Getters
  const isLoading = computed(() => loading.value)
  const currentTheme = computed(() => theme.value)
  const currentLanguage = computed(() => language.value)
  const unreadNotifications = computed(() =>
    notifications.value.filter((n: GameNotification) => !n.id.startsWith('read_'))
  )
  const isOnline = computed(() => online.value)
  const isFullscreen = computed(() => fullscreen.value)
  const audioSettings = computed(() => ({
    soundEnabled: soundEnabled.value,
    musicEnabled: musicEnabled.value,
    volume: volume.value
  }))

  // Actions
  function initialize(): void {
    // Load settings from localStorage
    loadSettings()

    // Set up online/offline detection
    window.addEventListener('online', () => {
      online.value = true
      addNotification({
        type: 'success',
        title: 'Connection Restored',
        message: 'You are back online!'
      })
    })

    window.addEventListener('offline', () => {
      online.value = false
      addNotification({
        type: 'warning',
        title: 'Connection Lost',
        message: 'You are currently offline'
      })
    })

    // Set up fullscreen detection
    document.addEventListener('fullscreenchange', () => {
      fullscreen.value = !!document.fullscreenElement
    })

    // Set up visibility change detection
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        setLoading(false) // Stop loading when tab is hidden
      }
    })

    console.log('[App] Initialized successfully')
  }

  function setLoading(isLoading: boolean): void {
    loading.value = isLoading
  }

  function setTitle(newTitle: string): void {
    title.value = newTitle
    document.title = newTitle
  }

  function setTheme(newTheme: 'dark' | 'light'): void {
    theme.value = newTheme
    document.documentElement.setAttribute('data-theme', newTheme)
    saveSettings()
  }

  function setLanguage(newLanguage: 'en' | 'zh-TW'): void {
    language.value = newLanguage
    saveSettings()
  }

  function addNotification(notification: Omit<GameNotification, 'id' | 'timestamp'>): void {
    const newNotification: GameNotification = {
      id: `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      duration: notification.duration || 5000,
      ...notification
    }

    notifications.value.push(newNotification)

    // Auto-remove notification after duration
    if (newNotification.duration && newNotification.duration > 0) {
      setTimeout(() => {
        removeNotification(newNotification.id)
      }, newNotification.duration)
    }
  }

  function removeNotification(id: string): void {
    const index = notifications.value.findIndex((n: GameNotification) => n.id === id)
    if (index !== -1) {
      notifications.value.splice(index, 1)
    }
  }

  function clearNotifications(): void {
    notifications.value = []
  }

  function markNotificationAsRead(id: string): void {
    const notification = notifications.value.find((n: GameNotification) => n.id === id)
    if (notification) {
      notification.id = `read_${notification.id}`
    }
  }

  function toggleFullscreen(): void {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        addNotification({
          type: 'error',
          title: 'Fullscreen Failed',
          message: `Error attempting to enable fullscreen: ${err.message}`
        })
      })
    } else {
      document.exitFullscreen()
    }
  }

  function setSoundEnabled(enabled: boolean): void {
    soundEnabled.value = enabled
    saveSettings()
  }

  function setMusicEnabled(enabled: boolean): void {
    musicEnabled.value = enabled
    saveSettings()
  }

  function setVolume(newVolume: number): void {
    volume.value = Math.max(0, Math.min(1, newVolume))
    saveSettings()
  }

  function setDebugMode(enabled: boolean): void {
    debugMode.value = enabled
    if (enabled) {
      console.log('[App] Debug mode enabled')
    }
  }

  function saveSettings(): void {
    const settings = {
      theme: theme.value,
      language: language.value,
      soundEnabled: soundEnabled.value,
      musicEnabled: musicEnabled.value,
      volume: volume.value
    }

    try {
      localStorage.setItem('cs2d_app_settings', JSON.stringify(settings))
    } catch (error) {
      console.error('Failed to save app settings:', error)
    }
  }

  function loadSettings(): void {
    try {
      const saved = localStorage.getItem('cs2d_app_settings')
      if (saved) {
        const settings = JSON.parse(saved)
        theme.value = settings.theme || 'dark'
        language.value = settings.language || 'en'
        soundEnabled.value = settings.soundEnabled !== undefined ? settings.soundEnabled : true
        musicEnabled.value = settings.musicEnabled !== undefined ? settings.musicEnabled : true
        volume.value = settings.volume !== undefined ? settings.volume : 0.8

        // Apply theme immediately
        document.documentElement.setAttribute('data-theme', theme.value)
      }
    } catch (error) {
      console.error('Failed to load app settings:', error)
    }
  }

  function reset(): void {
    loading.value = false
    title.value = 'CS2D - Counter-Strike 2D'
    theme.value = 'dark'
    language.value = 'en'
    notifications.value = []
    soundEnabled.value = true
    musicEnabled.value = true
    volume.value = 0.8
    debugMode.value = import.meta.env.DEV

    // Clear settings
    localStorage.removeItem('cs2d_app_settings')
  }

  return {
    // State
    loading,
    title,
    theme,
    language,
    notifications,
    online,
    fullscreen,
    soundEnabled,
    musicEnabled,
    volume,
    debugMode,

    // Getters
    isLoading,
    currentTheme,
    currentLanguage,
    unreadNotifications,
    isOnline,
    isFullscreen,
    audioSettings,

    // Actions
    initialize,
    setLoading,
    setTitle,
    setTheme,
    setLanguage,
    addNotification,
    removeNotification,
    clearNotifications,
    markNotificationAsRead,
    toggleFullscreen,
    setSoundEnabled,
    setMusicEnabled,
    setVolume,
    setDebugMode,
    saveSettings,
    loadSettings,
    reset
  }
})
