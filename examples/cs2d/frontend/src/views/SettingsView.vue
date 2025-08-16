<template>
  <div class="settings-view">
    <div class="settings-container">
      <header class="settings-header">
        <button @click="goBack" class="btn btn-secondary">← Back</button>
        <h1>Settings</h1>
      </header>

      <div class="settings-content">
        <div class="settings-section">
          <h2>General</h2>
          <div class="setting-item">
            <label>Player Name</label>
            <input
              v-model="playerName"
              @blur="savePlayerName"
              type="text"
              class="input"
              maxlength="16"
            />
          </div>
          <div class="setting-item">
            <label>Language</label>
            <select v-model="selectedLanguage" @change="changeLanguage" class="input">
              <option value="en">English</option>
              <option value="zh-TW">繁體中文</option>
            </select>
          </div>
          <div class="setting-item">
            <label>Theme</label>
            <select v-model="selectedTheme" @change="changeTheme" class="input">
              <option value="dark">Dark</option>
              <option value="light">Light</option>
            </select>
          </div>
        </div>

        <div class="settings-section">
          <h2>Audio</h2>
          <div class="setting-item">
            <label>Master Volume</label>
            <div class="volume-control">
              <input
                v-model="masterVolume"
                @input="updateVolume"
                type="range"
                min="0"
                max="100"
                class="volume-slider"
              />
              <span class="volume-value">{{ masterVolume }}%</span>
            </div>
          </div>
          <div class="setting-item">
            <label class="checkbox-label">
              <input
                v-model="soundEnabled"
                @change="toggleSound"
                type="checkbox"
                class="checkbox"
              />
              Enable Sound Effects
            </label>
          </div>
          <div class="setting-item">
            <label class="checkbox-label">
              <input
                v-model="musicEnabled"
                @change="toggleMusic"
                type="checkbox"
                class="checkbox"
              />
              Enable Background Music
            </label>
          </div>
        </div>

        <div class="settings-section">
          <h2>Graphics</h2>
          <div class="setting-item">
            <label>Resolution</label>
            <select v-model="selectedResolution" class="input">
              <option value="800x600">800x600</option>
              <option value="1024x768">1024x768</option>
              <option value="1280x720">1280x720</option>
              <option value="1920x1080">1920x1080</option>
              <option value="auto">Auto (Browser Size)</option>
            </select>
          </div>
          <div class="setting-item">
            <label class="checkbox-label">
              <input
                v-model="fullscreenEnabled"
                @change="toggleFullscreen"
                type="checkbox"
                class="checkbox"
              />
              Fullscreen Mode
            </label>
          </div>
          <div class="setting-item">
            <label class="checkbox-label">
              <input
                v-model="vsyncEnabled"
                type="checkbox"
                class="checkbox"
              />
              Enable VSync
            </label>
          </div>
        </div>

        <div class="settings-section">
          <h2>Controls</h2>
          <div class="setting-item">
            <label>Mouse Sensitivity</label>
            <div class="sensitivity-control">
              <input
                v-model="mouseSensitivity"
                type="range"
                min="0.1"
                max="5.0"
                step="0.1"
                class="volume-slider"
              />
              <span class="volume-value">{{ mouseSensitivity }}</span>
            </div>
          </div>
          <div class="setting-item">
            <label class="checkbox-label">
              <input
                v-model="invertMouse"
                type="checkbox"
                class="checkbox"
              />
              Invert Mouse Y-Axis
            </label>
          </div>
          
          <h3>Key Bindings</h3>
          <div class="keybinds">
            <div class="keybind-item">
              <span class="action">Move Forward</span>
              <button class="keybind-btn">W</button>
            </div>
            <div class="keybind-item">
              <span class="action">Move Backward</span>
              <button class="keybind-btn">S</button>
            </div>
            <div class="keybind-item">
              <span class="action">Move Left</span>
              <button class="keybind-btn">A</button>
            </div>
            <div class="keybind-item">
              <span class="action">Move Right</span>
              <button class="keybind-btn">D</button>
            </div>
            <div class="keybind-item">
              <span class="action">Reload</span>
              <button class="keybind-btn">R</button>
            </div>
            <div class="keybind-item">
              <span class="action">Buy Menu</span>
              <button class="keybind-btn">B</button>
            </div>
            <div class="keybind-item">
              <span class="action">Chat</span>
              <button class="keybind-btn">T</button>
            </div>
          </div>
        </div>

        <div class="settings-section">
          <h2>Network</h2>
          <div class="setting-item">
            <label>Connection Status</label>
            <div class="connection-info">
              <span class="status" :class="wsStore.connectionStatus.status">
                {{ connectionStatusText }}
              </span>
              <span v-if="wsStore.latency" class="latency">
                {{ wsStore.latency }}ms
              </span>
            </div>
          </div>
          <div class="setting-item">
            <label class="checkbox-label">
              <input
                v-model="autoReconnect"
                type="checkbox"
                class="checkbox"
              />
              Auto-reconnect on disconnect
            </label>
          </div>
        </div>

        <div class="settings-actions">
          <button @click="resetToDefaults" class="btn btn-warning">
            Reset to Defaults
          </button>
          <button @click="saveAllSettings" class="btn btn-success">
            Save Settings
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAppStore } from '@/stores/app'
import { useAuthStore } from '@/stores/auth'
import { useWebSocketStore } from '@/stores/websocket'

