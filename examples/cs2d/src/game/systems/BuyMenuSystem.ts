import { Player } from '../GameCore';
import { WeaponSystem, WeaponStats } from '../weapons/WeaponSystem';
import { CS16AudioManager } from '../audio/CS16AudioManager';

export interface BuyableItem {
  id: string;
  name: string;
  price: number;
  category: 'pistols' | 'rifles' | 'smgs' | 'shotguns' | 'snipers' | 'equipment' | 'grenades';
  team?: 'ct' | 't' | 'both';
  description: string;
  weaponStats?: WeaponStats;
}

export interface BuyMenuState {
  isOpen: boolean;
  selectedCategory: string;
  selectedItem: string | null;
  canBuy: boolean;
  timeLeft: number;
  buyZone: boolean;
}

export class BuyMenuSystem {
  private weaponSystem: WeaponSystem;
  private audioManager: CS16AudioManager | null = null;
  private buyableItems: Map<string, BuyableItem> = new Map();
  private menuState: Map<string, BuyMenuState> = new Map();
  
  constructor(weaponSystem: WeaponSystem, audioManager?: CS16AudioManager) {
    this.weaponSystem = weaponSystem;
    this.audioManager = audioManager || null;
    this.initializeBuyableItems();
  }
  
  private initializeBuyableItems(): void {
    const items: BuyableItem[] = [
      // Pistols
      {
        id: 'glock',
        name: 'Glock-18',
        price: 200,
        category: 'pistols',
        team: 't',
        description: 'Standard terrorist sidearm with high capacity magazine'
      },
      {
        id: 'usp',
        name: 'USP-S',
        price: 200,
        category: 'pistols',
        team: 'ct',
        description: 'Counter-terrorist sidearm with silencer capability'
      },
      {
        id: 'deagle',
        name: 'Desert Eagle',
        price: 650,
        category: 'pistols',
        team: 'both',
        description: 'High-powered magnum pistol with devastating damage'
      },
      {
        id: 'p228',
        name: 'P228',
        price: 600,
        category: 'pistols',
        team: 'both',
        description: 'Compact pistol with good accuracy and stopping power'
      },
      {
        id: 'dualelites',
        name: 'Dual Elites',
        price: 800,
        category: 'pistols',
        team: 't',
        description: 'Dual pistols with high fire rate but poor accuracy'
      },
      {
        id: 'fiveseven',
        name: 'Five-Seven',
        price: 750,
        category: 'pistols',
        team: 'ct',
        description: 'High-velocity pistol effective against armor'
      },
      
      // SMGs
      {
        id: 'mp5',
        name: 'MP5-SD',
        price: 1500,
        category: 'smgs',
        team: 'both',
        description: 'Silenced submachine gun with excellent mobility'
      },
      {
        id: 'tmp',
        name: 'Schmidt TMP',
        price: 1250,
        category: 'smgs',
        team: 'ct',
        description: 'Fast-firing submachine gun with silencer'
      },
      {
        id: 'mac10',
        name: 'MAC-10',
        price: 1400,
        category: 'smgs',
        team: 't',
        description: 'High rate of fire SMG with poor accuracy at range'
      },
      {
        id: 'ump45',
        name: 'UMP-45',
        price: 1700,
        category: 'smgs',
        team: 'both',
        description: 'Versatile SMG with good damage and moderate recoil'
      },
      {
        id: 'p90',
        name: 'P90',
        price: 2350,
        category: 'smgs',
        team: 'both',
        description: 'Bullpup SMG with large magazine and armor penetration'
      },
      
      // Shotguns
      {
        id: 'm3',
        name: 'M3 Super 90',
        price: 1700,
        category: 'shotguns',
        team: 'both',
        description: 'Pump-action shotgun devastating at close range'
      },
      {
        id: 'xm1014',
        name: 'XM1014',
        price: 3000,
        category: 'shotguns',
        team: 'both',
        description: 'Semi-automatic shotgun with faster follow-up shots'
      },
      
      // Rifles
      {
        id: 'galil',
        name: 'Galil',
        price: 2000,
        category: 'rifles',
        team: 't',
        description: 'Terrorist assault rifle with good mobility'
      },
      {
        id: 'ak47',
        name: 'AK-47',
        price: 2500,
        category: 'rifles',
        team: 't',
        description: 'Legendary assault rifle with high damage'
      },
      {
        id: 'famas',
        name: 'FAMAS',
        price: 2250,
        category: 'rifles',
        team: 'ct',
        description: 'Burst-fire assault rifle with good accuracy'
      },
      {
        id: 'm4a4',
        name: 'M4A4',
        price: 3100,
        category: 'rifles',
        team: 'ct',
        description: 'Standard CT assault rifle with silencer option'
      },
      {
        id: 'sg552',
        name: 'SG-552',
        price: 3500,
        category: 'rifles',
        team: 't',
        description: 'Scoped assault rifle with high accuracy'
      },
      {
        id: 'aug',
        name: 'AUG',
        price: 3500,
        category: 'rifles',
        team: 'ct',
        description: 'Scoped assault rifle with integrated optics'
      },
      
      // Sniper Rifles
      {
        id: 'scout',
        name: 'Scout',
        price: 2750,
        category: 'snipers',
        team: 'both',
        description: 'Lightweight sniper rifle with high mobility'
      },
      {
        id: 'awp',
        name: 'AWP',
        price: 4750,
        category: 'snipers',
        team: 'both',
        description: 'One-shot sniper rifle with devastating power'
      },
      {
        id: 'g3sg1',
        name: 'G3/SG1',
        price: 5000,
        category: 'snipers',
        team: 't',
        description: 'Semi-automatic sniper rifle'
      },
      {
        id: 'sg550',
        name: 'SG-550',
        price: 4200,
        category: 'snipers',
        team: 'ct',
        description: 'Semi-automatic sniper rifle with high accuracy'
      },
      
      // Equipment
      {
        id: 'kevlar',
        name: 'Kevlar Vest',
        price: 650,
        category: 'equipment',
        team: 'both',
        description: 'Body armor that reduces bullet damage'
      },
      {
        id: 'kevlar_helmet',
        name: 'Kevlar + Helmet',
        price: 1000,
        category: 'equipment',
        team: 'both',
        description: 'Body armor with helmet protection'
      },
      {
        id: 'defuse_kit',
        name: 'Defuse Kit',
        price: 200,
        category: 'equipment',
        team: 'ct',
        description: 'Allows faster bomb defusal'
      },
      {
        id: 'nvg',
        name: 'Night Vision',
        price: 1250,
        category: 'equipment',
        team: 'both',
        description: 'Night vision goggles for dark areas'
      },
      
      // Grenades
      {
        id: 'hegrenade',
        name: 'HE Grenade',
        price: 300,
        category: 'grenades',
        team: 'both',
        description: 'High-explosive fragmentation grenade'
      },
      {
        id: 'flashbang',
        name: 'Flashbang',
        price: 200,
        category: 'grenades',
        team: 'both',
        description: 'Stun grenade that blinds and deafens enemies'
      },
      {
        id: 'smokegrenade',
        name: 'Smoke Grenade',
        price: 300,
        category: 'grenades',
        team: 'both',
        description: 'Smoke screen for concealment and tactics'
      }
    ];
    
    items.forEach(item => {
      this.buyableItems.set(item.id, item);
    });
  }
  
