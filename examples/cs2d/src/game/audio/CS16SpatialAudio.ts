/**
 * CS 1.6 Advanced 3D Spatial Audio System
 * Provides realistic sound propagation, environmental effects, and occlusion
 */

import { Vector2D } from '../physics/PhysicsEngine';

export interface AudioEnvironment {
  name: string;
  reverbDecay: number;
  reverbDelay: number;
  reverbGain: number;
  absorption: number;
  reflectivity: number;
  roomSize: number;
  dampening: number;
}

export interface SoundOcclusion {
  isOccluded: boolean;
  occlusionFactor: number; // 0 = fully occluded, 1 = no occlusion
  material: 'thin_wall' | 'thick_wall' | 'metal' | 'wood' | 'glass' | 'concrete';
}

export interface SpatialAudioConfig {
  maxDistance: number;
  refDistance: number;
  rolloffFactor: number;
  enableOcclusion: boolean;
  enableEnvironmentalAudio: boolean;
  enableDistanceFiltering: boolean;
  enableDoppler: boolean;
}

export class CS16SpatialAudio {
  private context: AudioContext;
  private environments: Map<string, AudioEnvironment> = new Map();
  private currentEnvironment: AudioEnvironment;
  private config: SpatialAudioConfig;
  
  // Audio nodes for environmental effects
  private reverbConvolver: ConvolverNode;
  private reverbGain: GainNode;
  private dryGain: GainNode;
  private masterCompressor: DynamicsCompressorNode;
  
  constructor(context: AudioContext, config: Partial<SpatialAudioConfig> = {}) {
    this.context = context;
    this.config = {
      maxDistance: 1000,
      refDistance: 50,
      rolloffFactor: 1.2,
      enableOcclusion: true,
      enableEnvironmentalAudio: true,
      enableDistanceFiltering: true,
      enableDoppler: false,
      ...config
    };
    
    this.initializeEnvironments();
    this.setupAudioChain();
    this.currentEnvironment = this.environments.get('outdoor')!;
  }
  
  /**
   * Initialize predefined audio environments for different CS 1.6 areas
   */
  private initializeEnvironments(): void {
    const environments: AudioEnvironment[] = [
      {
        name: 'outdoor',
        reverbDecay: 0.3,
        reverbDelay: 0.02,
        reverbGain: 0.1,
        absorption: 0.8,
        reflectivity: 0.2,
        roomSize: 1.0,
        dampening: 0.1
      },
      {
        name: 'indoor_small',
        reverbDecay: 0.8,
        reverbDelay: 0.05,
        reverbGain: 0.3,
        absorption: 0.4,
        reflectivity: 0.6,
        roomSize: 0.3,
        dampening: 0.3
      },
      {
        name: 'indoor_large',
        reverbDecay: 1.5,
        reverbDelay: 0.1,
        reverbGain: 0.4,
        absorption: 0.3,
        reflectivity: 0.7,
        roomSize: 0.8,
        dampening: 0.2
      },
      {
        name: 'tunnel',
        reverbDecay: 2.0,
        reverbDelay: 0.15,
        reverbGain: 0.6,
        absorption: 0.2,
        reflectivity: 0.8,
        roomSize: 0.5,
        dampening: 0.1
      },
      {
        name: 'warehouse',
        reverbDecay: 2.5,
        reverbDelay: 0.2,
        reverbGain: 0.5,
        absorption: 0.25,
        reflectivity: 0.75,
        roomSize: 0.9,
        dampening: 0.15
      },
      {
        name: 'sewers',
        reverbDecay: 3.0,
        reverbDelay: 0.25,
        reverbGain: 0.7,
        absorption: 0.15,
        reflectivity: 0.85,
        roomSize: 0.6,
        dampening: 0.05
      },
      {
        name: 'underground',
        reverbDecay: 2.8,
        reverbDelay: 0.18,
        reverbGain: 0.65,
        absorption: 0.2,
        reflectivity: 0.8,
        roomSize: 0.7,
        dampening: 0.1
      }
    ];
    
    environments.forEach(env => {
      this.environments.set(env.name, env);
    });
  }
  
  /**
   * Setup the audio processing chain
   */
  private setupAudioChain(): void {
    // Create reverb convolver
    this.reverbConvolver = this.context.createConvolver();
    this.generateImpulseResponse();
    
    // Create gain nodes for dry/wet mixing
    this.reverbGain = this.context.createGain();
    this.dryGain = this.context.createGain();
    
    // Create master compressor for dynamic range control
    this.masterCompressor = this.context.createDynamicsCompressor();
    this.masterCompressor.threshold.value = -24;
    this.masterCompressor.knee.value = 30;
    this.masterCompressor.ratio.value = 12;
    this.masterCompressor.attack.value = 0.003;
    this.masterCompressor.release.value = 0.25;
    
    // Connect reverb chain
    this.reverbConvolver.connect(this.reverbGain);
    this.updateEnvironmentSettings();
  }
  
