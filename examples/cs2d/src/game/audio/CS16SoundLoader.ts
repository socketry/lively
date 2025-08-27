/**
 * CS 1.6 Authentic Sound Asset Loader
 * Loads and manages all authentic CS 1.6 WAV sound files
 */

export interface CS16SoundDefinition {
  id: string;
  path: string;
  category: 'weapons' | 'player' | 'bot' | 'ambient' | 'ui' | 'radio' | 'physics';
  subcategory?: string;
  volume: number;
  loop?: boolean;
  spatial?: boolean;
  randomPitch?: boolean;
}

export interface CS16WeaponSounds {
  fire: string[];
  reload: {
    clipOut?: string;
    clipIn?: string;
    boltPull?: string;
    slideBack?: string;
    slideRelease?: string;
    deploy?: string;
    special?: string[];
  };
  empty: string;
  switch?: string;
}

export class CS16SoundLoader {
  private static readonly BASE_PATH = '/cstrike/sound/';
  
  /**
   * Complete CS 1.6 weapon sound definitions
   */
  static readonly WEAPON_SOUNDS: Record<string, CS16WeaponSounds> = {
    'ak47': {
      fire: ['weapons/ak47/ak47-1.wav'],
      reload: {
        clipOut: 'weapons/ak47/ak47_clipout.wav',
        clipIn: 'weapons/ak47/ak47_clipin.wav',
        boltPull: 'weapons/ak47/ak47_boltpull.wav'
      },
      empty: 'weapons/clipempty_rifle.wav'
    },
    'm4a1': {
      fire: ['weapons/m4a1/m4a1-1.wav', 'weapons/m4a1/m4a1_unsil-1.wav'],
      reload: {
        clipOut: 'weapons/m4a1/m4a1_clipout.wav',
        clipIn: 'weapons/m4a1/m4a1_clipin.wav',
        boltPull: 'weapons/m4a1/m4a1_boltpull.wav',
        deploy: 'weapons/m4a1/m4a1_deploy.wav',
        special: ['weapons/m4a1/m4a1_silencer_on.wav', 'weapons/m4a1/m4a1_silencer_off.wav']
      },
      empty: 'weapons/clipempty_rifle.wav'
    },
    'awp': {
      fire: ['weapons/awp/awp1.wav'],
      reload: {
        clipOut: 'weapons/awp/awp_clipout.wav',
        clipIn: 'weapons/awp/awp_clipin.wav',
        boltPull: 'weapons/awp/awp_bolt.wav'
      },
      empty: 'weapons/clipempty_rifle.wav'
    },
    'deagle': {
      fire: ['weapons/deagle/deagle-1.wav'],
      reload: {
        clipOut: 'weapons/deagle/de_clipout.wav',
        clipIn: 'weapons/deagle/de_clipin.wav',
        slideBack: 'weapons/deagle/de_slideback.wav',
        deploy: 'weapons/deagle/de_deploy.wav'
      },
      empty: 'weapons/clipempty_pistol.wav'
    },
    'glock': {
      fire: ['weapons/glock/glock18-1.wav'],
      reload: {
        clipOut: 'weapons/glock/glock_clipout.wav',
        clipIn: 'weapons/glock/glock_clipin.wav',
        slideBack: 'weapons/glock/glock_slideback.wav',
        slideRelease: 'weapons/glock/glock_sliderelease.wav'
      },
      empty: 'weapons/clipempty_pistol.wav'
    },
    'usp': {
      fire: ['weapons/usp/usp1.wav', 'weapons/usp/usp_unsil-1.wav'],
      reload: {
        clipOut: 'weapons/usp/usp_clipout.wav',
        clipIn: 'weapons/usp/usp_clipin.wav',
        slideBack: 'weapons/usp/usp_slideback.wav',
        slideRelease: 'weapons/usp/usp_sliderelease.wav',
        special: ['weapons/usp/usp_silencer_on.wav', 'weapons/usp/usp_silencer_off.wav']
      },
      empty: 'weapons/clipempty_pistol.wav'
    },
    'famas': {
      fire: ['weapons/famas/famas-1.wav'],
      reload: {
        clipOut: 'weapons/famas/famas_clipout.wav',
        clipIn: 'weapons/famas/famas_clipin.wav',
        special: ['weapons/famas/famas_forearm.wav']
      },
      empty: 'weapons/clipempty_rifle.wav'
    },
    'galil': {
      fire: ['weapons/galil/galil-1.wav'],
      reload: {
        clipOut: 'weapons/galil/galil_clipout.wav',
        clipIn: 'weapons/galil/galil_clipin.wav',
        boltPull: 'weapons/galil/galil_boltpull.wav'
      },
      empty: 'weapons/clipempty_rifle.wav'
    },
    'aug': {
      fire: ['weapons/aug/aug-1.wav'],
      reload: {
        clipOut: 'weapons/aug/aug_clipout.wav',
        clipIn: 'weapons/aug/aug_clipin.wav',
        boltPull: 'weapons/aug/aug_boltpull.wav',
        special: ['weapons/aug/aug_boltslap.wav', 'weapons/aug/aug_forearm.wav']
      },
      empty: 'weapons/clipempty_rifle.wav'
    },
    'sg552': {
      fire: ['weapons/sg552/sg552-1.wav'],
      reload: {
        clipOut: 'weapons/sg552/sg552_clipout.wav',
        clipIn: 'weapons/sg552/sg552_clipin.wav',
        boltPull: 'weapons/sg552/sg552_boltpull.wav'
      },
      empty: 'weapons/clipempty_rifle.wav'
    },
    'p228': {
      fire: ['weapons/p228/p228-1.wav'],
      reload: {
        clipOut: 'weapons/p228/p228_clipout.wav',
        clipIn: 'weapons/p228/p228_clipin.wav',
        slideBack: 'weapons/p228/p228_slideback.wav',
        slideRelease: 'weapons/p228/p228_sliderelease.wav',
        special: ['weapons/p228/p228_slidepull.wav']
      },
      empty: 'weapons/clipempty_pistol.wav'
    },
    'fiveseven': {
      fire: ['weapons/fiveseven/fiveseven-1.wav'],
      reload: {
        clipOut: 'weapons/fiveseven/fiveseven_clipout.wav',
        clipIn: 'weapons/fiveseven/fiveseven_clipin.wav',
        slideBack: 'weapons/fiveseven/fiveseven_slideback.wav',
        slideRelease: 'weapons/fiveseven/fiveseven_sliderelease.wav',
        special: ['weapons/fiveseven/fiveseven_slidepull.wav']
      },
      empty: 'weapons/clipempty_pistol.wav'
    },
    'elite': {
      fire: ['weapons/elite/elite-1.wav'],
      reload: {
        clipOut: 'weapons/elite/elite_clipout.wav',
        special: ['weapons/elite/elite_leftclipin.wav', 'weapons/elite/elite_rightclipin.wav', 
                  'weapons/elite/elite_reloadstart.wav', 'weapons/elite/elite_sliderelease.wav', 
                  'weapons/elite/elite_deploy.wav']
      },
      empty: 'weapons/clipempty_pistol.wav'
    },
    'mp5': {
      fire: ['weapons/mp5navy/mp5-1.wav'],
      reload: {
        clipOut: 'weapons/mp5navy/mp5_clipout.wav',
        clipIn: 'weapons/mp5navy/mp5_clipin.wav',
        slideBack: 'weapons/mp5navy/mp5_slideback.wav'
      },
      empty: 'weapons/clipempty_rifle.wav'
    },
    'tmp': {
      fire: ['weapons/tmp/tmp-1.wav'],
      reload: {
        clipOut: 'weapons/tmp/tmp_clipout.wav',
        clipIn: 'weapons/tmp/tmp_clipin.wav'
      },
      empty: 'weapons/clipempty_rifle.wav'
    },
    'p90': {
      fire: ['weapons/p90/p90-1.wav'],
      reload: {
        clipOut: 'weapons/p90/p90_clipout.wav',
        clipIn: 'weapons/p90/p90_clipin.wav',
        boltPull: 'weapons/p90/p90_boltpull.wav',
        special: ['weapons/p90/p90_cliprelease.wav']
      },
      empty: 'weapons/clipempty_rifle.wav'
    },
    'mac10': {
      fire: ['weapons/mac10/mac10-1.wav'],
      reload: {
        clipOut: 'weapons/mac10/mac10_clipout.wav',
        clipIn: 'weapons/mac10/mac10_clipin.wav',
        boltPull: 'weapons/mac10/mac10_boltpull.wav'
      },
      empty: 'weapons/clipempty_rifle.wav'
    },
    'ump45': {
      fire: ['weapons/ump45/ump45-1.wav'],
      reload: {
        clipOut: 'weapons/ump45/ump45_clipout.wav',
        clipIn: 'weapons/ump45/ump45_clipin.wav',
        special: ['weapons/ump45/ump45_boltslap.wav']
      },
      empty: 'weapons/clipempty_rifle.wav'
    },
    'm3': {
      fire: ['weapons/m3/m3-1.wav'],
      reload: {
        special: ['weapons/m3/m3_insertshell.wav', 'weapons/m3/m3_pump.wav']
      },
      empty: 'weapons/clipempty_rifle.wav'
    },
    'xm1014': {
      fire: ['weapons/xm1014/xm1014-1.wav'],
      reload: {
        special: ['weapons/xm1014/xm1014_insertshell.wav']
      },
      empty: 'weapons/clipempty_rifle.wav'
    },
    'm249': {
      fire: ['weapons/m249/m249-1.wav'],
      reload: {
        special: ['weapons/m249/m249_boxout.wav', 'weapons/m249/m249_boxin.wav', 
                  'weapons/m249/m249_chain.wav', 'weapons/m249/m249_coverup.wav', 
                  'weapons/m249/m249_coverdown.wav']
      },
      empty: 'weapons/clipempty_rifle.wav'
    },
    'g3sg1': {
      fire: ['weapons/g3sg1/g3sg1-1.wav'],
      reload: {
        clipOut: 'weapons/g3sg1/g3sg1_clipout.wav',
        clipIn: 'weapons/g3sg1/g3sg1_clipin.wav',
        special: ['weapons/g3sg1/g3sg1_slide.wav']
      },
      empty: 'weapons/clipempty_rifle.wav'
    },
    'sg550': {
      fire: ['weapons/sg550/sg550-1.wav'],
      reload: {
        clipOut: 'weapons/sg550/sg550_clipout.wav',
        clipIn: 'weapons/sg550/sg550_clipin.wav',
        boltPull: 'weapons/sg550/sg550_boltpull.wav'
      },
      empty: 'weapons/clipempty_rifle.wav'
    },
    'scout': {
      fire: ['weapons/scout/scout_fire-1.wav'],
      reload: {
        clipOut: 'weapons/scout/scout_clipout.wav',
        clipIn: 'weapons/scout/scout_clipin.wav',
        special: ['weapons/scout/scout_bolt.wav']
      },
      empty: 'weapons/clipempty_rifle.wav'
    },
    'knife': {
      fire: ['weapons/knife/knife_slash1.wav', 'weapons/knife/knife_slash2.wav'],
      reload: {},
      empty: '',
      switch: 'weapons/knife/knife_deploy1.wav'
    }
  };

