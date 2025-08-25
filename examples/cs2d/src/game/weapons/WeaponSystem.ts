import { Vector2D } from '../physics/PhysicsEngine';
import { CS16AudioManager } from '../audio/CS16AudioManager';

export interface WeaponStats {
  name: string;
  type: 'pistol' | 'rifle' | 'smg' | 'sniper' | 'shotgun' | 'lmg' | 'grenade';
  damage: number;
  fireRate: number;
  reloadTime: number;
  magazineSize: number;
  reserveAmmo: number;
  spread: number;
  recoil: number;
  bulletSpeed: number;
  bulletPenetration: number;
  range: number;
  movementSpeed: number;
  price: number;
  killReward: number;
  headshotMultiplier: number;
  armorPenetration: number;
  weaponSlot: 'primary' | 'secondary' | 'melee' | 'grenade' | 'equipment';
  soundId: string; // CS 1.6 sound identifier
  silencedSoundId?: string; // For weapons with silencers
  // Weapon enhancement properties
  canDrop?: boolean;
  canInspect?: boolean;
  hasScope?: boolean;
  canToggleSilencer?: boolean;
  wallPenetration?: number;
}

export interface WeaponState {
  currentAmmo: number;
  reserveAmmo: number;
  isReloading: boolean;
  reloadStartTime?: number;
  isSilenced?: boolean; // For M4A1 and USP
}

export interface Bullet {
  id: string;
  position: Vector2D;
  velocity: Vector2D;
  damage: number;
  penetration: number;
  owner: string;
  weapon: string;
  distanceTraveled: number;
  maxRange: number;
  trail: Vector2D[];
}

export interface DroppedWeapon {
  id: string;
  weaponId: string;
  position: Vector2D;
  droppedTime: number;
  ammo: number;
  reserveAmmo: number;
  owner?: string;
}

export interface WeaponPickup {
  weaponId: string;
  position: Vector2D;
  playerId: string;
}

export interface RecoilPattern {
  vertical: number[];
  horizontal: number[];
  recovery: number;
  maxSpread: number;
}

export class WeaponSystem {
  private weapons: Map<string, WeaponStats> = new Map();
  private bullets: Map<string, Bullet> = new Map();
  private recoilPatterns: Map<string, RecoilPattern> = new Map();
  private currentRecoilIndex: Map<string, number> = new Map();
  private lastShotTime: Map<string, number> = new Map();
  private weaponStates: Map<string, WeaponState> = new Map(); // playerId -> weapon state
  private droppedWeapons: Map<string, DroppedWeapon> = new Map();
  private audioManager: CS16AudioManager | null = null;
  
  // Quick switch system
  private lastWeapon: Map<string, string> = new Map(); // playerId -> last weapon
  private inspectStartTime: Map<string, number> = new Map(); // playerId -> inspect start time
  
  constructor(audioManager?: CS16AudioManager) {
    this.audioManager = audioManager || null;
    this.initializeWeapons();
    this.initializeRecoilPatterns();
  }
  
