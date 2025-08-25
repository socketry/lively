/**
 * Simplified CS 1.6 Audio Manager
 * Removes complexity while maintaining CS 1.6 sound authenticity
 */

import { Vector2D } from '../physics/PhysicsEngine';
import { CS16SoundLoader } from './CS16SoundLoader';

export interface SurfaceType {
  material: 'concrete' | 'metal' | 'dirt' | 'grass' | 'gravel' | 'sand' | 'wood' | 'metalgrate' | 'chainlink' | 'ladder' | 'mud' | 'water';
  volume: number;
}

export interface SimplifiedSoundInstance {
  id: string;
  audio: HTMLAudioElement;
  startTime: number;
  category: string;
}

export class SimplifiedCS16AudioManager {
  private audioCache: Map<string, HTMLAudioElement> = new Map();
  private activeInstances: Map<string, SimplifiedSoundInstance> = new Map();
  private listenerPosition: Vector2D = { x: 0, y: 0 };
  private isInitialized: boolean = false;
  
  // Audio settings
  private masterVolume: number = 0.7;
  private categoryVolumes: Map<string, number> = new Map([
    ['weapons', 0.8],
    ['player', 0.7],
    ['bot', 0.6],
    ['ambient', 0.3],
    ['ui', 0.5],
    ['radio', 0.8],
    ['physics', 0.4],
    ['music', 0.2]
  ]);
  
  constructor() {
    this.isInitialized = true;
    console.log('🎵 Simplified CS 1.6 Audio System initialized');
  }
  
  /**
   * Initialize audio system (simplified - no preloading)
   */
  async initialize(): Promise<void> {
    console.log('✅ Simplified CS 1.6 Audio System ready');
  }
  
  /**
   * Load sound on-demand with simple fallback
   */
  private async loadSound(soundPath: string): Promise<HTMLAudioElement> {
    // Check cache first
    const cached = this.audioCache.get(soundPath);
    if (cached) {
      return cached.cloneNode() as HTMLAudioElement;
    }
    
    const audio = new Audio();
    
    // Simple 2-tier fallback system
    const normalizedPath = soundPath.startsWith('/cstrike/sound/') 
      ? soundPath 
      : `/cstrike/sound/${soundPath}`;
    
    const sources = [
      normalizedPath,
      `/sounds/fallback/${this.getFallbackSound(soundPath)}`
    ];
    
    for (const source of sources) {
      try {
        audio.src = source;
        audio.preload = 'auto';
        
        await new Promise<void>((resolve, reject) => {
          const onLoad = () => {
            audio.removeEventListener('canplaythrough', onLoad);
            audio.removeEventListener('error', onError);
            resolve();
          };
          
          const onError = () => {
            audio.removeEventListener('canplaythrough', onLoad);
            audio.removeEventListener('error', onError);
            reject(new Error(`Failed to load: ${source}`));
          };
          
          audio.addEventListener('canplaythrough', onLoad, { once: true });
          audio.addEventListener('error', onError, { once: true });
          
          audio.load();
        });
        
        // Cache successful load (limit cache to 100 sounds)
        if (this.audioCache.size < 100) {
          this.audioCache.set(soundPath, audio);
        }
        
        return audio.cloneNode() as HTMLAudioElement;
      } catch (error) {
        console.warn(`⚠️ Failed to load: ${source}`);
        continue;
      }
    }
    
    throw new Error(`All sources failed for: ${soundPath}`);
  }
  
  /**
   * Simple fallback sound mapping
   */
  private getFallbackSound(soundPath: string): string {
    if (soundPath.includes('weapon')) return 'weapon_generic.wav';
    if (soundPath.includes('footstep') || soundPath.includes('step')) return 'step_generic.wav';
    if (soundPath.includes('reload')) return 'reload_generic.wav';
    if (soundPath.includes('radio')) return 'radio_beep.wav';
    if (soundPath.includes('ambient')) return 'ambient_generic.wav';
    return 'click.wav';
  }
  
  /**
   * Play sound with basic 3D positioning
   */
  async play(
    soundId: string,
    position?: Vector2D,
    options: {
      volume?: number;
      category?: string;
      loop?: boolean;
    } = {}
  ): Promise<string | null> {
    try {
      const audio = await this.loadSound(soundId);
      
      // Basic volume calculation
      let volume = options.volume || 1;
      const categoryVolume = this.categoryVolumes.get(options.category || 'ui') || 1;
      volume *= categoryVolume * this.masterVolume;
      
      // Simple distance attenuation for 3D audio
      if (position) {
        const distance = Math.sqrt(
          Math.pow(position.x - this.listenerPosition.x, 2) +
          Math.pow(position.y - this.listenerPosition.y, 2)
        );
        const maxDistance = 500;
        const attenuation = Math.max(0.1, 1 - (distance / maxDistance));
        volume *= attenuation;
      }
      
      audio.volume = Math.max(0, Math.min(1, volume));
      audio.loop = options.loop || false;
      
      const instanceId = `${soundId}_${Date.now()}_${Math.random()}`;
      const instance: SimplifiedSoundInstance = {
        id: instanceId,
        audio,
        startTime: Date.now(),
        category: options.category || 'ui'
      };
      
      this.activeInstances.set(instanceId, instance);
      
      // Auto-cleanup when sound ends
      audio.onended = () => {
        this.activeInstances.delete(instanceId);
      };
      
      await audio.play();
      return instanceId;
    } catch (error) {
      console.warn(`🔇 Failed to play sound: ${soundId}`, error);
      return null;
    }
  }
  