  /**
   * Player footstep sounds by surface type
   */
  static readonly FOOTSTEP_SOUNDS: Record<string, string[]> = {
    'concrete': [
      'player/footsteps/concrete1.wav',
      'player/footsteps/concrete2.wav', 
      'player/footsteps/concrete3.wav',
      'player/footsteps/concrete4.wav'
    ],
    'metal': [
      'player/footsteps/metal1.wav',
      'player/footsteps/metal2.wav',
      'player/footsteps/metal3.wav', 
      'player/footsteps/metal4.wav'
    ],
    'dirt': [
      'player/footsteps/dirt1.wav',
      'player/footsteps/dirt2.wav',
      'player/footsteps/dirt3.wav',
      'player/footsteps/dirt4.wav'
    ],
    'grass': [
      'player/footsteps/grass1.wav',
      'player/footsteps/grass2.wav',
      'player/footsteps/grass3.wav',
      'player/footsteps/grass4.wav'
    ],
    'gravel': [
      'player/footsteps/gravel1.wav',
      'player/footsteps/gravel2.wav',
      'player/footsteps/gravel3.wav',
      'player/footsteps/gravel4.wav'
    ],
    'sand': [
      'player/footsteps/sand1.wav',
      'player/footsteps/sand2.wav',
      'player/footsteps/sand3.wav',
      'player/footsteps/sand4.wav'
    ],
    'wood': [
      'player/footsteps/duct1.wav',
      'player/footsteps/duct2.wav',
      'player/footsteps/duct3.wav',
      'player/footsteps/duct4.wav'
    ],
    'metalgrate': [
      'player/footsteps/metalgrate1.wav',
      'player/footsteps/metalgrate2.wav',
      'player/footsteps/metalgrate3.wav',
      'player/footsteps/metalgrate4.wav'
    ],
    'chainlink': [
      'player/footsteps/chainlink1.wav',
      'player/footsteps/chainlink2.wav',
      'player/footsteps/chainlink3.wav',
      'player/footsteps/chainlink4.wav'
    ],
    'ladder': [
      'player/footsteps/ladder1.wav',
      'player/footsteps/ladder2.wav',
      'player/footsteps/ladder3.wav',
      'player/footsteps/ladder4.wav'
    ],
    'mud': [
      'player/footsteps/mud1.wav',
      'player/footsteps/mud2.wav',
      'player/footsteps/mud3.wav',
      'player/footsteps/mud4.wav'
    ],
    'water': [
      'player/footsteps/slosh1.wav'
    ]
  };

