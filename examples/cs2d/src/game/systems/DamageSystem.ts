import { Vector2D } from '../physics/PhysicsEngine';
import { Player } from '../GameCore';
import { CS16AudioManager } from '../audio/CS16AudioManager';

export interface DamageInfo {
  amount: number;
  source: string;
  position: Vector2D;
  weapon?: string;
  headshot?: boolean;
  armorPiercing?: boolean;
}

export interface DamageEvent {
  type: 'damage' | 'death' | 'heal' | 'armor_damage';
  playerId: string;
  damage: number;
  source?: string;
  position: Vector2D;
  headshot?: boolean;
  timestamp: number;
}

export class DamageSystem {
  private audioManager: CS16AudioManager | null = null;
  private damageHistory: Map<string, DamageEvent[]> = new Map();
  private killAssists: Map<string, string[]> = new Map(); // playerId -> assistants
  
  constructor(audioManager?: CS16AudioManager) {
    this.audioManager = audioManager || null;
  }
  
  /**
   * Apply damage to a player with CS 1.6 mechanics
   */
  applyDamage(player: Player, damageInfo: DamageInfo): DamageEvent {
    // Calculate armor damage absorption
    let actualDamage = damageInfo.amount;
    let armorDamage = 0;
    
    if (player.armor > 0 && !damageInfo.armorPiercing) {
      // CS 1.6 armor mechanics: armor absorbs 50% damage until depleted
      const armorReduction = 0.5;
      const damageToArmor = actualDamage * armorReduction;
      armorDamage = Math.min(damageToArmor, player.armor);
      actualDamage = actualDamage - (armorDamage * 0.5);
      
      player.armor -= armorDamage;
      if (player.armor < 0) player.armor = 0;
    }
    
    // Apply headshot multiplier
    if (damageInfo.headshot) {
      actualDamage *= 2.0; // Standard CS headshot multiplier
    }
    
    // Apply damage to health
    const oldHealth = player.health;
    player.health -= actualDamage;
    
    // Mark player as in pain for audio behavior
    player.isInPain = true;
    player.lastDamageTime = Date.now();
    
    // Play damage sound based on damage type
    if (this.audioManager) {
      if (damageInfo.headshot) {
        this.audioManager.playPlayerSound('headshot', player.position);
      } else if (armorDamage > 0) {
        this.audioManager.playPlayerSound('kevlar', player.position);
      } else {
        this.audioManager.playPlayerSound('damage', player.position);
      }
    }
    
    // Track damage for assists
    if (damageInfo.source && damageInfo.source !== player.id && actualDamage > 0) {
      this.trackDamageForAssists(player.id, damageInfo.source);
    }
    
    // Create damage event
    const damageEvent: DamageEvent = {
      type: player.health <= 0 ? 'death' : 'damage',
      playerId: player.id,
      damage: actualDamage,
      source: damageInfo.source,
      position: damageInfo.position,
      headshot: damageInfo.headshot,
      timestamp: Date.now()
    };
    
    // Store damage history
    this.addDamageToHistory(player.id, damageEvent);
    
    // Handle death
    if (player.health <= 0) {
      this.handlePlayerDeath(player, damageInfo.source);
    }
    
    console.log('💥 Damage applied:', { 
      playerId: player.id, 
      damage: actualDamage, 
      armorDamage, 
      newHealth: player.health,
      headshot: damageInfo.headshot 
    });
    
    return damageEvent;
  }
  
  /**
   * Handle player death with CS 1.6 mechanics
   */
  private handlePlayerDeath(player: Player, killerId?: string): void {
    player.isAlive = false;
    player.deaths++;
    player.isInPain = false; // Reset pain state
    player.health = 0; // Ensure health is exactly 0
    
    // Play death sound
    if (this.audioManager) {
      this.audioManager.playPlayerSound('death', player.position);
    }
    
    // Award kill and money to killer
    if (killerId) {
      // Implementation would need access to other players - this should be handled by GameCore
      console.log('💀 Player killed:', player.id, 'by:', killerId);
    }
    
    // Clear damage tracking for this player
    this.killAssists.delete(player.id);
    
    console.log('💀 Player death handled:', { playerId: player.id, killer: killerId });
  }
  
