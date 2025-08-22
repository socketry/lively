/**
 * CS 1.6 Enhanced Audio Manager
 * Comprehensive sound system using authentic CS 1.6 audio assets
 */

import { Vector2D } from '../physics/PhysicsEngine';
import { CS16SoundLoader, CS16SoundDefinition } from './CS16SoundLoader';
import { CS16SoundPreloader, PreloadProgress } from './CS16SoundPreloader';

export interface CS16Sound {
  id: string;
  buffer: AudioBuffer;
  volume: number;
  loop: boolean;
  spatial: boolean;
  category: string;
  subcategory?: string;
  randomPitch?: boolean;
}

export interface CS16SoundInstance {
  id: string;
  soundId: string;
  source: AudioBufferSourceNode;
  gainNode: GainNode;
  pannerNode?: PannerNode;
  startTime: number;
  loop: boolean;
  category: string;
}

export interface SurfaceType {
  material: 'concrete' | 'metal' | 'dirt' | 'grass' | 'gravel' | 'sand' | 'wood' | 'metalgrate' | 'chainlink' | 'ladder' | 'mud' | 'water';
  volume: number;
}

export class CS16AudioManager {
  private context: AudioContext;
  private masterGain: GainNode;
  private sounds: Map<string, CS16Sound> = new Map();
  private instances: Map<string, CS16SoundInstance> = new Map();
  private listenerPosition: Vector2D = { x: 0, y: 0 };
  private listenerRotation: number = 0;
  private soundCategories: Map<string, GainNode> = new Map();
  private loadedCount: number = 0;
  private totalCount: number = 0;
  private isInitialized: boolean = false;
  private preloader: CS16SoundPreloader;
  
  // Audio settings
  private masterVolume: number = 0.7;
  private categoryVolumes: Map<string, number> = new Map();
  
  constructor() {
    this.context = new (window.AudioContext || (window as any).webkitAudioContext)();
    this.masterGain = this.context.createGain();
    this.masterGain.connect(this.context.destination);
    this.masterGain.gain.value = this.masterVolume;
    
    // Initialize preloader with optimized settings
    this.preloader = new CS16SoundPreloader({
      maxConcurrentLoads: 8,
      cacheLimit: 500,
      retryCount: 2,
      timeout: 8000,
      prioritySounds: [
        'weapons/ak47/ak47-1.wav',
        'weapons/m4a1/m4a1-1.wav',
        'weapons/awp/awp1.wav',
        'player/footsteps/',
        'radio/',
        'bot/'
      ]
    });
    
    this.initializeCategories();
  }
  
  /**
   * Initialize sound categories with proper volume mixing
   */
  private initializeCategories(): void {
    const categories = [
      { name: 'weapons', volume: 0.8 },
      { name: 'player', volume: 0.7 },
      { name: 'bot', volume: 0.6 },
      { name: 'ambient', volume: 0.3 },
      { name: 'ui', volume: 0.5 },
      { name: 'radio', volume: 0.8 },
      { name: 'physics', volume: 0.4 },
      { name: 'music', volume: 0.2 }
    ];
    
    categories.forEach(category => {
      const gainNode = this.context.createGain();
      gainNode.connect(this.masterGain);
      gainNode.gain.value = category.volume;
      this.soundCategories.set(category.name, gainNode);
      this.categoryVolumes.set(category.name, category.volume);
    });
  }
  
