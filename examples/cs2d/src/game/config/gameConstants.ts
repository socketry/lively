/**
 * CS2D Game Constants Configuration
 * Centralized configuration for all game constants to improve maintainability
 */

export const GAME_CONSTANTS = {
  // Game Loop & Performance
  PERFORMANCE: {
    TARGET_FPS: 121,
    MAX_DELTA_TIME: 50, // ms - prevent physics explosions
    PHYSICS_SUBSTEPS: 1,
  },
  
  // Round System
  ROUND: {
    DEFAULT_ROUND_TIME: 115, // seconds - CS 1.6 standard is 175s
    FREEZE_TIME: 15, // seconds - time before round starts
    BOMB_TIMER: 40, // seconds - CS 1.6 standard is 45s
    MAX_ROUNDS: 30, // Competitive match max rounds
    HALF_TIME_ROUND: 15, // Switch sides at round 15
    ROUND_END_DELAY: 5, // seconds - delay after round ends
  },
  
  // Player Movement & Physics
  MOVEMENT: {
    BASE_SPEED: 200, // units per second
    WALK_SPEED_MULTIPLIER: 0.5, // 50% speed when walking
    DUCK_SPEED_MULTIPLIER: 0.25, // 25% speed when ducking
    SPRINT_SPEED_MULTIPLIER: 1.2, // 120% speed when sprinting
    ACCELERATION: 800, // units per second squared
    FRICTION: 0.85, // velocity dampening
    AIR_FRICTION: 0.98, // less friction in air
    JUMP_FORCE: 350, // initial jump velocity
    GRAVITY: 980, // units per second squared
  },
  
  // Player Stats
  PLAYER: {
    MAX_HEALTH: 100,
    MAX_ARMOR: 100,
    SPAWN_HEALTH: 100,
    SPAWN_ARMOR: 0,
    SPAWN_MONEY: 800, // Starting money
    MAX_MONEY: 16000, // CS 1.6 max money
    RESPAWN_TIME: 0, // Instant respawn in deathmatch modes
  },
  
  // Combat & Damage
  COMBAT: {
    HEADSHOT_MULTIPLIER: 4.0, // 4x damage for headshots
    ARMOR_DAMAGE_REDUCTION: 0.5, // 50% damage reduction with armor
    FALL_DAMAGE_THRESHOLD: 300, // velocity threshold for fall damage
    FALL_DAMAGE_MULTIPLIER: 0.1, // damage per unit over threshold
    FRIENDLY_FIRE_ENABLED: false, // Team damage
  },
  
  // Weapon System
  WEAPONS: {
    SWITCH_TIME: 0.5, // seconds to switch weapons
    RELOAD_TIME_MULTIPLIER: 1.0, // adjust all reload times
    RECOIL_RECOVERY_RATE: 0.1, // per frame
    BULLET_PENETRATION_LOSS: 0.5, // damage reduction through walls
    MAX_BULLET_PENETRATIONS: 2, // maximum wall penetrations
  },
  
  // Economy System
  ECONOMY: {
    KILL_REWARD: 300, // Money per kill
    HEADSHOT_BONUS: 100, // Extra money for headshot
    TEAM_KILL_PENALTY: -300, // Money lost for team kill
    ROUND_WIN_REWARD: 3250, // Money for winning round
    ROUND_LOSS_REWARD: 1400, // Money for losing round
    CONSECUTIVE_LOSS_BONUS: 500, // Extra per consecutive loss (max 5)
    BOMB_PLANT_REWARD: 300, // Money for planting bomb
    BOMB_DEFUSE_REWARD: 300, // Money for defusing bomb
    HOSTAGE_RESCUE_REWARD: 1000, // Money per hostage rescued
  },
  
  // Bot AI Configuration
  BOT_AI: {
    EASY: {
      AIM_ACCURACY: 0.3, // 30% accuracy
      REACTION_TIME: 1000, // 1 second reaction
      DECISION_DELAY: 500, // ms between decisions
      VIEW_DISTANCE: 500, // units
      HEARING_DISTANCE: 300, // units
    },
    NORMAL: {
      AIM_ACCURACY: 0.5, // 50% accuracy
      REACTION_TIME: 500, // 0.5 second reaction
      DECISION_DELAY: 300, // ms between decisions
      VIEW_DISTANCE: 800, // units
      HEARING_DISTANCE: 500, // units
    },
    HARD: {
      AIM_ACCURACY: 0.7, // 70% accuracy
      REACTION_TIME: 250, // 0.25 second reaction
      DECISION_DELAY: 200, // ms between decisions
      VIEW_DISTANCE: 1000, // units
      HEARING_DISTANCE: 700, // units
    },
    EXPERT: {
      AIM_ACCURACY: 0.9, // 90% accuracy
      REACTION_TIME: 100, // 0.1 second reaction
      DECISION_DELAY: 100, // ms between decisions
      VIEW_DISTANCE: 1500, // units
      HEARING_DISTANCE: 1000, // units
    },
  },
  
  // Audio System
  AUDIO: {
    MAX_CONCURRENT_SOUNDS: 32, // Maximum sounds playing at once
    SOUND_CACHE_SIZE: 100, // Maximum cached sounds
    POSITIONAL_AUDIO_RANGE: 2000, // Maximum hearing distance
    VOLUME_FALLOFF_START: 500, // Distance where volume starts decreasing
    VOICE_COOLDOWN: 2000, // ms between bot voice lines
    FOOTSTEP_INTERVAL: 300, // ms between footstep sounds
  },
  
  // Collision Detection
  COLLISION: {
    PLAYER_RADIUS: 16, // Player collision radius
    BULLET_RADIUS: 2, // Bullet collision radius
    HEADSHOT_HEIGHT_RATIO: 0.8, // Top 20% of player is head
    WALL_THICKNESS: 10, // Default wall thickness
    SPATIAL_GRID_SIZE: 100, // Size of spatial grid cells
  },
  
  // Rendering & Visual
  RENDERING: {
    PLAYER_SPRITE_SIZE: 40, // Player sprite canvas size
    HEALTH_BAR_WIDTH: 24, // Health bar width in pixels
    HEALTH_BAR_HEIGHT: 3, // Health bar height in pixels
    DEAD_PLAYER_OPACITY: 0.5, // Opacity for dead players
    MUZZLE_FLASH_DURATION: 100, // ms
    BLOOD_PARTICLE_COUNT: 10, // Particles per hit
    SPARK_PARTICLE_COUNT: 5, // Particles per wall hit
    PARTICLE_LIFETIME: 1000, // ms
    MAX_PARTICLES: 1000, // Maximum particles on screen
  },
  
  // Network & Multiplayer
  NETWORK: {
    TICK_RATE: 64, // Server updates per second
    INTERPOLATION_DELAY: 100, // ms - lag compensation
    MAX_PACKET_SIZE: 1400, // bytes - MTU safe
    HEARTBEAT_INTERVAL: 5000, // ms - keep connection alive
    TIMEOUT_DURATION: 30000, // ms - disconnect after timeout
    MAX_RECONNECT_ATTEMPTS: 5, // Maximum reconnection attempts
    RECONNECT_DELAY: 2000, // ms - base delay (exponential backoff)
  },
  
  // Map System
  MAP: {
    DEFAULT_MAP: 'de_dust2',
    GRID_SIZE: 32, // Size of map grid cells
    MAX_MAP_WIDTH: 4096, // Maximum map width
    MAX_MAP_HEIGHT: 4096, // Maximum map height
    SPAWN_PROTECTION_TIME: 2000, // ms - spawn protection
    SPAWN_SEPARATION_DISTANCE: 100, // Minimum distance between spawns
  },
  
  // UI & HUD
  UI: {
    CHAT_MESSAGE_LIMIT: 100, // Maximum chat messages to keep
    CHAT_MESSAGE_TIMEOUT: 30000, // ms - chat message display time
    KILLFEED_LIMIT: 5, // Maximum killfeed entries
    KILLFEED_DURATION: 5000, // ms - killfeed entry display time
    CROSSHAIR_SIZE: 20, // Crosshair size in pixels
    MINIMAP_SIZE: 200, // Minimap size in pixels
  },
  
  // Validation Ranges (for runtime checks)
  VALIDATION: {
    MIN_ROUND_TIME: 30, // Minimum allowed round time
    MAX_ROUND_TIME: 600, // Maximum allowed round time (10 minutes)
    MIN_BOMB_TIMER: 10, // Minimum bomb timer
    MAX_BOMB_TIMER: 120, // Maximum bomb timer
    MIN_FREEZE_TIME: 0, // Minimum freeze time
    MAX_FREEZE_TIME: 60, // Maximum freeze time
    MIN_PLAYER_SPEED: 50, // Minimum player speed
    MAX_PLAYER_SPEED: 500, // Maximum player speed
  },
} as const;

