// WebSocket Types for CS2D Frontend

export interface WebSocketMessage {
  type: string
  data?: any
  timestamp?: number
  id?: string
}

export interface WebSocketEvent {
  event: string
  data?: any
  timestamp: number
}

export interface ConnectionStatus {
  status: 'connected' | 'disconnected' | 'connecting' | 'error' | 'offline' | 'failed'
  lastConnected?: Date
  reconnectAttempts: number
  latency?: number
}

// Room Events
export interface RoomCreateEvent {
  name: string
  map: string
  maxPlayers: number
  password?: string
  gameMode: 'classic' | 'deathmatch' | 'gungame'
}

export interface RoomJoinEvent {
  roomId: string
  password?: string
}

export interface RoomUpdateEvent {
  roomId: string
  players: Player[]
  gameState: 'waiting' | 'starting' | 'playing' | 'finished'
  map: string
  settings: RoomSettings
}

// Game Events
export interface PlayerMoveEvent {
  playerId: string
  position: Position
  direction: number
  velocity: Velocity
  timestamp: number
  sequence: number
}

export interface PlayerShootEvent {
  playerId: string
  weapon: string
  position: Position
  direction: number
  timestamp: number
}

export interface GameStateUpdateEvent {
  players: Record<string, Player>
  projectiles: Projectile[]
  gameTime: number
  roundTime: number
  score: Score
  bombs: Bomb[]
  timestamp: number
}

// Chat Events
export interface ChatMessageEvent {
  playerId: string
  message: string
  timestamp: number
  type: 'all' | 'team' | 'system'
}

// Supporting Types
export interface Player {
  id: string
  name: string
  team: 'terrorist' | 'counter_terrorist' | 'spectator'
  position: Position
  health: number
  armor: number
  money: number
  weapon: Weapon
  alive: boolean
  kills: number
  deaths: number
}

export interface Position {
  x: number
  y: number
}

export interface Velocity {
  x: number
  y: number
}

export interface Weapon {
  id: string
  name: string
  ammo: number
  maxAmmo: number
  damage: number
  range: number
  fireRate: number
}

export interface Projectile {
  id: string
  position: Position
  velocity: Velocity
  type: string
  damage: number
  owner: string
}

export interface Score {
  terrorists: number
  counterTerrorists: number
  round: number
  maxRounds: number
}

export interface Bomb {
  id: string
  position: Position
  planted: boolean
  timer: number
  defusing: boolean
  defuser?: string
}

export interface RoomSettings {
  maxPlayers: number
  timeLimit: number
  fragLimit: number
  friendly_fire: boolean
  auto_balance: boolean
  restart_rounds: number
}
