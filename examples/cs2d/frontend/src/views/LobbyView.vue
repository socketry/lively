<template>
  <div class="lobby-view">
    <div class="lobby-container">
      <header class="lobby-header">
        <h1>{{ $t('lobby.title') }}</h1>
        <div class="player-info">
          <span class="player-name">{{ authStore.playerName }}</span>
          <button @click="openSettings" class="btn btn-secondary">Settings</button>
        </div>
      </header>

      <div class="lobby-content">
        <!-- Room List -->
        <div class="room-section">
          <div class="section-header">
            <h2>Active Rooms</h2>
            <button @click="createRoom" class="btn btn-primary">
              {{ $t('lobby.createRoom') }}
            </button>
          </div>

          <div v-if="loading" class="loading">
            <div class="spinner"></div>
            Loading rooms...
          </div>

          <div v-else class="room-list">
            <div
              v-for="room in rooms"
              :key="room.id"
              class="room-card"
              @click="joinRoom(room.id)"
            >
              <div class="room-header">
                <h3>{{ room.name }}</h3>
                <span class="room-status" :class="room.status">{{ room.status }}</span>
              </div>
              <div class="room-info">
                <span class="room-map">{{ room.map }}</span>
                <span class="room-players">{{ room.players.length }}/{{ room.maxPlayers }}</span>
                <span class="room-mode">{{ room.gameMode }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Player List -->
        <div class="players-section">
          <h2>{{ $t('lobby.players') }}</h2>
          <div class="player-list">
            <div
              v-for="player in onlinePlayers"
              :key="player.id"
              class="player-item"
              :class="{ online: player.online }"
            >
              <span class="player-name">{{ player.name }}</span>
              <span class="player-status">{{ player.status }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Connection Status -->
      <div class="connection-status" :class="wsStore.connectionStatus.status">
        <div class="status-indicator"></div>
        <span>{{ connectionStatusText }}</span>
        <span v-if="wsStore.latency" class="latency">{{ wsStore.latency }}ms</span>
      </div>
    </div>

    <!-- Create Room Modal -->
    <div v-if="showCreateModal" class="modal-overlay" @click="closeCreateModal">
      <div class="modal" @click.stop>
        <h2>Create Room</h2>
        <form @submit.prevent="submitCreateRoom">
          <div class="form-group">
            <label>Room Name</label>
            <input v-model="createForm.name" type="text" required class="input" />
          </div>
          <div class="form-group">
            <label>Map</label>
            <select v-model="createForm.map" class="input">
              <option value="de_dust2_simple">Dust2</option>
              <option value="de_inferno_simple">Inferno</option>
              <option value="aim_map">Aim Map</option>
              <option value="fy_iceworld">Iceworld</option>
            </select>
          </div>
          <div class="form-group">
            <label>Max Players</label>
            <select v-model="createForm.maxPlayers" class="input">
              <option value="8">8</option>
              <option value="16">16</option>
              <option value="32">32</option>
            </select>
          </div>
          <div class="form-group">
            <label>Game Mode</label>
            <select v-model="createForm.gameMode" class="input">
              <option value="classic">Classic</option>
              <option value="deathmatch">Deathmatch</option>
              <option value="gungame">Gun Game</option>
            </select>
          </div>
          <div class="form-actions">
            <button type="button" @click="closeCreateModal" class="btn btn-secondary">Cancel</button>
            <button type="submit" class="btn btn-primary">Create</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useWebSocketStore } from '@/stores/websocket'
import { useAppStore } from '@/stores/app'
import { useWebSocket } from '@/services/websocket'
import type { Room } from '@/types/game'

const router = useRouter()
const authStore = useAuthStore()
const wsStore = useWebSocketStore()
const appStore = useAppStore()
const ws = useWebSocket()

// State
const loading = ref(true)
const rooms = ref<Room[]>([])
const onlinePlayers = ref<any[]>([])
const showCreateModal = ref(false)
const createForm = ref({
  name: '',
  map: 'de_dust2_simple',
  maxPlayers: 16,
  gameMode: 'classic'
})

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
function createRoom() {
  createForm.value.name = `${authStore.playerName}'s Room`
  showCreateModal.value = true
}

function closeCreateModal() {
  showCreateModal.value = false
}

function submitCreateRoom() {
  ws.emit('room:create', createForm.value)
  closeCreateModal()
}

function joinRoom(roomId: string) {
  ws.emit('room:join', { roomId })
  router.push(`/room/${roomId}`)
}

function openSettings() {
  router.push('/settings')
}

function refreshRooms() {
  ws.emit('lobby:get_rooms')
}

function refreshPlayers() {
  ws.emit('lobby:get_players')
}

// WebSocket event handlers
function handleRoomList(roomList: Room[]) {
  rooms.value = roomList
  loading.value = false
}

function handlePlayerList(playerList: any[]) {
  onlinePlayers.value = playerList
}

function handleRoomCreated(room: Room) {
  rooms.value.push(room)
  appStore.addNotification({
    type: 'success',
    title: 'Room Created',
    message: `Room "${room.name}" has been created`
  })
  router.push(`/room/${room.id}`)
}

function handleRoomJoined(data: { roomId: string, success: boolean, message?: string }) {
  if (data.success) {
    router.push(`/room/${data.roomId}`)
  } else {
    appStore.addNotification({
      type: 'error',
      title: 'Join Failed',
      message: data.message || 'Failed to join room'
    })
  }
}

// Lifecycle
onMounted(async () => {
  // Initialize auth if needed
  if (!authStore.isAuthenticated) {
    await authStore.initializePlayer()
  }

  // Set up WebSocket event listeners
  ws.on('lobby:rooms', handleRoomList)
  ws.on('lobby:players', handlePlayerList)
  ws.on('room:created', handleRoomCreated)
  ws.on('room:joined', handleRoomJoined)

  // Refresh data
  refreshRooms()
  refreshPlayers()

  // Set up periodic refresh
  const refreshInterval = setInterval(() => {
    if (wsStore.isConnected) {
      refreshRooms()
      refreshPlayers()
    }
  }, 5000)

  onUnmounted(() => {
    clearInterval(refreshInterval)
    ws.off('lobby:rooms', handleRoomList)
    ws.off('lobby:players', handlePlayerList)
    ws.off('room:created', handleRoomCreated)
    ws.off('room:joined', handleRoomJoined)
  })
})
</script>

<style scoped>
.lobby-view {
  height: 100vh;
  overflow: auto;
}

.lobby-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
}

