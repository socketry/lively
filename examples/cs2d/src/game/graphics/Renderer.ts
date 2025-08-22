import { Vector2D } from '../physics/PhysicsEngine';

export interface Camera {
  x: number;
  y: number;
  zoom: number;
  rotation: number;
  screenWidth: number;
  screenHeight: number;
  followTarget?: Vector2D;
  smoothing: number;
}

export interface Sprite {
  image: HTMLImageElement;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  scale: number;
  opacity: number;
  tint?: string;
}

export interface ParticleEffect {
  id: string;
  x: number;
  y: number;
  particles: Particle[];
  emitting: boolean;
  lifetime: number;
  type: 'explosion' | 'smoke' | 'blood' | 'muzzleFlash' | 'bulletTrail' | 'spark';
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  opacity: number;
}

export class Renderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private camera: Camera;
  private sprites: Map<string, Sprite> = new Map();
  private particleEffects: Map<string, ParticleEffect> = new Map();
  private layers: Map<number, Set<string>> = new Map();
  private shadowCanvas: HTMLCanvasElement;
  private shadowCtx: CanvasRenderingContext2D;
  private lightSources: Map<string, LightSource> = new Map();
  
  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false })!;
    this.ctx.imageSmoothingEnabled = false;
    
    this.shadowCanvas = document.createElement('canvas');
    this.shadowCanvas.width = canvas.width;
    this.shadowCanvas.height = canvas.height;
    this.shadowCtx = this.shadowCanvas.getContext('2d')!;
    
    this.camera = {
      x: 0,
      y: 0,
      zoom: 1,
      rotation: 0,
      screenWidth: canvas.width,
      screenHeight: canvas.height,
      smoothing: 0.1
    };
    
    this.initLayers();
  }
  
  private initLayers(): void {
    for (let i = 0; i < 10; i++) {
      this.layers.set(i, new Set());
    }
  }
  
  setCamera(camera: Partial<Camera>): void {
    Object.assign(this.camera, camera);
  }
  
  followTarget(target: Vector2D): void {
    this.camera.followTarget = target;
  }
  
  updateCamera(): void {
    if (this.camera.followTarget) {
      const targetX = this.camera.followTarget.x - this.camera.screenWidth / 2;
      const targetY = this.camera.followTarget.y - this.camera.screenHeight / 2;
      
      this.camera.x += (targetX - this.camera.x) * this.camera.smoothing;
      this.camera.y += (targetY - this.camera.y) * this.camera.smoothing;
    }
  }
  
  screenToWorld(screenX: number, screenY: number): Vector2D {
    return {
      x: (screenX + this.camera.x) / this.camera.zoom,
      y: (screenY + this.camera.y) / this.camera.zoom
    };
  }
  
  worldToScreen(worldX: number, worldY: number): Vector2D {
    return {
      x: (worldX - this.camera.x) * this.camera.zoom,
      y: (worldY - this.camera.y) * this.camera.zoom
    };
  }
  
  addSprite(id: string, sprite: Sprite, layer: number = 5): void {
    this.sprites.set(id, sprite);
    this.layers.get(layer)?.add(id);
  }
  
  removeSprite(id: string): void {
    this.sprites.delete(id);
    this.layers.forEach(layer => layer.delete(id));
  }
  
  createParticleEffect(type: ParticleEffect['type'], x: number, y: number): string {
    const id = `particle_${Date.now()}_${Math.random()}`;
    const effect = this.generateParticleEffect(type, x, y);
    effect.id = id;
    this.particleEffects.set(id, effect);
    return id;
  }
  
  private generateParticleEffect(type: ParticleEffect['type'], x: number, y: number): ParticleEffect {
    const particles: Particle[] = [];
    
    switch (type) {
      case 'explosion':
        for (let i = 0; i < 50; i++) {
          const angle = (Math.PI * 2 * i) / 50;
          const speed = 100 + Math.random() * 200;
          particles.push({
            x, y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            life: 1,
            maxLife: 1,
            size: 3 + Math.random() * 4,
            color: `hsl(${Math.random() * 60}, 100%, 50%)`,
            opacity: 1
          });
        }
        break;
        
      case 'smoke':
        for (let i = 0; i < 20; i++) {
          particles.push({
            x: x + (Math.random() - 0.5) * 10,
            y: y + (Math.random() - 0.5) * 10,
            vx: (Math.random() - 0.5) * 20,
            vy: -20 - Math.random() * 30,
            life: 2,
            maxLife: 2,
            size: 10 + Math.random() * 10,
            color: '#666666',
            opacity: 0.5
          });
        }
        break;
        
      case 'blood':
        for (let i = 0; i < 15; i++) {
          const angle = Math.random() * Math.PI * 2;
          const speed = 50 + Math.random() * 100;
          particles.push({
            x, y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed + 50,
            life: 0.5,
            maxLife: 0.5,
            size: 2 + Math.random() * 3,
            color: '#8B0000',
            opacity: 0.8
          });
        }
        break;
        
      case 'muzzleFlash':
        for (let i = 0; i < 10; i++) {
          const angle = (Math.random() - 0.5) * 0.5;
          const speed = 200 + Math.random() * 100;
          particles.push({
            x, y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            life: 0.1,
            maxLife: 0.1,
            size: 3 + Math.random() * 2,
            color: '#FFFF00',
            opacity: 1
          });
        }
        break;
        
      case 'bulletTrail':
        for (let i = 0; i < 5; i++) {
          particles.push({
            x: x - i * 5,
            y,
            vx: 0,
            vy: 0,
            life: 0.2,
            maxLife: 0.2,
            size: 2,
            color: '#FFFF88',
            opacity: 0.6 - i * 0.1
          });
        }
        break;
        
      case 'spark':
        for (let i = 0; i < 8; i++) {
          const angle = Math.random() * Math.PI * 2;
          const speed = 100 + Math.random() * 50;
          particles.push({
            x, y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            life: 0.3,
            maxLife: 0.3,
            size: 1 + Math.random() * 2,
            color: '#FFFFFF',
            opacity: 1
          });
        }
        break;
    }
    
    return {
      id: '',
      x, y,
      particles,
      emitting: true,
      lifetime: 2,
      type
    };
  }
  
  updateParticles(deltaTime: number): void {
    this.particleEffects.forEach((effect, id) => {
      effect.lifetime -= deltaTime;
      
      if (effect.lifetime <= 0 && effect.particles.length === 0) {
        this.particleEffects.delete(id);
        return;
      }
      
      effect.particles = effect.particles.filter(particle => {
        particle.x += particle.vx * deltaTime;
        particle.y += particle.vy * deltaTime;
        particle.vy += 200 * deltaTime;
        particle.vx *= 0.98;
        particle.vy *= 0.98;
        particle.life -= deltaTime;
        particle.opacity = particle.life / particle.maxLife;
        
        return particle.life > 0;
      });
    });
  }
  
  render(): void {
    this.clear();
    this.updateCamera();
    
    this.ctx.save();
    this.ctx.translate(-this.camera.x, -this.camera.y);
    this.ctx.scale(this.camera.zoom, this.camera.zoom);
    
    this.renderLayers();
    this.renderParticles();
    this.renderLighting();
    
    this.ctx.restore();
    
    this.renderUI();
  }
  
  private clear(): void {
    this.ctx.fillStyle = '#1a1a1a';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }
  
  private renderLayers(): void {
    for (let i = 0; i < 10; i++) {
      const layer = this.layers.get(i);
      if (!layer) continue;
      
      layer.forEach(spriteId => {
        const sprite = this.sprites.get(spriteId);
        if (sprite) {
          this.renderSprite(sprite);
        }
      });
    }
  }
  
  private renderSprite(sprite: Sprite): void {
    this.ctx.save();
    
    this.ctx.translate(sprite.x, sprite.y);
    this.ctx.rotate(sprite.rotation);
    this.ctx.scale(sprite.scale, sprite.scale);
    this.ctx.globalAlpha = sprite.opacity;
    
    if (sprite.tint) {
      this.ctx.globalCompositeOperation = 'multiply';
      this.ctx.fillStyle = sprite.tint;
      this.ctx.fillRect(-sprite.width / 2, -sprite.height / 2, sprite.width, sprite.height);
      this.ctx.globalCompositeOperation = 'destination-atop';
    }
    
    this.ctx.drawImage(
      sprite.image,
      -sprite.width / 2,
      -sprite.height / 2,
      sprite.width,
      sprite.height
    );
    
    this.ctx.restore();
  }
  
  private renderParticles(): void {
    this.particleEffects.forEach(effect => {
      effect.particles.forEach(particle => {
        this.ctx.save();
        this.ctx.globalAlpha = particle.opacity;
        this.ctx.fillStyle = particle.color;
        this.ctx.beginPath();
        this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.restore();
      });
    });
  }
  
  private renderLighting(): void {
    if (this.lightSources.size === 0) return;
    
    this.shadowCtx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    this.shadowCtx.fillRect(0, 0, this.shadowCanvas.width, this.shadowCanvas.height);
    
    this.shadowCtx.globalCompositeOperation = 'destination-out';
    
    this.lightSources.forEach(light => {
      const screenPos = this.worldToScreen(light.x, light.y);
      const gradient = this.shadowCtx.createRadialGradient(
        screenPos.x, screenPos.y, 0,
        screenPos.x, screenPos.y, light.radius * this.camera.zoom
      );
      
      gradient.addColorStop(0, `rgba(255, 255, 255, ${light.intensity})`);
      gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
      
      this.shadowCtx.fillStyle = gradient;
      this.shadowCtx.beginPath();
      this.shadowCtx.arc(screenPos.x, screenPos.y, light.radius * this.camera.zoom, 0, Math.PI * 2);
      this.shadowCtx.fill();
    });
    
    this.shadowCtx.globalCompositeOperation = 'source-over';
    this.ctx.drawImage(this.shadowCanvas, 0, 0);
  }
  
  private renderUI(): void {
    // UI rendering is handled separately
  }
  
  addLightSource(id: string, light: LightSource): void {
    this.lightSources.set(id, light);
  }
  
  removeLightSource(id: string): void {
    this.lightSources.delete(id);
  }
  
  drawLine(start: Vector2D, end: Vector2D, color: string, width: number = 1): void {
    const screenStart = this.worldToScreen(start.x, start.y);
    const screenEnd = this.worldToScreen(end.x, end.y);
    
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = width;
    this.ctx.beginPath();
    this.ctx.moveTo(screenStart.x, screenStart.y);
    this.ctx.lineTo(screenEnd.x, screenEnd.y);
    this.ctx.stroke();
  }
  
  drawCircle(center: Vector2D, radius: number, color: string, filled: boolean = true): void {
    const screenPos = this.worldToScreen(center.x, center.y);
    
    this.ctx.beginPath();
    this.ctx.arc(screenPos.x, screenPos.y, radius * this.camera.zoom, 0, Math.PI * 2);
    
    if (filled) {
      this.ctx.fillStyle = color;
      this.ctx.fill();
    } else {
      this.ctx.strokeStyle = color;
      this.ctx.stroke();
    }
  }
  
  drawText(text: string, position: Vector2D, color: string, fontSize: number = 14): void {
    const screenPos = this.worldToScreen(position.x, position.y);
    
    this.ctx.fillStyle = color;
    this.ctx.font = `${fontSize}px Arial`;
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText(text, screenPos.x, screenPos.y);
  }
}

interface LightSource {
  x: number;
  y: number;
  radius: number;
  intensity: number;
  color: string;
}