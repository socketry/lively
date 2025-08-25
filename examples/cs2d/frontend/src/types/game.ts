// Game Types for CS2D Frontend

// Game Status - different from GameState
export type GameStatus = 'idle' | 'loading' | 'playing' | 'spectating' | 'round-end' | 'game-over'

export interface Player {
  id: string
  name: string
  team: 'terrorist' | 'counter_terrorist' | 'spectator'
  position: Position
  health: number
  armor: number
  money: number
  weapon: Weapon
  weapons?: Weapon[] // Array of weapons in inventory
  alive: boolean
  isAlive?: boolean // Alternative property name
  kills: number
  deaths: number
  assists: number
  ping: number
  ready: boolean
  angle?: number // Player view angle
  velocity?: Velocity // Player movement velocity
}

export interface Position {
  x: number
  y: number
}

export interface Velocity {
  x: number
  y: number
}

export interface GameState {
  phase: 'warmup' | 'freeze_time' | 'round_active' | 'round_end' | 'game_over'
  roundTime: number
  freezeTime: number
  players: Record<string, Player>
  spectators: Record<string, Player>
  score: Score
  map: GameMap
  bombs: Bomb[]
  items: Item[]
  projectiles: Projectile[]
  round: RoundInfo
}

export interface Score {
  terrorists: number
  counterTerrorists: number
  round: number
  maxRounds: number
}

export interface Weapon {
  id: string
  name: string
  type: 'pistol' | 'rifle' | 'sniper' | 'shotgun' | 'smg' | 'grenade' | 'knife'
  ammo: number
  maxAmmo: number
  clipSize: number
  damage: number
  range: number
  accuracy: number
  fireRate: number
  reloadTime: number
  price: number
  killReward: number
}

export interface GameMap {
  name: string
  width: number
  height: number
  tileSize: number
  tiles: number[][]
  spawnPoints: {
    terrorists: Position[]
    counterTerrorists: Position[]
  }
  buyZones: {
    terrorists: Area[]
    counterTerrorists: Area[]
  }
  bombSites: {
    a: Area
    b: Area
  }
}

export interface Area {
  x: number
  y: number
  width: number
  height: number
}

export interface Bomb {
  id: string
  position: Position
  planted: boolean
  plantTime: number
  timer: number
  defusing: boolean
  defuser?: string
  site: 'a' | 'b'
}

export interface Item {
  id: string
  type: 'weapon' | 'armor' | 'grenade' | 'health'
  position: Position
  weapon?: Weapon
  amount?: number
}

export interface Projectile {
  id: string
  type: 'bullet' | 'grenade' | 'smoke' | 'flash'
  position: Position
  velocity: Velocity
  damage: number
  owner: string
  lifetime: number
}

export interface RoundInfo {
  number: number
  startTime: number
  endTime?: number
  winner?: 'terrorists' | 'counter_terrorists'
  reason?: 'elimination' | 'bomb_exploded' | 'bomb_defused' | 'time_limit'
  mvp?: string
}

// Input and Movement
export interface PlayerInput {
  sequence: number
  timestamp: number
  keys: {
    up: boolean
    down: boolean
    left: boolean
    right: boolean
    shoot: boolean
    reload: boolean
    use: boolean
  }
  mousePosition: Position
  direction: number
}

// Simplified input for basic movement commands
export interface SimplePlayerInput {
  sequence: number
  timestamp: number
  dx?: number
  dy?: number
  weapon?: string
  angle?: number
}

export interface MovementState {
  position: Position
  velocity: Velocity
  direction: number
  moving: boolean
  running: boolean
  crouching: boolean
}

// Buy Menu
export interface WeaponCategory {
  id: string
  name: string
  weapons: Weapon[]
}

export interface BuyMenuState {
  open: boolean
  category: string | null
  money: number
  canBuy: boolean
}

// Game Statistics
export interface PlayerStats {
  kills: number
  deaths: number
  assists: number
  damage: number
  headshots: number
  accuracy: number
  kdr: number
  score: number
  mvpRounds: number
}

export interface GameStats {
  duration: number
  totalRounds: number
  players: Record<string, PlayerStats>
  winner: 'terrorists' | 'counter_terrorists' | null
  mvp: string | null
}

// Room and Lobby
export interface Room {
  id: string
  name: string
  map: string
  gameMode: 'classic' | 'deathmatch' | 'gungame'
  players: Player[]
  maxPlayers: number
  hasPassword: boolean
  status: 'waiting' | 'starting' | 'playing' | 'finished'
  settings: RoomSettings
  host: string
  // Computed properties for room state
  isHost?: boolean
  allReady?: boolean
}

export interface RoomSettings {
  maxPlayers: number
  timeLimit: number
  fragLimit: number
  friendlyFire: boolean
  autoBalance: boolean
  restartRounds: number
  buyTime: number
  freezeTime: number
  roundTime: number
  c4Timer: number
}

// Notifications and UI
export interface GameNotification {
  id: string
  type: 'info' | 'warning' | 'error' | 'success'
  title: string
  message: string
  duration?: number
  timestamp: number
}

export interface HudElement {
  health: number
  armor: number
  money: number
  ammo: number
  weapon: Weapon | null
  grenades: string[]
  time: number
  score: Score
}

// Audio and Effects
export interface SoundEffect {
  id: string
  name: string
  volume: number
  position?: Position
  loop?: boolean
}

export interface VisualEffect {
  id: string
  type: 'explosion' | 'muzzle_flash' | 'blood' | 'smoke' | 'spark'
  position: Position
  duration: number
  scale?: number
}
