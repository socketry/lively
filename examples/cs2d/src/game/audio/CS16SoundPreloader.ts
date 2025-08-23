/**
 * CS 1.6 Sound Preloader and Caching System
 * Handles efficient loading, caching, and management of all CS 1.6 audio assets
 */

import { CS16SoundLoader } from './CS16SoundLoader';

export interface SoundCache {
  audio: HTMLAudioElement;
  loaded: boolean;
  loading: boolean;
  error: boolean;
  lastUsed: number;
  useCount: number;
  size: number; // In bytes if available
}

export interface PreloadProgress {
  totalSounds: number;
  loadedSounds: number;
  failedSounds: number;
  progress: number; // 0-1
  currentSound: string;
  estimatedTimeRemaining: number; // In seconds
  bytesLoaded: number;
  totalBytes: number;
}

export interface PreloadOptions {
  prioritySounds?: string[];
  maxConcurrentLoads?: number;
  cacheLimit?: number; // Max number of sounds to keep in cache
  memoryLimit?: number; // Max memory usage in MB
  enableCompression?: boolean;
  retryCount?: number;
  timeout?: number; // Per-sound timeout in ms
}

export class CS16SoundPreloader {
  private cache: Map<string, SoundCache> = new Map();
  private loadQueue: string[] = [];
  private activeLoads: Set<string> = new Set();
  private loadPromises: Map<string, Promise<HTMLAudioElement>> = new Map();
  
  private options: PreloadOptions;
  private progress: PreloadProgress;
  private startTime: number = 0;
  private onProgressCallback?: (progress: PreloadProgress) => void;
  private onCompleteCallback?: (success: boolean) => void;

  constructor(options: PreloadOptions = {}) {
    this.options = {
      maxConcurrentLoads: 8,
      cacheLimit: 500,
      memoryLimit: 100, // 100MB
      enableCompression: false,
      retryCount: 3,
      timeout: 10000,
      ...options
    };

    this.progress = {
      totalSounds: 0,
      loadedSounds: 0,
      failedSounds: 0,
      progress: 0,
      currentSound: '',
      estimatedTimeRemaining: 0,
      bytesLoaded: 0,
      totalBytes: 0
    };
  }

  /**
   * Start preloading all CS 1.6 sounds
   */
  async preloadAll(
    onProgress?: (progress: PreloadProgress) => void,
    onComplete?: (success: boolean) => void
  ): Promise<boolean> {
    this.onProgressCallback = onProgress;
    this.onCompleteCallback = onComplete;
    this.startTime = performance.now();

    console.log('🎵 Starting CS 1.6 sound preload...');

    // Get all sound definitions
    const soundDefinitions = CS16SoundLoader.generateSoundDefinitions();
    const allSounds = new Set<string>();

    // Collect all unique sound paths
    Object.values(soundDefinitions).forEach(category => {
      Object.values(category).forEach(sounds => {
        if (Array.isArray(sounds)) {
          sounds.forEach(sound => allSounds.add(sound));
        } else if (typeof sounds === 'string') {
          allSounds.add(sounds);
        } else if (typeof sounds === 'object') {
          Object.values(sounds).forEach(sound => {
            if (Array.isArray(sound)) {
              sound.forEach(s => allSounds.add(s));
            } else if (typeof sound === 'string') {
              allSounds.add(sound);
            }
          });
        }
      });
    });

    this.loadQueue = Array.from(allSounds);
    this.progress.totalSounds = this.loadQueue.length;

    // Prioritize important sounds
    if (this.options.prioritySounds) {
      this.loadQueue = this.prioritizeSounds(this.loadQueue, this.options.prioritySounds);
    }

    console.log(`📦 Queued ${this.progress.totalSounds} sounds for preload`);
    
    try {
      await this.processLoadQueue();
      const success = this.progress.failedSounds === 0;
      
      console.log(`✅ Preload complete: ${this.progress.loadedSounds}/${this.progress.totalSounds} sounds loaded`);
      if (this.progress.failedSounds > 0) {
        console.warn(`⚠️ ${this.progress.failedSounds} sounds failed to load`);
      }

      this.onCompleteCallback?.(success);
      return success;
    } catch (error) {
      console.error('❌ Preload failed:', error);
      this.onCompleteCallback?.(false);
      return false;
    }
  }

  /**
   * Preload specific sounds
   */
  async preloadSounds(soundPaths: string[]): Promise<Map<string, boolean>> {
    const results = new Map<string, boolean>();
    
    for (const soundPath of soundPaths) {
      try {
        const audio = await this.loadSound(soundPath);
        results.set(soundPath, true);
      } catch (error) {
        console.warn(`Failed to preload ${soundPath}:`, error);
        results.set(soundPath, false);
      }
    }

    return results;
  }

