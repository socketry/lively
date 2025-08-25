/**
 * CS 1.6 Enhanced Audio Manager
 * Comprehensive sound system using authentic CS 1.6 audio assets
 */

import { Vector2D } from '../physics/PhysicsEngine';
import { SimplifiedCS16AudioManager, SurfaceType } from './SimplifiedCS16AudioManager';

export type { SurfaceType };

export class CS16AudioManager {
  private simplifiedManager: SimplifiedCS16AudioManager;
  
  constructor() {
    this.simplifiedManager = new SimplifiedCS16AudioManager();
    console.log('🎵 CS16AudioManager using simplified system');
  }
  
  /**
   * Initialize audio system
   */
  async initialize(): Promise<void> {
    return this.simplifiedManager.initialize();
  }
  
  /**
   * Play sound (simplified)
   */
  async play(
    soundId: string,
    position?: Vector2D,
    options: {
      volume?: number;
      pitch?: number;
      delay?: number;
      category?: string;
      loop?: boolean;
      fadeIn?: number;
    } = {}
  ): Promise<string | null> {
    return this.simplifiedManager.play(soundId, position, {
      volume: options.volume,
      category: options.category,
      loop: options.loop
    });
  }
  
  /**
   * Play weapon sound
   */
  async playWeaponSound(weapon: string, action: 'fire' | 'reload' | 'empty' | 'switch', position?: Vector2D): Promise<string | null> {
    return this.simplifiedManager.playWeaponSound(weapon, action, position);
  }
  
  /**
   * Play footstep sound
   */
  async playFootstep(position: Vector2D, surface: SurfaceType = { material: 'concrete', volume: 1.0 }): Promise<string | null> {
    return this.simplifiedManager.playFootstep(position, surface);
  }
  
  /**
   * Play player sound
   */
  async playPlayerSound(type: 'damage' | 'death' | 'headshot' | 'kevlar', position?: Vector2D): Promise<string | null> {
    return this.simplifiedManager.playPlayerSound(type, position);
  }
  
  /**
   * Play UI sound
   */
  async playUISound(type: 'button_click' | 'button_deny' | 'item_pickup' | 'ammo_pickup' | 'nvg_on' | 'nvg_off'): Promise<string | null> {
    return this.simplifiedManager.playUISound(type);
  }
  
  /**
   * Stop sound instance
   */
  stop(instanceId: string, _fadeOut: number = 0): void {
    this.simplifiedManager.stop(instanceId);
  }
  
  /**
   * Stop all sounds in category
   */
  stopCategory(category: string, _fadeOut: number = 0): void {
    this.simplifiedManager.stopCategory(category);
  }
  
  /**
   * Stop all sounds
   */
  stopAll(_fadeOut: number = 0): void {
    this.simplifiedManager.stopAll();
  }
  
  /**
   * Update listener position
   */
  setListenerPosition(position: Vector2D, rotation: number = 0): void {
    this.simplifiedManager.setListenerPosition(position, rotation);
  }
  
  /**
   * Set category volume
   */
  setCategoryVolume(category: string, volume: number): void {
    this.simplifiedManager.setCategoryVolume(category, volume);
  }
  
  /**
   * Get category volume
   */
  getCategoryVolume(category: string): number {
    return this.simplifiedManager.getCategoryVolume(category);
  }
  
  /**
   * Set master volume
   */
  setMasterVolume(volume: number): void {
    this.simplifiedManager.setMasterVolume(volume);
  }
  
  /**
   * Get master volume
   */
  getMasterVolume(): number {
    return this.simplifiedManager.getMasterVolume();
  }
  
  /**
   * Mute/unmute audio
   */
  mute(): void {
    this.simplifiedManager.mute();
  }
  
  unmute(): void {
    this.simplifiedManager.unmute();
  }
  
  /**
   * Get loading progress (simplified)
   */
  getLoadingProgress(): { loaded: number; total: number; percentage: number } {
    return { loaded: 1, total: 1, percentage: 100 };
  }
  
  /**
   * Check if ready
   */
  isReady(): boolean {
    return this.simplifiedManager.isReady();
  }
  
  /**
   * Get statistics
   */
  getStats(): { totalSounds: number; categoriesLoaded: Record<string, number>; activeInstances: number } {
    const stats = this.simplifiedManager.getStats();
    return {
      totalSounds: stats.totalCached,
      categoriesLoaded: {},
      activeInstances: stats.activeInstances
    };
  }
  
  /**
   * Cleanup resources
   */
  cleanup(): void {
    this.simplifiedManager.cleanup();
  }
}