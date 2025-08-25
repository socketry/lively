// HUD Component Exports
export { GameHUD } from './GameHUD';
export { HealthArmorHUD } from './HealthArmorHUD';
export { AmmoWeaponHUD } from './AmmoWeaponHUD';
export { ScoreTimerHUD } from './ScoreTimerHUD';
export { KillFeedHUD } from './KillFeedHUD';
export { MiniMapHUD } from './MiniMapHUD';
export { CrosshairHUD } from './CrosshairHUD';
export { WeaponInventoryHUD } from './WeaponInventoryHUD';
export { BuyMenuHUD } from './BuyMenuHUD';
export { ScoreboardHUD } from './ScoreboardHUD';
export { RadioMenuHUD } from './RadioMenuHUD';
export { NotificationsHUD } from './NotificationsHUD';
export { DeathScreenHUD } from './DeathScreenHUD';
export { RoundEndHUD } from './RoundEndHUD';

// HUD Types
export interface HUDPlayer {
  id: string;
  name: string;
  team: 'ct' | 't';
  health: number;
  armor: number;
  money: number;
  kills: number;
  deaths: number;
  assists: number;
  currentWeapon: string;
  weapons: string[];
  ammo: Map<string, number>;
  isAlive: boolean;
  position: { x: number; y: number };
  orientation?: number;
}

export interface HUDGameState {
  roundTime: number;
  bombPlanted: boolean;
  bombTimer?: number;
  ctScore: number;
  tScore: number;
  roundPhase: 'warmup' | 'freeze' | 'live' | 'post';
  mvpPlayer?: string;
}

export interface HUDKillFeedEntry {
  id: string;
  killer: string;
  victim: string;
  weapon: string;
  headshot: boolean;
  timestamp: number;
  killerTeam: 'ct' | 't';
  victimTeam: 'ct' | 't';
}

export interface HUDNotification {
  id: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'error';
  timestamp: number;
}