const router = useRouter()
const appStore = useAppStore()
const authStore = useAuthStore()
const wsStore = useWebSocketStore()

// State
const playerName = ref('')
const selectedLanguage = ref('en')
const selectedTheme = ref('dark')
const masterVolume = ref(80)
const soundEnabled = ref(true)
const musicEnabled = ref(true)
const selectedResolution = ref('auto')
const fullscreenEnabled = ref(false)
const vsyncEnabled = ref(true)
const mouseSensitivity = ref(1.0)
const invertMouse = ref(false)
const autoReconnect = ref(true)

// Computed
const connectionStatusText = computed(() => {
  const status = wsStore.connectionStatus.status
  switch (status) {
    case 'connected': return 'Connected'
    case 'connecting': return 'Connecting...'
    case 'disconnected': return 'Disconnected'
    case 'error': return 'Connection Error'
    default: return 'Unknown'
  }
})

// Methods
function goBack() {
  router.go(-1)
}

function savePlayerName() {
  if (playerName.value.trim()) {
    authStore.setPlayerName(playerName.value.trim())
    appStore.addNotification({
      type: 'success',
      title: 'Settings Saved',
      message: 'Player name updated successfully'
    })
  }
}

function changeLanguage() {
  appStore.setLanguage(selectedLanguage.value as 'en' | 'zh-TW')
  appStore.addNotification({
    type: 'success',
    title: 'Settings Saved',
    message: 'Language updated successfully'
  })
}

function changeTheme() {
  appStore.setTheme(selectedTheme.value as 'dark' | 'light')
  appStore.addNotification({
    type: 'success',
    title: 'Settings Saved',
    message: 'Theme updated successfully'
  })
}

function updateVolume() {
  const volume = masterVolume.value / 100
  appStore.setVolume(volume)
}

function toggleSound() {
  appStore.setSoundEnabled(soundEnabled.value)
}

function toggleMusic() {
  appStore.setMusicEnabled(musicEnabled.value)
}

function toggleFullscreen() {
  if (fullscreenEnabled.value) {
    appStore.toggleFullscreen()
  }
}

function resetToDefaults() {
  playerName.value = 'Player'
  selectedLanguage.value = 'en'
  selectedTheme.value = 'dark'
  masterVolume.value = 80
  soundEnabled.value = true
  musicEnabled.value = true
  selectedResolution.value = 'auto'
  fullscreenEnabled.value = false
  vsyncEnabled.value = true
  mouseSensitivity.value = 1.0
  invertMouse.value = false
  autoReconnect.value = true

  appStore.addNotification({
    type: 'info',
    title: 'Settings Reset',
    message: 'All settings have been reset to defaults'
  })
}

