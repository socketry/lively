import { Vector2D } from '../physics/PhysicsEngine';

export interface Sound {
  id: string;
  buffer: AudioBuffer;
  volume: number;
  loop: boolean;
  spatial: boolean;
}

export interface SoundInstance {
  id: string;
  soundId: string;
  source: AudioBufferSourceNode;
  gainNode: GainNode;
  pannerNode?: PannerNode;
  startTime: number;
  loop: boolean;
}

export class AudioManager {
  private context: AudioContext;
  private masterGain: GainNode;
  private sounds: Map<string, Sound> = new Map();
  private instances: Map<string, SoundInstance> = new Map();
  private listenerPosition: Vector2D = { x: 0, y: 0 };
  private soundCategories: Map<string, GainNode> = new Map();
  
  constructor() {
    this.context = new (window.AudioContext || (window as any).webkitAudioContext)();
    this.masterGain = this.context.createGain();
    this.masterGain.connect(this.context.destination);
    this.masterGain.gain.value = 0.7;
    
    this.initializeCategories();
    this.loadSounds();
  }
  
  private initializeCategories(): void {
    const categories = ['master', 'effects', 'weapons', 'footsteps', 'ambient', 'ui', 'voice'];
    
    categories.forEach(category => {
      const gainNode = this.context.createGain();
      gainNode.connect(this.masterGain);
      gainNode.gain.value = 1.0;
      this.soundCategories.set(category, gainNode);
    });
  }
  
  private async loadSounds(): Promise<void> {
    const soundDefinitions = [
      { id: 'ak47_fire', url: '/sounds/weapons/ak47_fire.mp3', category: 'weapons', volume: 0.6 },
      { id: 'm4a4_fire', url: '/sounds/weapons/m4a4_fire.mp3', category: 'weapons', volume: 0.6 },
      { id: 'awp_fire', url: '/sounds/weapons/awp_fire.mp3', category: 'weapons', volume: 0.8 },
      { id: 'deagle_fire', url: '/sounds/weapons/deagle_fire.mp3', category: 'weapons', volume: 0.7 },
      { id: 'glock_fire', url: '/sounds/weapons/glock_fire.mp3', category: 'weapons', volume: 0.5 },
      { id: 'reload', url: '/sounds/weapons/reload.mp3', category: 'weapons', volume: 0.4 },
      { id: 'empty_clip', url: '/sounds/weapons/empty_clip.mp3', category: 'weapons', volume: 0.3 },
      { id: 'weapon_switch', url: '/sounds/weapons/switch.mp3', category: 'weapons', volume: 0.3 },
      { id: 'footstep_1', url: '/sounds/player/footstep_1.mp3', category: 'footsteps', volume: 0.2 },
      { id: 'footstep_2', url: '/sounds/player/footstep_2.mp3', category: 'footsteps', volume: 0.2 },
      { id: 'footstep_3', url: '/sounds/player/footstep_3.mp3', category: 'footsteps', volume: 0.2 },
      { id: 'footstep_4', url: '/sounds/player/footstep_4.mp3', category: 'footsteps', volume: 0.2 },
      { id: 'hit_flesh', url: '/sounds/impacts/hit_flesh.mp3', category: 'effects', volume: 0.5 },
      { id: 'hit_helmet', url: '/sounds/impacts/hit_helmet.mp3', category: 'effects', volume: 0.6 },
      { id: 'hit_wall', url: '/sounds/impacts/hit_wall.mp3', category: 'effects', volume: 0.3 },
      { id: 'explosion', url: '/sounds/effects/explosion.mp3', category: 'effects', volume: 0.8 },
      { id: 'flash_explode', url: '/sounds/effects/flash_explode.mp3', category: 'effects', volume: 0.6 },
      { id: 'smoke_explode', url: '/sounds/effects/smoke_explode.mp3', category: 'effects', volume: 0.4 },
      { id: 'death', url: '/sounds/player/death.mp3', category: 'voice', volume: 0.5 },
      { id: 'hurt_1', url: '/sounds/player/hurt_1.mp3', category: 'voice', volume: 0.4 },
      { id: 'hurt_2', url: '/sounds/player/hurt_2.mp3', category: 'voice', volume: 0.4 },
      { id: 'bomb_plant', url: '/sounds/gameplay/bomb_plant.mp3', category: 'effects', volume: 0.5 },
      { id: 'bomb_defuse', url: '/sounds/gameplay/bomb_defuse.mp3', category: 'effects', volume: 0.5 },
      { id: 'bomb_tick', url: '/sounds/gameplay/bomb_tick.mp3', category: 'effects', volume: 0.3 },
      { id: 'round_start', url: '/sounds/gameplay/round_start.mp3', category: 'ui', volume: 0.5 },
      { id: 'round_end', url: '/sounds/gameplay/round_end.mp3', category: 'ui', volume: 0.5 },
      { id: 'buy_item', url: '/sounds/ui/buy_item.mp3', category: 'ui', volume: 0.3 },
      { id: 'menu_click', url: '/sounds/ui/menu_click.mp3', category: 'ui', volume: 0.2 },
      { id: 'ambient_wind', url: '/sounds/ambient/wind.mp3', category: 'ambient', volume: 0.1, loop: true },
    ];
    
    await Promise.all(soundDefinitions.map(def => this.createPlaceholderSound(def)));
  }
  
