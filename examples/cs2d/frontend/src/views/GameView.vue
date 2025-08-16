<template>
  <div class="game-view">
    <div class="game-container">
      <!-- Game Canvas -->
      <canvas
        ref="gameCanvas"
        class="game-canvas"
        :width="canvasWidth"
        :height="canvasHeight"
        @click="handleCanvasClick"
        @mousemove="handleMouseMove"
        @contextmenu.prevent
      />

      <!-- Game HUD -->
      <div class="game-hud">
        <!-- Top HUD -->
        <div class="hud-top">
          <div class="round-info">
            <span class="round-counter">Round {{ gameStore.roundNumber }}/{{ gameStore.maxRounds }}</span>
            <span class="round-time">{{ formatTime(gameStore.roundTime) }}</span>
          </div>
          <div class="score-board">
            <div class="team-score terrorists">
              <span class="team-name">T</span>
              <span class="score">{{ gameStore.terroristScore }}</span>
            </div>
            <div class="team-score counter-terrorists">
              <span class="team-name">CT</span>
              <span class="score">{{ gameStore.counterTerroristScore }}</span>
            </div>
          </div>
        </div>

        <!-- Bottom HUD -->
        <div class="hud-bottom">
          <div class="player-stats" v-if="localPlayer">
            <div class="health-armor">
              <div class="health">
                <span class="label">HP</span>
                <span class="value">{{ localPlayer.health }}</span>
              </div>
              <div class="armor">
                <span class="label">ARMOR</span>
                <span class="value">{{ localPlayer.armor }}</span>
              </div>
            </div>

            <div class="weapon-info" v-if="localPlayer.weapon">
              <div class="weapon-name">{{ localPlayer.weapon.name }}</div>
              <div class="ammo">
                <span class="clip">{{ localPlayer.weapon.ammo }}</span>
                <span class="separator">/</span>
                <span class="reserve">{{ localPlayer.weapon.maxAmmo }}</span>
              </div>
            </div>

            <div class="money">
              <span class="label">$</span>
              <span class="value">{{ localPlayer.money }}</span>
            </div>
          </div>

          <!-- Minimap -->
          <div class="minimap">
            <canvas
              ref="minimapCanvas"
              class="minimap-canvas"
              width="150"
              height="150"
            />
          </div>
        </div>

        <!-- Buy Menu -->
        <div v-if="showBuyMenu" class="buy-menu">
          <div class="buy-header">
            <h3>Buy Menu</h3>
            <button @click="closeBuyMenu" class="close-btn">×</button>
          </div>
          <div class="buy-categories">
            <button
              v-for="category in weaponCategories"
              :key="category.id"
              @click="selectCategory(category.id)"
              class="category-btn"
              :class="{ active: selectedCategory === category.id }"
            >
              {{ category.name }}
            </button>
          </div>
          <div class="buy-items" v-if="selectedCategory">
            <div
              v-for="weapon in currentCategoryWeapons"
              :key="weapon.id"
              class="buy-item"
              :class="{ disabled: localPlayer && weapon.price > localPlayer.money }"
              @click="buyWeapon(weapon)"
            >
              <div class="weapon-info">
                <span class="weapon-name">{{ weapon.name }}</span>
                <span class="weapon-price">${{ weapon.price }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Chat -->
        <div class="game-chat" :class="{ expanded: chatExpanded }">
          <div class="chat-messages" ref="chatContainer">
            <div
              v-for="message in recentChatMessages"
              :key="message.id"
              class="chat-message"
              :class="message.type"
            >
              <span class="message-author">{{ message.author }}:</span>
              <span class="message-text">{{ message.text }}</span>
            </div>
          </div>
          <div v-if="showChatInput" class="chat-input">
            <input
              ref="chatInputRef"
              v-model="chatInput"
              @keyup.enter="sendChatMessage"
              @keyup.esc="hideChatInput"
              type="text"
              placeholder="Type message... (Press Enter to send, Esc to cancel)"
              maxlength="200"
            />
          </div>
        </div>

        <!-- Death Screen -->
        <div v-if="!localPlayer?.alive" class="death-screen">
          <h2>You are dead</h2>
          <p>Respawning in {{ respawnTime }}s</p>
          <button @click="spectateNext" class="btn btn-primary">Spectate Next</button>
        </div>
      </div>
    </div>

    <!-- Game Menu -->
    <div v-if="showGameMenu" class="game-menu-overlay" @click="closeGameMenu">
      <div class="game-menu" @click.stop>
        <h2>Game Menu</h2>
        <button @click="resumeGame" class="btn btn-primary">Resume</button>
        <button @click="openSettings" class="btn btn-secondary">Settings</button>
        <button @click="leaveGame" class="btn btn-danger">Leave Game</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useGameStore } from '@/stores/game'