  private initializeWeapons(): void {
    const weaponData: WeaponStats[] = [
      {
        name: 'Glock-18',
        type: 'pistol',
        damage: 28,
        fireRate: 400,
        reloadTime: 2200,
        magazineSize: 20,
        reserveAmmo: 120,
        spread: 0.05,
        recoil: 0.3,
        bulletSpeed: 2000,
        bulletPenetration: 1,
        range: 1500,
        movementSpeed: 1.0,
        price: 200,
        killReward: 300,
        headshotMultiplier: 2.0,
        armorPenetration: 0.47,
        weaponSlot: 'secondary',
        soundId: 'glock'
      },
      {
        name: 'USP-S',
        type: 'pistol',
        damage: 35,
        fireRate: 352,
        reloadTime: 2200,
        magazineSize: 12,
        reserveAmmo: 24,
        spread: 0.03,
        recoil: 0.35,
        bulletSpeed: 2000,
        bulletPenetration: 1,
        range: 2000,
        movementSpeed: 1.0,
        price: 200,
        killReward: 300,
        headshotMultiplier: 2.2,
        armorPenetration: 0.505,
        weaponSlot: 'secondary',
        soundId: 'usp',
        silencedSoundId: 'usp'
      },
      {
        name: 'Desert Eagle',
        type: 'pistol',
        damage: 48,
        fireRate: 267,
        reloadTime: 2200,
        magazineSize: 7,
        reserveAmmo: 35,
        spread: 0.02,
        recoil: 0.8,
        bulletSpeed: 2200,
        bulletPenetration: 2,
        range: 3000,
        movementSpeed: 0.93,
        price: 650,
        killReward: 300,
        headshotMultiplier: 2.5,
        armorPenetration: 0.93,
        weaponSlot: 'secondary',
        soundId: 'deagle'
      },
      {
        name: 'AK-47',
        type: 'rifle',
        damage: 36,
        fireRate: 600,
        reloadTime: 2500,
        magazineSize: 30,
        reserveAmmo: 90,
        spread: 0.04,
        recoil: 0.65,
        bulletSpeed: 2500,
        bulletPenetration: 2,
        range: 4000,
        movementSpeed: 0.89,
        price: 2700,
        killReward: 300,
        headshotMultiplier: 2.5,
        armorPenetration: 0.775,
        weaponSlot: 'primary',
        soundId: 'ak47',
        canDrop: true,
        canInspect: true,
        wallPenetration: 200
      },
      {
        name: 'M4A4',
        type: 'rifle',
        damage: 33,
        fireRate: 666,
        reloadTime: 3100,
        magazineSize: 30,
        reserveAmmo: 90,
        spread: 0.03,
        recoil: 0.55,
        bulletSpeed: 2500,
        bulletPenetration: 2,
        range: 4000,
        movementSpeed: 0.9,
        price: 3100,
        killReward: 300,
        headshotMultiplier: 2.2,
        armorPenetration: 0.7,
        weaponSlot: 'primary',
        soundId: 'm4a1',
        silencedSoundId: 'm4a1',
        canDrop: true,
        canInspect: true,
        canToggleSilencer: true,
        wallPenetration: 200
      },
      {
        name: 'AWP',
        type: 'sniper',
        damage: 115,
        fireRate: 41,
        reloadTime: 3700,
        magazineSize: 10,
        reserveAmmo: 30,
        spread: 0.001,
        recoil: 1.5,
        bulletSpeed: 3500,
        bulletPenetration: 3,
        range: 8000,
        movementSpeed: 0.81,
        price: 4750,
        killReward: 100,
        headshotMultiplier: 2.5,
        armorPenetration: 0.975,
        weaponSlot: 'primary',
        soundId: 'awp',
        canDrop: true,
        canInspect: true,
        hasScope: true,
        wallPenetration: 250
      },
      {
        name: 'MP5-SD',
        type: 'smg',
        damage: 27,
        fireRate: 750,
        reloadTime: 2900,
        magazineSize: 30,
        reserveAmmo: 120,
        spread: 0.045,
        recoil: 0.4,
        bulletSpeed: 2000,
        bulletPenetration: 1,
        range: 2500,
        movementSpeed: 0.95,
        price: 1500,
        killReward: 600,
        headshotMultiplier: 2.0,
        armorPenetration: 0.625,
        weaponSlot: 'primary',
        soundId: 'mp5'
      },
      {
        name: 'P90',
        type: 'smg',
        damage: 26,
        fireRate: 857,
        reloadTime: 3300,
        magazineSize: 50,
        reserveAmmo: 100,
        spread: 0.05,
        recoil: 0.35,
        bulletSpeed: 2000,
        bulletPenetration: 1,
        range: 2500,
        movementSpeed: 0.93,
        price: 2350,
        killReward: 300,
        headshotMultiplier: 1.8,
        armorPenetration: 0.69,
        weaponSlot: 'primary',
        soundId: 'p90'
      },
      {
        name: 'Nova',
        type: 'shotgun',
        damage: 26,
        fireRate: 68,
        reloadTime: 600,
        magazineSize: 8,
        reserveAmmo: 32,
        spread: 0.3,
        recoil: 1.0,
        bulletSpeed: 1500,
        bulletPenetration: 0,
        range: 800,
        movementSpeed: 0.88,
        price: 1050,
        killReward: 900,
        headshotMultiplier: 1.5,
        armorPenetration: 0.5,
        weaponSlot: 'primary',
        soundId: 'm3'
      },
      {
        name: 'XM1014',
        type: 'shotgun',
        damage: 20,
        fireRate: 171,
        reloadTime: 500,
        magazineSize: 7,
        reserveAmmo: 32,
        spread: 0.35,
        recoil: 0.8,
        bulletSpeed: 1500,
        bulletPenetration: 0,
        range: 700,
        movementSpeed: 0.88,
        price: 2000,
        killReward: 900,
        headshotMultiplier: 1.5,
        armorPenetration: 0.8,
        weaponSlot: 'primary',
        soundId: 'xm1014'
      },
      {
        name: 'Negev',
        type: 'lmg',
        damage: 35,
        fireRate: 800,
        reloadTime: 5700,
        magazineSize: 150,
        reserveAmmo: 200,
        spread: 0.08,
        recoil: 0.6,
        bulletSpeed: 2500,
        bulletPenetration: 2,
        range: 4000,
        movementSpeed: 0.78,
        price: 1700,
        killReward: 300,
        headshotMultiplier: 2.0,
        armorPenetration: 0.75,
        weaponSlot: 'primary',
        soundId: 'm249'
      },
      {
        name: 'Knife',
        type: 'pistol', // Treat as melee
        damage: 65,
        fireRate: 120,
        reloadTime: 0,
        magazineSize: 1,
        reserveAmmo: 0,
        spread: 0,
        recoil: 0,
        bulletSpeed: 500,
        bulletPenetration: 0,
        range: 50,
        movementSpeed: 1.2,
        price: 0,
        killReward: 1500,
        headshotMultiplier: 1.0,
        armorPenetration: 0.85,
        weaponSlot: 'melee',
        soundId: 'knife',
        canDrop: false,
        canInspect: true
      },
      // Grenades
      {
        name: 'HE Grenade',
        type: 'grenade',
        damage: 98,
        fireRate: 0,
        reloadTime: 0,
        magazineSize: 1,
        reserveAmmo: 0,
        spread: 0,
        recoil: 0,
        bulletSpeed: 0,
        bulletPenetration: 0,
        range: 1000,
        movementSpeed: 1.0,
        price: 300,
        killReward: 300,
        headshotMultiplier: 1.0,
        armorPenetration: 1.0,
        weaponSlot: 'grenade',
        soundId: 'hegrenade',
        canDrop: true
      },
      {
        name: 'Flashbang',
        type: 'grenade',
        damage: 1,
        fireRate: 0,
        reloadTime: 0,
        magazineSize: 1,
        reserveAmmo: 1,
        spread: 0,
        recoil: 0,
        bulletSpeed: 0,
        bulletPenetration: 0,
        range: 800,
        movementSpeed: 1.0,
        price: 200,
        killReward: 0,
        headshotMultiplier: 1.0,
        armorPenetration: 1.0,
        weaponSlot: 'grenade',
        soundId: 'flashbang',
        canDrop: true
      },
      {
        name: 'Smoke Grenade',
        type: 'grenade',
        damage: 0,
        fireRate: 0,
        reloadTime: 0,
        magazineSize: 1,
        reserveAmmo: 0,
        spread: 0,
        recoil: 0,
        bulletSpeed: 0,
        bulletPenetration: 0,
        range: 600,
        movementSpeed: 1.0,
        price: 300,
        killReward: 0,
        headshotMultiplier: 1.0,
        armorPenetration: 1.0,
        weaponSlot: 'grenade',
        soundId: 'smoke',
        canDrop: true
      },
      {
        name: 'Molotov Cocktail',
        type: 'grenade',
        damage: 8,
        fireRate: 0,
        reloadTime: 0,
        magazineSize: 1,
        reserveAmmo: 0,
        spread: 0,
        recoil: 0,
        bulletSpeed: 0,
        bulletPenetration: 0,
        range: 700,
        movementSpeed: 1.0,
        price: 400,
        killReward: 300,
        headshotMultiplier: 1.0,
        armorPenetration: 1.0,
        weaponSlot: 'grenade',
        soundId: 'molotov',
        canDrop: true
      },
      {
        name: 'Incendiary Grenade',
        type: 'grenade',
        damage: 8,
        fireRate: 0,
        reloadTime: 0,
        magazineSize: 1,
        reserveAmmo: 0,
        spread: 0,
        recoil: 0,
        bulletSpeed: 0,
        bulletPenetration: 0,
        range: 700,
        movementSpeed: 1.0,
        price: 600,
        killReward: 300,
        headshotMultiplier: 1.0,
        armorPenetration: 1.0,
        weaponSlot: 'grenade',
        soundId: 'incendiary',
        canDrop: true
      }
    ];
    
    weaponData.forEach(weapon => {
      this.weapons.set(weapon.name.toLowerCase().replace(/[^a-z0-9]/g, ''), weapon);
    });
  }
  
