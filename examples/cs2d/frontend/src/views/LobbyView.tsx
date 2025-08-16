import { cn } from '@/utils/tailwind';
import React from 'react';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNavigate } from "react-router-dom"
import { useAuthStore } from '@/stores/auth'
import { useWebSocketStore } from '@/stores/websocket'
import { useAppStore } from '@/stores/app'
import { useWebSocket } from '@/services/websocket'
import type { Room } from '@/types/game'

interface LobbyViewProps {
  // TODO: Define props from Vue component
}

export const LobbyView: React.FC<LobbyViewProps> = (props) => {
  const navigate = useNavigate();
  
  

const navigate = useNavigate()
const authStore = useAuth()
const wsStore = useWebSocket()
const appStore = useApp()
const ws = useWebSocket()

// State
const [loading, set${this.capitalize("loading")}] = useState(true)
const rooms = ref<Room[]>([])
const onlinePlayers = ref<any[]>([])
const [showCreateModal, set${this.capitalize("showCreateModal")}] = useState(false)
const [createForm, set${this.capitalize("createForm")}] = useState({
  name: '',
  map: 'de_dust2_simple',
  maxPlayers: 16,
  gameMode: 'classic'
})

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
  navigate(`/room/${roomId}`)
}

function openSettings() {
  navigate('/settings')
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
  navigate(`/room/${room.id}`)
}

function handleRoomJoined(data: { roomId: string, success: boolean, message?: string }) {
  if (data.success) {
    navigate(`/room/${data.roomId}`)
  } else {
    appStore.addNotification({
      type: 'error',
      title: 'Join Failed',
      message: data.message || 'Failed to join room'
    })
  }
}

// Lifecycle
useEffect(async (, []) => {
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

  useEffect(() => { return () => {
    clearInterval(refreshInterval)
    ws.off('lobby:rooms', handleRoomList)
    ws.off('lobby:players', handlePlayerList)
    ws.off('room:created', handleRoomCreated)
    ws.off('room:joined', handleRoomJoined)
  }; }, [])
})

  return (
    <div className="container mx-auto px-4">
      <div className="lobby-view">
    <div className="lobby-container">
      <header className="lobby-header">
        <h1>{$t('lobby.title') }</h1>)}
        <div className="player-info">
          <span className="player-name">{authStore.playerName }</span>)}
          <button onClick={openSettings} className="btn btn-secondary hover:scale-105 active:scale-95 transition-transform">Settings</button>)}
        </div>
      </header>)}

      <div className="lobby-content">
        <!-- Room List -->
        <div className="room-section">
          <div className="section-header">
            <h2>Active Rooms</h2>)}
            <button onClick={createRoom} className="btn btn-primary hover:scale-105 active:scale-95 transition-transform">
              {$t('lobby.createRoom') }
            </button>)}
          </div>

          <div {loading && ( className="loading">
            <div className="spinner"></div>
            Loading rooms...
          </div>)}

          <div )} {( className="room-list">
            <div
              {rooms.map((room, index) => (
              key={room.id}
              className="room-card hover:shadow-lg transition-shadow"
              onClick={joinRoom(room.id)}
            >
              <div className="room-header">
                <h3>{room.name }</h3>)}
                <span className="room-status" className={room.status}>{room.status }</span>)}
              </div>
              <div className="room-info">
                <span className="room-map">{room.map }</span>)}
                <span className="room-players">{room.players.length }/{room.maxPlayers }</span>)}
                <span className="room-mode">{room.gameMode }</span>)}
              </div>
            </div>)}
          </div>
        </div>

        <!-- Player List -->
        <div className="players-section">
          <h2>{$t('lobby.players') }</h2>)}
          <div className="player-list">
            <div
              {onlinePlayers.map((player, index) => (
              key={player.id}
              className="player-item"
              className={{ online: player.online }}
            >
              <span className="player-name">{player.name }</span>)}
              <span className="player-status">{player.status }</span>)}
            </div>
          </div>)}
        </div>
      </div>

      <!-- Connection Status -->
      <div className="connection-status" className={wsStore.connectionStatus.status}>
        <div className="status-indicator"></div>)}
        <span>{connectionStatusText }</span>)}
        <span {wsStore.latency && ( className="latency">{wsStore.latency }ms</span>)}
      </div>
    </div>

    <!-- Create Room Modal -->
    <div {showCreateModal && ( className="modal-overlay" onClick={closeCreateModal}>
      <div className="modal" @click.stop>
        <h2>Create Room</h2>)}
        <form onSubmit={(e) => { e.preventDefault(); submitCreateRoom(e); }}>
          <div className="form-group">
            <label>Room Name</label>)}
            <input value={createForm.name} onChange={(e) => set${this.capitalize("createForm.name")}(e.target.value)} type="text" className="focus:ring-2 focus:ring-cs-primary focus:outline-none" required className="input" />
          </div>)}
          <div className="form-group">
            <label>Map</label>)}
            <select value={createForm.map} onChange={(e) => set${this.capitalize("createForm.map")}(e.target.value)} className="input">
              <option value="de_dust2_simple">Dust2</option>)}
              <option value="de_inferno_simple">Inferno</option>)}
              <option value="aim_map">Aim Map</option>)}
              <option value="fy_iceworld">Iceworld</option>)}
            </select>
          </div>)}
          <div className="form-group">
            <label>Max Players</label>)}
            <select value={createForm.maxPlayers} onChange={(e) => set${this.capitalize("createForm.maxPlayers")}(e.target.value)} className="input">
              <option value="8">8</option>)}
              <option value="16">16</option>)}
              <option value="32">32</option>)}
            </select>
          </div>)}
          <div className="form-group">
            <label>Game Mode</label>)}
            <select value={createForm.gameMode} onChange={(e) => set${this.capitalize("createForm.gameMode")}(e.target.value)} className="input">
              <option value="classic">Classic</option>)}
              <option value="deathmatch">Deathmatch</option>)}
              <option value="gungame">Gun Game</option>)}
            </select>
          </div>)}
          <div className="form-actions">
            <button type="button" onClick={closeCreateModal} className="btn btn-secondary hover:scale-105 active:scale-95 transition-transform">Cancel</button>)}
            <button type="submit" className="btn btn-primary hover:scale-105 active:scale-95 transition-transform">Create</button>)}
          </div>
        </form>)}
      </div>
    </div>)}
  </div>
    </div>
  );
};

export default LobbyView;