  /**
   * Player damage and death sounds
   */
  static readonly PLAYER_SOUNDS: Record<string, string[]> = {
    'damage': [
      'player/damage1.wav',
      'player/damage2.wav',
      'player/damage3.wav'
    ],
    'death': [
      'player/death1.wav',
      'player/death2.wav',
      'player/death3.wav',
      'player/death4.wav',
      'player/death5.wav',
      'player/death6.wav'
    ],
    'headshot': [
      'player/headshot1.wav',
      'player/headshot2.wav'
    ],
    'kevlar': [
      'player/kevlar1.wav',
      'player/kevlar2.wav',
      'player/kevlar3.wav',
      'player/kevlar4.wav',
      'player/kevlar5.wav'
    ],
    'helmet': [
      'player/bhit_helmet-1.wav'
    ]
  };

  /**
   * Grenade and explosive sounds
   */
  static readonly GRENADE_SOUNDS: Record<string, string[]> = {
    'hegrenade': [
      'weapons/hegrenade/explode3.wav',
      'weapons/hegrenade/explode4.wav',
      'weapons/hegrenade/explode5.wav'
    ],
    'flashbang': [
      'weapons/flashbang/flashbang_explode1.wav',
      'weapons/flashbang/flashbang_explode2.wav'
    ],
    'smoke': [
      'weapons/smokegrenade/sg_explode.wav'
    ],
    'grenade_bounce': [
      'weapons/hegrenade/he_bounce-1.wav',
      'weapons/flashbang/grenade_hit1.wav'
    ],
    'pinpull': [
      'weapons/pinpull.wav'
    ]
  };