  private initializeRecoilPatterns(): void {
    this.recoilPatterns.set('ak47', {
      vertical: [2.5, 3.0, 3.5, 4.0, 4.5, 5.0, 5.5, 6.0, 6.5, 7.0],
      horizontal: [-0.5, 0.5, -0.8, 0.8, -1.0, 1.0, -1.2, 1.2, -1.5, 1.5],
      recovery: 0.15,
      maxSpread: 0.12
    });
    
    this.recoilPatterns.set('m4a4', {
      vertical: [2.0, 2.5, 3.0, 3.5, 4.0, 4.5, 5.0, 5.5, 6.0, 6.5],
      horizontal: [-0.3, 0.3, -0.5, 0.5, -0.7, 0.7, -0.9, 0.9, -1.1, 1.1],
      recovery: 0.12,
      maxSpread: 0.08
    });
    
    this.recoilPatterns.set('awp', {
      vertical: [15.0],
      horizontal: [0],
      recovery: 0.5,
      maxSpread: 0.001
    });
  }
  
  getWeapon(weaponId: string): WeaponStats | undefined {
    return this.weapons.get(weaponId);
  }
  
  fire(
    weaponId: string,
    origin: Vector2D,
    direction: Vector2D,
    playerId: string
  ): Bullet[] | null {
    console.log('🔫 WeaponSystem.fire called:', { weaponId, playerId, direction, availableWeapons: Array.from(this.weapons.keys()) });
    const weapon = this.weapons.get(weaponId);
    if (!weapon) {
      console.warn('❌ Weapon not found:', weaponId);
      return null;
    }
    console.log('✅ Weapon found:', weapon.name);
    
    // Check weapon state and ammo
    const weaponState = this.getWeaponState(playerId, weaponId);
    if (weaponState.currentAmmo <= 0) {
      // Play empty clip sound
      this.playWeaponSound(weapon, 'empty', origin);
      return null;
    }
    
    const now = Date.now();
    const lastShot = this.lastShotTime.get(playerId) || 0;
    const timeSinceLastShot = now - lastShot;
    
    if (timeSinceLastShot < (60000 / weapon.fireRate)) {
      return null;
    }
    
    // Check if reloading
    if (weaponState.isReloading) {
      return null;
    }
    
    this.lastShotTime.set(playerId, now);
    
    // Consume ammo
    weaponState.currentAmmo--;
    this.weaponStates.set(playerId, weaponState);
    
    // Play weapon fire sound
    this.playWeaponSound(weapon, 'fire', origin, weaponState.isSilenced);
    
    const bullets: Bullet[] = [];
    const recoilPattern = this.recoilPatterns.get(weaponId);
    const recoilIndex = this.currentRecoilIndex.get(playerId) || 0;
    
    let spreadX = 0;
    let spreadY = 0;
    
    if (recoilPattern) {
      const verticalRecoil = recoilPattern.vertical[Math.min(recoilIndex, recoilPattern.vertical.length - 1)];
      const horizontalRecoil = recoilPattern.horizontal[Math.min(recoilIndex, recoilPattern.horizontal.length - 1)];
      
      spreadY -= verticalRecoil * weapon.recoil;
      spreadX += horizontalRecoil * weapon.recoil;
      
      this.currentRecoilIndex.set(playerId, recoilIndex + 1);
      
      setTimeout(() => {
        const currentIndex = this.currentRecoilIndex.get(playerId) || 0;
        if (currentIndex > 0) {
          this.currentRecoilIndex.set(playerId, Math.max(0, currentIndex - 1));
        }
      }, 1000 * recoilPattern.recovery);
    }
    
    const pelletCount = weapon.type === 'shotgun' ? 9 : 1;
    
    for (let i = 0; i < pelletCount; i++) {
      const randomSpread = {
        x: (Math.random() - 0.5) * weapon.spread + spreadX,
        y: (Math.random() - 0.5) * weapon.spread + spreadY
      };
      
      const bulletDirection = {
        x: direction.x + randomSpread.x,
        y: direction.y + randomSpread.y
      };
      
      const magnitude = Math.sqrt(bulletDirection.x ** 2 + bulletDirection.y ** 2);
      bulletDirection.x /= magnitude;
      bulletDirection.y /= magnitude;
      
      const bullet: Bullet = {
        id: `${playerId}_${weaponId}_${now}_${i}`,
        position: { ...origin },
        velocity: {
          x: bulletDirection.x * weapon.bulletSpeed,
          y: bulletDirection.y * weapon.bulletSpeed
        },
        damage: weapon.damage / (weapon.type === 'shotgun' ? 1 : 1),
        penetration: weapon.bulletPenetration,
        owner: playerId,
        weapon: weaponId,
        distanceTraveled: 0,
        maxRange: weapon.range,
        trail: [{ ...origin }]
      };
      
      bullets.push(bullet);
      this.bullets.set(bullet.id, bullet);
    }
    
    return bullets;
  }
  
