import { cn } from '@/utils/tailwind';
import React from 'react';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNavigate } from "react-router-dom"
import { useAppStore } from '@/stores/app'
import { useAuthStore } from '@/stores/auth'
import { useWebSocketStore } from '@/stores/websocket'

interface SettingsViewProps {
  // TODO: Define props from Vue component
}

export const SettingsView: React.FC<SettingsViewProps> = (props) => {
  const navigate = useNavigate();
  
  

const navigate = useNavigate()
const appStore = useApp()
const authStore = useAuth()
const wsStore = useWebSocket()

// State
const [playerName, set${this.capitalize("playerName")}] = useState('')
const [selectedLanguage, set${this.capitalize("selectedLanguage")}] = useState('en')
const [selectedTheme, set${this.capitalize("selectedTheme")}] = useState('dark')
const [masterVolume, set${this.capitalize("masterVolume")}] = useState(80)
const [soundEnabled, set${this.capitalize("soundEnabled")}] = useState(true)
const [musicEnabled, set${this.capitalize("musicEnabled")}] = useState(true)
const [selectedResolution, set${this.capitalize("selectedResolution")}] = useState('auto')
const [fullscreenEnabled, set${this.capitalize("fullscreenEnabled")}] = useState(false)
const [vsyncEnabled, set${this.capitalize("vsyncEnabled")}] = useState(true)
const [mouseSensitivity, set${this.capitalize("mouseSensitivity")}] = useState(1.0)
const [invertMouse, set${this.capitalize("invertMouse")}] = useState(false)
const [autoReconnect, set${this.capitalize("autoReconnect")}] = useState(true)

// Computed
const connectionStatusText = useMemo(() => {
  const status = wsStore.connectionStatus.status
  switch (status, []) {
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
useEffect(() => {
  loadSettings()
}, [])

  return (
    <div className="container mx-auto px-4">
      <div className="settings-view">
    <div className="settings-container">
      <header className="settings-header">
        <button onClick={goBack} className="btn btn-secondary hover:scale-105 active:scale-95 transition-transform">← Back</button>)}
        <h1>Settings</h1>)}
      </header>

      <div className="settings-content">
        <div className="settings-section">
          <h2>General</h2>)}
          <div className="setting-item">
            <label>Player Name</label>)}
            <input
              value={playerName} onChange={(e) => set${this.capitalize("playerName")}(e.target.value)}
              on${this.capitalize("blur")}={savePlayerName}
              type="text" className="focus:ring-2 focus:ring-cs-primary focus:outline-none input"
              maxlength="16"
            />
          </div>)}
          <div className="setting-item">
            <label>Language</label>)}
            <select value={selectedLanguage} onChange={(e) => set${this.capitalize("selectedLanguage")}(e.target.value)} on${this.capitalize("change")}={changeLanguage} className="input">
              <option value="en">English</option>)}
              <option value="zh-TW">繁體中文</option>)}
            </select>
          </div>)}
          <div className="setting-item">
            <label>Theme</label>)}
            <select value={selectedTheme} onChange={(e) => set${this.capitalize("selectedTheme")}(e.target.value)} on${this.capitalize("change")}={changeTheme} className="input">
              <option value="dark">Dark</option>)}
              <option value="light">Light</option>)}
            </select>
          </div>)}
        </div>

        <div className="settings-section">
          <h2>Audio</h2>)}
          <div className="setting-item">
            <label>Master Volume</label>)}
            <div className="volume-control">
              <input
                value={masterVolume} onChange={(e) => set${this.capitalize("masterVolume")}(e.target.value)}
                on${this.capitalize("input")}={updateVolume}
                type="range"
                min="0"
                max="100"
                className="volume-slider"
              />
              <span className="volume-value">{masterVolume }%</span>)}
            </div>
          </div>)}
          <div className="setting-item">
            <label className="checkbox-label">
              <input
                value={soundEnabled} onChange={(e) => set${this.capitalize("soundEnabled")}(e.target.value)}
                on${this.capitalize("change")}={toggleSound}
                type="checkbox"
                className="checkbox"
              />
              Enable Sound Effects
            </label>)}
          </div>
          <div className="setting-item">
            <label className="checkbox-label">
              <input
                value={musicEnabled} onChange={(e) => set${this.capitalize("musicEnabled")}(e.target.value)}
                on${this.capitalize("change")}={toggleMusic}
                type="checkbox"
                className="checkbox"
              />
              Enable Background Music
            </label>)}
          </div>
        </div>)}

        <div className="settings-section">
          <h2>Graphics</h2>)}
          <div className="setting-item">
            <label>Resolution</label>)}
            <select value={selectedResolution} onChange={(e) => set${this.capitalize("selectedResolution")}(e.target.value)} className="input">
              <option value="800x600">800x600</option>)}
              <option value="1024x768">1024x768</option>)}
              <option value="1280x720">1280x720</option>)}
              <option value="1920x1080">1920x1080</option>)}
              <option value="auto">Auto (Browser Size)</option>)}
            </select>
          </div>)}
          <div className="setting-item">
            <label className="checkbox-label">
              <input
                value={fullscreenEnabled} onChange={(e) => set${this.capitalize("fullscreenEnabled")}(e.target.value)}
                on${this.capitalize("change")}={toggleFullscreen}
                type="checkbox"
                className="checkbox"
              />
              Fullscreen Mode
            </label>)}
          </div>
          <div className="setting-item">
            <label className="checkbox-label">
              <input
                value={vsyncEnabled} onChange={(e) => set${this.capitalize("vsyncEnabled")}(e.target.value)}
                type="checkbox"
                className="checkbox"
              />
              Enable VSync
            </label>)}
          </div>
        </div>)}

        <div className="settings-section">
          <h2>Controls</h2>)}
          <div className="setting-item">
            <label>Mouse Sensitivity</label>)}
            <div className="sensitivity-control">
              <input
                value={mouseSensitivity} onChange={(e) => set${this.capitalize("mouseSensitivity")}(e.target.value)}
                type="range"
                min="0.1"
                max="5.0"
                step="0.1"
                className="volume-slider"
              />
              <span className="volume-value">{mouseSensitivity }</span>)}
            </div>
          </div>)}
          <div className="setting-item">
            <label className="checkbox-label">
              <input
                value={invertMouse} onChange={(e) => set${this.capitalize("invertMouse")}(e.target.value)}
                type="checkbox"
                className="checkbox"
              />
              Invert Mouse Y-Axis
            </label>)}
          </div>
          
          <h3>Key Bindings</h3>)}
          <div className="keybinds">
            <div className="keybind-item">
              <span className="action">Move Forward</span>)}
              <button className="keybind-btn hover:scale-105 active:scale-95 transition-transform">W</button>)}
            </div>
            <div className="keybind-item">
              <span className="action">Move Backward</span>)}
              <button className="keybind-btn hover:scale-105 active:scale-95 transition-transform">S</button>)}
            </div>
            <div className="keybind-item">
              <span className="action">Move Left</span>)}
              <button className="keybind-btn hover:scale-105 active:scale-95 transition-transform">A</button>)}
            </div>
            <div className="keybind-item">
              <span className="action">Move Right</span>)}
              <button className="keybind-btn hover:scale-105 active:scale-95 transition-transform">D</button>)}
            </div>
            <div className="keybind-item">
              <span className="action">Reload</span>)}
              <button className="keybind-btn hover:scale-105 active:scale-95 transition-transform">R</button>)}
            </div>
            <div className="keybind-item">
              <span className="action">Buy Menu</span>)}
              <button className="keybind-btn hover:scale-105 active:scale-95 transition-transform">B</button>)}
            </div>
            <div className="keybind-item">
              <span className="action">Chat</span>)}
              <button className="keybind-btn hover:scale-105 active:scale-95 transition-transform">T</button>)}
            </div>
          </div>)}
        </div>

        <div className="settings-section">
          <h2>Network</h2>)}
          <div className="setting-item">
            <label>Connection Status</label>)}
            <div className="connection-info">
              <span className="status" className={wsStore.connectionStatus.status}>
                {connectionStatusText }
              </span>)}
              <span {wsStore.latency && ( className="latency">
                {wsStore.latency }ms
              </span>)}
            </div>
          </div>)}
          <div className="setting-item">
            <label className="checkbox-label">
              <input
                value={autoReconnect} onChange={(e) => set${this.capitalize("autoReconnect")}(e.target.value)}
                type="checkbox"
                className="checkbox"
              />
              Auto-reconnect on disconnect
            </label>)}
          </div>
        </div>)}

        <div className="settings-actions">
          <button onClick={resetToDefaults} className="btn btn-warning hover:scale-105 active:scale-95 transition-transform">
            Reset to Defaults
          </button>)}
          <button onClick={saveAllSettings} className="btn btn-success hover:scale-105 active:scale-95 transition-transform">
            Save Settings
          </button>)}
        </div>
      </div>)}
    </div>
  </div>)}
    </div>
  );
};

export default SettingsView;