  /**
   * C4 bomb sounds
   */
  static readonly C4_SOUNDS: Record<string, string[]> = {
    'plant': ['weapons/c4/c4_plant.wav'],
    'beep': ['weapons/c4/c4_beep1.wav'],
    'click': ['weapons/c4/c4_click.wav'],
    'disarm': ['weapons/c4/c4_disarm.wav'],
    'explode': ['weapons/c4/c4_explode1.wav'],
    'debris': ['weapons/c4/c4_exp_deb1.wav', 'weapons/c4/c4_exp_deb2.wav']
  };

  /**
   * Knife impact sounds
   */
  static readonly KNIFE_SOUNDS: Record<string, string[]> = {
    'hit': [
      'weapons/knife/knife_hit1.wav',
      'weapons/knife/knife_hit2.wav',
      'weapons/knife/knife_hit3.wav',
      'weapons/knife/knife_hit4.wav'
    ],
    'hitwall': ['weapons/knife/knife_hitwall1.wav'],
    'stab': ['weapons/knife/knife_stab.wav']
  };

  /**
   * Generate complete sound definitions
   */
  static generateSoundDefinitions(): CS16SoundDefinition[] {
    const definitions: CS16SoundDefinition[] = [];

    // Weapon sounds
    Object.entries(this.WEAPON_SOUNDS).forEach(([weapon, sounds]) => {
      // Fire sounds
      sounds.fire.forEach((path, index) => {
        definitions.push({
          id: `${weapon}_fire${index > 0 ? `_${index}` : ''}`,
          path: this.BASE_PATH + path,
          category: 'weapons',
          subcategory: 'fire',
          volume: weapon === 'awp' ? 0.9 : weapon.includes('m249') ? 0.95 : 0.7,
          spatial: true,
          randomPitch: true
        });
      });

      // Reload sounds
      Object.entries(sounds.reload).forEach(([action, path]) => {
        if (typeof path === 'string') {
          definitions.push({
            id: `${weapon}_${action}`,
            path: this.BASE_PATH + path,
            category: 'weapons',
            subcategory: 'reload',
            volume: 0.5,
            spatial: true
          });
        } else if (Array.isArray(path)) {
          path.forEach((p, index) => {
            definitions.push({
              id: `${weapon}_${action}${index > 0 ? `_${index}` : ''}`,
              path: this.BASE_PATH + p,
              category: 'weapons',
              subcategory: 'reload',
              volume: 0.5,
              spatial: true
            });
          });
        }
      });

      // Empty clip sounds
      if (sounds.empty) {
        definitions.push({
          id: `${weapon}_empty`,
          path: this.BASE_PATH + sounds.empty,
          category: 'weapons',
          subcategory: 'empty',
          volume: 0.4,
          spatial: true
        });
      }

      // Switch sounds
      if (sounds.switch) {
        definitions.push({
          id: `${weapon}_switch`,
          path: this.BASE_PATH + sounds.switch,
          category: 'weapons',
          subcategory: 'switch',
          volume: 0.3,
          spatial: true
        });
      }
    });

    // Footstep sounds
    Object.entries(this.FOOTSTEP_SOUNDS).forEach(([surface, paths]) => {
      paths.forEach((path, index) => {
        definitions.push({
          id: `footstep_${surface}_${index + 1}`,
          path: this.BASE_PATH + path,
          category: 'player',
          subcategory: 'footsteps',
          volume: 0.3,
          spatial: true,
          randomPitch: true
        });
      });
    });

    // Player sounds
    Object.entries(this.PLAYER_SOUNDS).forEach(([type, paths]) => {
      paths.forEach((path, index) => {
        definitions.push({
          id: `player_${type}_${index + 1}`,
          path: this.BASE_PATH + path,
          category: 'player',
          subcategory: type,
          volume: type === 'death' ? 0.6 : 0.5,
          spatial: true,
          randomPitch: type === 'damage'
        });
      });
    });

    // Grenade sounds
    Object.entries(this.GRENADE_SOUNDS).forEach(([type, paths]) => {
      paths.forEach((path, index) => {
        definitions.push({
          id: `grenade_${type}${index > 0 ? `_${index}` : ''}`,
          path: this.BASE_PATH + path,
          category: 'weapons',
          subcategory: 'grenades',
          volume: type.includes('explode') ? 0.9 : 0.4,
          spatial: true
        });
      });
    });

    // C4 sounds
    Object.entries(this.C4_SOUNDS).forEach(([type, paths]) => {
      paths.forEach((path, index) => {
        definitions.push({
          id: `c4_${type}${index > 0 ? `_${index}` : ''}`,
          path: this.BASE_PATH + path,
          category: 'weapons',
          subcategory: 'c4',
          volume: type === 'explode' ? 1.0 : type === 'beep' ? 0.2 : 0.6,
          spatial: true,
          loop: type === 'beep'
        });
      });
    });

    // Knife sounds
    Object.entries(this.KNIFE_SOUNDS).forEach(([type, paths]) => {
      paths.forEach((path, index) => {
        definitions.push({
          id: `knife_${type}${index > 0 ? `_${index}` : ''}`,
          path: this.BASE_PATH + path,
          category: 'weapons',
          subcategory: 'knife',
          volume: 0.6,
          spatial: true,
          randomPitch: true
        });
      });
    });

    // UI sounds
    const uiSounds = [
      { id: 'button_click', path: 'buttons/weapon_confirm.wav', volume: 0.3 },
      { id: 'button_deny', path: 'buttons/weapon_cant_buy.wav', volume: 0.3 },
      { id: 'button_bell', path: 'buttons/bell1.wav', volume: 0.2 },
      { id: 'nvg_on', path: 'items/nvg_on.wav', volume: 0.4 },
      { id: 'nvg_off', path: 'items/nvg_off.wav', volume: 0.4 },
      { id: 'item_pickup', path: 'items/itempickup.wav', volume: 0.4 },
      { id: 'ammo_pickup', path: 'items/ammopickup.wav', volume: 0.4 },
      { id: 'defuser_equip', path: 'items/defuser_equip.wav', volume: 0.5 }
    ];

    uiSounds.forEach(sound => {
      definitions.push({
        id: sound.id,
        path: this.BASE_PATH + sound.path,
        category: 'ui',
        volume: sound.volume,
        spatial: false
      });
    });

    // Common sounds
    const commonSounds = [
      { id: 'use_deny', path: 'common/use_deny.wav', volume: 0.3 },
      { id: 'weapon_zoom', path: 'weapons/zoom.wav', volume: 0.2 }
    ];

    commonSounds.forEach(sound => {
      definitions.push({
        id: sound.id,
        path: this.BASE_PATH + sound.path,
        category: 'ui',
        volume: sound.volume,
        spatial: false
      });
    });

    return definitions;
  }