  private async createPlaceholderSound(definition: any): Promise<void> {
    const oscillator = this.context.createOscillator();
    const duration = 0.1;
    const sampleRate = this.context.sampleRate;
    const buffer = this.context.createBuffer(1, sampleRate * duration, sampleRate);
    const channel = buffer.getChannelData(0);
    
    const frequency = definition.id.includes('fire') ? 200 : 
                     definition.id.includes('explosion') ? 80 :
                     definition.id.includes('footstep') ? 150 : 300;
    
    for (let i = 0; i < channel.length; i++) {
      channel[i] = Math.sin(2 * Math.PI * frequency * i / sampleRate) * 
                   Math.exp(-i / (channel.length * 0.3)) *
                   (Math.random() * 0.2 - 0.1);
    }
    
    this.sounds.set(definition.id, {
      id: definition.id,
      buffer,
      volume: definition.volume || 1,
      loop: definition.loop || false,
      spatial: definition.category !== 'ui' && definition.category !== 'ambient'
    });
  }
  
  async loadSound(id: string, url: string, options: Partial<Sound> = {}): Promise<void> {
    try {
      const response = await fetch(url);
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await this.context.decodeAudioData(arrayBuffer);
      
      this.sounds.set(id, {
        id,
        buffer: audioBuffer,
        volume: options.volume || 1,
        loop: options.loop || false,
        spatial: options.spatial !== undefined ? options.spatial : true
      });
    } catch (error) {
      console.error(`Failed to load sound: ${id}`, error);
      await this.createPlaceholderSound({ id, ...options });
    }
  }
  
  play(
    soundId: string,
    position?: Vector2D,
    options: {
      volume?: number;
      pitch?: number;
      delay?: number;
      category?: string;
    } = {}
  ): string | null {
    const sound = this.sounds.get(soundId);
    if (!sound) {
      console.warn(`Sound not found: ${soundId}`);
      return null;
    }
    
    const source = this.context.createBufferSource();
    source.buffer = sound.buffer;
    source.loop = sound.loop;
    
    if (options.pitch) {
      source.playbackRate.value = options.pitch;
    }
    
    const gainNode = this.context.createGain();
    gainNode.gain.value = sound.volume * (options.volume || 1);
    
    let finalNode: AudioNode = gainNode;
    
    if (sound.spatial && position) {
      const pannerNode = this.context.createPanner();
      pannerNode.panningModel = 'HRTF';
      pannerNode.distanceModel = 'inverse';
      pannerNode.refDistance = 100;
      pannerNode.maxDistance = 1000;
      pannerNode.rolloffFactor = 1;
      pannerNode.coneInnerAngle = 360;
      pannerNode.coneOuterAngle = 0;
      pannerNode.coneOuterGain = 0;
      
      const relativeX = (position.x - this.listenerPosition.x) / 100;
      const relativeY = 0;
      const relativeZ = (position.y - this.listenerPosition.y) / 100;
      
      pannerNode.setPosition(relativeX, relativeY, relativeZ);
      
      source.connect(gainNode);
      gainNode.connect(pannerNode);
      finalNode = pannerNode;
    } else {
      source.connect(gainNode);
    }
    
    const categoryNode = this.soundCategories.get(options.category || 'effects') || this.masterGain;
    finalNode.connect(categoryNode);
    
    const instanceId = `${soundId}_${Date.now()}_${Math.random()}`;
    const instance: SoundInstance = {
      id: instanceId,
      soundId,
      source,
      gainNode,
      pannerNode: sound.spatial && position ? finalNode as PannerNode : undefined,
      startTime: this.context.currentTime + (options.delay || 0),
      loop: sound.loop
    };
    
    this.instances.set(instanceId, instance);
    
    source.start(instance.startTime);
    
    if (!sound.loop) {
      source.onended = () => {
        this.instances.delete(instanceId);
      };
    }
    
    return instanceId;
  }
  