function saveAllSettings() {
  savePlayerName()
  changeLanguage()
  changeTheme()
  updateVolume()
  toggleSound()
  toggleMusic()

  // Save other settings to localStorage
  const settings = {
    resolution: selectedResolution.value,
    fullscreen: fullscreenEnabled.value,
    vsync: vsyncEnabled.value,
    mouseSensitivity: mouseSensitivity.value,
    invertMouse: invertMouse.value,
    autoReconnect: autoReconnect.value
  }

  localStorage.setItem('cs2d_game_settings', JSON.stringify(settings))

  appStore.addNotification({
    type: 'success',
    title: 'Settings Saved',
    message: 'All settings have been saved successfully'
  })
}

function loadSettings() {
  // Load from stores
  playerName.value = authStore.playerName
  selectedLanguage.value = appStore.currentLanguage
  selectedTheme.value = appStore.currentTheme
  masterVolume.value = Math.round(appStore.volume * 100)
  soundEnabled.value = appStore.soundEnabled
  musicEnabled.value = appStore.musicEnabled

  // Load game settings from localStorage
  try {
    const saved = localStorage.getItem('cs2d_game_settings')
    if (saved) {
      const settings = JSON.parse(saved)
      selectedResolution.value = settings.resolution || 'auto'
      fullscreenEnabled.value = settings.fullscreen || false
      vsyncEnabled.value = settings.vsync !== undefined ? settings.vsync : true
      mouseSensitivity.value = settings.mouseSensitivity || 1.0
      invertMouse.value = settings.invertMouse || false
      autoReconnect.value = settings.autoReconnect !== undefined ? settings.autoReconnect : true
    }
  } catch (error) {
    console.error('Failed to load game settings:', error)
  }
}

// Lifecycle
onMounted(() => {
  loadSettings()
})
</script>

<style scoped>
.settings-view {
  height: 100vh;
  overflow: auto;
  background: var(--cs-dark);
}

.settings-container {
  max-width: 800px;
  margin: 0 auto;
  padding: 2rem;
}

.settings-header {
  display: flex;
  align-items: center;
  gap: 2rem;
  margin-bottom: 2rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--cs-border);
}

.settings-content {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.settings-section {
  background: #2a2a2a;
  border-radius: 8px;
  padding: 2rem;
}

.settings-section h2 {
  color: var(--cs-primary);
  margin-bottom: 1.5rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid var(--cs-border);
}

.settings-section h3 {
  color: var(--cs-light);
  margin: 1.5rem 0 1rem 0;
  font-size: 1.1rem;
}

.setting-item {
  margin-bottom: 1.5rem;
}

.setting-item label {
  display: block;
  margin-bottom: 0.5rem;
  color: var(--cs-light);
  font-weight: 500;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
}

.volume-control,
.sensitivity-control {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.volume-slider {
  flex: 1;
  max-width: 200px;
}

.volume-value {
  min-width: 50px;
  color: var(--cs-primary);
  font-weight: 600;
}

.connection-info {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.status {
  padding: 0.25rem 0.75rem;
  border-radius: 4px;
  font-weight: 600;
  text-transform: uppercase;
  font-size: 0.8rem;
}

.status.connected {
  background: var(--cs-success);
  color: white;
}

.status.disconnected {
  background: var(--cs-danger);
  color: white;
}

.status.connecting {
  background: var(--cs-warning);
  color: black;
}

.latency {
  color: var(--cs-gray);
  font-size: 0.9rem;
}

.keybinds {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}

.keybind-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem;
  background: #1a1a1a;
  border-radius: 4px;
  border: 1px solid var(--cs-border);
}

.action {
  color: var(--cs-light);
}

.keybind-btn {
  padding: 0.25rem 0.75rem;
  background: var(--cs-primary);
  border: none;
  border-radius: 3px;
  color: white;
  font-weight: 600;
  font-size: 0.9rem;
  min-width: 40px;
  cursor: pointer;
}

.keybind-btn:hover {
  background: var(--cs-secondary);
}

.settings-actions {
  display: flex;
  gap: 1rem;
  justify-content: center;
  padding-top: 1rem;
  border-top: 1px solid var(--cs-border);
}

.checkbox {
  width: 18px;
  height: 18px;
  accent-color: var(--cs-primary);
}

@media (max-width: 768px) {
  .settings-container {
    padding: 1rem;
  }
  
  .settings-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }
  
  .keybinds {
    grid-template-columns: 1fr;
  }
  
  .settings-actions {
    flex-direction: column;
  }
}
</style>