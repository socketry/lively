<template>
  <div class="room-view">
    <div class="room-container">
      <header class="room-header">
        <button @click="leaveRoom" class="btn btn-secondary">← Back to Lobby</button>
        <h1>{{ room?.name || 'Room' }}</h1>
        <div class="room-info">
          <span class="room-map">{{ room?.map }}</span>
          <span class="room-mode">{{ room?.gameMode }}</span>
        </div>
      </header>

      <div class="room-content">
        <!-- Players Section -->
        <div class="players-section">
          <div class="team" v-if="room">
            <h3>Terrorists ({{ terroristPlayers.length }})</h3>
            <div class="player-list">
              <div
                v-for="player in terroristPlayers"
                :key="player.id"
                class="player-item"
                :class="{ ready: player.ready, host: player.id === room.host }"
              >
                <span class="player-name">{{ player.name }}</span>
                <span class="player-status">
                  <span v-if="player.id === room.host" class="host-badge">HOST</span>
                  <span v-if="player.ready" class="ready-badge">READY</span>
                </span>
              </div>
            </div>
            <button 
              v-if="authStore.player?.team !== 'terrorist'"
              @click="joinTeam('terrorist')"
              class="btn btn-primary team-join"
            >
              Join Terrorists
            </button>
          </div>

          <div class="team" v-if="room">
            <h3>Counter-Terrorists ({{ counterTerroristPlayers.length }})</h3>
            <div class="player-list">
              <div
                v-for="player in counterTerroristPlayers"
                :key="player.id"
                class="player-item"
                :class="{ ready: player.ready, host: player.id === room.host }"
              >
                <span class="player-name">{{ player.name }}</span>
                <span class="player-status">
                  <span v-if="player.id === room.host" class="host-badge">HOST</span>
                  <span v-if="player.ready" class="ready-badge">READY</span>
                </span>
              </div>
            </div>
            <button 
              v-if="authStore.player?.team !== 'counter_terrorist'"
              @click="joinTeam('counter_terrorist')"
              class="btn btn-primary team-join"
            >
              Join Counter-Terrorists
            </button>
          </div>

          <div class="team">
            <h3>Spectators ({{ spectatorPlayers.length }})</h3>
            <div class="player-list">
              <div
                v-for="player in spectatorPlayers"
                :key="player.id"
                class="player-item"
                :class="{ ready: player.ready }"
              >
                <span class="player-name">{{ player.name }}</span>
                <span class="player-status">
                  <span v-if="player.ready" class="ready-badge">READY</span>
                </span>
              </div>
            </div>
            <button 
              v-if="authStore.player?.team !== 'spectator'"
              @click="joinTeam('spectator')"
              class="btn btn-secondary team-join"
            >
              Spectate
            </button>
          </div>
        </div>

        <!-- Chat Section -->
        <div class="chat-section">
          <h3>Chat</h3>
          <div class="chat-messages" ref="chatContainer">
            <div
              v-for="message in chatMessages"
              :key="message.id"
              class="chat-message"
              :class="message.type"
            >
              <span class="message-time">{{ formatTime(message.timestamp) }}</span>
              <span class="message-author">{{ message.author }}:</span>
              <span class="message-text">{{ message.text }}</span>
            </div>
          </div>
          <form @submit.prevent="sendMessage" class="chat-input">
            <input
              v-model="chatInput"
              type="text"
              placeholder="Type a message..."
              class="input"
              maxlength="200"
            />
            <button type="submit" class="btn btn-primary">Send</button>
          </form>
        </div>
      </div>

      <!-- Room Controls -->
      <div class="room-controls">
        <div class="control-group">
          <button
            @click="toggleReady"
            class="btn"
            :class="authStore.player?.ready ? 'btn-warning' : 'btn-success'"
          >
            {{ authStore.player?.ready ? 'Not Ready' : 'Ready' }}
          </button>
        </div>

        <div class="control-group" v-if="isHost">
          <button
            @click="startGame"
            class="btn btn-primary"
            :disabled="!canStartGame"
          >
            Start Game
          </button>
          <button @click="openSettings" class="btn btn-secondary">
            Room Settings
          </button>
        </div>

        <div class="game-status">
          <span v-if="room?.status === 'waiting'" class="status waiting">
            Waiting for players...
          </span>
          <span v-else-if="room?.status === 'starting'" class="status starting">
            Game starting in {{ countdown }}...
          </span>
          <span v-else-if="room?.status === 'playing'" class="status playing">
            Game in progress
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useWebSocketStore } from '@/stores/websocket'
import { useAppStore } from '@/stores/app'
import { useWebSocket } from '@/services/websocket'
import type { Room, Player } from '@/types/game'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const wsStore = useWebSocketStore()
const appStore = useAppStore()
const ws = useWebSocket()

