import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Player, GameState, GameStatus, Weapon, Position } from '@/types/game'
import { useWebSocket } from '@/services/websocket'
import { useAuthStore } from './auth'

export const useGameStore = defineStore('game', () => {
  // State
  const gameStatus = ref<GameStatus>('idle')
  const gameState = ref<GameState | null>(null)
  const currentRoomId = ref<string | null>(null)
  const players = ref<Map<string, Player>>(new Map())
  const localPlayer = ref<Player | null>(null)
  const spectatingPlayerId = ref<string | null>(null)

  // Game state
  const roundTime = ref(0)
  const roundNumber = ref(0)
  const teamScores = ref({ ct: 0, t: 0 })
  const bombPlanted = ref(false)
  const bombPosition = ref<Position | null>(null)
  const bombTimer = ref(0)

  // Client-side prediction
  const pendingInputs = ref<any[]>([])
  const inputSequence = ref(0)
  // const lastServerUpdate = ref(0) // Unused for now

  // Performance metrics
  const fps = ref(0)
  const ping = ref(0)
  const packetLoss = ref(0)

  // Computed
  const isPlaying = computed(() => gameStatus.value === 'playing')
  const isSpectating = computed(() => gameStatus.value === 'spectating')
  const isAlive = computed(() => localPlayer.value?.health ?? 0 > 0)
  const currentTeam = computed(() => localPlayer.value?.team)
  const alivePlayersCount = computed(() => {
    let count = { ct: 0, t: 0 }
    players.value.forEach((player: Player) => {
      if (player.health > 0) {
        if (player.team === 'terrorist') {
          count.t++
        } else if (player.team === 'counter_terrorist') {
          count.ct++
        }
      }
    })
    return count
  })

  // Actions
  function initializeGame(roomId: string) {
    currentRoomId.value = roomId
    gameStatus.value = 'loading'

    const ws = useWebSocket()
    ws.emit('game:join', { roomId })

    // Setup game event listeners
    setupGameListeners()
  }

  function setupGameListeners() {
    const ws = useWebSocket()

    ws.on('game:state', handleGameStateUpdate)
    ws.on('game:player:spawn', handlePlayerSpawn)
    ws.on('game:player:move', handlePlayerMove)
    ws.on('game:player:shoot', handlePlayerShoot)
    ws.on('game:player:hit', handlePlayerHit)
    ws.on('game:player:death', handlePlayerDeath)
    ws.on('game:round:start', handleRoundStart)
    ws.on('game:round:end', handleRoundEnd)
    ws.on('game:bomb:planted', handleBombPlanted)
    ws.on('game:bomb:defused', handleBombDefused)
    ws.on('game:bomb:exploded', handleBombExploded)
  }

  function handleGameStateUpdate(data: any) {
    // Update players
    if (data.players) {
      data.players.forEach((playerData: Player) => {
        players.value.set(playerData.id, playerData)
      })
    }

    // Update local player
    if (data.localPlayer) {
      const authStore = useAuthStore()
      if (data.localPlayer.id === authStore.playerId) {
        localPlayer.value = data.localPlayer
      }
    }

    // Update game state
    if (data.gameState) {
      gameState.value = data.gameState
    }

    // Update scores
    if (data.scores) {
      teamScores.value = data.scores
    }

    // Server reconciliation
    if (data.lastProcessedInput) {
      reconcileWithServer(data.lastProcessedInput)
    }
  }

  function handlePlayerSpawn(data: any) {
    const player = players.value.get(data.playerId)
    if (player) {
      player.position = data.position
      player.health = 100
      player.armor = data.armor || 0
      player.weapons = data.weapons || []
      player.weapon = data.weapon || player.weapons?.[0]
    }
  }

  function handlePlayerMove(data: any) {
    const player = players.value.get(data.playerId)
    if (player && data.playerId !== localPlayer.value?.id) {
      // Interpolate other players' movement
      interpolatePlayerPosition(player, data.position)
    }
  }

  function handlePlayerShoot(data: any) {
    const player = players.value.get(data.playerId)
    if (player) {
      // Play shooting animation/sound
      // Update ammo count
      if (player.id === localPlayer.value?.id) {
        // Update local ammo immediately
        updateLocalAmmo(data.weapon)
      }
    }
  }

  function handlePlayerHit(data: any) {
    const player = players.value.get(data.playerId)
    if (player) {
      player.health = Math.max(0, player.health - data.damage)

      if (player.id === localPlayer.value?.id) {
        // Show damage indicator
        showDamageIndicator(data.fromDirection)
      }
    }
  }

  function handlePlayerDeath(data: any) {
    const player = players.value.get(data.playerId)
    if (player) {
      player.health = 0
      player.alive = false
      player.isAlive = false

      if (player.id === localPlayer.value?.id) {
        // Switch to spectator mode
        gameStatus.value = 'spectating'
        // Find next player to spectate
        autoSpectate()
      }
    }
  }

  function handleRoundStart(data: any) {
    roundNumber.value = data.roundNumber
    roundTime.value = data.roundTime
    bombPlanted.value = false
    bombPosition.value = null

    // Reset players
    players.value.forEach((player: Player) => {
      player.health = 100
      player.alive = true
      player.isAlive = true
    })
  }

  function handleRoundEnd(data: any) {
    // Update scores
    teamScores.value = data.scores

    // Show round end screen
    gameStatus.value = 'round-end'
  }

  function handleBombPlanted(data: any) {
    bombPlanted.value = true
    bombPosition.value = data.position
    bombTimer.value = 40 // CS2D bomb timer
  }

  function handleBombDefused() {
    bombPlanted.value = false
    bombPosition.value = null
    bombTimer.value = 0
  }

  function handleBombExploded() {
    bombPlanted.value = false

    // Damage nearby players
    if (bombPosition.value) {
      const explosionRadius = 500
      players.value.forEach((player: Player) => {
        const distance = calculateDistance(player.position, bombPosition.value!)
        if (distance < explosionRadius) {
          const damage = Math.floor((1 - distance / explosionRadius) * 200)
          player.health = Math.max(0, player.health - damage)
        }
      })
    }
  }

  // Client-side prediction
  function movePlayer(dx: number, dy: number) {
    if (!localPlayer.value || !isAlive.value) return

    const input = {
      sequence: ++inputSequence.value,
      dx,
      dy,
      timestamp: Date.now()
    }

    // Apply immediately (client-side prediction)
    localPlayer.value.position.x += dx
    localPlayer.value.position.y += dy

    // Save for reconciliation
    pendingInputs.value.push(input)

    // Send to server
    const ws = useWebSocket()
    ws.emit('game:player:move', input)
  }

  function shoot(weapon: Weapon) {
    if (!localPlayer.value || !isAlive.value) return

    const input = {
      sequence: ++inputSequence.value,
      weapon: weapon.id,
      angle: localPlayer.value.angle,
      timestamp: Date.now()
    }

    // Send to server
    const ws = useWebSocket()
    ws.emit('game:player:shoot', input)
  }

  function reconcileWithServer(lastProcessedSequence: number) {
    // Remove acknowledged inputs
    pendingInputs.value = pendingInputs.value.filter(
      (input) => input.sequence > lastProcessedSequence
    )

    // Re-apply unacknowledged inputs
    if (localPlayer.value) {
      const serverPosition = { ...localPlayer.value.position }

      pendingInputs.value.forEach((input) => {
        serverPosition.x += input.dx
        serverPosition.y += input.dy
      })

      // Apply correction if needed
      const diff =
        Math.abs(serverPosition.x - localPlayer.value.position.x) +
        Math.abs(serverPosition.y - localPlayer.value.position.y)

      if (diff > 5) {
        // Tolerance threshold
        localPlayer.value.position = serverPosition
      }
    }
  }

  function interpolatePlayerPosition(player: Player, targetPosition: Position) {
    // Smooth interpolation for other players
    const interpolationRate = 0.2
    player.position.x += (targetPosition.x - player.position.x) * interpolationRate
    player.position.y += (targetPosition.y - player.position.y) * interpolationRate
  }

  function updateLocalAmmo(weaponId: string) {
    if (!localPlayer.value || !localPlayer.value.weapons) return

    const weapon = localPlayer.value.weapons.find((w) => w.id === weaponId)
    if (weapon && weapon.ammo > 0) {
      weapon.ammo--
    }
  }

  function showDamageIndicator(direction: number) {
    // Emit event for UI to show damage indicator
    window.dispatchEvent(new CustomEvent('damage-indicator', { detail: { direction } }))
  }

  function autoSpectate() {
    // Find first alive player to spectate
    const alivePlayer = Array.from(players.value.values()).find((p: Player) => p.alive || p.isAlive)
    if (alivePlayer) {
      spectatingPlayerId.value = alivePlayer.id
    }
  }

  function calculateDistance(pos1: Position, pos2: Position): number {
    const dx = pos1.x - pos2.x
    const dy = pos1.y - pos2.y
    return Math.sqrt(dx * dx + dy * dy)
  }

  function leaveGame() {
    const ws = useWebSocket()
    ws.emit('game:leave', { roomId: currentRoomId.value })

    // Reset state
    gameStatus.value = 'idle'
    currentRoomId.value = null
    players.value.clear()
    localPlayer.value = null
    pendingInputs.value = []
    inputSequence.value = 0
  }

  // Performance monitoring
  function updatePerformanceMetrics(metrics: { fps: number; ping: number; packetLoss: number }) {
    fps.value = metrics.fps
    ping.value = metrics.ping
    packetLoss.value = metrics.packetLoss
  }

  return {
    // State
    gameStatus,
    gameState,
    currentRoomId,
    players,
    localPlayer,
    spectatingPlayerId,
    roundTime,
    roundNumber,
    teamScores,
    bombPlanted,
    bombPosition,
    bombTimer,
    fps,
    ping,
    packetLoss,

    // Computed
    isPlaying,
    isSpectating,
    isAlive,
    currentTeam,
    alivePlayersCount,

    // Actions
    initializeGame,
    movePlayer,
    shoot,
    leaveGame,
    updatePerformanceMetrics
  }
})
