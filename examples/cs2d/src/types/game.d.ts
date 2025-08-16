/**
 * CS2D Game Type Definitions
 * Strict TypeScript types with no 'any' allowed
 */

// Tile System Types
export interface TilePosition {
  readonly x: number;
  readonly y: number;
}

export interface TileData {
  readonly type: TileType;
  readonly walkable: boolean;
  readonly destructible: boolean;
  readonly health?: number;
}

export type TileType =
  | 'empty'
  | 'wall'
  | 'spawn_ct'
  | 'spawn_t'
  | 'bombsite_a'
  | 'bombsite_b'
  | 'buyzone_ct'
  | 'buyzone_t'
  | 'water'
  | 'metal'
  | 'wood'
  | 'glass'
  | 'door'
  | 'ladder'
  | 'hostage'
  | 'rescue_zone'
  | 'vip_escape'
  | 'cover';

// Map System Types
export interface MapData {
  readonly name: string;
  readonly width: number;
  readonly height: number;
  readonly tiles: ReadonlyArray<ReadonlyArray<TileData>>;
  readonly metadata: MapMetadata;
}

export interface MapMetadata {
  readonly author: string;
  readonly version: string;
  readonly gameMode: GameMode;
  readonly maxPlayers: number;
  readonly description: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export type GameMode = 'defuse' | 'hostage' | 'deathmatch' | 'gungame' | 'custom';

// Weapon System Types
export interface WeaponStats {
  readonly damage: number;
  readonly fireRate: number;
  readonly reloadTime: number;
  readonly magazineSize: number;
  readonly reserveAmmo: number;
  readonly penetration: number;
  readonly range: number;
  readonly accuracy: number;
  readonly movementSpeed: number;
  readonly price: number;
}

export interface WeaponDefinition {
  readonly id: string;
  readonly name: string;
  readonly category: WeaponCategory;
  readonly team: WeaponTeam;
  readonly stats: WeaponStats;
  readonly icon: string;
  readonly sound: WeaponSounds;
}

export type WeaponCategory =
  | 'pistol'
  | 'smg'
  | 'rifle'
  | 'sniper'
  | 'shotgun'
  | 'machine_gun'
  | 'knife'
  | 'grenade';
export type WeaponTeam = 'ct' | 't' | 'both';

export interface WeaponSounds {
  readonly fire: string;
  readonly reload: string;
  readonly empty: string;
  readonly draw: string;
}

// Player System Types
export interface PlayerState {
  readonly id: string;
  readonly name: string;
  readonly team: Team;
  readonly health: number;
  readonly armor: number;
  readonly helmet: boolean;
  readonly money: number;
  readonly position: Vector3;
  readonly velocity: Vector3;
  readonly rotation: number;
  readonly viewAngle: number;
  readonly isAlive: boolean;
  readonly isDucking: boolean;
  readonly isWalking: boolean;
  readonly isDefusing: boolean;
  readonly isPlanting: boolean;
  readonly hasDefuseKit: boolean;
  readonly hasBomb: boolean;
  readonly weapons: PlayerWeapons;
  readonly statistics: PlayerStatistics;
}

export type Team = 'ct' | 't' | 'spectator' | 'unassigned';

export interface Vector3 {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

export interface PlayerWeapons {
  readonly primary: WeaponInstance | null;
  readonly secondary: WeaponInstance | null;
  readonly knife: WeaponInstance;
  readonly grenades: readonly GrenadeInstance[];
  readonly activeSlot: WeaponSlot;
}

export type WeaponSlot = 'primary' | 'secondary' | 'knife' | 'grenade' | 'bomb';

export interface WeaponInstance {
  readonly definition: WeaponDefinition;
  readonly ammoInMagazine: number;
  readonly reserveAmmo: number;
}

export interface GrenadeInstance {
  readonly type: GrenadeType;
  readonly count: number;
}

export type GrenadeType = 'flashbang' | 'smoke' | 'he' | 'molotov' | 'incendiary' | 'decoy';

export interface PlayerStatistics {
  readonly kills: number;
  readonly deaths: number;
  readonly assists: number;
  readonly score: number;
  readonly mvpRounds: number;
  readonly headshots: number;
  readonly damageDealt: number;
  readonly damageTaken: number;
  readonly roundsWon: number;
  readonly bombsPlanted: number;
  readonly bombsDefused: number;
  readonly hostagesRescued: number;
}

// Round System Types
export interface RoundState {
  readonly number: number;
  readonly phase: RoundPhase;
  readonly timeRemaining: number;
  readonly winner: Team | null;
  readonly winReason: WinReason | null;
  readonly bombState: BombState;
  readonly mvpPlayer: string | null;
}

export type RoundPhase = 'freezetime' | 'live' | 'ended';

export type WinReason =
  | 'elimination'
  | 'bomb_exploded'
  | 'bomb_defused'
  | 'time_expired'
  | 'hostages_rescued'
  | 'vip_escaped'
  | 'surrender';

export interface BombState {
  readonly isPlanted: boolean;
  readonly isDefused: boolean;
  readonly plantTime: number | null;
  readonly defuseTime: number | null;
  readonly plantedAt: TilePosition | null;
  readonly timeToExplode: number;
  readonly defuseProgress: number;
}

// Match System Types
export interface MatchConfig {
  readonly maxRounds: number;
  readonly roundTime: number;
  readonly freezeTime: number;
  readonly bombTime: number;
  readonly defuseTime: number;
  readonly startMoney: number;
  readonly maxMoney: number;
  readonly friendlyFire: boolean;
  readonly killReward: MoneyRewards;
}

export interface MoneyRewards {
  readonly kill: number;
  readonly killHeadshot: number;
  readonly killKnife: number;
  readonly teamKill: number;
  readonly bombPlant: number;
  readonly bombDefuse: number;
  readonly roundWin: number;
  readonly roundLoss: number;
  readonly hostageRescue: number;
}

// Network Types
export interface NetworkMessage {
  readonly type: MessageType;
  readonly timestamp: number;
  readonly data: unknown;
}

export type MessageType =
  | 'player_update'
  | 'round_start'
  | 'round_end'
  | 'bomb_planted'
  | 'bomb_defused'
  | 'player_killed'
  | 'player_hurt'
  | 'weapon_fired'
  | 'grenade_thrown'
  | 'chat_message'
  | 'team_switch'
  | 'disconnect'
  | 'connect';

// Input System Types
export interface InputState {
  readonly movement: MovementInput;
  readonly mouse: MouseInput;
  readonly keys: KeyboardInput;
  readonly actions: ActionInput;
}

export interface MovementInput {
  readonly forward: boolean;
  readonly backward: boolean;
  readonly left: boolean;
  readonly right: boolean;
  readonly walk: boolean;
  readonly duck: boolean;
  readonly jump: boolean;
}

export interface MouseInput {
  readonly x: number;
  readonly y: number;
  readonly deltaX: number;
  readonly deltaY: number;
  readonly leftButton: boolean;
  readonly rightButton: boolean;
}

export interface KeyboardInput {
  readonly pressedKeys: ReadonlySet<string>;
  readonly lastKeyPressed: string | null;
}

export interface ActionInput {
  readonly fire: boolean;
  readonly altFire: boolean;
  readonly reload: boolean;
  readonly use: boolean;
  readonly drop: boolean;
  readonly buy: boolean;
  readonly scoreboard: boolean;
  readonly chat: boolean;
  readonly teamChat: boolean;
}

// Buy Menu Types
export interface BuyMenuItem {
  readonly id: string;
  readonly weaponId: string;
  readonly category: BuyMenuCategory;
  readonly price: number;
  readonly teamRestriction: Team | 'both';
  readonly keyBind: string;
  readonly icon: string;
}

export type BuyMenuCategory = 'pistols' | 'heavy' | 'smgs' | 'rifles' | 'equipment' | 'grenades';

// Audio System Types
export interface AudioConfig {
  readonly masterVolume: number;
  readonly effectsVolume: number;
  readonly musicVolume: number;
  readonly voiceVolume: number;
  readonly positionalAudio: boolean;
  readonly quality: AudioQuality;
}

export type AudioQuality = 'low' | 'medium' | 'high' | 'ultra';

// Renderer Types
export interface RenderConfig {
  readonly resolution: Resolution;
  readonly fullscreen: boolean;
  readonly vsync: boolean;
  readonly antiAliasing: AntiAliasingMode;
  readonly shadows: ShadowQuality;
  readonly textures: TextureQuality;
  readonly effects: EffectQuality;
  readonly viewDistance: number;
  readonly fov: number;
}

export interface Resolution {
  readonly width: number;
  readonly height: number;
}

export type AntiAliasingMode = 'none' | 'fxaa' | 'msaa2x' | 'msaa4x' | 'msaa8x';
export type ShadowQuality = 'off' | 'low' | 'medium' | 'high' | 'ultra';
export type TextureQuality = 'low' | 'medium' | 'high' | 'ultra';
export type EffectQuality = 'low' | 'medium' | 'high' | 'ultra';

// HUD Types
export interface HUDConfig {
  readonly scale: number;
  readonly opacity: number;
  readonly color: RGBColor;
  readonly showRadar: boolean;
  readonly showHealth: boolean;
  readonly showAmmo: boolean;
  readonly showMoney: boolean;
  readonly showTimer: boolean;
  readonly showKillFeed: boolean;
  readonly showCrosshair: boolean;
  readonly crosshairStyle: CrosshairStyle;
}

export interface RGBColor {
  readonly r: number;
  readonly g: number;
  readonly b: number;
}

export interface CrosshairStyle {
  readonly style: 'default' | 'classic' | 'dynamic' | 'custom';
  readonly size: number;
  readonly thickness: number;
  readonly gap: number;
  readonly color: RGBColor;
  readonly outline: boolean;
  readonly dot: boolean;
}

// Server Configuration Types
export interface ServerConfig {
  readonly name: string;
  readonly password: string;
  readonly maxPlayers: number;
  readonly tickRate: number;
  readonly gameMode: GameMode;
  readonly mapRotation: readonly string[];
  readonly rules: ServerRules;
}

export interface ServerRules {
  readonly friendlyFire: boolean;
  readonly autoBalance: boolean;
  readonly alltalk: boolean;
  readonly cheatsEnabled: boolean;
  readonly votingEnabled: boolean;
  readonly kickIdleTime: number;
  readonly maxPing: number;
}

// Event System Types
export interface GameEvent<T = unknown> {
  readonly type: string;
  readonly timestamp: number;
  readonly data: T;
}

export type EventHandler<T = unknown> = (event: GameEvent<T>) => void;

export interface EventEmitter {
  on<T>(event: string, handler: EventHandler<T>): void;
  off<T>(event: string, handler: EventHandler<T>): void;
  emit<T>(event: string, data: T): void;
  once<T>(event: string, handler: EventHandler<T>): void;
}