  updateBullets(deltaTime: number): void {
    this.bullets.forEach((bullet, id) => {
      bullet.position.x += bullet.velocity.x * deltaTime;
      bullet.position.y += bullet.velocity.y * deltaTime;
      
      const distance = Math.sqrt(
        bullet.velocity.x * deltaTime ** 2 +
        bullet.velocity.y * deltaTime ** 2
      );
      bullet.distanceTraveled += distance;
      
      bullet.trail.push({ ...bullet.position });
      if (bullet.trail.length > 10) {
        bullet.trail.shift();
      }
      
      const damageFalloff = 1 - (bullet.distanceTraveled / bullet.maxRange) * 0.3;
      bullet.damage *= damageFalloff;
      
      if (bullet.distanceTraveled >= bullet.maxRange || bullet.penetration <= 0) {
        this.bullets.delete(id);
      }
    });
  }
  
  handleBulletHit(bulletId: string, targetArmor: number = 0): number {
    const bullet = this.bullets.get(bulletId);
    if (!bullet) return 0;
    
    const weapon = this.weapons.get(bullet.weapon);
    if (!weapon) return 0;
    
    const armorReduction = targetArmor > 0 ? (1 - weapon.armorPenetration) : 0;
    const finalDamage = bullet.damage * (1 - armorReduction);
    
    bullet.penetration--;
    bullet.damage *= 0.5;
    
    if (bullet.penetration <= 0) {
      this.bullets.delete(bulletId);
    }
    
    return finalDamage;
  }
  