  /**
   * Heal a player (for medkits, spawn, etc.)
   */
  healPlayer(player: Player, amount: number): DamageEvent {
    const oldHealth = player.health;
    player.health = Math.min(100, player.health + amount);
    
    const actualHealing = player.health - oldHealth;
    
    // Play healing sound if available
    if (this.audioManager && actualHealing > 0) {
      // CS 1.6 doesn't have healing sounds, but we can add item pickup sound
      this.audioManager.play('items/itempickup.wav', player.position);
    }
    
    const healEvent: DamageEvent = {
      type: 'heal',
      playerId: player.id,
      damage: -actualHealing, // Negative for healing
      position: player.position,
      timestamp: Date.now()
    };
    
    this.addDamageToHistory(player.id, healEvent);
    
    return healEvent;
  }
  
  /**
   * Give armor to a player
   */
  giveArmor(player: Player, amount: number): void {
    const oldArmor = player.armor;
    player.armor = Math.min(100, player.armor + amount);
    
    if (player.armor > oldArmor && this.audioManager) {
      // Play kevlar equip sound
      this.audioManager.play('items/equip_nvg.wav', player.position); // Using NVG sound as placeholder
    }
    
    console.log('🛡️ Armor given:', { playerId: player.id, amount, newArmor: player.armor });
  }
  
  /**
   * Track damage for assist calculations
   */
  private trackDamageForAssists(victimId: string, attackerId: string): void {
    if (!this.killAssists.has(victimId)) {
      this.killAssists.set(victimId, []);
    }
    
    const assistants = this.killAssists.get(victimId)!;
    if (!assistants.includes(attackerId)) {
      assistants.push(attackerId);
    }
    
    // Clean up old assists (older than 5 seconds)
    setTimeout(() => {
      const currentAssistants = this.killAssists.get(victimId);
      if (currentAssistants) {
        const index = currentAssistants.indexOf(attackerId);
        if (index > -1) {
          currentAssistants.splice(index, 1);
        }
      }
    }, 5000);
  }
  
  /**
   * Get assists for a kill
   */
  getAssists(victimId: string): string[] {
    return this.killAssists.get(victimId) || [];
  }
  
  /**
   * Add damage event to history
   */
  private addDamageToHistory(playerId: string, event: DamageEvent): void {
    if (!this.damageHistory.has(playerId)) {
      this.damageHistory.set(playerId, []);
    }
    
    const history = this.damageHistory.get(playerId)!;
    history.push(event);
    
    // Keep only last 50 events per player
    if (history.length > 50) {
      history.shift();
    }
  }
  
  /**
   * Get damage history for a player
   */
  getDamageHistory(playerId: string): DamageEvent[] {
    return this.damageHistory.get(playerId) || [];
  }
  
  /**
   * Calculate total damage dealt by a player in last N seconds
   */
  getDamageDealt(playerId: string, timeWindowMs: number = 10000): number {
    const now = Date.now();
    let totalDamage = 0;
    
    this.damageHistory.forEach((events) => {
      events.forEach(event => {
        if (event.source === playerId && 
            event.type === 'damage' && 
            (now - event.timestamp) <= timeWindowMs) {
          totalDamage += event.damage;
        }
      });
    });
    
    return totalDamage;
  }
  
  /**
   * Calculate total damage received by a player in last N seconds
   */
  getDamageReceived(playerId: string, timeWindowMs: number = 10000): number {
    const history = this.damageHistory.get(playerId) || [];
    const now = Date.now();
    
    return history
      .filter(event => 
        event.type === 'damage' && 
        (now - event.timestamp) <= timeWindowMs
      )
      .reduce((total, event) => total + event.damage, 0);
  }
  
  /**
   * Check if player is in pain (recently damaged)
   */
  isPlayerInPain(player: Player): boolean {
    return player.isInPain && (Date.now() - player.lastDamageTime) < 2000;
  }
  
  /**
   * Reset player health and armor (for round reset)
   */
  resetPlayer(player: Player): void {
    player.health = 100;
    player.armor = 0;
    player.isAlive = true;
    player.isInPain = false;
    player.lastDamageTime = 0;
    
    // Clear damage history for this player
    this.damageHistory.delete(player.id);
    this.killAssists.delete(player.id);
  }
  
  /**
   * Set audio manager
   */
  setAudioManager(audioManager: CS16AudioManager): void {
    this.audioManager = audioManager;
  }
}