  /**
   * Initialize and load all CS 1.6 sounds
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;
    
    console.log('🎵 Initializing CS 1.6 Audio System with preloader...');
    
    // Use preloader for efficient sound loading
    const success = await this.preloader.preloadAll(
      (progress: PreloadProgress) => {
        const percent = Math.round(progress.progress * 100);
        console.log(`🎵 Loading CS 1.6 sounds: ${percent}% (${progress.loadedSounds}/${progress.totalSounds})`);
        if (progress.currentSound) {
          console.log(`   📂 ${progress.currentSound}`);
        }
      },
      (success: boolean) => {
        if (success) {
          console.log('✅ All CS 1.6 sounds preloaded successfully');
        } else {
          console.warn('⚠️ Some CS 1.6 sounds failed to preload');
        }
      }
    );
    
    // Cache stats
    const stats = this.preloader.getCacheStats();
    console.log(`📊 Sound Cache: ${stats.loadedSounds}/${stats.totalSounds} loaded, ${Math.round(stats.memoryUsage)}MB memory`);
    
    this.isInitialized = true;
    console.log('✅ CS 1.6 Audio System initialized with preloader');
  }
  
  /**
   * Load individual sound from definition
   */
  private async loadSound(definition: CS16SoundDefinition): Promise<void> {
    try {
      const response = await fetch(definition.path);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await this.context.decodeAudioData(arrayBuffer);
      
      this.sounds.set(definition.id, {
        id: definition.id,
        buffer: audioBuffer,
        volume: definition.volume,
        loop: definition.loop || false,
        spatial: definition.spatial !== false,
        category: definition.category,
        subcategory: definition.subcategory,
        randomPitch: definition.randomPitch || false
      });
      
      this.loadedCount++;
    } catch (error) {
      console.warn(`⚠️ Failed to load sound: ${definition.id} from ${definition.path}`, error);
      
      // Create placeholder sound for missing files
      await this.createPlaceholderSound(definition);
      this.loadedCount++;
    }
  }
  
  /**
   * Create placeholder sound for missing audio files
   */
  private async createPlaceholderSound(definition: CS16SoundDefinition): Promise<void> {
    const duration = 0.1;
    const sampleRate = this.context.sampleRate;
    const buffer = this.context.createBuffer(1, sampleRate * duration, sampleRate);
    const channel = buffer.getChannelData(0);
    
    // Generate appropriate placeholder sound based on type
    let frequency = 300;
    if (definition.subcategory === 'fire') frequency = 200;
    else if (definition.subcategory === 'footsteps') frequency = 150;
    else if (definition.category === 'weapons') frequency = 250;
    else if (definition.category === 'ui') frequency = 400;
    
    for (let i = 0; i < channel.length; i++) {
      channel[i] = Math.sin(2 * Math.PI * frequency * i / sampleRate) * 
                   Math.exp(-i / (channel.length * 0.3)) *
                   (Math.random() * 0.1 - 0.05);
    }
    
    this.sounds.set(definition.id, {
      id: definition.id,
      buffer,
      volume: definition.volume,
      loop: definition.loop || false,
      spatial: definition.spatial !== false,
      category: definition.category,
      subcategory: definition.subcategory,
      randomPitch: definition.randomPitch || false
    });
  }
  