  getBullets(): Bullet[] {
    return Array.from(this.bullets.values());
  }
  
  clearBullet(bulletId: string): void {
    this.bullets.delete(bulletId);
  }
  
  getRecoilOffset(playerId: string, weaponId: string): Vector2D {
    const recoilPattern = this.recoilPatterns.get(weaponId);
    const recoilIndex = this.currentRecoilIndex.get(playerId) || 0;
    
    if (!recoilPattern) {
      return { x: 0, y: 0 };
    }
    
    const vertical = recoilPattern.vertical[Math.min(recoilIndex, recoilPattern.vertical.length - 1)] || 0;
    const horizontal = recoilPattern.horizontal[Math.min(recoilIndex, recoilPattern.horizontal.length - 1)] || 0;
    
    return {
      x: horizontal,
      y: -vertical
    };
  }
  
  resetRecoil(playerId: string): void {
    this.currentRecoilIndex.set(playerId, 0);
  }
  
  /**
   * Get or initialize weapon state for a player
   */
  getWeaponState(playerId: string, weaponId: string): WeaponState {
    const stateKey = `${playerId}_${weaponId}`;
    let state = this.weaponStates.get(stateKey);
    
    if (!state) {
      const weapon = this.weapons.get(weaponId);
      state = {
        currentAmmo: weapon?.magazineSize || 30,
        reserveAmmo: weapon?.reserveAmmo || 90,
        isReloading: false,
        isSilenced: false // Default to unsilenced
      };
      this.weaponStates.set(stateKey, state);
    }
    
    return state;
  }
  