  /**
   * Process the load queue with concurrent loading
   */
  private async processLoadQueue(): Promise<void> {
    const maxConcurrent = this.options.maxConcurrentLoads!;
    
    while (this.loadQueue.length > 0 || this.activeLoads.size > 0) {
      // Start new loads up to the concurrent limit
      while (this.loadQueue.length > 0 && this.activeLoads.size < maxConcurrent) {
        const soundPath = this.loadQueue.shift()!;
        this.startSoundLoad(soundPath);
      }

      // Wait for at least one load to complete
      if (this.activeLoads.size > 0) {
        await Promise.race(Array.from(this.activeLoads).map(path => 
          this.loadPromises.get(path)!.catch(() => {})
        ));
      }

      this.updateProgress();
    }
  }

  /**
   * Start loading a single sound
   */
  private startSoundLoad(soundPath: string): void {
    this.activeLoads.add(soundPath);
    this.progress.currentSound = soundPath;

    const loadPromise = this.loadSoundWithRetry(soundPath)
      .then(audio => {
        this.onSoundLoaded(soundPath, audio);
        return audio;
      })
      .catch(error => {
        this.onSoundFailed(soundPath, error);
        throw error;
      })
      .finally(() => {
        this.activeLoads.delete(soundPath);
        this.loadPromises.delete(soundPath);
      });

    this.loadPromises.set(soundPath, loadPromise);
  }

  /**
   * Load sound with retry logic
   */
  private async loadSoundWithRetry(soundPath: string): Promise<HTMLAudioElement> {
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt <= this.options.retryCount!; attempt++) {
      try {
        if (attempt > 0) {
          console.log(`🔄 Retry ${attempt}/${this.options.retryCount} for ${soundPath}`);
          await this.delay(1000 * attempt); // Exponential backoff
        }
        
        return await this.loadSoundDirect(soundPath);
      } catch (error) {
        lastError = error as Error;
      }
    }