  /**
   * Generate impulse response for reverb
   */
  private generateImpulseResponse(): void {
    const length = this.context.sampleRate * 2; // 2 second reverb
    const impulse = this.context.createBuffer(2, length, this.context.sampleRate);
    
    for (let channel = 0; channel < 2; channel++) {
      const channelData = impulse.getChannelData(channel);
      for (let i = 0; i < length; i++) {
        const decay = Math.pow(1 - i / length, this.currentEnvironment.reverbDecay);
        channelData[i] = (Math.random() * 2 - 1) * decay * 0.5;
      }
    }
    
    this.reverbConvolver.buffer = impulse;
  }
  
  /**
   * Create enhanced 3D panner with environmental effects
   */
  createSpatialPanner(
    sourcePosition: Vector2D,
    listenerPosition: Vector2D,
    listenerRotation: number = 0,
    occlusion?: SoundOcclusion
  ): {
    pannerNode: PannerNode;
    filterNode: BiquadFilterNode;
    occlusionGain: GainNode;
    connectToDestination: (destination: AudioNode) => void;
  } {
    // Create panner node
    const pannerNode = this.context.createPanner();
    pannerNode.panningModel = 'HRTF';
    pannerNode.distanceModel = 'inverse';
    pannerNode.refDistance = this.config.refDistance;
    pannerNode.maxDistance = this.config.maxDistance;
    pannerNode.rolloffFactor = this.config.rolloffFactor;
    pannerNode.coneInnerAngle = 360;
    pannerNode.coneOuterAngle = 0;
    pannerNode.coneOuterGain = 0;
    
    // Calculate 3D position
    const relativeX = (sourcePosition.x - listenerPosition.x) / 100;
    const relativeZ = (sourcePosition.y - listenerPosition.y) / 100;
    const relativeY = 0; // 2D game, so Y is always 0
    
    pannerNode.setPosition(relativeX, relativeY, relativeZ);
    
    // Set listener orientation
    const forward = {
      x: Math.cos(listenerRotation),
      y: 0,
      z: Math.sin(listenerRotation)
    };
    const up = { x: 0, y: 1, z: 0 };
    
    if (this.context.listener.forwardX) {
      this.context.listener.forwardX.value = forward.x;
      this.context.listener.forwardY.value = forward.y;
      this.context.listener.forwardZ.value = forward.z;
      this.context.listener.upX.value = up.x;
      this.context.listener.upY.value = up.y;
      this.context.listener.upZ.value = up.z;
    }
    
    // Create distance-based filtering
    const filterNode = this.context.createBiquadFilter();
    filterNode.type = 'lowpass';
    
    if (this.config.enableDistanceFiltering) {
      const distance = Math.sqrt(relativeX * relativeX + relativeZ * relativeZ) * 100;
      const normalizedDistance = Math.min(distance / this.config.maxDistance, 1);
      
      // High frequencies fall off with distance
      const cutoffFrequency = 20000 * (1 - normalizedDistance * 0.7);
      filterNode.frequency.value = Math.max(cutoffFrequency, 200);
      filterNode.Q.value = 1;
    } else {
      filterNode.frequency.value = 20000; // No filtering
    }
    
    // Create occlusion gain
    const occlusionGain = this.context.createGain();
    if (this.config.enableOcclusion && occlusion) {
      this.applyOcclusion(occlusionGain, filterNode, occlusion);
    } else {
      occlusionGain.gain.value = 1;
    }
    
    // Connection helper
    const connectToDestination = (destination: AudioNode) => {
      pannerNode.connect(filterNode);
      filterNode.connect(occlusionGain);
      
      if (this.config.enableEnvironmentalAudio) {
        // Split signal for dry/wet processing
        const splitter = this.context.createChannelSplitter(2);
        const merger = this.context.createChannelMerger(2);
        
        occlusionGain.connect(splitter);
        
        // Dry path
        splitter.connect(this.dryGain);
        this.dryGain.connect(merger, 0, 0);
        this.dryGain.connect(merger, 0, 1);
        
        // Wet path (reverb)
        splitter.connect(this.reverbConvolver);
        this.reverbConvolver.connect(this.reverbGain);
        this.reverbGain.connect(merger, 0, 0);
        this.reverbGain.connect(merger, 0, 1);
        
        // Final output through compressor
        merger.connect(this.masterCompressor);
        this.masterCompressor.connect(destination);
      } else {
        occlusionGain.connect(destination);
      }
    };
    
    return {
      pannerNode,
      filterNode,
      occlusionGain,
      connectToDestination
    };
  }
  