  /**
   * Start weapon reload with authentic CS 1.6 sounds
   */
  reload(weaponId: string, playerId: string, position?: Vector2D): boolean {
    const weapon = this.weapons.get(weaponId);
    if (!weapon) return false;
    
    const weaponState = this.getWeaponState(playerId, weaponId);
    
    // Check if reload is needed and possible
    if (weaponState.currentAmmo >= weapon.magazineSize || 
        weaponState.reserveAmmo <= 0 || 
        weaponState.isReloading) {
      return false;
    }
    
    // Start reload
    weaponState.isReloading = true;
    weaponState.reloadStartTime = Date.now();
    this.weaponStates.set(`${playerId}_${weaponId}`, weaponState);
    
    // Play reload sound
    this.playWeaponSound(weapon, 'reload', position);
    
    // Complete reload after weapon's reload time
    setTimeout(() => {
      const currentState = this.getWeaponState(playerId, weaponId);
      if (currentState.isReloading) {
        const neededAmmo = weapon.magazineSize - currentState.currentAmmo;
        const ammoToAdd = Math.min(neededAmmo, currentState.reserveAmmo);
        
        currentState.currentAmmo += ammoToAdd;
        currentState.reserveAmmo -= ammoToAdd;
        currentState.isReloading = false;
        currentState.reloadStartTime = undefined;
        
        this.weaponStates.set(`${playerId}_${weaponId}`, currentState);
      }
    }, weapon.reloadTime);
    
    return true;
  }
  
  /**
   * Switch weapon with sound
   */
  switchWeapon(fromWeaponId: string | null, toWeaponId: string, playerId: string, position?: Vector2D): boolean {
    const toWeapon = this.weapons.get(toWeaponId);
    if (!toWeapon) return false;
    
    // Play weapon switch sound
    this.playWeaponSound(toWeapon, 'switch', position);
    
    return true;
  }
  
