import { Player, GameState } from '../GameCore';
import { WeaponSystem } from '../weapons/WeaponSystem';

export interface HUDElements {
  health: number;
  armor: number;
  money: number;
  kills: number;
  deaths: number;
  assists: number;
  currentWeapon: string;
  currentAmmo: number;
  reserveAmmo: number;
  isReloading: boolean;
  reloadProgress: number;
  roundTime: string;
  bombTimer?: string;
  ctScore: number;
  tScore: number;
  playersAlive: { ct: number; t: number };
  gameMode: string;
  fps: number;
}

export interface KillFeedEntry {
  id: string;
  killer: string;
  victim: string;
  weapon: string;
  headshot: boolean;
  timestamp: number;
}

export interface CrosshairSettings {
  size: number;
  thickness: number;
  gap: number;
  color: string;
  opacity: number;
  dynamic: boolean; // Changes with movement/shooting
}

export class HUD {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private weaponSystem: WeaponSystem;
  private killFeed: KillFeedEntry[] = [];
  private crosshair: CrosshairSettings;
  private showDebugInfo: boolean = false;
  
  constructor(canvas: HTMLCanvasElement, weaponSystem: WeaponSystem) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Cannot get 2D context');
    this.ctx = ctx;
    this.weaponSystem = weaponSystem;
    