  /**
   * Open buy menu for player
   */
  openBuyMenu(playerId: string, canBuy: boolean = true, timeLeft: number = 15): BuyMenuState {
    const state: BuyMenuState = {
      isOpen: true,
      selectedCategory: 'pistols',
      selectedItem: null,
      canBuy,
      timeLeft,
      buyZone: true
    };
    
    this.menuState.set(playerId, state);
    
    // Play menu open sound
    if (this.audioManager) {
      this.audioManager.playUISound('button_click');
    }
    
    console.log('💰 Buy menu opened for player:', playerId);
    return state;
  }
  
  /**
   * Close buy menu for player
   */
  closeBuyMenu(playerId: string): void {
    this.menuState.delete(playerId);
    
    // Play menu close sound
    if (this.audioManager) {
      this.audioManager.playUISound('button_click');
    }
    
    console.log('💰 Buy menu closed for player:', playerId);
  }
  
  /**
   * Get buy menu state for player
   */
  getBuyMenuState(playerId: string): BuyMenuState | null {
    return this.menuState.get(playerId) || null;
  }
  
  /**
   * Select category in buy menu
   */
  selectCategory(playerId: string, category: string): boolean {
    const state = this.menuState.get(playerId);
    if (!state || !state.isOpen) return false;
    
    state.selectedCategory = category;
    state.selectedItem = null;
    
    // Play selection sound
    if (this.audioManager) {
      this.audioManager.playUISound('button_click');
    }
    
    return true;
  }
  
  /**
   * Select item in buy menu
   */
  selectItem(playerId: string, itemId: string): boolean {
    const state = this.menuState.get(playerId);
    if (!state || !state.isOpen) return false;
    
    const item = this.buyableItems.get(itemId);
    if (!item) return false;
    
    state.selectedItem = itemId;
    
    // Play selection sound
    if (this.audioManager) {
      this.audioManager.playUISound('button_click');
    }
    
    return true;
  }
  
  /**
   * Attempt to buy selected item
   */
  buyItem(player: Player, itemId: string): boolean {
    const state = this.menuState.get(player.id);
    if (!state || !state.isOpen || !state.canBuy) {
      this.playFailureSound();
      return false;
    }
    
    const item = this.buyableItems.get(itemId);
    if (!item) {
      this.playFailureSound();
      return false;
    }
    
    // Check team restrictions
    if (item.team && item.team !== 'both' && item.team !== player.team) {
      this.playFailureSound();
      return false;
    }
    
    // Check money
    if (player.money < item.price) {
      this.playFailureSound();
      return false;
    }
    
    // Check inventory space and restrictions
    if (!this.canPurchaseItem(player, item)) {
      this.playFailureSound();
      return false;
    }
    
    // Deduct money
    player.money -= item.price;
    
    // Add item to player
    this.giveItemToPlayer(player, item);
    
    // Play success sound
    if (this.audioManager) {
      this.audioManager.playUISound('item_pickup');
    }
    
    console.log('💰 Item purchased:', { 
      playerId: player.id, 
      item: item.name, 
      price: item.price, 
      remainingMoney: player.money 
    });
    
    return true;
  }
  