  /**
   * Toggle silencer for M4A1 and USP
   */
  toggleSilencer(weaponId: string, playerId: string, position?: Vector2D): boolean {
    const weapon = this.weapons.get(weaponId);
    if (!weapon || !weapon.silencedSoundId) return false;
    
    const weaponState = this.getWeaponState(playerId, weaponId);
    weaponState.isSilenced = !weaponState.isSilenced;
    this.weaponStates.set(`${playerId}_${weaponId}`, weaponState);
    
    // Play silencer toggle sound
    if (this.audioManager) {
      const soundId = weaponState.isSilenced ? 
        `${weapon.soundId}_silencer_on` : 
        `${weapon.soundId}_silencer_off`;
      this.audioManager.play(soundId, position, { category: 'weapons' });
    }
    
    return true;
  }
  
  /**
   * Play weapon-specific sounds using CS16AudioManager
   */
  private playWeaponSound(
    weapon: WeaponStats, 
    action: 'fire' | 'reload' | 'empty' | 'switch', 
    position?: Vector2D,
    isSilenced: boolean = false
  ): void {
    if (!this.audioManager) return;
    
    let soundId: string;
    
    switch (action) {
      case 'fire':
        soundId = (isSilenced && weapon.silencedSoundId) ? 
          weapon.silencedSoundId : weapon.soundId;
        this.audioManager.playWeaponSound(soundId, 'fire', position);
        break;
        
      case 'reload':
        this.audioManager.playWeaponSound(weapon.soundId, 'reload', position);
        break;
        
      case 'empty':
        this.audioManager.playWeaponSound(weapon.soundId, 'empty', position);
        break;
        
      case 'switch':
        this.audioManager.playWeaponSound(weapon.soundId, 'switch', position);
        break;
    }
  }
  
  /**
   * Get current ammo for display
   */
  getCurrentAmmo(playerId: string, weaponId: string): { current: number; reserve: number } {
    const weaponState = this.getWeaponState(playerId, weaponId);
    return {
      current: weaponState.currentAmmo,
      reserve: weaponState.reserveAmmo
    };
  }
  
  /**
   * Check if weapon is reloading
   */
  isReloading(playerId: string, weaponId: string): boolean {
    const weaponState = this.getWeaponState(playerId, weaponId);
    return weaponState.isReloading;
  }
  
  /**
   * Get reload progress (0-1)
   */
  getReloadProgress(playerId: string, weaponId: string): number {
    const weaponState = this.getWeaponState(playerId, weaponId);
    const weapon = this.weapons.get(weaponId);
    
    if (!weaponState.isReloading || !weaponState.reloadStartTime || !weapon) {
      return 0;
    }
    
    const elapsed = Date.now() - weaponState.reloadStartTime;
    return Math.min(1, elapsed / weapon.reloadTime);
  }
  
  /**
   * Check if weapon has silencer capability
   */
  canToggleSilencer(weaponId: string): boolean {
    const weapon = this.weapons.get(weaponId);
    return weapon?.silencedSoundId !== undefined;
  }
  
  /**
   * Check if weapon is silenced
   */
  isSilenced(playerId: string, weaponId: string): boolean {
    const weaponState = this.getWeaponState(playerId, weaponId);
    return weaponState.isSilenced || false;
  }
  
  /**
   * Drop weapon at position
   */
  dropWeapon(
    weaponId: string, 
    playerId: string, 
    position: Vector2D, 
    currentAmmo?: number, 
    reserveAmmo?: number
  ): string | null {
    const weapon = this.weapons.get(weaponId);
    if (!weapon || !weapon.canDrop) {
      return null;
    }
    
    const weaponState = this.getWeaponState(playerId, weaponId);
    const dropId = `drop_${weaponId}_${Date.now()}`;
    
    const droppedWeapon: DroppedWeapon = {
      id: dropId,
      weaponId: weaponId,
      position: { ...position },
      droppedTime: Date.now(),
      ammo: currentAmmo ?? weaponState.currentAmmo,
      reserveAmmo: reserveAmmo ?? weaponState.reserveAmmo,
      owner: playerId
    };
    
    this.droppedWeapons.set(dropId, droppedWeapon);
    
    // Play drop sound
    this.audioManager?.play('item_pickup', position, { category: 'ui' });
    
    console.log('💧 Weapon dropped:', weaponId, 'at position:', position);
    return dropId;
  }
  