  /**
   * Play sound with advanced 3D positioning and effects
   */
  play(
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
  ): string | null {
    const sound = this.sounds.get(soundId);
    if (!sound) {
      console.warn(`🔇 Sound not found: ${soundId}`);
      return null;
    }
    
    const source = this.context.createBufferSource();
    source.buffer = sound.buffer;
    source.loop = options.loop !== undefined ? options.loop : sound.loop;
    
    // Apply pitch variation
    let finalPitch = options.pitch || 1;
    if (sound.randomPitch && !options.pitch) {
      finalPitch = 0.9 + Math.random() * 0.2; // ±10% pitch variation
    }
    source.playbackRate.value = finalPitch;
    
    const gainNode = this.context.createGain();
    const finalVolume = sound.volume * (options.volume || 1);
    
    // Apply fade in if specified
    if (options.fadeIn && options.fadeIn > 0) {
      gainNode.gain.setValueAtTime(0, this.context.currentTime);
      gainNode.gain.linearRampToValueAtTime(finalVolume, this.context.currentTime + options.fadeIn);
    } else {
      gainNode.gain.value = finalVolume;
    }
    
    let finalNode: AudioNode = gainNode;
    let pannerNode: PannerNode | undefined;
    
    // Apply 3D spatial audio if enabled and position provided
    if (sound.spatial && position) {
      pannerNode = this.context.createPanner();
      pannerNode.panningModel = 'HRTF';
      pannerNode.distanceModel = 'inverse';
      pannerNode.refDistance = 50;
      pannerNode.maxDistance = 1000;
      pannerNode.rolloffFactor = 1.2;
      pannerNode.coneInnerAngle = 360;
      pannerNode.coneOuterAngle = 0;
      pannerNode.coneOuterGain = 0;
      
      // Convert 2D position to 3D coordinates
      const relativeX = (position.x - this.listenerPosition.x) / 100;
      const relativeY = 0;
      const relativeZ = (position.y - this.listenerPosition.y) / 100;
      
      pannerNode.setPosition(relativeX, relativeY, relativeZ);
      
      // Set listener orientation
      const forward = {
        x: Math.cos(this.listenerRotation),
        y: 0,
        z: Math.sin(this.listenerRotation)
      };
      const up = { x: 0, y: 1, z: 0 };
      
      if (this.context.listener.forwardX) {
        this.context.listener.forwardX.value = forward.x;
        this.context.listener.forwardY.value = forward.y;
        this.context.listener.forwardZ.value = forward.z;
        this.context.listener.upX.value = up.x;
        this.context.listener.upY.value = up.y;
        this.context.listener.upZ.value = up.z;
      } else {
        this.context.listener.setOrientation(forward.x, forward.y, forward.z, up.x, up.y, up.z);
      }
      
      source.connect(gainNode);
      gainNode.connect(pannerNode);
      finalNode = pannerNode;
    } else {
      source.connect(gainNode);
    }
    
    // Connect to appropriate category mixer
    const categoryNode = this.soundCategories.get(sound.category) || this.masterGain;
    finalNode.connect(categoryNode);
    
    const instanceId = `${soundId}_${Date.now()}_${Math.random()}`;
    const instance: CS16SoundInstance = {
      id: instanceId,
      soundId,
      source,
      gainNode,
      pannerNode,
      startTime: this.context.currentTime + (options.delay || 0),
      loop: source.loop,
      category: sound.category
    };
    
    this.instances.set(instanceId, instance);
    
    source.start(instance.startTime);
    
    if (!source.loop) {
      source.onended = () => {
        this.instances.delete(instanceId);
      };
    }
    
    return instanceId;
  }
  