  /**
   * Check if player can purchase an item
   */
  private canPurchaseItem(player: Player, item: BuyableItem): boolean {
    switch (item.category) {
      case 'pistols':
        // Can always buy pistols (replaces current secondary)
        return true;
        
      case 'rifles':
      case 'smgs':
      case 'shotguns':
      case 'snipers':
        // Can buy if no primary weapon or replacing current primary
        return true;
        
      case 'equipment':
        if (item.id === 'kevlar' || item.id === 'kevlar_helmet') {
          // Can buy armor if not at max
          return player.armor < 100;
        }
        if (item.id === 'defuse_kit') {
          // Only CTs can buy defuse kit
          return player.team === 'ct';
        }
        return true;
        
      case 'grenades':
        // Check grenade limit (typically 1 HE, 2 flash, 1 smoke)
        return this.canCarryMoreGrenades(player, item.id);
        
      default:
        return true;
    }
  }
  
  /**
   * Give purchased item to player
   */
  private giveItemToPlayer(player: Player, item: BuyableItem): void {
    switch (item.category) {
      case 'pistols':
        // Replace secondary weapon
        if (player.weapons.length > 1) {
          player.weapons[1] = item.id;
        } else {
          player.weapons.push(item.id);
        }
        break;
        
      case 'rifles':
      case 'smgs':
      case 'shotguns':
      case 'snipers':
        // Replace primary weapon
        if (player.weapons.length > 2) {
          player.weapons[2] = item.id;
        } else {
          while (player.weapons.length < 3) {
            player.weapons.push(item.id);
          }
        }
        // Switch to new weapon
        player.currentWeapon = item.id;
        break;
        
      case 'equipment':
        if (item.id === 'kevlar') {
          player.armor = Math.min(100, player.armor + 100);
        } else if (item.id === 'kevlar_helmet') {
          player.armor = 100; // Full armor with helmet
        }
        // Other equipment would be added to inventory
        break;
        
      case 'grenades':
        // Add to grenade inventory
        player.weapons.push(item.id);
        break;
    }
    
    // Initialize ammo for weapons
    if (item.weaponStats) {
      player.ammo.set(item.id, item.weaponStats.magazineSize);
    }
  }
  
  /**
   * Check if player can carry more grenades
   */
  private canCarryMoreGrenades(player: Player, grenadeType: string): boolean {
    const grenadeCount = player.weapons.filter(w => {
      const item = this.buyableItems.get(w);
      return item?.category === 'grenades' && item.id === grenadeType;
    }).length;
    
    // CS 1.6 grenade limits
    switch (grenadeType) {
      case 'hegrenade':
        return grenadeCount < 1;
      case 'flashbang':
        return grenadeCount < 2;
      case 'smokegrenade':
        return grenadeCount < 1;
      default:
        return grenadeCount < 1;
    }
  }
  
  /**
   * Get items for a specific category and team
   */
  getItemsForCategory(category: string, team: 'ct' | 't'): BuyableItem[] {
    return Array.from(this.buyableItems.values())
      .filter(item => 
        item.category === category && 
        (item.team === 'both' || item.team === team)
      );
  }
  
  /**
   * Get all available categories
   */
  getCategories(): string[] {
    return ['pistols', 'rifles', 'smgs', 'shotguns', 'snipers', 'equipment', 'grenades'];
  }
  
  /**
   * Update buy menu state (called each frame)
   */
  updateBuyMenu(playerId: string, deltaTime: number): void {
    const state = this.menuState.get(playerId);
    if (!state || !state.isOpen) return;
    
    state.timeLeft -= deltaTime;
    
    if (state.timeLeft <= 0) {
      this.closeBuyMenu(playerId);
    }
  }
  
  /**
   * Check if player can buy (in buy zone and buy time)
   */
  canPlayerBuy(player: Player, gameState: any): boolean {
    // Can buy during freeze time or first 15 seconds of round
    const canBuyTime = gameState.freezeTime > 0 || gameState.roundTime > 105;
    
    // Would need to check buy zone position in actual implementation
    const inBuyZone = true; // Simplified for now
    
    return canBuyTime && inBuyZone && player.isAlive;
  }
  
  /**
   * Play failure sound
   */
  private playFailureSound(): void {
    if (this.audioManager) {
      this.audioManager.playUISound('button_deny');
    }
  }
  
  /**
   * Set audio manager
   */
  setAudioManager(audioManager: CS16AudioManager): void {
    this.audioManager = audioManager;
  }
  
  /**
   * Get item by ID
   */
  getItem(itemId: string): BuyableItem | undefined {
    return this.buyableItems.get(itemId);
  }
}