    throw lastError;
  }

  /**
   * Load sound directly with fallback system
   */
  private async loadSoundDirect(soundPath: string): Promise<HTMLAudioElement> {
    return new Promise((resolve, reject) => {
      const audio = new Audio();
      let attemptCount = 0;
      const maxAttempts = 3;
      
      const sources = [
        `/cstrike/sound/${soundPath}`,
        `/sounds/fallback/${this.getFallbackSound(soundPath)}`,
        `/sounds/ui/click.wav` // Ultimate fallback
      ];
      
      const tryNextSource = () => {
        if (attemptCount >= sources.length) {
          reject(new Error(`All sources failed for: ${soundPath}`));
          return;
        }
        
        const timeout = setTimeout(() => {
          clearTimeout(timeout);
          attemptCount++;
          tryNextSource();
        }, this.options.timeout! / sources.length);

        const onLoad = () => {
          clearTimeout(timeout);
          audio.removeEventListener('canplaythrough', onLoad);
          audio.removeEventListener('error', onError);
          console.log(`✅ Loaded sound: ${soundPath} from ${sources[attemptCount]}`);
          resolve(audio);
        };

        const onError = () => {
          clearTimeout(timeout);
          audio.removeEventListener('canplaythrough', onLoad);
          audio.removeEventListener('error', onError);
          console.warn(`⚠️ Failed to load: ${sources[attemptCount]}, trying next...`);
          attemptCount++;
          tryNextSource();
        };

        audio.addEventListener('canplaythrough', onLoad, { once: true });
        audio.addEventListener('error', onError, { once: true });

        // Set source and start loading
        audio.src = sources[attemptCount];
        audio.preload = 'auto';
        audio.load();
      };
      
      tryNextSource();
    });
  }
  
  /**
   * Get fallback sound for a given sound path
   */
  private getFallbackSound(soundPath: string): string {
    // Categorize sounds and provide appropriate fallbacks
    if (soundPath.includes('weapon')) {
      return 'weapon_generic.wav';
    } else if (soundPath.includes('footstep') || soundPath.includes('step')) {
      return 'step_generic.wav';
    } else if (soundPath.includes('reload')) {
      return 'reload_generic.wav';
    } else if (soundPath.includes('radio')) {
      return 'radio_beep.wav';
    } else if (soundPath.includes('ambient')) {
      return 'ambient_generic.wav';
    } else {
      return 'click.wav'; // Generic fallback
    }
  }

  /**
   * Handle successful sound load
   */
  private onSoundLoaded(soundPath: string, audio: HTMLAudioElement): void {
    const cacheEntry: SoundCache = {
      audio,
      loaded: true,
      loading: false,
      error: false,
      lastUsed: Date.now(),
      useCount: 0,
      size: this.estimateAudioSize(audio)
    };

    this.cache.set(soundPath, cacheEntry);
    this.progress.loadedSounds++;
    this.progress.bytesLoaded += cacheEntry.size;

    // Check cache limits
    this.enforceCacheLimits();
  }

  /**
   * Handle failed sound load
   */
  private onSoundFailed(soundPath: string, error: Error): void {
    console.warn(`❌ Failed to load ${soundPath}:`, error.message);
    
    const cacheEntry: SoundCache = {
      audio: new Audio(),
      loaded: false,
      loading: false,
      error: true,
      lastUsed: Date.now(),
      useCount: 0,
      size: 0
    };

    this.cache.set(soundPath, cacheEntry);
    this.progress.failedSounds++;
  }

  /**
   * Update progress and call callback
   */
  private updateProgress(): void {
    const completed = this.progress.loadedSounds + this.progress.failedSounds;
    this.progress.progress = completed / this.progress.totalSounds;

    // Estimate time remaining
    if (completed > 0) {
      const elapsed = (performance.now() - this.startTime) / 1000;
      const rate = completed / elapsed;
      const remaining = this.progress.totalSounds - completed;
      this.progress.estimatedTimeRemaining = remaining / rate;
    }

    this.onProgressCallback?.(this.progress);
  }

  /**
   * Prioritize sounds based on importance
   */
  private prioritizeSounds(sounds: string[], prioritySounds: string[]): string[] {
    const priority: string[] = [];
    const regular: string[] = [];

    sounds.forEach(sound => {
      if (prioritySounds.some(p => sound.includes(p))) {
        priority.push(sound);
      } else {
        regular.push(sound);
      }
    });

    return [...priority, ...regular];
  }

  /**
   * Enforce cache limits
   */
  private enforceCacheLimits(): void {
    if (this.cache.size <= this.options.cacheLimit!) return;

    // Sort by last used time (LRU)
    const entries = Array.from(this.cache.entries())
      .sort(([, a], [, b]) => a.lastUsed - b.lastUsed);

    // Remove oldest entries
    const toRemove = this.cache.size - this.options.cacheLimit!;
    for (let i = 0; i < toRemove; i++) {
      const [path] = entries[i];
      this.cache.delete(path);
      console.log(`🗑️ Removed ${path} from cache (LRU)`);
    }
  }

  /**
   * Get cached sound
   */
  getSound(soundPath: string): HTMLAudioElement | null {
    const cached = this.cache.get(soundPath);
    if (cached && cached.loaded) {
      cached.lastUsed = Date.now();
      cached.useCount++;
      return cached.audio.cloneNode() as HTMLAudioElement;
    }
    return null;
  }

  /**
   * Check if sound is loaded
   */
  isLoaded(soundPath: string): boolean {
    const cached = this.cache.get(soundPath);
    return cached ? cached.loaded : false;
  }

  /**
   * Load sound on demand if not cached
   */
  async loadSound(soundPath: string): Promise<HTMLAudioElement> {
    const cached = this.cache.get(soundPath);
    
    if (cached && cached.loaded) {
      cached.lastUsed = Date.now();
      cached.useCount++;
      return cached.audio.cloneNode() as HTMLAudioElement;
    }

    if (cached && cached.loading) {
      // Wait for existing load
      const promise = this.loadPromises.get(soundPath);
      if (promise) {
        return promise;
      }
    }

    // Load new sound
    return this.loadSoundWithRetry(soundPath);
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    totalSounds: number;
    loadedSounds: number;
    failedSounds: number;
    cacheSize: number;
    memoryUsage: number;
    hitRate: number;
  } {
    let totalUseCount = 0;
    let totalHits = 0;
    let memoryUsage = 0;

    this.cache.forEach(entry => {
      totalUseCount += entry.useCount;
      if (entry.loaded) totalHits += entry.useCount;
      memoryUsage += entry.size;
    });

    return {
      totalSounds: this.cache.size,
      loadedSounds: Array.from(this.cache.values()).filter(c => c.loaded).length,
      failedSounds: Array.from(this.cache.values()).filter(c => c.error).length,
      cacheSize: this.cache.size,
      memoryUsage: memoryUsage / (1024 * 1024), // MB
      hitRate: totalUseCount > 0 ? totalHits / totalUseCount : 0
    };
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
    console.log('🗑️ Sound cache cleared');
  }

  /**
   * Estimate audio file size (rough estimate)
   */
  private estimateAudioSize(audio: HTMLAudioElement): number {
    // Rough estimate: duration * sample rate * channels * bit depth
    // This is a very rough estimate since we don't have access to the actual file size
    if (audio.duration && !isNaN(audio.duration)) {
      return Math.round(audio.duration * 44100 * 2 * 2); // 44.1kHz, stereo, 16-bit
    }
    return 50000; // 50KB default estimate
  }

  /**
   * Utility delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get preload progress
   */
  getProgress(): PreloadProgress {
    return { ...this.progress };
  }

  /**
   * Check if preload is complete
   */
  isPreloadComplete(): boolean {
    return this.progress.progress >= 1.0;
  }
}