import { useAuthStore } from '@/stores/auth'
import { useWebSocket } from '@/services/websocket'
import type { Weapon, WeaponCategory } from '@/types/game'

const route = useRoute()
const router = useRouter()
const gameStore = useGameStore()
const authStore = useAuthStore()
const ws = useWebSocket()

// Canvas refs
const gameCanvas = ref<HTMLCanvasElement>()
const minimapCanvas = ref<HTMLCanvasElement>()
const chatContainer = ref<HTMLElement>()
const chatInputRef = ref<HTMLInputElement>()

// State
const canvasWidth = ref(800)
const canvasHeight = ref(600)
const showBuyMenu = ref(false)
const selectedCategory = ref<string | null>(null)
const showGameMenu = ref(false)
const chatExpanded = ref(false)
const showChatInput = ref(false)
const chatInput = ref('')
const recentChatMessages = ref<any[]>([])
const respawnTime = ref(0)

// Computed
const roomId = computed(() => route.params.roomId as string)
const localPlayer = computed(() => gameStore.localPlayer)

const weaponCategories: WeaponCategory[] = [
  { id: 'pistols', name: 'Pistols', weapons: [] },
  { id: 'rifles', name: 'Rifles', weapons: [] },
  { id: 'smgs', name: 'SMGs', weapons: [] },
  { id: 'shotguns', name: 'Shotguns', weapons: [] },
  { id: 'snipers', name: 'Snipers', weapons: [] },
  { id: 'grenades', name: 'Grenades', weapons: [] }
]

const currentCategoryWeapons = computed(() => {
  if (!selectedCategory.value) return []
  const category = weaponCategories.find(c => c.id === selectedCategory.value)
  return category?.weapons || []
})

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
  router.push('/lobby')
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
onMounted(() => {
  // Initialize canvas
  initializeCanvas()
  initializeMinimap()
  
  // Set up keyboard listeners
  document.addEventListener('keydown', handleKeyDown)
  document.addEventListener('keyup', handleKeyUp)
  
  // Join game
  ws.emit('game:join', { roomId: roomId.value })
  
  // Start game loop
  gameStore.startGameLoop()
  
  onUnmounted(() => {
    document.removeEventListener('keydown', handleKeyDown)
    document.removeEventListener('keyup', handleKeyUp)
    gameStore.stopGameLoop()
  })
})
</script>

<style scoped>
.game-view {
  height: 100vh;
  overflow: hidden;
  background: #000;
  position: relative;
}

.game-container {
  height: 100%;
  position: relative;
}

.game-canvas {
  display: block;
  width: 100%;
  height: 100%;
  cursor: crosshair;
}

.game-hud {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
  z-index: 10;
}

.game-hud > * {
  pointer-events: auto;
}

.hud-top {
  position: absolute;
  top: 1rem;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 2rem;
  align-items: center;
}

.round-info {
  background: rgba(0, 0, 0, 0.8);
  padding: 0.5rem 1rem;
  border-radius: 4px;
  display: flex;
  gap: 1rem;
  color: white;
  font-weight: 600;
}

.score-board {
  display: flex;
  gap: 1rem;
}

.team-score {
  background: rgba(0, 0, 0, 0.8);
  padding: 0.5rem 1rem;
  border-radius: 4px;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: white;
  font-weight: 600;
}

.team-score.terrorists {
  border-left: 3px solid var(--cs-danger);
}

.team-score.counter-terrorists {
  border-left: 3px solid var(--cs-secondary);
}

.hud-bottom {
  position: absolute;
  bottom: 1rem;
  left: 1rem;
  right: 1rem;
  display: flex;
  justify-content: space-between;
  align-items: end;
}