.lobby-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--cs-border);
}

.player-info {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.player-name {
  color: var(--cs-primary);
  font-weight: 600;
}

.lobby-content {
  display: grid;
  grid-template-columns: 1fr 300px;
  gap: 2rem;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.room-list {
  display: grid;
  gap: 1rem;
}

.room-card {
  background: #2a2a2a;
  border: 1px solid var(--cs-border);
  border-radius: 8px;
  padding: 1rem;
  cursor: pointer;
  transition: all 0.3s ease;
}

.room-card:hover {
  border-color: var(--cs-primary);
  transform: translateY(-2px);
}

.room-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.room-header h3 {
  margin: 0;
}

.room-status {
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.8rem;
  text-transform: uppercase;
}

.room-status.waiting {
  background: var(--cs-warning);
  color: black;
}

.room-status.playing {
  background: var(--cs-danger);
}

.room-info {
  display: flex;
  gap: 1rem;
  font-size: 0.9rem;
  color: var(--cs-gray);
}

.player-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.player-item {
  display: flex;
  justify-content: space-between;
  padding: 0.5rem;
  background: #2a2a2a;
  border-radius: 4px;
}

.player-item.online {
  border-left: 3px solid var(--cs-success);
}

.connection-status {
  position: fixed;
  bottom: 1rem;
  right: 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: #2a2a2a;
  border-radius: 4px;
  font-size: 0.9rem;
}

.status-indicator {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.connection-status.connected .status-indicator {
  background: var(--cs-success);
}

.connection-status.disconnected .status-indicator {
  background: var(--cs-danger);
}

.connection-status.connecting .status-indicator {
  background: var(--cs-warning);
  animation: pulse 1s infinite;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal {
  background: #2a2a2a;
  border-radius: 8px;
  padding: 2rem;
  min-width: 400px;
}

.form-group {
  margin-bottom: 1rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  color: var(--cs-light);
}

.form-actions {
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
  margin-top: 2rem;
}

.loading {
  display: flex;
  align-items: center;
  gap: 1rem;
  justify-content: center;
  padding: 2rem;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

@media (max-width: 768px) {
  .lobby-content {
    grid-template-columns: 1fr;
  }
  
  .lobby-header {
    flex-direction: column;
    gap: 1rem;
    align-items: flex-start;
  }
}
</style>