  /**
   * Pick up weapon at position
   */
  pickupWeapon(position: Vector2D, playerId: string, pickupRadius: number = 50): WeaponPickup | null {
    let closestDrop: DroppedWeapon | null = null;
    let closestDistance = pickupRadius;
    
    // Find closest weapon within pickup radius
    this.droppedWeapons.forEach(drop => {
      const distance = Math.sqrt(
        (position.x - drop.position.x) ** 2 +
        (position.y - drop.position.y) ** 2
      );
      
      if (distance < closestDistance) {
        closestDrop = drop;
        closestDistance = distance;
      }
    });
    
    if (!closestDrop) return null;
    
    // Set weapon state for player
    const weaponState: WeaponState = {
      currentAmmo: closestDrop.ammo,
      reserveAmmo: closestDrop.reserveAmmo,
      isReloading: false,
      isSilenced: false
    };
    
    this.weaponStates.set(`${playerId}_${closestDrop.weaponId}`, weaponState);
    
    // Remove from dropped weapons
    this.droppedWeapons.delete(closestDrop.id);
    
    // Play pickup sound
    this.audioManager?.play('item_pickup', position, { category: 'ui' });
    
    console.log('🔫 Weapon picked up:', closestDrop.weaponId, 'by player:', playerId);
    
    return {
      weaponId: closestDrop.weaponId,
      position: closestDrop.position,
      playerId: playerId
    };
  }
  
  /**
   * Quick switch to last weapon (Q key)
   */
  quickSwitch(playerId: string, currentWeapon: string): string | null {
    const lastWeapon = this.lastWeapon.get(playerId);
    
    if (lastWeapon && lastWeapon !== currentWeapon) {
      // Update last weapon to current
      this.lastWeapon.set(playerId, currentWeapon);
      return lastWeapon;
    }
    
    return null;
  }
  
  /**
   * Start weapon inspect animation
   */
  startInspect(weaponId: string, playerId: string, position?: Vector2D): boolean {
    const weapon = this.weapons.get(weaponId);
    if (!weapon || !weapon.canInspect) {
      return false;
    }
    
    this.inspectStartTime.set(playerId, Date.now());
    
    // Play inspect sound
    this.audioManager?.playWeaponSound(weaponId, 'inspect', position);
    
    console.log('🔍 Weapon inspect started:', weaponId, 'by player:', playerId);
    return true;
  }
  
  /**
   * Check if weapon is being inspected
   */
  isInspecting(playerId: string): boolean {
    const inspectTime = this.inspectStartTime.get(playerId);
    if (!inspectTime) return false;
    
    const elapsed = Date.now() - inspectTime;
    const inspectDuration = 3000; // 3 second inspect animation
    
    if (elapsed >= inspectDuration) {
      this.inspectStartTime.delete(playerId);
      return false;
    }
    
    return true;
  }
  
  /**
   * Get all dropped weapons for rendering
   */
  getDroppedWeapons(): DroppedWeapon[] {
    return Array.from(this.droppedWeapons.values());
  }
  
  /**
   * Set audio manager (can be called after construction)
   */
  setAudioManager(audioManager: CS16AudioManager): void {
    this.audioManager = audioManager;
  }
  
  /**
   * Update system (call this in game loop)
   */
  updateSystem(deltaTime: number): void {
    // Clean up old dropped weapons periodically
    if (Math.random() < 0.001) { // ~0.1% chance per frame
      const now = Date.now();
      const maxAge = 5 * 60 * 1000; // 5 minutes
      
      const toRemove: string[] = [];
      this.droppedWeapons.forEach((drop, id) => {
        if (now - drop.droppedTime > maxAge) {
          toRemove.push(id);
        }
      });
      
      toRemove.forEach(id => this.droppedWeapons.delete(id));
    }
  }
}