.player-stats {
  display: flex;
  gap: 2rem;
  align-items: end;
}

.health-armor {
  display: flex;
  gap: 1rem;
}

.health, .armor {
  background: rgba(0, 0, 0, 0.8);
  padding: 0.5rem 1rem;
  border-radius: 4px;
  display: flex;
  flex-direction: column;
  align-items: center;
  color: white;
}

.health {
  border-bottom: 3px solid var(--cs-success);
}

.armor {
  border-bottom: 3px solid var(--cs-secondary);
}

.weapon-info {
  background: rgba(0, 0, 0, 0.8);
  padding: 0.5rem 1rem;
  border-radius: 4px;
  text-align: center;
  color: white;
}

.weapon-name {
  display: block;
  font-weight: 600;
  margin-bottom: 0.25rem;
}

.ammo {
  font-size: 1.2rem;
  font-weight: 600;
}

.money {
  background: rgba(0, 0, 0, 0.8);
  padding: 0.5rem 1rem;
  border-radius: 4px;
  display: flex;
  align-items: center;
  gap: 0.25rem;
  color: var(--cs-success);
  font-weight: 600;
  border-bottom: 3px solid var(--cs-success);
}

.minimap {
  background: rgba(0, 0, 0, 0.8);
  border-radius: 4px;
  padding: 0.5rem;
}

.minimap-canvas {
  display: block;
  border-radius: 2px;
}

.buy-menu {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: rgba(0, 0, 0, 0.95);
  border-radius: 8px;
  padding: 2rem;
  min-width: 400px;
  max-width: 600px;
  max-height: 80vh;
  overflow-y: auto;
}

.buy-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  color: white;
}

.close-btn {
  background: none;
  border: none;
  color: white;
  font-size: 1.5rem;
  cursor: pointer;
  padding: 0.25rem 0.5rem;
}

.buy-categories {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
  flex-wrap: wrap;
}

.category-btn {
  padding: 0.5rem 1rem;
  border: 1px solid var(--cs-border);
  background: transparent;
  color: white;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.category-btn:hover,
.category-btn.active {
  background: var(--cs-primary);
  border-color: var(--cs-primary);
}

.buy-items {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.buy-item {
  padding: 1rem;
  border: 1px solid var(--cs-border);
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.3s ease;
  color: white;
}

.buy-item:hover:not(.disabled) {
  border-color: var(--cs-primary);
  background: rgba(255, 107, 53, 0.1);
}

.buy-item.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.weapon-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.weapon-price {
  color: var(--cs-success);
  font-weight: 600;
}

.game-chat {
  position: absolute;
  bottom: 150px;
  left: 1rem;
  width: 300px;
  max-height: 200px;
  transition: all 0.3s ease;
}

.game-chat.expanded {
  max-height: 400px;
}

.chat-messages {
  background: rgba(0, 0, 0, 0.7);
  border-radius: 4px;
  padding: 0.5rem;
  max-height: 150px;
  overflow-y: auto;
  font-size: 0.9rem;
}

.chat-message {
  margin-bottom: 0.25rem;
  color: white;
}

.message-author {
  color: var(--cs-primary);
  font-weight: 600;
}

.chat-input {
  margin-top: 0.5rem;
}

.chat-input input {
  width: 100%;
  padding: 0.5rem;
  border: none;
  border-radius: 4px;
  background: rgba(0, 0, 0, 0.8);
  color: white;
  font-size: 0.9rem;
}

.chat-input input:focus {
  outline: 2px solid var(--cs-primary);
}

.death-screen {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: rgba(0, 0, 0, 0.9);
  padding: 2rem;
  border-radius: 8px;
  text-align: center;
  color: white;
}

.death-screen h2 {
  color: var(--cs-danger);
  margin-bottom: 1rem;
}

.game-menu-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.game-menu {
  background: #2a2a2a;
  border-radius: 8px;
  padding: 2rem;
  text-align: center;
  color: white;
}

.game-menu h2 {
  margin-bottom: 2rem;
}

.game-menu button {
  display: block;
  width: 200px;
  margin: 0.5rem auto;
}
</style>