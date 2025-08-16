import React from 'react';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useWebSocketStore } from '@/stores/websocket'
import { useAppStore } from '@/stores/app'
import { useWebSocket } from '@/services/websocket'
import type { Room, Player } from '@/types/game'
import styles from './RoomView.module.css';

interface RoomViewProps {
  // TODO: Define props from Vue component
}

export const RoomView: React.FC<RoomViewProps> = (props) => {
  const navigate = useNavigate();
  
  

const route = useRoute()
const navigate = useNavigate()
const authStore = useAuth()
const wsStore = useWebSocket()
const appStore = useApp()
const ws = useWebSocket()

// State
const room = ref<Room | null>(null)
const chatMessages = ref<any[]>([])
const [chatInput, set${this.capitalize("chatInput")}] = useState('')
const [countdown, set${this.capitalize("countdown")}] = useState(0)
const chatContainer = ref<HTMLElement>()

// Computed
const roomId = useMemo(() => route.params.roomId as string, [])
const isHost = useMemo(() => room.value?.host === authStore.playerId, [])

const terroristPlayers = useMemo(() => 
  room.value?.players.filter(p => p.team === 'terrorist', []) || []
)

const counterTerroristPlayers = useMemo(() => 
  room.value?.players.filter(p => p.team === 'counter_terrorist', []) || []
)

const spectatorPlayers = useMemo(() => 
  room.value?.players.filter(p => p.team === 'spectator', []) || []
)

const canStartGame = useMemo(() => {
  if (!room.value || !isHost.value) return false
  const readyPlayers = room.value.players.filter(p => p.ready && p.team !== 'spectator')
  return readyPlayers.length >= 2
}, [])

// Methods
function leaveRoom() {
  ws.emit('room:leave', { roomId: roomId.value })
  navigate('/lobby')
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
    navigate(`/game/${roomId.value}`)
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
useEffect(() => {
  // Join the room
  ws.emit('room:join', { roomId: roomId.value }, [])

  // Set up event listeners
  ws.on('room:updated', handleRoomUpdate)
  ws.on('chat:message', handleChatMessage)
  ws.on('room:game_starting', handleGameStarting)
  ws.on('room:player_joined', handlePlayerJoined)
  ws.on('room:player_left', handlePlayerLeft)

  useEffect(() => { return () => {
    ws.off('room:updated', handleRoomUpdate)
    ws.off('chat:message', handleChatMessage)
    ws.off('room:game_starting', handleGameStarting)
    ws.off('room:player_joined', handlePlayerJoined)
    ws.off('room:player_left', handlePlayerLeft)
  }; }, [])
})

  return (
    <div className={styles.container}>
      <div className="room-view">
    <div className="room-container">
      <header className="room-header">
        <button onClick={leaveRoom} className="btn btn-secondary">← Back to Lobby</button>)}
        <h1>{room?.name || 'Room' }</h1>)}
        <div className="room-info">
          <span className="room-map">{room?.map }</span>)}
          <span className="room-mode">{room?.gameMode }</span>)}
        </div>
      </header>)}

      <div className="room-content">
        <!-- Players Section -->
        <div className="players-section">
          <div className="team" {room && (>
            <h3>Terrorists ({terroristPlayers.length })</h3>)}
            <div className="player-list">
              <div
                {terroristPlayers.map((player, index) => (
                key={player.id}
                className="player-item"
                className={{ ready: player.ready, host: player.id === room.host }}
              >
                <span className="player-name">{player.name }</span>)}
                <span className="player-status">
                  <span {player.id === room.host && ( className="host-badge">HOST</span>)}
                  <span {player.ready && ( className="ready-badge">READY</span>)}
                </span>
              </div>)}
            </div>
            <button 
              {authStore.player?.team !== 'terrorist' && (
              onClick={joinTeam('terrorist')}
              className="btn btn-primary team-join"
            >
              Join Terrorists
            </button>)}
          </div>

          <div className="team" {room && (>
            <h3>Counter-Terrorists ({counterTerroristPlayers.length })</h3>)}
            <div className="player-list">
              <div
                {counterTerroristPlayers.map((player, index) => (
                key={player.id}
                className="player-item"
                className={{ ready: player.ready, host: player.id === room.host }}
              >
                <span className="player-name">{player.name }</span>)}
                <span className="player-status">
                  <span {player.id === room.host && ( className="host-badge">HOST</span>)}
                  <span {player.ready && ( className="ready-badge">READY</span>)}
                </span>
              </div>)}
            </div>
            <button 
              {authStore.player?.team !== 'counter_terrorist' && (
              onClick={joinTeam('counter_terrorist')}
              className="btn btn-primary team-join"
            >
              Join Counter-Terrorists
            </button>)}
          </div>

          <div className="team">
            <h3>Spectators ({spectatorPlayers.length })</h3>)}
            <div className="player-list">
              <div
                {spectatorPlayers.map((player, index) => (
                key={player.id}
                className="player-item"
                className={{ ready: player.ready }}
              >
                <span className="player-name">{player.name }</span>)}
                <span className="player-status">
                  <span {player.ready && ( className="ready-badge">READY</span>)}
                </span>
              </div>)}
            </div>
            <button 
              {authStore.player?.team !== 'spectator' && (
              onClick={joinTeam('spectator')}
              className="btn btn-secondary team-join"
            >
              Spectate
            </button>)}
          </div>
        </div>

        <!-- Chat Section -->
        <div className="chat-section">
          <h3>Chat</h3>)}
          <div className="chat-messages" ref="chatContainer">
            <div
              {chatMessages.map((message, index) => (
              key={message.id}
              className="chat-message"
              className={message.type}
            >
              <span className="message-time">{formatTime(message.timestamp) }</span>)}
              <span className="message-author">{message.author }:</span>)}
              <span className="message-text">{message.text }</span>)}
            </div>
          </div>)}
          <form onSubmit={(e) => { e.preventDefault(); sendMessage(e); }} className="chat-input">
            <input
              value={chatInput} onChange={(e) => set${this.capitalize("chatInput")}(e.target.value)}
              type="text"
              placeholder="Type a message..."
              className="input"
              maxlength="200"
            />
            <button type="submit" className="btn btn-primary">Send</button>)}
          </form>
        </div>)}
      </div>

      <!-- Room Controls -->
      <div className="room-controls">
        <div className="control-group">
          <button
            onClick={toggleReady}
            className="btn"
            className={authStore.player?.ready ? 'btn-warning' : 'btn-success'}
          >
            {authStore.player?.ready ? 'Not Ready' : 'Ready' }
          </button>)}
        </div>

        <div className="control-group" {isHost && (>
          <button
            onClick={startGame}
            className="btn btn-primary"
            :disabled="!canStartGame"
          >
            Start Game
          </button>)}
          <button onClick={openSettings} className="btn btn-secondary">
            Room Settings
          </button>)}
        </div>

        <div className="game-status">
          <span {room?.status === 'waiting' && ( className="status waiting">
            Waiting for players...
          </span>)}
          <span )} {room?.status === 'starting' && ( className="status starting">
            Game starting in {countdown }...
          </span>)}
          <span )} {room?.status === 'playing' && ( className="status playing">
            Game in progress
          </span>)}
        </div>
      </div>)}
    </div>
  </div>)}
    </div>
  );
};

export default RoomView;