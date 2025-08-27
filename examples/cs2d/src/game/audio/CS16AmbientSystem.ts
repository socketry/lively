/**
 * CS 1.6 Ambient Sound System
 * Manages atmospheric sounds, music, and environmental audio
 */

import { Vector2D } from '../physics/PhysicsEngine';
import { CS16AudioManager } from './CS16AudioManager';

export interface AmbientSoundConfig {
  name: string;
  soundPath: string;
  volume: number;
  loop: boolean;
  fadeInDuration?: number;
  fadeOutDuration?: number;
  spatialEnabled?: boolean;
  position?: Vector2D;
  maxDistance?: number;
  randomDelay?: { min: number; max: number };
  playChance?: number; // 0-1 probability
}

export interface EnvironmentAmbientProfile {
  name: string;
  description: string;
  backgroundMusic?: AmbientSoundConfig[];
  atmosphericSounds: AmbientSoundConfig[];
  randomSounds: AmbientSoundConfig[];
  machinerySounds?: AmbientSoundConfig[];
  natureSounds?: AmbientSoundConfig[];
  weatherSounds?: AmbientSoundConfig[];
}

export class CS16AmbientSystem {
  private audioManager: CS16AudioManager;
  private currentProfile: EnvironmentAmbientProfile | null = null;
  private activeSounds: Map<string, { audio: HTMLAudioElement; config: AmbientSoundConfig }> = new Map();
  private ambientProfiles: Map<string, EnvironmentAmbientProfile> = new Map();
  private randomSoundTimers: Map<string, NodeJS.Timeout> = new Map();
  private masterVolume: number = 0.8;
  private musicVolume: number = 0.6;
  private effectsVolume: number = 0.7;

  constructor(audioManager: CS16AudioManager) {
    this.audioManager = audioManager;
    this.initializeAmbientProfiles();
  }