  /**
   * Apply occlusion effects based on material and obstruction
   */
  private applyOcclusion(
    gainNode: GainNode,
    filterNode: BiquadFilterNode,
    occlusion: SoundOcclusion
  ): void {
    const { occlusionFactor, material } = occlusion;
    
    // Volume reduction based on occlusion
    gainNode.gain.value = 0.2 + (0.8 * occlusionFactor);
    
    // Frequency filtering based on material
    const materialFilters = {
      thin_wall: { cutoff: 8000, q: 1.5 },
      thick_wall: { cutoff: 4000, q: 2.0 },
      metal: { cutoff: 6000, q: 1.8 },
      wood: { cutoff: 5000, q: 1.6 },
      glass: { cutoff: 12000, q: 1.2 },
      concrete: { cutoff: 3000, q: 2.5 }
    };
    
    const filter = materialFilters[material];
    if (filter) {
      filterNode.frequency.value = filter.cutoff * (0.3 + 0.7 * occlusionFactor);
      filterNode.Q.value = filter.q;
    }
  }
  
  /**
   * Check for sound occlusion using line-of-sight
   */
  calculateOcclusion(
    sourcePosition: Vector2D,
    listenerPosition: Vector2D,
    walls: Array<{ start: Vector2D; end: Vector2D; material: SoundOcclusion['material'] }>
  ): SoundOcclusion {
    // Simple line-of-sight check
    const line = {
      start: sourcePosition,
      end: listenerPosition
    };
    
    for (const wall of walls) {
      if (this.lineIntersectsLine(line.start, line.end, wall.start, wall.end)) {
        const distance = this.distanceToLine(sourcePosition, wall.start, wall.end);
        const occlusionFactor = Math.max(0, 1 - distance / 50); // 50 unit range
        
        return {
          isOccluded: true,
          occlusionFactor,
          material: wall.material
        };
      }
    }
    
    return {
      isOccluded: false,
      occlusionFactor: 1,
      material: 'thin_wall'
    };
  }
  
  /**
   * Line intersection helper
   */
  private lineIntersectsLine(a1: Vector2D, a2: Vector2D, b1: Vector2D, b2: Vector2D): boolean {
    const denominator = (b2.y - b1.y) * (a2.x - a1.x) - (b2.x - b1.x) * (a2.y - a1.y);
    if (denominator === 0) return false;
    
    const ua = ((b2.x - b1.x) * (a1.y - b1.y) - (b2.y - b1.y) * (a1.x - b1.x)) / denominator;
    const ub = ((a2.x - a1.x) * (a1.y - b1.y) - (a2.y - a1.y) * (a1.x - b1.x)) / denominator;
    
    return ua >= 0 && ua <= 1 && ub >= 0 && ub <= 1;
  }
  
  /**
   * Distance from point to line helper
   */
  private distanceToLine(point: Vector2D, lineStart: Vector2D, lineEnd: Vector2D): number {
    const A = point.x - lineStart.x;
    const B = point.y - lineStart.y;
    const C = lineEnd.x - lineStart.x;
    const D = lineEnd.y - lineStart.y;
    
    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    
    if (lenSq === 0) return Math.sqrt(A * A + B * B);
    
    let param = dot / lenSq;
    param = Math.max(0, Math.min(1, param));
    
    const xx = lineStart.x + param * C;
    const yy = lineStart.y + param * D;
    
    const dx = point.x - xx;
    const dy = point.y - yy;
    
    return Math.sqrt(dx * dx + dy * dy);
  }
  
  /**
   * Set current audio environment
   */
  setEnvironment(environmentName: string): void {
    const environment = this.environments.get(environmentName);
    if (!environment) {
      console.warn(`🔇 Environment not found: ${environmentName}`);
      return;
    }
    
    this.currentEnvironment = environment;
    this.updateEnvironmentSettings();
    this.generateImpulseResponse(); // Regenerate with new decay settings
  }
  
  /**
   * Update environment settings
   */
  private updateEnvironmentSettings(): void {
    const env = this.currentEnvironment;
    
    // Update gain levels
    this.dryGain.gain.value = 1 - env.reverbGain;
    this.reverbGain.gain.value = env.reverbGain;
    
    // Update compressor based on environment
    this.masterCompressor.threshold.value = -24 - (env.roomSize * 12);
    this.masterCompressor.ratio.value = 12 + (env.dampening * 8);
  }
  
  /**
   * Create custom environment
   */
  createEnvironment(name: string, environment: AudioEnvironment): void {
    this.environments.set(name, environment);
  }
  
  /**
   * Get list of available environments
   */
  getAvailableEnvironments(): string[] {
    return Array.from(this.environments.keys());
  }
  
  /**
   * Get current environment
   */
  getCurrentEnvironment(): AudioEnvironment {
    return this.currentEnvironment;
  }
  
  /**
   * Update spatial audio configuration
   */
  updateConfig(config: Partial<SpatialAudioConfig>): void {
    this.config = { ...this.config, ...config };
  }
  
  /**
   * Get current configuration
   */
  getConfig(): SpatialAudioConfig {
    return { ...this.config };
  }
}