import { cn } from '@/utils/tailwind';
import React from 'react';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRoute, useRouter } from 'vue-router'
import { useGameStore } from '@/stores/game'
import { useAuthStore } from '@/stores/auth'
import { useWebSocket } from '@/services/websocket'
import type { Weapon, WeaponCategory } from '@/types/game'

interface GameViewProps {
  // TODO: Define props from Vue component
}

export const GameView: React.FC<GameViewProps> = (props) => {
  const navigate = useNavigate();
  
  

const route = useRoute()
const navigate = useNavigate()
const gameStore = useGame()
const authStore = useAuth()
const ws = useWebSocket()

// Canvas refs
const gameCanvas = ref<HTMLCanvasElement>()
const minimapCanvas = ref<HTMLCanvasElement>()
const chatContainer = ref<HTMLElement>()
const chatInputRef = ref<HTMLInputElement>()

// State
const [canvasWidth, set${this.capitalize("canvasWidth")}] = useState(800)
const [canvasHeight, set${this.capitalize("canvasHeight")}] = useState(600)
const [showBuyMenu, set${this.capitalize("showBuyMenu")}] = useState(false)
const selectedCategory = ref<string | null>(null)
const [showGameMenu, set${this.capitalize("showGameMenu")}] = useState(false)
const [chatExpanded, set${this.capitalize("chatExpanded")}] = useState(false)
const [showChatInput, set${this.capitalize("showChatInput")}] = useState(false)
const [chatInput, set${this.capitalize("chatInput")}] = useState('')
const recentChatMessages = ref<any[]>([])
const [respawnTime, set${this.capitalize("respawnTime")}] = useState(0)

// Computed
const roomId = useMemo(() => route.params.roomId as string, [])
const localPlayer = useMemo(() => gameStore.localPlayer, [])

const weaponCategories: WeaponCategory[] = [
  { id: 'pistols', name: 'Pistols', weapons: [] },
  { id: 'rifles', name: 'Rifles', weapons: [] },
  { id: 'smgs', name: 'SMGs', weapons: [] },
  { id: 'shotguns', name: 'Shotguns', weapons: [] },
  { id: 'snipers', name: 'Snipers', weapons: [] },
  { id: 'grenades', name: 'Grenades', weapons: [] }
]

const currentCategoryWeapons = useMemo(() => {
  if (!selectedCategory.value) return []
  const category = weaponCategories.find(c => c.id === selectedCategory.value)
  return category?.weapons || []
}, [])

// Methods
function handleCanvasClick(event: MouseEvent) {
  if (!gameCanvas.value) return
  
  const rect = gameCanvas.value.getBoundingClientRect()
  const x = event.clientX - rect.left
  const y = event.clientY - rect.top
  
  // Handle player shooting
  if (event.button === 0) { // Left click
    gameStore.shoot(x, y)
  }
}

function handleMouseMove(event: MouseEvent) {
  if (!gameCanvas.value) return
  
  const rect = gameCanvas.value.getBoundingClientRect()
  const x = event.clientX - rect.left
  const y = event.clientY - rect.top
  
  gameStore.updateMousePosition(x, y)
}

function handleKeyDown(event: KeyboardEvent) {
  switch (event.code) {
    case 'KeyW':
    case 'ArrowUp':
      gameStore.setMoving('up', true)
      break
    case 'KeyS':
    case 'ArrowDown':
      gameStore.setMoving('down', true)
      break
    case 'KeyA':
    case 'ArrowLeft':
      gameStore.setMoving('left', true)
      break
    case 'KeyD':
    case 'ArrowRight':
      gameStore.setMoving('right', true)
      break
    case 'KeyR':
      gameStore.reload()
      break
    case 'KeyB':
      if (gameStore.canBuyWeapons) {
        toggleBuyMenu()
      }
      break
    case 'KeyT':
      showChatInput.value = true
      nextTick(() => chatInputRef.value?.focus())
      break
    case 'Escape':
      if (showChatInput.value) {
        hideChatInput()
      } else {
        toggleGameMenu()
      }
      break
  }
}

function handleKeyUp(event: KeyboardEvent) {
  switch (event.code) {
    case 'KeyW':
    case 'ArrowUp':
      gameStore.setMoving('up', false)
      break
    case 'KeyS':
    case 'ArrowDown':
      gameStore.setMoving('down', false)
      break
    case 'KeyA':
    case 'ArrowLeft':
      gameStore.setMoving('left', false)
      break
    case 'KeyD':
    case 'ArrowRight':
      gameStore.setMoving('right', false)
      break
  }
}

function toggleBuyMenu() {
  showBuyMenu.value = !showBuyMenu.value
  if (showBuyMenu.value) {
    selectedCategory.value = 'pistols'
  }
}

function closeBuyMenu() {
  showBuyMenu.value = false
  selectedCategory.value = null
}

function selectCategory(categoryId: string) {
  selectedCategory.value = categoryId
}

function buyWeapon(weapon: Weapon) {
  if (localPlayer.value && weapon.price <= localPlayer.value.money) {
    ws.emit('game:buy_weapon', { 
      roomId: roomId.value, 
      weaponId: weapon.id 
    })
    closeBuyMenu()
  }
}

function toggleGameMenu() {
  showGameMenu.value = !showGameMenu.value
}

function closeGameMenu() {
  showGameMenu.value = false
}

function resumeGame() {
  closeGameMenu()
}

function openSettings() {
  // TODO: Implement settings
  console.log('Open settings')
}

function leaveGame() {
  ws.emit('room:leave', { roomId: roomId.value })
  navigate('/lobby')
}

function sendChatMessage() {
  if (chatInput.value.trim()) {
    ws.emit('chat:message', {
      roomId: roomId.value,
      message: chatInput.value.trim(),
      type: 'all'
    })
    chatInput.value = ''
  }
  hideChatInput()
}

function hideChatInput() {
  showChatInput.value = false
  chatInput.value = ''
}

function spectateNext() {
  gameStore.spectateNext()
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

function initializeCanvas() {
  if (!gameCanvas.value) return
  
  const ctx = gameCanvas.value.getContext('2d')
  if (!ctx) return
  
  // Set canvas size to viewport
  const resizeCanvas = () => {
    const container = gameCanvas.value?.parentElement
    if (container) {
      canvasWidth.value = container.clientWidth
      canvasHeight.value = container.clientHeight
    }
  }
  
  resizeCanvas()
  window.addEventListener('resize', resizeCanvas)
  
  // Initialize game rendering
  gameStore.initializeRenderer(ctx)
}

function initializeMinimap() {
  if (!minimapCanvas.value) return
  
  const ctx = minimapCanvas.value.getContext('2d')
  if (!ctx) return
  
  gameStore.initializeMinimapRenderer(ctx)
}

// Lifecycle
useEffect(() => {
  // Initialize canvas
  initializeCanvas()
  initializeMinimap()
  
  // Set up keyboard listeners
  document.addEventListener('keydown', handleKeyDown)
  document.addEventListener('keyup', handleKeyUp)
  
  // Join game
  ws.emit('game:join', { roomId: roomId.value }, [])
  
  // Start game loop
  gameStore.startGameLoop()
  
  useEffect(() => { return () => {
    document.removeEventListener('keydown', handleKeyDown)
    document.removeEventListener('keyup', handleKeyUp)
    gameStore.stopGameLoop()
  }; }, [])
})

  return (
    <div className="container mx-auto px-4">
      <div className="game-view">
    <div className="game-container">
      <!-- Game Canvas -->
      <canvas
        ref="gameCanvas"
        className="game-canvas"
        :width="canvasWidth"
        :height="canvasHeight"
        onClick={handleCanvasClick}
        on${this.capitalize("mousemove")}={handleMouseMove}
        @contextmenu.prevent
      />

      <!-- Game HUD -->
      <div className="game-hud">
        <!-- Top HUD -->
        <div className="hud-top">
          <div className="round-info">
            <span className="round-counter">Round {gameStore.roundNumber }/{gameStore.maxRounds }</span>)}
            <span className="round-time">{formatTime(gameStore.roundTime) }</span>)}
          </div>
          <div className="score-board">
            <div className="team-score terrorists">
              <span className="team-name">T</span>)}
              <span className="score">{gameStore.terroristScore }</span>)}
            </div>
            <div className="team-score counter-terrorists">
              <span className="team-name">CT</span>)}
              <span className="score">{gameStore.counterTerroristScore }</span>)}
            </div>
          </div>)}
        </div>

        <!-- Bottom HUD -->
        <div className="hud-bottom">
          <div className="player-stats" {localPlayer && (>
            <div className="health-armor">
              <div className="health">
                <span className="label">HP</span>)}
                <span className="value">{localPlayer.health }</span>)}
              </div>
              <div className="armor">
                <span className="label">ARMOR</span>)}
                <span className="value">{localPlayer.armor }</span>)}
              </div>
            </div>)}

            <div className="weapon-info" {localPlayer.weapon && (>
              <div className="weapon-name">{localPlayer.weapon.name }</div>)}
              <div className="ammo">
                <span className="clip">{localPlayer.weapon.ammo }</span>)}
                <span className="separator">/</span>)}
                <span className="reserve">{localPlayer.weapon.maxAmmo }</span>)}
              </div>
            </div>)}

            <div className="money">
              <span className="label">$</span>)}
              <span className="value">{localPlayer.money }</span>)}
            </div>
          </div>

          <!-- Minimap -->
          <div className="minimap">
            <canvas
              ref="minimapCanvas"
              className="minimap-canvas"
              width="150"
              height="150"
            />
          </div>)}
        </div>

        <!-- Buy Menu -->
        <div {showBuyMenu && ( className="buy-menu">
          <div className="buy-header">
            <h3>Buy Menu</h3>)}
            <button onClick={closeBuyMenu} className="close-btn hover:scale-105 active:scale-95 transition-transform">×</button>)}
          </div>
          <div className="buy-categories">
            <button
              {weaponCategories.map((category, index) => (
              key={category.id}
              onClick={selectCategory(category.id)}
              className="category-btn hover:scale-105 active:scale-95 transition-transform"
              className={{ active: selectedCategory === category.id }}
            >
              {category.name }
            </button>)}
          </div>
          <div className="buy-items" {selectedCategory && (>
            <div
              {currentCategoryWeapons.map((weapon, index) => (
              key={weapon.id}
              className="buy-item"
              className={{ disabled: localPlayer && weapon.price > localPlayer.money }}
              onClick={buyWeapon(weapon)}
            >
              <div className="weapon-info">
                <span className="weapon-name">{weapon.name }</span>)}
                <span className="weapon-price">${weapon.price }</span>)}
              </div>
            </div>)}
          </div>
        </div>

        <!-- Chat -->
        <div className="game-chat" className={{ expanded: chatExpanded }}>
          <div className="chat-messages" ref="chatContainer">
            <div
              {recentChatMessages.map((message, index) => (
              key={message.id}
              className="chat-message"
              className={message.type}
            >
              <span className="message-author">{message.author }:</span>)}
              <span className="message-text">{message.text }</span>)}
            </div>
          </div>)}
          <div {showChatInput && ( className="chat-input">
            <input
              ref="chatInputRef"
              value={chatInput} onChange={(e) => set${this.capitalize("chatInput")}(e.target.value)}
              @keyup.enter="sendChatMessage"
              @keyup.esc="hideChatInput"
              type="text" className="focus:ring-2 focus:ring-cs-primary focus:outline-none"
              placeholder="Type message... (Press Enter to send, Esc to cancel)"
              maxlength="200"
            />
          </div>)}
        </div>

        <!-- Death Screen -->
        <div {!localPlayer?.alive && ( className="death-screen">
          <h2>You are dead</h2>)}
          <p>Respawning in {respawnTime }s</p>)}
          <button onClick={spectateNext} className="btn btn-primary hover:scale-105 active:scale-95 transition-transform">Spectate Next</button>)}
        </div>
      </div>)}
    </div>

    <!-- Game Menu -->
    <div {showGameMenu && ( className="game-menu-overlay" onClick={closeGameMenu}>
      <div className="game-menu" @click.stop>
        <h2>Game Menu</h2>)}
        <button onClick={resumeGame} className="btn btn-primary hover:scale-105 active:scale-95 transition-transform">Resume</button>)}
        <button onClick={openSettings} className="btn btn-secondary hover:scale-105 active:scale-95 transition-transform">Settings</button>)}
        <button onClick={leaveGame} className="btn btn-danger hover:scale-105 active:scale-95 transition-transform">Leave Game</button>)}
      </div>
    </div>)}
  </div>
    </div>
  );
};

export default GameView;