  /**
   * Play weapon sound with proper audio mixing
   */
  playWeaponSound(weapon: string, action: 'fire' | 'reload' | 'empty' | 'switch', position?: Vector2D): string | null {
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
   * Play footstep sound based on surface material
   */
  playFootstep(position: Vector2D, surface: SurfaceType = { material: 'concrete', volume: 1.0 }): string | null {
    const soundId = CS16SoundLoader.getFootstepSound(surface.material);
    if (!soundId) return null;
    
    return this.play(soundId, position, {
      volume: 0.4 * surface.volume,
      category: 'player'
    });
  }
  
  /**
   * Play player damage/death sound
   */
  playPlayerSound(type: 'damage' | 'death' | 'headshot' | 'kevlar', position?: Vector2D): string | null {
    const soundId = CS16SoundLoader.getRandomSound('player', type);
    if (!soundId) return null;
    
    return this.play(soundId, position, {
      volume: type === 'death' ? 0.8 : 0.6,
      category: 'player'
    });
  }
  
  /**
   * Play grenade sound
   */
  playGrenadeSound(type: 'hegrenade' | 'flashbang' | 'smoke' | 'grenade_bounce' | 'pinpull', position?: Vector2D): string | null {
    const soundId = CS16SoundLoader.getRandomSound('weapons', 'grenades');
    if (!soundId || !soundId.includes(type)) {
      // Fallback to specific search
      const definitions = CS16SoundLoader.generateSoundDefinitions();
      const matching = definitions.find(def => def.id.includes(type));
      if (!matching) return null;
      return this.play(matching.id, position, { category: 'weapons' });
    }
    
    return this.play(soundId, position, {
      volume: type.includes('explode') ? 1.0 : 0.6,
      category: 'weapons'
    });
  }
  
  /**
   * Play C4 bomb sound
   */
  playC4Sound(type: 'plant' | 'beep' | 'disarm' | 'explode', position?: Vector2D): string | null {
    const definitions = CS16SoundLoader.generateSoundDefinitions();
    const matching = definitions.find(def => def.id.includes(`c4_${type}`));
    if (!matching) return null;
    
    return this.play(matching.id, position, {
      volume: type === 'explode' ? 1.0 : type === 'beep' ? 0.3 : 0.7,
      category: 'weapons',
      loop: type === 'beep'
    });
  }
  
  /**
   * Play UI sound
   */
  playUISound(type: 'button_click' | 'button_deny' | 'item_pickup' | 'ammo_pickup' | 'nvg_on' | 'nvg_off'): string | null {
    return this.play(type, undefined, {
      category: 'ui',
      volume: 0.5
    });
  }
  
  /**
   * Stop sound instance with optional fade out
   */
  stop(instanceId: string, fadeOut: number = 0): void {
    const instance = this.instances.get(instanceId);
    if (!instance) return;
    
    if (fadeOut > 0) {
      instance.gainNode.gain.exponentialRampToValueAtTime(
        0.001,
        this.context.currentTime + fadeOut
      );
      setTimeout(() => {
        if (this.instances.has(instanceId)) {
          instance.source.stop();
          this.instances.delete(instanceId);
        }
      }, fadeOut * 1000);
    } else {
      instance.source.stop();
      this.instances.delete(instanceId);
    }
  }
  
  /**
   * Stop all sounds in category
   */
  stopCategory(category: string, fadeOut: number = 0): void {
    this.instances.forEach((instance, id) => {
      if (instance.category === category) {
        this.stop(id, fadeOut);
      }
    });
  }
  
  /**
   * Stop all playing sounds
   */
  stopAll(fadeOut: number = 0): void {
    this.instances.forEach((instance, id) => {
      this.stop(id, fadeOut);
    });
  }
  
  /**
   * Update listener position and orientation
   */
  setListenerPosition(position: Vector2D, rotation: number = 0): void {
    this.listenerPosition = position;
    this.listenerRotation = rotation;
    
    if (this.context.listener.positionX) {
      this.context.listener.positionX.value = 0;
      this.context.listener.positionY.value = 0;
      this.context.listener.positionZ.value = 0;
    } else {
      this.context.listener.setPosition(0, 0, 0);
    }
  }
  
  /**
   * Set volume for specific category
   */
  setCategoryVolume(category: string, volume: number): void {
    const gainNode = this.soundCategories.get(category);
    if (gainNode) {
      gainNode.gain.value = Math.max(0, Math.min(1, volume));
      this.categoryVolumes.set(category, volume);
    }
  }
  
  /**
   * Get volume for specific category
   */
  getCategoryVolume(category: string): number {
    return this.categoryVolumes.get(category) || 0;
  }
  
  /**
   * Set master volume
   */
  setMasterVolume(volume: number): void {
    this.masterVolume = Math.max(0, Math.min(1, volume));
    this.masterGain.gain.value = this.masterVolume;
  }
  
  /**
   * Get master volume
   */
  getMasterVolume(): number {
    return this.masterVolume;
  }
  
  /**
   * Mute all audio
   */
  mute(): void {
    this.masterGain.gain.value = 0;
  }
  
  /**
   * Unmute audio
   */
  unmute(): void {
    this.masterGain.gain.value = this.masterVolume;
  }
  
  /**
   * Get loading progress
   */
  getLoadingProgress(): { loaded: number; total: number; percentage: number } {
    return {
      loaded: this.loadedCount,
      total: this.totalCount,
      percentage: this.totalCount > 0 ? Math.round((this.loadedCount / this.totalCount) * 100) : 0
    };
  }
  
  /**
   * Check if audio system is ready
   */
  isReady(): boolean {
    return this.isInitialized && this.loadedCount >= this.totalCount;
  }
  
  /**
   * Get statistics about loaded sounds
   */
  getStats(): { totalSounds: number; categoriesLoaded: Record<string, number>; activeInstances: number } {
    const categoriesLoaded: Record<string, number> = {};
    
    this.sounds.forEach(sound => {
      categoriesLoaded[sound.category] = (categoriesLoaded[sound.category] || 0) + 1;
    });
    
    return {
      totalSounds: this.sounds.size,
      categoriesLoaded,
      activeInstances: this.instances.size
    };
  }
  
  /**
   * Cleanup resources
   */
  cleanup(): void {
    this.stopAll();
    this.instances.clear();
    this.sounds.clear();
    this.context.close();
    this.isInitialized = false;
  }
}