  /**
   * Initialize CS 1.6 ambient sound profiles for different map types
   */
  private initializeAmbientProfiles(): void {
    // Dust2 - Desert environment
    this.ambientProfiles.set('dust2', {
      name: 'dust2',
      description: 'Desert town with Middle Eastern atmosphere',
      backgroundMusic: [
        {
          name: 'arabic_ambience',
          soundPath: 'ambient/music/dustmusic1.wav',
          volume: 0.3,
          loop: true,
          fadeInDuration: 3000
        }
      ],
      atmosphericSounds: [
        {
          name: 'desert_wind',
          soundPath: 'ambient/wind/wind_med1.wav',
          volume: 0.4,
          loop: true,
          fadeInDuration: 2000
        },
        {
          name: 'arabic_radio',
          soundPath: 'ambient/chatter/arabic_radio1.wav',
          volume: 0.2,
          loop: false,
          randomDelay: { min: 30000, max: 120000 },
          playChance: 0.7
        }
      ],
      randomSounds: [
        {
          name: 'distant_dog',
          soundPath: 'ambient/animal/dog1.wav',
          volume: 0.3,
          loop: false,
          randomDelay: { min: 45000, max: 180000 },
          playChance: 0.5
        },
        {
          name: 'metal_stress',
          soundPath: 'ambient/misc/metal_str1.wav',
          volume: 0.2,
          loop: false,
          randomDelay: { min: 60000, max: 300000 },
          playChance: 0.3
        }
      ],
      weatherSounds: [
        {
          name: 'light_wind',
          soundPath: 'ambient/wind/lightwind.wav',
          volume: 0.3,
          loop: true
        }
      ]
    });

    // Inferno - Italian village
    this.ambientProfiles.set('inferno', {
      name: 'inferno',
      description: 'Italian village with Mediterranean atmosphere',
      backgroundMusic: [
        {
          name: 'italian_ambience',
          soundPath: 'ambient/music/cubanmusic1.wav',
          volume: 0.25,
          loop: true,
          fadeInDuration: 4000
        }
      ],
      atmosphericSounds: [
        {
          name: 'village_atmosphere',
          soundPath: 'ambient/tones/roomtone2.wav',
          volume: 0.3,
          loop: true
        },
        {
          name: 'italian_radio',
          soundPath: 'ambient/chatter/italian_radio1.wav',
          volume: 0.2,
          loop: false,
          randomDelay: { min: 40000, max: 150000 },
          playChance: 0.6
        }
      ],
      randomSounds: [
        {
          name: 'church_bell',
          soundPath: 'ambient/misc/brass_bell_c.wav',
          volume: 0.4,
          loop: false,
          randomDelay: { min: 120000, max: 600000 },
          playChance: 0.8
        },
        {
          name: 'distant_car',
          soundPath: 'ambient/misc/car1.wav',
          volume: 0.2,
          loop: false,
          randomDelay: { min: 30000, max: 180000 },
          playChance: 0.4
        }
      ],
      natureSounds: [
        {
          name: 'birds_chirping',
          soundPath: 'ambient/animal/bird1.wav',
          volume: 0.25,
          loop: false,
          randomDelay: { min: 20000, max: 90000 },
          playChance: 0.7
        }
      ]
    });

    // Train/Industrial environment
    this.ambientProfiles.set('train', {
      name: 'train',
      description: 'Industrial train yard with machinery',
      atmosphericSounds: [
        {
          name: 'industrial_hum',
          soundPath: 'ambient/tones/industrial1_loop.wav',
          volume: 0.4,
          loop: true,
          fadeInDuration: 2000
        },
        {
          name: 'steam_loop',
          soundPath: 'ambient/tones/steam_loop1.wav',
          volume: 0.3,
          loop: true
        }
      ],
      machinerySounds: [
        {
          name: 'diesel_engine',
          soundPath: 'ambient/machines/diesel_1.wav',
          volume: 0.3,
          loop: true,
          spatialEnabled: true,
          position: { x: 500, y: 300 },
          maxDistance: 800
        },
        {
          name: 'hydraulic_sounds',
          soundPath: 'ambient/machines/hydraulic_1.wav',
          volume: 0.2,
          loop: false,
          randomDelay: { min: 45000, max: 200000 },
          playChance: 0.6
        }
      ],
      randomSounds: [
        {
          name: 'train_horn',
          soundPath: 'ambient/machines/train_horn_1.wav',
          volume: 0.5,
          loop: false,
          randomDelay: { min: 180000, max: 600000 },
          playChance: 0.8
        },
        {
          name: 'metal_clank',
          soundPath: 'ambient/misc/clank1.wav',
          volume: 0.3,
          loop: false,
          randomDelay: { min: 30000, max: 120000 },
          playChance: 0.4
        }
      ]
    });

    // Office/Indoor environment
    this.ambientProfiles.set('office', {
      name: 'office',
      description: 'Indoor office building atmosphere',
      atmosphericSounds: [
        {
          name: 'office_ambient',
          soundPath: 'ambient/tones/roomtone1.wav',
          volume: 0.3,
          loop: true,
          fadeInDuration: 2000
        },
        {
          name: 'fluorescent_hum',
          soundPath: 'ambient/machines/fluorescent_hum_1.wav',
          volume: 0.2,
          loop: true
        }
      ],
      machinerySounds: [
        {
          name: 'air_conditioning',
          soundPath: 'ambient/machines/air_conditioner_loop_1.wav',
          volume: 0.25,
          loop: true
        },
        {
          name: 'office_equipment',
          soundPath: 'ambient/office/officenews.wav',
          volume: 0.15,
          loop: false,
          randomDelay: { min: 60000, max: 300000 },
          playChance: 0.3
        }
      ],
      randomSounds: [
        {
          name: 'elevator_ding',
          soundPath: 'ambient/tones/elev1.wav',
          volume: 0.3,
          loop: false,
          randomDelay: { min: 120000, max: 400000 },
          playChance: 0.5
        }
      ]
    });

    // Underground/Sewers environment
    this.ambientProfiles.set('underground', {
      name: 'underground',
      description: 'Underground tunnels and sewers',
      atmosphericSounds: [
        {
          name: 'tunnel_ambient',
          soundPath: 'ambient/tones/under1.wav',
          volume: 0.4,
          loop: true,
          fadeInDuration: 3000
        },
        {
          name: 'tunnel_wind',
          soundPath: 'ambient/tones/tunnel_wind_loop.wav',
          volume: 0.3,
          loop: true
        }
      ],
      randomSounds: [
        {
          name: 'water_drip',
          soundPath: 'ambient/weather/drip1.wav',
          volume: 0.4,
          loop: false,
          randomDelay: { min: 5000, max: 30000 },
          playChance: 0.8
        },
        {
          name: 'metal_stress',
          soundPath: 'ambient/misc/metal_str2.wav',
          volume: 0.2,
          loop: false,
          randomDelay: { min: 60000, max: 240000 },
          playChance: 0.4
        }
      ],
      weatherSounds: [
        {
          name: 'water_flow',
          soundPath: 'ambient/nature/water_streamloop3.wav',
          volume: 0.3,
          loop: true,
          spatialEnabled: true,
          maxDistance: 600
        }
      ]
    });

    // Default outdoor environment
    this.ambientProfiles.set('outdoor', {
      name: 'outdoor',
      description: 'General outdoor environment',
      atmosphericSounds: [
        {
          name: 'outdoor_ambient',
          soundPath: 'ambient/nature/woodland_ambient_1.wav',
          volume: 0.3,
          loop: true,
          fadeInDuration: 2000
        }
      ],
      natureSounds: [
        {
          name: 'wind_leaves',
          soundPath: 'ambient/nature/wind_leaves_mild_gust_1.wav',
          volume: 0.2,
          loop: false,
          randomDelay: { min: 30000, max: 120000 },
          playChance: 0.6
        },
        {
          name: 'birds',
          soundPath: 'ambient/animal/bird2.wav',
          volume: 0.2,
          loop: false,
          randomDelay: { min: 20000, max: 90000 },
          playChance: 0.5
        }
      ],
      randomSounds: [
        {
          name: 'distant_traffic',
          soundPath: 'ambient/misc/car2.wav',
          volume: 0.15,
          loop: false,
          randomDelay: { min: 60000, max: 300000 },
          playChance: 0.3
        }
      ]
    });
  }