// State
const room = ref<Room | null>(null)
const chatMessages = ref<any[]>([])
const chatInput = ref('')
const countdown = ref(0)
const chatContainer = ref<HTMLElement>()

// Computed
const roomId = computed(() => route.params.roomId as string)
const isHost = computed(() => room.value?.host === authStore.playerId)

const terroristPlayers = computed(() => 
  room.value?.players.filter(p => p.team === 'terrorist') || []
)

const counterTerroristPlayers = computed(() => 
  room.value?.players.filter(p => p.team === 'counter_terrorist') || []
)

const spectatorPlayers = computed(() => 
  room.value?.players.filter(p => p.team === 'spectator') || []
)

const canStartGame = computed(() => {
  if (!room.value || !isHost.value) return false
  const readyPlayers = room.value.players.filter(p => p.ready && p.team !== 'spectator')
  return readyPlayers.length >= 2
})

// Methods
function leaveRoom() {
  ws.emit('room:leave', { roomId: roomId.value })
  router.push('/lobby')
}

function joinTeam(team: 'terrorist' | 'counter_terrorist' | 'spectator') {
  authStore.setPlayerTeam(team)
  ws.emit('room:change_team', { roomId: roomId.value, team })
}

function toggleReady() {
  const newReady = !authStore.player?.ready
  authStore.setPlayerReady(newReady)
  ws.emit('room:toggle_ready', { roomId: roomId.value, ready: newReady })
}

function startGame() {
  if (canStartGame.value) {
    ws.emit('room:start_game', { roomId: roomId.value })
  }
}

function openSettings() {
  // TODO: Implement room settings modal
  appStore.addNotification({
    type: 'info',
    title: 'Coming Soon',
    message: 'Room settings will be available soon'
  })
}

function sendMessage() {
  if (chatInput.value.trim()) {
    ws.emit('chat:message', {
      roomId: roomId.value,
      message: chatInput.value.trim(),
      type: 'all'
    })
    chatInput.value = ''
  }
}

function scrollChatToBottom() {
  nextTick(() => {
    if (chatContainer.value) {
      chatContainer.value.scrollTop = chatContainer.value.scrollHeight
    }
  })
}

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit'
  })
}

// WebSocket event handlers
function handleRoomUpdate(updatedRoom: Room) {
  room.value = updatedRoom
}

function handleChatMessage(message: any) {
  chatMessages.value.push({
    id: `msg_${Date.now()}_${Math.random()}`,
    author: message.playerName,
    text: message.message,
    timestamp: message.timestamp || Date.now(),
    type: message.type || 'all'
  })
  scrollChatToBottom()
}

function handleGameStarting(data: { countdown: number }) {
  countdown.value = data.countdown
  if (data.countdown === 0) {
    router.push(`/game/${roomId.value}`)
  }
}

function handlePlayerJoined(player: Player) {
  chatMessages.value.push({
    id: `join_${Date.now()}_${player.id}`,
    author: 'System',
    text: `${player.name} joined the room`,
    timestamp: Date.now(),
    type: 'system'
  })
  scrollChatToBottom()
}

function handlePlayerLeft(player: Player) {
  chatMessages.value.push({
    id: `leave_${Date.now()}_${player.id}`,
    author: 'System',
    text: `${player.name} left the room`,
    timestamp: Date.now(),
    type: 'system'
  })
  scrollChatToBottom()
}