  /**
   * Play weapon sound
   */
  async playWeaponSound(weapon: string, action: 'fire' | 'reload' | 'empty' | 'switch', position?: Vector2D): Promise<string | null> {
    const soundId = CS16SoundLoader.getWeaponSound(weapon, action);
    if (!soundId) {
      console.warn(`🔫 Weapon sound not found: ${weapon} ${action}`);
      return null;
    }
    
    const volumeMultiplier = action === 'fire' ? 1.0 : action === 'reload' ? 0.7 : 0.5;
    return this.play(soundId, position, {
      volume: volumeMultiplier,
      category: 'weapons'
    });
  }
  
  /**
   * Play footstep sound
   */
  async playFootstep(position: Vector2D, surface: SurfaceType = { material: 'concrete', volume: 1.0 }): Promise<string | null> {
    const soundId = CS16SoundLoader.getFootstepSound(surface.material);
    if (!soundId) return null;
    
    return this.play(soundId, position, {
      volume: 0.4 * surface.volume,
      category: 'player'
    });
  }
  
  /**
   * Play player sound
   */
  async playPlayerSound(type: 'damage' | 'death' | 'headshot' | 'kevlar', position?: Vector2D): Promise<string | null> {
    const soundId = CS16SoundLoader.getRandomSound('player', type);
    if (!soundId) return null;
    
    return this.play(soundId, position, {
      volume: type === 'death' ? 0.8 : 0.6,
      category: 'player'
    });
  }
  
  /**
   * Play UI sound
   */
  async playUISound(type: 'button_click' | 'button_deny' | 'item_pickup' | 'ammo_pickup' | 'nvg_on' | 'nvg_off'): Promise<string | null> {
    return this.play(type, undefined, {
      category: 'ui',
      volume: 0.5
    });
  }
  
  /**
   * Stop sound instance
   */
  stop(instanceId: string): void {
    const instance = this.activeInstances.get(instanceId);
    if (instance) {
      instance.audio.pause();
      instance.audio.currentTime = 0;
      this.activeInstances.delete(instanceId);
    }
  }
  
  /**
   * Stop all sounds in category
   */
  stopCategory(category: string): void {
    this.activeInstances.forEach((instance, id) => {
      if (instance.category === category) {
        this.stop(id);
      }
    });
  }
  
  /**
   * Stop all sounds
   */
  stopAll(): void {
    this.activeInstances.forEach((instance, id) => {
      this.stop(id);
    });
  }
  
  /**
   * Update listener position
   */
  setListenerPosition(position: Vector2D, _rotation: number = 0): void {
    this.listenerPosition = position;
  }
  
  /**
   * Set category volume
   */
  setCategoryVolume(category: string, volume: number): void {
    this.categoryVolumes.set(category, Math.max(0, Math.min(1, volume)));
  }
  
  /**
   * Get category volume
   */
  getCategoryVolume(category: string): number {
    return this.categoryVolumes.get(category) || 0;
  }
  
  /**
   * Set master volume
   */
  setMasterVolume(volume: number): void {
    this.masterVolume = Math.max(0, Math.min(1, volume));
  }
  
  /**
   * Get master volume
   */
  getMasterVolume(): number {
    return this.masterVolume;
  }
  
  /**
   * Mute/unmute audio
   */
  mute(): void {
    this.activeInstances.forEach(instance => {
      instance.audio.volume = 0;
    });
  }
  
  unmute(): void {
    this.activeInstances.forEach((instance, _id) => {
      const categoryVolume = this.categoryVolumes.get(instance.category) || 1;
      instance.audio.volume = categoryVolume * this.masterVolume;
    });
  }
  
  /**
   * Check if audio system is ready
   */
  isReady(): boolean {
    return this.isInitialized;
  }
  
  /**
   * Get basic statistics
   */
  getStats(): { totalCached: number; activeInstances: number } {
    return {
      totalCached: this.audioCache.size,
      activeInstances: this.activeInstances.size
    };
  }
  
  /**
   * Cleanup resources
   */
  cleanup(): void {
    this.stopAll();
    this.audioCache.clear();
  }
}