  /**
   * Set ambient environment profile
   */
  setEnvironment(profileName: string): boolean {
    const profile = this.ambientProfiles.get(profileName);
    if (!profile) {
      console.warn(`🔇 Ambient profile not found: ${profileName}`);
      return false;
    }

    // Stop current environment
    this.stopCurrentEnvironment();

    this.currentProfile = profile;
    console.log(`🌍 Setting ambient environment: ${profile.name} - ${profile.description}`);

    // Start new environment sounds
    this.startEnvironmentSounds();
    return true;
  }

  /**
   * Start playing environment sounds
   */
  private startEnvironmentSounds(): void {
    if (!this.currentProfile) return;

    const profile = this.currentProfile;

    // Start background music
    if (profile.backgroundMusic) {
      profile.backgroundMusic.forEach(config => {
        this.playAmbientSound(config, 'music');
      });
    }

    // Start atmospheric sounds
    profile.atmosphericSounds.forEach(config => {
      this.playAmbientSound(config, 'ambient');
    });

    // Start machinery sounds
    if (profile.machinerySounds) {
      profile.machinerySounds.forEach(config => {
        this.playAmbientSound(config, 'ambient');
      });
    }

    // Start nature sounds
    if (profile.natureSounds) {
      profile.natureSounds.forEach(config => {
        this.scheduleRandomSound(config);
      });
    }

    // Start weather sounds
    if (profile.weatherSounds) {
      profile.weatherSounds.forEach(config => {
        this.playAmbientSound(config, 'ambient');
      });
    }

    // Schedule random sounds
    profile.randomSounds.forEach(config => {
      this.scheduleRandomSound(config);
    });
  }

  /**
   * Play a single ambient sound
   */
  private playAmbientSound(config: AmbientSoundConfig, category: 'music' | 'ambient'): void {
    try {
      const volume = this.calculateVolume(config.volume, category);
      
      // Use simplified audio manager
      this.audioManager.play(
        config.soundPath,
        config.position,
        {
          volume,
          loop: config.loop,
          category: category
        }
      );

      console.log(`🔊 Playing ambient sound: ${config.name} (${config.soundPath})`);
    } catch (error) {
      console.warn(`🔇 Failed to play ambient sound: ${config.name}`, error);
    }
  }