    this.crosshair = {
      size: 20,
      thickness: 2,
      gap: 4,
      color: '#00FF00',
      opacity: 0.8,
      dynamic: true
    };
  }
  
  /**
   * Render the complete HUD
   */
  render(player: Player, gameState: GameState, hudElements: HUDElements): void {
    this.ctx.save();
    
    // Clear any previous HUD drawings
    // Note: We don't clear the entire canvas as game content might be there
    
    // Render HUD elements
    this.renderHealthAndArmor(hudElements.health, hudElements.armor);
    this.renderAmmo(hudElements.currentAmmo, hudElements.reserveAmmo, hudElements.currentWeapon);
    this.renderMoney(hudElements.money);
    this.renderScoreboard(hudElements.ctScore, hudElements.tScore);
    this.renderRoundTimer(hudElements.roundTime, hudElements.bombTimer);
    this.renderPlayerStats(hudElements.kills, hudElements.deaths, hudElements.assists);
    this.renderKillFeed();
    this.renderCrosshair(player);
    this.renderReloadIndicator(hudElements.isReloading, hudElements.reloadProgress);
    this.renderWeaponInfo(hudElements.currentWeapon);
    
    if (this.showDebugInfo) {
      this.renderDebugInfo(hudElements.fps, player);
    }
    
    this.ctx.restore();
  }
  
  /**
   * Render health and armor bars
   */
  private renderHealthAndArmor(health: number, armor: number): void {
    const x = 20;
    const y = this.canvas.height - 80;
    const width = 150;
    const height = 20;
    
    // Health bar background
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    this.ctx.fillRect(x - 2, y - 2, width + 4, height + 4);
    
    // Health bar
    this.ctx.fillStyle = health > 50 ? '#00FF00' : health > 25 ? '#FFFF00' : '#FF0000';
    this.ctx.fillRect(x, y, (health / 100) * width, height);
    
    // Health text
    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.font = 'bold 14px monospace';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(`${Math.ceil(health)}`, x + width / 2, y + 15);
    
    // Armor bar (if has armor)
    if (armor > 0) {
      const armorY = y + height + 5;
      
      // Armor bar background
      this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      this.ctx.fillRect(x - 2, armorY - 2, width + 4, height + 4);
      
      // Armor bar
      this.ctx.fillStyle = '#4169E1'; // Blue for armor
      this.ctx.fillRect(x, armorY, (armor / 100) * width, height);
      
      // Armor text
      this.ctx.fillStyle = '#FFFFFF';
      this.ctx.fillText(`${Math.ceil(armor)}`, x + width / 2, armorY + 15);
      
      // Kevlar icon (simplified)
      this.ctx.fillStyle = '#4169E1';
      this.ctx.fillRect(x - 25, armorY + 2, 16, 16);
    }
    
    // Health cross icon (simplified)
    this.ctx.fillStyle = '#FF0000';
    this.ctx.fillRect(x - 25, y + 6, 16, 8);
    this.ctx.fillRect(x - 21, y + 2, 8, 16);
  }
  
  /**
   * Render ammunition display
   */
  private renderAmmo(currentAmmo: number, reserveAmmo: number, weaponName: string): void {
    const x = this.canvas.width - 200;
    const y = this.canvas.height - 80;
    
    // Ammo background
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    this.ctx.fillRect(x - 10, y - 10, 180, 60);
    
    // Current ammo (large)
    this.ctx.fillStyle = currentAmmo > 5 ? '#FFFFFF' : '#FF0000';
    this.ctx.font = 'bold 32px monospace';
    this.ctx.textAlign = 'right';
    this.ctx.fillText(`${currentAmmo}`, x + 60, y + 25);
    
    // Separator
    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.font = 'bold 24px monospace';
    this.ctx.fillText('/', x + 80, y + 25);
    
    // Reserve ammo
    this.ctx.fillStyle = '#CCCCCC';
    this.ctx.font = 'bold 20px monospace';
    this.ctx.textAlign = 'left';
    this.ctx.fillText(`${reserveAmmo}`, x + 90, y + 25);
    
    // Low ammo warning
    if (currentAmmo <= 5) {
      this.ctx.fillStyle = '#FF0000';
      this.ctx.font = 'bold 12px monospace';
      this.ctx.textAlign = 'center';
      this.ctx.fillText('LOW AMMO', x + 90, y + 45);
    }
  }
  
  /**
   * Render money display
   */
  private renderMoney(money: number): void {
    const x = 20;
    const y = 40;
    
    // Money background
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    this.ctx.fillRect(x - 5, y - 20, 120, 30);
    
    // Dollar sign
    this.ctx.fillStyle = '#00FF00';
    this.ctx.font = 'bold 18px monospace';
    this.ctx.textAlign = 'left';
    this.ctx.fillText('$', x, y);
    
    // Money amount
    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.fillText(`${money}`, x + 15, y);
  }
  
  /**
   * Render scoreboard
   */
  private renderScoreboard(ctScore: number, tScore: number): void {
    const x = this.canvas.width / 2 - 100;
    const y = 30;
    const width = 200;
    const height = 40;
    
    // Background
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    this.ctx.fillRect(x, y, width, height);
    
    // CT section
    this.ctx.fillStyle = '#4169E1';
    this.ctx.fillRect(x, y, width / 2, height);
    
    // T section
    this.ctx.fillStyle = '#DC143C';
    this.ctx.fillRect(x + width / 2, y, width / 2, height);
    
    // Scores
    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.font = 'bold 24px monospace';
    this.ctx.textAlign = 'center';
    
    // CT Score
    this.ctx.fillText(`CT ${ctScore}`, x + width / 4, y + 28);
    
    // T Score  
    this.ctx.fillText(`${tScore} T`, x + (3 * width) / 4, y + 28);
    
    // Divider
    this.ctx.strokeStyle = '#FFFFFF';
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.moveTo(x + width / 2, y);
    this.ctx.lineTo(x + width / 2, y + height);
    this.ctx.stroke();
  }
  
  /**
   * Render round timer
   */
  private renderRoundTimer(roundTime: string, bombTimer?: string): void {
    const x = this.canvas.width / 2;
    const y = 90;
    
    // Round timer
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    this.ctx.fillRect(x - 50, y - 20, 100, 30);
    
    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.font = 'bold 20px monospace';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(roundTime, x, y);
    
    // Bomb timer (if bomb is planted)
    if (bombTimer) {
      const bombY = y + 40;
      
      this.ctx.fillStyle = 'rgba(255, 0, 0, 0.8)';
      this.ctx.fillRect(x - 60, bombY - 20, 120, 30);
      
      this.ctx.fillStyle = '#FFFFFF';
      this.ctx.font = 'bold 18px monospace';
      this.ctx.fillText(`💣 ${bombTimer}`, x, bombY);
      
      // Flashing effect for low time
      if (parseFloat(bombTimer) < 10) {
        const flash = Math.sin(Date.now() / 100) > 0;
        if (flash) {
          this.ctx.fillStyle = '#FF0000';
          this.ctx.fillText(`💣 ${bombTimer}`, x, bombY);
        }
      }
    }
  }
  
  /**
   * Render player statistics
   */
  private renderPlayerStats(kills: number, deaths: number, assists: number): void {
    const x = this.canvas.width - 120;
    const y = 40;
    
    // Background
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    this.ctx.fillRect(x - 5, y - 20, 110, 30);
    
    // K/D/A
    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.font = 'bold 14px monospace';
    this.ctx.textAlign = 'left';
    this.ctx.fillText(`K:${kills} D:${deaths} A:${assists}`, x, y);
  }
  
  /**
   * Render kill feed
   */
  private renderKillFeed(): void {
    const x = this.canvas.width - 300;
    const y = 120;
    const entryHeight = 25;
    const maxEntries = 5;
    
    // Clean old entries
    const now = Date.now();
    this.killFeed = this.killFeed.filter(entry => (now - entry.timestamp) < 10000);
    
    // Show recent entries
    const entries = this.killFeed.slice(-maxEntries);
    
    entries.forEach((entry, index) => {
      const entryY = y + (index * entryHeight);
      const alpha = Math.max(0.3, 1 - (now - entry.timestamp) / 10000);
      
      // Background
      this.ctx.fillStyle = `rgba(0, 0, 0, ${alpha * 0.7})`;
      this.ctx.fillRect(x - 5, entryY - 15, 290, 20);
      
      // Kill entry text
      this.ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
      this.ctx.font = '12px monospace';
      this.ctx.textAlign = 'left';
      
      const killText = `${entry.killer} ${entry.headshot ? '🎯' : '🔫'} ${entry.victim}`;
      this.ctx.fillText(killText, x, entryY);
      
      // Weapon icon/name
      this.ctx.fillStyle = `rgba(200, 200, 200, ${alpha})`;
      this.ctx.font = '10px monospace';
      this.ctx.textAlign = 'right';
      this.ctx.fillText(entry.weapon, x + 280, entryY);
    });
  }
  
  /**
   * Render crosshair
   */
  private renderCrosshair(player: Player): void {
    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;
    
    let { size, thickness, gap, color, opacity, dynamic } = this.crosshair;
    
    // Dynamic crosshair adjustments
    if (dynamic) {
      const isMoving = Math.abs(player.velocity.x) > 10 || Math.abs(player.velocity.y) > 10;
      const isScoped = player.isScoped;
      
      if (isScoped) {
        // Hide crosshair when scoped
        opacity *= 0.2;
      } else if (isMoving) {
        // Expand crosshair when moving
        size += 5;
        gap += 2;
      }
      
      if (player.isDucking) {
        // Smaller crosshair when crouching
        size *= 0.8;
        gap *= 0.8;
      }
    }
    
    this.ctx.globalAlpha = opacity;
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = thickness;
    this.ctx.lineCap = 'square';
    
    // Draw crosshair lines
    this.ctx.beginPath();
    
    // Top line
    this.ctx.moveTo(centerX, centerY - gap);
    this.ctx.lineTo(centerX, centerY - gap - size);
    
    // Bottom line
    this.ctx.moveTo(centerX, centerY + gap);
    this.ctx.lineTo(centerX, centerY + gap + size);
    
    // Left line
    this.ctx.moveTo(centerX - gap, centerY);
    this.ctx.lineTo(centerX - gap - size, centerY);
    
    // Right line
    this.ctx.moveTo(centerX + gap, centerY);
    this.ctx.lineTo(centerX + gap + size, centerY);
    
    this.ctx.stroke();
    
    // Reset global alpha
    this.ctx.globalAlpha = 1.0;
  }
  
  /**
   * Render reload indicator
   */
  private renderReloadIndicator(isReloading: boolean, progress: number): void {
    if (!isReloading) return;
    
    const x = this.canvas.width / 2 - 75;
    const y = this.canvas.height / 2 + 50;
    const width = 150;
    const height = 8;
    
    // Background
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    this.ctx.fillRect(x - 2, y - 2, width + 4, height + 4);
    
    // Progress bar
    this.ctx.fillStyle = '#FFFF00';
    this.ctx.fillRect(x, y, progress * width, height);
    
    // Text
    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.font = 'bold 12px monospace';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('RELOADING...', x + width / 2, y - 10);
  }
  
  /**
   * Render current weapon information
   */
  private renderWeaponInfo(weaponName: string): void {
    const x = this.canvas.width - 200;
    const y = this.canvas.height - 120;
    
    // Background
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    this.ctx.fillRect(x - 5, y - 5, 180, 30);
    
    // Weapon name
    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.font = 'bold 16px monospace';
    this.ctx.textAlign = 'left';
    this.ctx.fillText(weaponName.toUpperCase(), x, y + 15);
  }
  
  /**
   * Render debug information
   */
  private renderDebugInfo(fps: number, player: Player): void {
    const x = 10;
    const y = 100;
    const lineHeight = 16;
    let line = 0;
    
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    this.ctx.fillRect(x - 5, y - 15, 200, 120);
    
    this.ctx.fillStyle = '#00FF00';
    this.ctx.font = '12px monospace';
    this.ctx.textAlign = 'left';
    
    this.ctx.fillText(`FPS: ${fps}`, x, y + (line++ * lineHeight));
    this.ctx.fillText(`Pos: ${Math.round(player.position.x)}, ${Math.round(player.position.y)}`, x, y + (line++ * lineHeight));
    this.ctx.fillText(`Vel: ${Math.round(player.velocity.x)}, ${Math.round(player.velocity.y)}`, x, y + (line++ * lineHeight));
    this.ctx.fillText(`Health: ${player.health}`, x, y + (line++ * lineHeight));
    this.ctx.fillText(`Armor: ${player.armor}`, x, y + (line++ * lineHeight));
    this.ctx.fillText(`Money: $${player.money}`, x, y + (line++ * lineHeight));
    this.ctx.fillText(`Weapon: ${player.currentWeapon}`, x, y + (line++ * lineHeight));
  }
  
  /**
   * Add entry to kill feed
   */
  addKillFeedEntry(killer: string, victim: string, weapon: string, headshot: boolean = false): void {
    this.killFeed.push({
      id: `${Date.now()}_${Math.random()}`,
      killer,
      victim,
      weapon,
      headshot,
      timestamp: Date.now()
    });
    
    // Keep only last 20 entries
    if (this.killFeed.length > 20) {
      this.killFeed = this.killFeed.slice(-20);
    }
  }
  
  /**
   * Update crosshair settings
   */
  setCrosshairSettings(settings: Partial<CrosshairSettings>): void {
    this.crosshair = { ...this.crosshair, ...settings };
  }
  
  /**
   * Toggle debug info display
   */
  toggleDebugInfo(): void {
    this.showDebugInfo = !this.showDebugInfo;
  }
  
  /**
   * Format time as MM:SS
   */
  private formatTime(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }
}