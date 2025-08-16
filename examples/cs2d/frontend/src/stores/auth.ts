import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Player } from '@/types/game'

export interface AuthState {
  player: Player | null
  token: string | null
  isAuthenticated: boolean
  isGuest: boolean
}

export const useAuthStore = defineStore('auth', () => {
  // State
  const player = ref<Player | null>(null)
  const token = ref<string | null>(null)
  const isGuest = ref(false)

  // Getters
  const isAuthenticated = computed(() => {
    return player.value !== null
  })

  const playerName = computed(() => {
    return player.value?.name || 'Anonymous'
  })

  const playerId = computed(() => {
    return player.value?.id || null
  })

  // Actions
  function initializePlayer(name?: string): Promise<void> {
    return new Promise((resolve) => {
      // Generate a temporary player for guest access
      const guestPlayer: Player = {
        id: `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: name || `Guest${Math.floor(Math.random() * 1000)}`,
        team: 'spectator',
        position: { x: 0, y: 0 },
        health: 100,
        armor: 0,
        money: 800,
        weapon: {
          id: 'knife',
          name: 'Knife',
          type: 'knife',
          ammo: 0,
          maxAmmo: 0,
          clipSize: 0,
          damage: 50,
          range: 1,
          accuracy: 1,
          fireRate: 1,
          reloadTime: 0,
          price: 0,
          killReward: 0
        },
        alive: true,
        kills: 0,
        deaths: 0,
        assists: 0,
        ping: 0,
        ready: false
      }

      player.value = guestPlayer
      isGuest.value = true

      // Save to localStorage for persistence
      localStorage.setItem('cs2d_player', JSON.stringify(guestPlayer))
      localStorage.setItem('cs2d_is_guest', 'true')

      resolve()
    })
  }

  function loadPlayerFromStorage(): void {
    try {
      const savedPlayer = localStorage.getItem('cs2d_player')
      const savedIsGuest = localStorage.getItem('cs2d_is_guest')

      if (savedPlayer) {
        player.value = JSON.parse(savedPlayer)
        isGuest.value = savedIsGuest === 'true'
      }
    } catch (error) {
      console.error('Failed to load player from storage:', error)
    }
  }

  function updatePlayer(updates: Partial<Player>): void {
    if (player.value) {
      player.value = { ...player.value, ...updates }

      // Save to localStorage
      localStorage.setItem('cs2d_player', JSON.stringify(player.value))
    }
  }

  function setPlayerName(name: string): void {
    if (player.value) {
      updatePlayer({ name })
    }
  }

  function setPlayerTeam(team: 'terrorist' | 'counter_terrorist' | 'spectator'): void {
    if (player.value) {
      updatePlayer({ team })
    }
  }

  function setPlayerReady(ready: boolean): void {
    if (player.value) {
      updatePlayer({ ready })
    }
  }

  function logout(): void {
    player.value = null
    token.value = null
    isGuest.value = false

    // Clear localStorage
    localStorage.removeItem('cs2d_player')
    localStorage.removeItem('cs2d_token')
    localStorage.removeItem('cs2d_is_guest')
  }

  function reset(): void {
    logout()
  }

  // Initialize on store creation
  loadPlayerFromStorage()

  return {
    // State
    player,
    token,
    isGuest,

    // Getters
    isAuthenticated,
    playerName,
    playerId,

    // Actions
    initializePlayer,
    loadPlayerFromStorage,
    updatePlayer,
    setPlayerName,
    setPlayerTeam,
    setPlayerReady,
    logout,
    reset
  }
})