  stop(instanceId: string, fadeOut: number = 0): void {
    const instance = this.instances.get(instanceId);
    if (!instance) return;
    
    if (fadeOut > 0) {
      instance.gainNode.gain.exponentialRampToValueAtTime(
        0.001,
        this.context.currentTime + fadeOut
      );
      setTimeout(() => {
        instance.source.stop();
        this.instances.delete(instanceId);
      }, fadeOut * 1000);
    } else {
      instance.source.stop();
      this.instances.delete(instanceId);
    }
  }
  
  stopAll(category?: string, fadeOut: number = 0): void {
    this.instances.forEach((instance, id) => {
      if (!category || this.getSoundCategory(instance.soundId) === category) {
        this.stop(id, fadeOut);
      }
    });
  }
  
  private getSoundCategory(soundId: string): string {
    if (soundId.includes('fire') || soundId.includes('reload')) return 'weapons';
    if (soundId.includes('footstep')) return 'footsteps';
    if (soundId.includes('ambient')) return 'ambient';
    if (soundId.includes('menu') || soundId.includes('round')) return 'ui';
    if (soundId.includes('death') || soundId.includes('hurt')) return 'voice';
    return 'effects';
  }
  
  setListenerPosition(position: Vector2D): void {
    this.listenerPosition = position;
    
    if (this.context.listener.positionX) {
      this.context.listener.positionX.value = 0;
      this.context.listener.positionY.value = 0;
      this.context.listener.positionZ.value = 0;
    } else {
      this.context.listener.setPosition(0, 0, 0);
    }
  }
  
  setVolume(category: string, volume: number): void {
    const gainNode = this.soundCategories.get(category);
    if (gainNode) {
      gainNode.gain.value = Math.max(0, Math.min(1, volume));
    }
  }
  
  getVolume(category: string): number {
    const gainNode = this.soundCategories.get(category);
    return gainNode ? gainNode.gain.value : 0;
  }
  
  setMasterVolume(volume: number): void {
    this.masterGain.gain.value = Math.max(0, Math.min(1, volume));
  }
  
  getMasterVolume(): number {
    return this.masterGain.gain.value;
  }
  
  mute(): void {
    this.masterGain.gain.value = 0;
  }
  
  unmute(): void {
    this.masterGain.gain.value = 0.7;
  }
  
  playFootstep(position: Vector2D): void {
    const footstepIndex = Math.floor(Math.random() * 4) + 1;
    this.play(`footstep_${footstepIndex}`, position, {
      volume: 0.3 + Math.random() * 0.2,
      pitch: 0.9 + Math.random() * 0.2,
      category: 'footsteps'
    });
  }
  
  playWeaponFire(weapon: string, position: Vector2D): void {
    const soundMap: Record<string, string> = {
      'ak47': 'ak47_fire',
      'm4a4': 'm4a4_fire',
      'm4a1': 'm4a4_fire',
      'awp': 'awp_fire',
      'deagle': 'deagle_fire',
      'glock': 'glock_fire',
      'usp': 'glock_fire',
      'p250': 'glock_fire'
    };
    
    const soundId = soundMap[weapon.toLowerCase()] || 'glock_fire';
    this.play(soundId, position, {
      volume: 0.8,
      category: 'weapons'
    });
  }
  
  playHitSound(headshot: boolean, position: Vector2D): void {
    this.play(headshot ? 'hit_helmet' : 'hit_flesh', position, {
      volume: 0.6,
      category: 'effects'
    });
  }
  
  cleanup(): void {
    this.stopAll();
    this.instances.clear();
    this.context.close();
  }
}