// Type-safe getter with validation
export function getConstant<T extends keyof typeof GAME_CONSTANTS>(
  category: T,
  key: keyof typeof GAME_CONSTANTS[T]
): typeof GAME_CONSTANTS[T][keyof typeof GAME_CONSTANTS[T]] {
  return GAME_CONSTANTS[category][key];
}

// Validate configuration at runtime
export function validateConfiguration(): string[] {
  const errors: string[] = [];
  
  // Validate round times
  if (GAME_CONSTANTS.ROUND.DEFAULT_ROUND_TIME < GAME_CONSTANTS.VALIDATION.MIN_ROUND_TIME ||
      GAME_CONSTANTS.ROUND.DEFAULT_ROUND_TIME > GAME_CONSTANTS.VALIDATION.MAX_ROUND_TIME) {
    errors.push(`Round time ${GAME_CONSTANTS.ROUND.DEFAULT_ROUND_TIME} is out of valid range`);
  }
  
  if (GAME_CONSTANTS.ROUND.BOMB_TIMER < GAME_CONSTANTS.VALIDATION.MIN_BOMB_TIMER ||
      GAME_CONSTANTS.ROUND.BOMB_TIMER > GAME_CONSTANTS.VALIDATION.MAX_BOMB_TIMER) {
    errors.push(`Bomb timer ${GAME_CONSTANTS.ROUND.BOMB_TIMER} is out of valid range`);
  }
  
  if (GAME_CONSTANTS.ROUND.FREEZE_TIME < GAME_CONSTANTS.VALIDATION.MIN_FREEZE_TIME ||
      GAME_CONSTANTS.ROUND.FREEZE_TIME > GAME_CONSTANTS.VALIDATION.MAX_FREEZE_TIME) {
    errors.push(`Freeze time ${GAME_CONSTANTS.ROUND.FREEZE_TIME} is out of valid range`);
  }
  
  // Validate movement speeds
  if (GAME_CONSTANTS.MOVEMENT.BASE_SPEED < GAME_CONSTANTS.VALIDATION.MIN_PLAYER_SPEED ||
      GAME_CONSTANTS.MOVEMENT.BASE_SPEED > GAME_CONSTANTS.VALIDATION.MAX_PLAYER_SPEED) {
    errors.push(`Base speed ${GAME_CONSTANTS.MOVEMENT.BASE_SPEED} is out of valid range`);
  }
  
  return errors;
}

// Export for use in tests
export default GAME_CONSTANTS;