  /**
   * Get random sound from category
   */
  static getRandomSound(category: string, subcategory?: string): string | null {
    const definitions = this.generateSoundDefinitions();
    const filtered = definitions.filter(def => {
      return def.category === category && (!subcategory || def.subcategory === subcategory);
    });
    
    if (filtered.length === 0) return null;
    return filtered[Math.floor(Math.random() * filtered.length)].id;
  }

  /**
   * Get weapon sound ID by weapon name and action
   */
  static getWeaponSound(weapon: string, action: 'fire' | 'reload' | 'empty' | 'switch'): string | null {
    const weaponSounds = this.WEAPON_SOUNDS[weapon.toLowerCase()];
    if (!weaponSounds) return null;

    switch (action) {
      case 'fire':
        const fireIndex = Math.floor(Math.random() * weaponSounds.fire.length);
        return `${weapon}_fire${fireIndex > 0 ? `_${fireIndex}` : ''}`;
      case 'empty':
        return `${weapon}_empty`;
      case 'switch':
        return weaponSounds.switch ? `${weapon}_switch` : null;
      case 'reload':
        // Get random reload sound
        const reloadKeys = Object.keys(weaponSounds.reload);
        if (reloadKeys.length === 0) return null;
        const randomKey = reloadKeys[Math.floor(Math.random() * reloadKeys.length)];
        return `${weapon}_${randomKey}`;
      default:
        return null;
    }
  }

  /**
   * Get footstep sound by surface type
   */
  static getFootstepSound(surface: string = 'concrete'): string | null {
    const surfaceSounds = this.FOOTSTEP_SOUNDS[surface] || this.FOOTSTEP_SOUNDS['concrete'];
    const index = Math.floor(Math.random() * surfaceSounds.length);
    return `footstep_${surface}_${index + 1}`;
  }
}