// Lifecycle
onMounted(() => {
  // Join the room
  ws.emit('room:join', { roomId: roomId.value })

  // Set up event listeners
  ws.on('room:updated', handleRoomUpdate)
  ws.on('chat:message', handleChatMessage)
  ws.on('room:game_starting', handleGameStarting)
  ws.on('room:player_joined', handlePlayerJoined)
  ws.on('room:player_left', handlePlayerLeft)

  onUnmounted(() => {
    ws.off('room:updated', handleRoomUpdate)
    ws.off('chat:message', handleChatMessage)
    ws.off('room:game_starting', handleGameStarting)
    ws.off('room:player_joined', handlePlayerJoined)
    ws.off('room:player_left', handlePlayerLeft)
  })
})
</script>

<style scoped>
.room-view {
  height: 100vh;
  display: flex;
  flex-direction: column;
}

.room-container {
  flex: 1;
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
  display: flex;
  flex-direction: column;
}

.room-header {
  display: flex;
  align-items: center;
  gap: 2rem;
  margin-bottom: 2rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--cs-border);
}

.room-info {
  display: flex;
  gap: 1rem;
  color: var(--cs-gray);
}

.room-content {
  flex: 1;
  display: grid;
  grid-template-columns: 1fr 300px;
  gap: 2rem;
  margin-bottom: 2rem;
}

.players-section {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.team {
  background: #2a2a2a;
  border-radius: 8px;
  padding: 1.5rem;
}

.team h3 {
  margin-bottom: 1rem;
  color: var(--cs-light);
}

.player-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.player-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem;
  background: #1a1a1a;
  border-radius: 4px;
  border-left: 3px solid transparent;
}

.player-item.ready {
  border-left-color: var(--cs-success);
}

.player-item.host {
  background: #2a3a2a;
}

.player-status {
  display: flex;
  gap: 0.5rem;
}

.host-badge {
  background: var(--cs-primary);
  color: white;
  padding: 0.25rem 0.5rem;
  border-radius: 3px;
  font-size: 0.7rem;
  font-weight: 600;
}

.ready-badge {
  background: var(--cs-success);
  color: white;
  padding: 0.25rem 0.5rem;
  border-radius: 3px;
  font-size: 0.7rem;
  font-weight: 600;
}

.team-join {
  width: 100%;
}

.chat-section {
  background: #2a2a2a;
  border-radius: 8px;
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  height: fit-content;
}

.chat-messages {
  height: 300px;
  overflow-y: auto;
  border: 1px solid var(--cs-border);
  border-radius: 4px;
  padding: 1rem;
  margin-bottom: 1rem;
  background: #1a1a1a;
}

.chat-message {
  margin-bottom: 0.5rem;
  font-size: 0.9rem;
}

.chat-message.system {
  color: var(--cs-gray);
  font-style: italic;
}

.message-time {
  color: var(--cs-gray);
  font-size: 0.8rem;
}

.message-author {
  color: var(--cs-primary);
  font-weight: 600;
  margin-left: 0.5rem;
}

.message-text {
  margin-left: 0.5rem;
}

.chat-input {
  display: flex;
  gap: 0.5rem;
}

.chat-input .input {
  flex: 1;
}

.room-controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  background: #2a2a2a;
  border-radius: 8px;
}

.control-group {
  display: flex;
  gap: 1rem;
}

.game-status .status {
  padding: 0.5rem 1rem;
  border-radius: 4px;
  font-weight: 600;
}

.status.waiting {
  background: var(--cs-warning);
  color: black;
}

.status.starting {
  background: var(--cs-primary);
  color: white;
}

.status.playing {
  background: var(--cs-success);
  color: white;
}

@media (max-width: 768px) {
  .room-content {
    grid-template-columns: 1fr;
  }
  
  .room-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }
  
  .room-controls {
    flex-direction: column;
    gap: 1rem;
    align-items: stretch;
  }
}
</style>