  /**
   * Schedule random sound to play at intervals
   */
  private scheduleRandomSound(config: AmbientSoundConfig): void {
    if (!config.randomDelay) return;

    const scheduleNext = () => {
      const delay = config.randomDelay!.min + 
        Math.random() * (config.randomDelay!.max - config.randomDelay!.min);

      const timer = setTimeout(() => {
        if (Math.random() < (config.playChance || 1.0)) {
          this.playAmbientSound(config, 'ambient');
        }
        scheduleNext(); // Schedule next occurrence
      }, delay);

      this.randomSoundTimers.set(config.name, timer);
    };

    scheduleNext();
  }

  /**
   * Calculate final volume based on category and master settings
   */
  private calculateVolume(baseVolume: number, category: 'music' | 'ambient'): number {
    const categoryVolume = category === 'music' ? this.musicVolume : this.effectsVolume;
    return baseVolume * categoryVolume * this.masterVolume;
  }

  /**
   * Stop current environment and cleanup
   */
  private stopCurrentEnvironment(): void {
    // Clear random sound timers
    this.randomSoundTimers.forEach(timer => clearTimeout(timer));
    this.randomSoundTimers.clear();

    // Stop active sounds
    this.activeSounds.forEach(({ audio }) => {
      audio.pause();
      audio.currentTime = 0;
    });
    this.activeSounds.clear();

    // Stop ambient sounds in audio manager
    this.audioManager.stopCategory('ambient');
    this.audioManager.stopCategory('music');
  }

  /**
   * Set master volume (0-1)
   */
  setMasterVolume(volume: number): void {
    this.masterVolume = Math.max(0, Math.min(1, volume));
    this.updateAllVolumes();
  }

  /**
   * Set music volume (0-1)
   */
  setMusicVolume(volume: number): void {
    this.musicVolume = Math.max(0, Math.min(1, volume));
    this.updateAllVolumes();
  }

  /**
   * Set effects volume (0-1)
   */
  setEffectsVolume(volume: number): void {
    this.effectsVolume = Math.max(0, Math.min(1, volume));
    this.updateAllVolumes();
  }

  /**
   * Update volume for all active sounds
   */
  private updateAllVolumes(): void {
    // This would require keeping track of active sounds and updating their volumes
    // For now, just restart the current environment
    if (this.currentProfile) {
      const currentProfileName = this.currentProfile.name;
      this.setEnvironment(currentProfileName);
    }
  }

  /**
   * Get available environment profiles
   */
  getAvailableProfiles(): string[] {
    return Array.from(this.ambientProfiles.keys());
  }

  /**
   * Get current profile info
   */
  getCurrentProfile(): EnvironmentAmbientProfile | null {
    return this.currentProfile;
  }

  /**
   * Stop all ambient sounds
   */
  stopAll(): void {
    this.stopCurrentEnvironment();
    this.currentProfile = null;
  }

  /**
   * Pause all ambient sounds
   */
  pause(): void {
    this.activeSounds.forEach(({ audio }) => {
      audio.pause();
    });
    
    // Pause random timers
    this.randomSoundTimers.forEach(timer => clearTimeout(timer));
  }

  /**
   * Resume all ambient sounds
   */
  resume(): void {
    this.activeSounds.forEach(({ audio }) => {
      audio.play().catch(err => console.warn('Failed to resume ambient sound:', err));
    });

    // Reschedule random sounds
    if (this.currentProfile) {
      this.currentProfile.randomSounds.forEach(config => {
        this.scheduleRandomSound(config);
      });
      
      if (this.currentProfile.natureSounds) {
        this.currentProfile.natureSounds.forEach(config => {
          this.scheduleRandomSound(config);
        });
      }
    }
  }

  /**
   * Add custom ambient profile
   */
  addCustomProfile(profile: EnvironmentAmbientProfile): void {
    this.ambientProfiles.set(profile.name, profile);
    console.log(`🌍 Added custom ambient profile: ${profile.name}`);
  }
}