#!/usr/bin/env lively
# frozen_string_literal: true

require 'securerandom'
require 'json'
require_relative 'progression/progression_manager'

class CS2DView < Live::View
  # Game constants
  WEAPONS = {
    # Pistols
    'usp' => { 
      name: 'USP', category: 'pistol', price: 0, damage: 34, rate: 400, ammo: 12, reserve: 100, 
      speed: 1.0, accuracy: 0.92, penetration: 0.5, range: 600, reload_time: 2.6,
      spray_pattern: 'tight', sound: 'usp_fire', teams: ['ct'], attachments: ['silencer']
    },
    'usp_silenced' => {
      name: 'USP-S', category: 'pistol', price: 0, damage: 32, rate: 400, ammo: 12, reserve: 100,
      speed: 1.0, accuracy: 0.95, penetration: 0.4, range: 650, reload_time: 2.6,
      spray_pattern: 'tight', sound: 'usp_silenced_fire', teams: ['ct'], base_weapon: 'usp'
    },
    'glock' => { 
      name: 'Glock-18', category: 'pistol', price: 0, damage: 28, rate: 400, ammo: 20, reserve: 120, 
      speed: 1.0, accuracy: 0.88, penetration: 0.5, range: 550, reload_time: 2.2,
      spray_pattern: 'wide', sound: 'glock_fire', teams: ['t'], burst_fire: true
    },
    'p228' => {
      name: 'P228', category: 'pistol', price: 600, damage: 40, rate: 400, ammo: 13, reserve: 52,
      speed: 1.0, accuracy: 0.9, penetration: 0.6, range: 650, reload_time: 2.7,
      spray_pattern: 'moderate', sound: 'p228_fire', teams: ['ct', 't']
    },
    'deagle' => { 
      name: 'Desert Eagle', category: 'pistol', price: 700, damage: 54, rate: 267, ammo: 7, reserve: 35, 
      speed: 0.95, accuracy: 0.81, penetration: 0.93, range: 800, reload_time: 2.2,
      spray_pattern: 'very_wide', sound: 'deagle_fire', teams: ['ct', 't']
    },
    'fiveseven' => {
      name: 'Five-SeveN', category: 'pistol', price: 750, damage: 32, rate: 400, ammo: 20, reserve: 100,
      speed: 1.0, accuracy: 0.92, penetration: 0.91, range: 700, reload_time: 2.8,
      spray_pattern: 'moderate', sound: 'fiveseven_fire', teams: ['ct']
    },
    'elite' => {
      name: 'Dual Berettas', category: 'pistol', price: 800, damage: 38, rate: 500, ammo: 30, reserve: 120,
      speed: 1.0, accuracy: 0.75, penetration: 0.57, range: 600, reload_time: 4.2,
      spray_pattern: 'dual_wide', sound: 'elite_fire', teams: ['t']
    },
    
    # Rifles
    'ak47' => { 
      name: 'AK-47', category: 'rifle', price: 2700, damage: 36, rate: 600, ammo: 30, reserve: 90, 
      speed: 0.88, accuracy: 0.73, penetration: 0.77, range: 1200, reload_time: 2.5,
      spray_pattern: 'ak47_pattern', sound: 'ak47_fire', teams: ['t']
    },
    'm4a1' => { 
      name: 'M4A1', category: 'rifle', price: 3100, damage: 33, rate: 666, ammo: 30, reserve: 90, 
      speed: 0.9, accuracy: 0.78, penetration: 0.7, range: 1300, reload_time: 3.1,
      spray_pattern: 'm4a1_pattern', sound: 'm4a1_fire', teams: ['ct'], attachments: ['silencer']
    },
    'm4a1_silenced' => {
      name: 'M4A1-S', category: 'rifle', price: 3100, damage: 31, rate: 666, ammo: 25, reserve: 75,
      speed: 0.9, accuracy: 0.82, penetration: 0.65, range: 1350, reload_time: 3.1,
      spray_pattern: 'm4a1s_pattern', sound: 'm4a1_silenced_fire', teams: ['ct'], base_weapon: 'm4a1'
    },
    'm4a4' => {
      name: 'M4A4', category: 'rifle', price: 3100, damage: 33, rate: 666, ammo: 30, reserve: 90,
      speed: 0.9, accuracy: 0.75, penetration: 0.7, range: 1250, reload_time: 3.1,
      spray_pattern: 'm4a4_pattern', sound: 'm4a4_fire', teams: ['ct']
    },
    'aug' => {
      name: 'AUG', category: 'rifle', price: 3300, damage: 28, rate: 600, ammo: 30, reserve: 90,
      speed: 0.89, accuracy: 0.82, penetration: 0.67, range: 1400, reload_time: 3.8,
      spray_pattern: 'aug_pattern', sound: 'aug_fire', teams: ['ct'], attachments: ['scope']
    },
    'sg552' => {
      name: 'SG552', category: 'rifle', price: 3500, damage: 30, rate: 545, ammo: 30, reserve: 90,
      speed: 0.88, accuracy: 0.84, penetration: 0.71, range: 1450, reload_time: 3.0,
      spray_pattern: 'sg552_pattern', sound: 'sg552_fire', teams: ['t'], attachments: ['scope']
    },
    'awp' => { 
      name: 'AWP', category: 'sniper', price: 4750, damage: 115, rate: 41, ammo: 10, reserve: 30, 
      speed: 0.72, accuracy: 0.99, penetration: 0.975, range: 2500, reload_time: 3.7,
      spray_pattern: 'none', sound: 'awp_fire', teams: ['ct', 't'], zoom_levels: [2, 8]
    },
    'scout' => {
      name: 'Scout', category: 'sniper', price: 2750, damage: 75, rate: 48, ammo: 10, reserve: 90,
      speed: 0.92, accuracy: 0.95, penetration: 0.85, range: 2200, reload_time: 2.0,
      spray_pattern: 'none', sound: 'scout_fire', teams: ['ct', 't'], zoom_levels: [2, 6]
    },
    'g3sg1' => {
      name: 'G3SG1', category: 'sniper', price: 5000, damage: 60, rate: 240, ammo: 20, reserve: 90,
      speed: 0.79, accuracy: 0.88, penetration: 0.82, range: 2000, reload_time: 4.2,
      spray_pattern: 'g3sg1_pattern', sound: 'g3sg1_fire', teams: ['ct'], zoom_levels: [2, 6]
    },
    'sg550' => {
      name: 'SG550', category: 'sniper', price: 4200, damage: 70, rate: 240, ammo: 30, reserve: 90,
      speed: 0.81, accuracy: 0.9, penetration: 0.88, range: 2100, reload_time: 3.5,
      spray_pattern: 'sg550_pattern', sound: 'sg550_fire', teams: ['t'], zoom_levels: [2, 6]
    },
    
    # SMGs
    'mp5navy' => { 
      name: 'MP5-Navy', category: 'smg', price: 1500, damage: 26, rate: 750, ammo: 30, reserve: 120, 
      speed: 0.96, accuracy: 0.65, penetration: 0.6, range: 800, reload_time: 2.6,
      spray_pattern: 'mp5_pattern', sound: 'mp5_fire', teams: ['ct', 't']
    },
    'tmp' => {
      name: 'TMP', category: 'smg', price: 1250, damage: 20, rate: 857, ammo: 30, reserve: 120,
      speed: 0.97, accuracy: 0.55, penetration: 0.55, range: 600, reload_time: 2.1,
      spray_pattern: 'tmp_pattern', sound: 'tmp_fire', teams: ['ct']
    },
    'mac10' => {
      name: 'MAC-10', category: 'smg', price: 1400, damage: 29, rate: 857, ammo: 30, reserve: 100,
      speed: 0.97, accuracy: 0.15, penetration: 0.6, range: 500, reload_time: 3.15,
      spray_pattern: 'mac10_pattern', sound: 'mac10_fire', teams: ['t']
    },
    'ump45' => {
      name: 'UMP45', category: 'smg', price: 1700, damage: 30, rate: 600, ammo: 25, reserve: 100,
      speed: 0.95, accuracy: 0.58, penetration: 0.65, range: 900, reload_time: 3.5,
      spray_pattern: 'ump45_pattern', sound: 'ump45_fire', teams: ['ct', 't']
    },
    'p90' => { 
      name: 'P90', category: 'smg', price: 2350, damage: 26, rate: 857, ammo: 50, reserve: 100, 
      speed: 0.93, accuracy: 0.68, penetration: 0.64, range: 750, reload_time: 3.4,
      spray_pattern: 'p90_pattern', sound: 'p90_fire', teams: ['ct', 't']
    },
    
    # Shotguns
    'm3' => {
      name: 'M3 Shotgun', category: 'shotgun', price: 1700, damage: 113, rate: 882, ammo: 8, reserve: 32,
      speed: 0.92, accuracy: 0.62, penetration: 0.0, range: 300, reload_time: 4.2,
      spray_pattern: 'shotgun_spread', sound: 'm3_fire', teams: ['ct', 't'], pellets: 9
    },
    'xm1014' => {
      name: 'XM1014', category: 'shotgun', price: 3000, damage: 88, rate: 240, ammo: 7, reserve: 32,
      speed: 0.89, accuracy: 0.17, penetration: 0.0, range: 350, reload_time: 2.5,
      spray_pattern: 'auto_shotgun_spread', sound: 'xm1014_fire', teams: ['ct', 't'], pellets: 6
    },
    
    # Machine Guns
    'm249' => {
      name: 'M249', category: 'machinegun', price: 5750, damage: 32, rate: 750, ammo: 100, reserve: 200,
      speed: 0.75, accuracy: 0.65, penetration: 0.8, range: 1500, reload_time: 5.7,
      spray_pattern: 'm249_pattern', sound: 'm249_fire', teams: ['ct', 't']
    },
    
    # Additional rifles for bot purchasing
    'famas' => {
      name: 'FAMAS', category: 'rifle', price: 2050, damage: 30, rate: 666, ammo: 25, reserve: 90,
      speed: 0.9, accuracy: 0.76, penetration: 0.68, range: 1100, reload_time: 3.3,
      spray_pattern: 'famas_pattern', sound: 'famas_fire', teams: ['ct'], burst_fire: true
    },
    'galil' => {
      name: 'Galil AR', category: 'rifle', price: 2000, damage: 30, rate: 666, ammo: 35, reserve: 90,
      speed: 0.91, accuracy: 0.74, penetration: 0.69, range: 1050, reload_time: 2.45,
      spray_pattern: 'galil_pattern', sound: 'galil_fire', teams: ['t']
    },
    
    # Equipment
    'kevlar' => { name: 'Kevlar Vest', category: 'equipment', price: 650 },
    'kevlar_helmet' => { name: 'Kevlar + Helmet', category: 'equipment', price: 1000 },
    'defuse_kit' => { name: 'Defuse Kit', category: 'equipment', price: 400 },
    'flashbang' => { name: 'Flashbang', category: 'grenade', price: 200 },
    'hegrenade' => { name: 'HE Grenade', category: 'grenade', price: 300 },
    'smokegrenade' => { name: 'Smoke Grenade', category: 'grenade', price: 300 }
  }
  
  # Weapon spray patterns and recoil data
  SPRAY_PATTERNS = {
    'tight' => { 
      pattern: [[0, 0], [0, -1], [1, -1], [-1, -1], [0, -2]], 
      recovery_time: 0.4, max_spread: 2.0 
    },
    'wide' => { 
      pattern: [[0, 0], [-1, -1], [1, -1], [-2, -1], [2, -2], [0, -2]], 
      recovery_time: 0.6, max_spread: 3.5 
    },
    'moderate' => { 
      pattern: [[0, 0], [0, -1], [1, -1], [-1, -2], [1, -2], [0, -3]], 
      recovery_time: 0.5, max_spread: 2.8 
    },
    'very_wide' => { 
      pattern: [[0, 0], [-2, -1], [3, -1], [-3, -2], [4, -3], [0, -4]], 
      recovery_time: 0.8, max_spread: 5.0 
    },
    'dual_wide' => { 
      pattern: [[0, 0], [-1, 0], [1, 0], [-2, -1], [2, -1], [-1, -2], [1, -2]], 
      recovery_time: 0.7, max_spread: 4.0 
    },
    'ak47_pattern' => {
      pattern: [[0, 0], [0, -2], [-1, -4], [1, -6], [-2, -7], [2, -8], [-3, -9], [3, -10], 
                [-4, -10], [4, -10], [-3, -9], [3, -8], [-2, -7], [2, -6], [-1, -5], 
                [1, -4], [0, -3], [0, -2], [-1, -1], [1, -1], [0, 0], [-1, 1], [1, 1], 
                [-2, 2], [2, 2], [-3, 3], [3, 3], [-2, 4], [2, 4], [-1, 5]],
      recovery_time: 1.0, max_spread: 6.0
    },
    'm4a1_pattern' => {
      pattern: [[0, 0], [0, -1], [0, -2], [-1, -3], [1, -4], [-1, -5], [2, -6], [-2, -7], 
                [1, -8], [-1, -9], [2, -9], [-2, -9], [3, -8], [-3, -7], [2, -6], 
                [-2, -5], [1, -4], [-1, -3], [0, -2], [0, -1], [1, 0], [-1, 1], 
                [2, 2], [-2, 3], [1, 4], [-1, 5], [0, 6], [0, 7], [1, 8], [-1, 9]],
      recovery_time: 0.9, max_spread: 5.0
    },
    'm4a1s_pattern' => {
      pattern: [[0, 0], [0, -1], [0, -2], [0, -3], [-1, -4], [1, -5], [-1, -6], [1, -7], 
                [-2, -8], [2, -9], [-1, -9], [1, -8], [-2, -7], [2, -6], [-1, -5], 
                [1, -4], [0, -3], [0, -2], [0, -1], [0, 0], [0, 1], [0, 2], 
                [-1, 3], [1, 4], [0, 5]],
      recovery_time: 0.8, max_spread: 4.0
    },
    'm4a4_pattern' => {
      pattern: [[0, 0], [0, -1], [0, -2], [-1, -3], [1, -4], [-2, -5], [2, -6], [-1, -7], 
                [1, -8], [-3, -9], [3, -9], [-2, -8], [2, -7], [-1, -6], [1, -5], 
                [0, -4], [0, -3], [-1, -2], [1, -1], [0, 0], [-1, 1], [1, 2], 
                [-2, 3], [2, 4], [-1, 5], [1, 6], [0, 7], [0, 8], [-1, 9], [1, 10]],
      recovery_time: 0.95, max_spread: 5.5
    },
    'p90_pattern' => {
      pattern: [[0, 0], [-1, 0], [1, 0], [-2, -1], [2, -1], [-1, -2], [1, -2], [0, -3],
                [-3, -3], [3, -3], [-2, -2], [2, -2], [-1, -1], [1, -1], [0, 0],
                [-1, 1], [1, 1], [-2, 2], [2, 2], [-3, 3], [3, 3], [-4, 4], [4, 4],
                [-3, 5], [3, 5], [-2, 6], [2, 6], [-1, 7], [1, 7], [0, 8]],
      recovery_time: 0.7, max_spread: 4.5
    },
    'mp5_pattern' => {
      pattern: [[0, 0], [0, -1], [-1, -1], [1, -2], [-1, -3], [1, -4], [0, -5], 
                [-2, -5], [2, -5], [-1, -4], [1, -3], [0, -2], [0, -1], [-1, 0],
                [1, 1], [-2, 2], [2, 3], [-1, 4], [1, 5], [0, 6], [0, 7],
                [-1, 8], [1, 9], [0, 10]],
      recovery_time: 0.6, max_spread: 3.5
    },
    'shotgun_spread' => {
      pattern: [[0, 0], [-3, -2], [3, -1], [-4, 1], [4, -3], [-2, 3], [2, 2], [-5, 0], [5, -2]],
      recovery_time: 1.2, max_spread: 8.0, pellet_spread: true
    },
    'auto_shotgun_spread' => {
      pattern: [[0, 0], [-2, -1], [2, -1], [-3, 1], [3, -2], [-1, 2], [1, 1]],
      recovery_time: 1.0, max_spread: 6.0, pellet_spread: true
    },
    'famas_pattern' => {
      pattern: [[0, 0], [0, -1], [-1, -2], [1, -3], [-1, -4], [2, -5], [-2, -6], 
                [1, -7], [-1, -8], [2, -8], [-2, -7], [1, -6], [-1, -5], [0, -4],
                [1, -3], [-1, -2], [0, -1], [0, 0], [1, 1], [-1, 2], [0, 3]],
      recovery_time: 0.8, max_spread: 4.5
    },
    'galil_pattern' => {
      pattern: [[0, 0], [0, -1], [1, -2], [-1, -3], [2, -4], [-2, -5], [1, -6], 
                [-1, -7], [3, -8], [-3, -8], [2, -7], [-2, -6], [1, -5], [-1, -4],
                [0, -3], [0, -2], [1, -1], [-1, 0], [2, 1], [-2, 2], [1, 3],
                [-1, 4], [0, 5], [0, 6], [1, 7]],
      recovery_time: 0.85, max_spread: 5.2
    },
    'm249_pattern' => {
      pattern: [[0, 0], [-1, -1], [1, -1], [-2, -2], [2, -2], [-3, -3], [3, -3],
                [-4, -4], [4, -4], [-3, -5], [3, -5], [-2, -6], [2, -6], [-1, -7],
                [1, -7], [0, -8], [0, -9], [-1, -10], [1, -10], [-2, -9], [2, -8]],
      recovery_time: 1.2, max_spread: 7.0
    },
    'none' => { pattern: [[0, 0]], recovery_time: 0.0, max_spread: 0.0 }
  }
  
  # Weapon skins system
  WEAPON_SKINS = {
    'ak47' => {
      'default' => { name: 'Default', rarity: 'stock', wear: nil },
      'redline' => { name: 'Redline', rarity: 'classified', wear: ['factory_new', 'minimal_wear', 'field_tested'] },
      'vulcan' => { name: 'Vulcan', rarity: 'covert', wear: ['factory_new', 'minimal_wear', 'field_tested', 'well_worn'] },
      'fire_serpent' => { name: 'Fire Serpent', rarity: 'covert', wear: ['minimal_wear', 'field_tested', 'well_worn', 'battle_scarred'] }
    },
    'm4a1' => {
      'default' => { name: 'Default', rarity: 'stock', wear: nil },
      'hyper_beast' => { name: 'Hyper Beast', rarity: 'covert', wear: ['factory_new', 'minimal_wear', 'field_tested'] },
      'asiimov' => { name: 'Asiimov', rarity: 'covert', wear: ['field_tested', 'well_worn', 'battle_scarred'] }
    },
    'awp' => {
      'default' => { name: 'Default', rarity: 'stock', wear: nil },
      'dragon_lore' => { name: 'Dragon Lore', rarity: 'covert', wear: ['factory_new', 'minimal_wear', 'field_tested'] },
      'asiimov' => { name: 'Asiimov', rarity: 'covert', wear: ['field_tested', 'well_worn', 'battle_scarred'] },
      'lightning_strike' => { name: 'Lightning Strike', rarity: 'covert', wear: ['factory_new'] }
    }
  }
  
  # Weapon attachment definitions
  ATTACHMENTS = {
    'silencer' => {
      name: 'Silencer',
      compatible_weapons: ['usp', 'm4a1'],
      stat_modifiers: { damage: -0.05, accuracy: 0.03, sound: 'silenced', flash_reduction: 0.8 }
    },
    'scope' => {
      name: 'Scope',
      compatible_weapons: ['aug', 'sg552', 'awp', 'scout', 'g3sg1', 'sg550'],
      stat_modifiers: { accuracy: 0.1, speed: -0.05 },
      zoom_levels: [2, 4, 6, 8]
    }
  }
  
  # Game mode types
  GAME_MODES = {
    'bomb_defusal' => 'Bomb Defusal',
    'hostage_rescue' => 'Hostage Rescue'
  }

  # Map definitions with spawn points, bomb sites, hostage positions, rescue zones, walls, and tactical positions
  MAPS = {
    'dust2' => {
      name: 'Dust2',
      description: 'Classic desert map',
      game_mode: 'bomb_defusal',
      size: { width: 1280, height: 720 },
      ct_spawn: [
        { x: 100, y: 300, angle: 0 },
        { x: 120, y: 320, angle: 0 },
        { x: 80, y: 280, angle: 0 },
        { x: 100, y: 340, angle: 0 },
        { x: 140, y: 300, angle: 0 }
      ],
      t_spawn: [
        { x: 1100, y: 300, angle: 180 },
        { x: 1120, y: 320, angle: 180 },
        { x: 1080, y: 280, angle: 180 },
        { x: 1100, y: 340, angle: 180 },
        { x: 1140, y: 300, angle: 180 }
      ],
      bomb_sites: {
        'A' => { x: 200, y: 200, radius: 60 },
        'B' => { x: 1080, y: 520, radius: 60 }
      },
      walls: [
        # Main layout walls - long corridor
        [250, 100, 1030, 100], # Top wall
        [250, 100, 250, 280], # Top left vertical
        [1030, 100, 1030, 280], # Top right vertical
        
        # Mid section
        [400, 350, 880, 350], # Mid horizontal
        [400, 350, 400, 500], # Mid left vertical
        [880, 350, 880, 500], # Mid right vertical
        
        # Bottom section
        [250, 620, 1030, 620], # Bottom wall
        [250, 440, 250, 620], # Bottom left vertical
        [1030, 440, 1030, 620], # Bottom right vertical
      ],
      tactical_positions: {
        't' => [
          { x: 950, y: 150, type: 'long' },
          { x: 640, y: 400, type: 'mid' },
          { x: 900, y: 570, type: 'tunnels' }
        ],
        'ct' => [
          { x: 330, y: 150, type: 'long' },
          { x: 640, y: 300, type: 'mid' },
          { x: 380, y: 570, type: 'tunnels' }
        ]
      }
    },
    
    'inferno' => {
      name: 'Inferno',
      description: 'Tight CQB map',
      size: { width: 1280, height: 720 },
      ct_spawn: [
        { x: 150, y: 600, angle: 270 },
        { x: 170, y: 580, angle: 270 },
        { x: 130, y: 620, angle: 270 },
        { x: 190, y: 600, angle: 270 },
        { x: 150, y: 560, angle: 270 }
      ],
      t_spawn: [
        { x: 1130, y: 120, angle: 90 },
        { x: 1150, y: 100, angle: 90 },
        { x: 1110, y: 140, angle: 90 },
        { x: 1170, y: 120, angle: 90 },
        { x: 1130, y: 80, angle: 90 }
      ],
      bomb_sites: {
        'A' => { x: 300, y: 180, radius: 55 },
        'B' => { x: 980, y: 540, radius: 55 }
      },
      walls: [
        # Apartments complex
        [200, 120, 500, 120], # Apartments top
        [200, 120, 200, 320], # Apartments left
        [500, 120, 500, 220], # Apartments right partial
        
        # Mid building
        [580, 280, 700, 280], # Mid building top
        [580, 280, 580, 440], # Mid building left
        [700, 280, 700, 440], # Mid building right
        [580, 440, 700, 440], # Mid building bottom
        
        # Banana/B site
        [800, 480, 1200, 480], # B site top wall
        [800, 480, 800, 600], # B site left wall
        [1200, 480, 1200, 600], # B site right wall
      ],
      tactical_positions: {
        't' => [
          { x: 350, y: 200, type: 'apartments' },
          { x: 640, y: 360, type: 'mid' },
          { x: 850, y: 540, type: 'banana' }
        ],
        'ct' => [
          { x: 250, y: 250, type: 'site_a' },
          { x: 640, y: 250, type: 'mid' },
          { x: 1050, y: 540, type: 'site_b' }
        ]
      }
    },
    
    'mirage' => {
      name: 'Mirage',
      description: 'Balanced three-lane map',
      size: { width: 1280, height: 720 },
      ct_spawn: [
        { x: 640, y: 650, angle: 270 },
        { x: 620, y: 630, angle: 270 },
        { x: 660, y: 630, angle: 270 },
        { x: 600, y: 650, angle: 270 },
        { x: 680, y: 650, angle: 270 }
      ],
      t_spawn: [
        { x: 640, y: 70, angle: 90 },
        { x: 620, y: 90, angle: 90 },
        { x: 660, y: 90, angle: 90 },
        { x: 600, y: 70, angle: 90 },
        { x: 680, y: 70, angle: 90 }
      ],
      bomb_sites: {
        'A' => { x: 280, y: 280, radius: 50 },
        'B' => { x: 1000, y: 440, radius: 50 }
      },
      walls: [
        # A site structure
        [200, 200, 360, 200], # A site top
        [200, 200, 200, 360], # A site left
        [360, 200, 360, 280], # A site right partial
        
        # Mid structure
        [560, 300, 720, 300], # Mid wall
        [560, 420, 720, 420], # Mid lower wall
        
        # B site structure
        [920, 360, 1080, 360], # B site top
        [1080, 360, 1080, 520], # B site right
        [920, 520, 1080, 520], # B site bottom
        [920, 360, 920, 520], # B site left
        
        # Connector walls
        [480, 180, 480, 280], # A connector
        [800, 440, 800, 540], # B connector
      ],
      tactical_positions: {
        't' => [
          { x: 280, y: 150, type: 'ramp' },
          { x: 640, y: 200, type: 'mid' },
          { x: 860, y: 440, type: 'apps' }
        ],
        'ct' => [
          { x: 350, y: 350, type: 'site_a' },
          { x: 640, y: 500, type: 'connector' },
          { x: 950, y: 300, type: 'site_b' }
        ]
      }
    },
    
    'cache' => {
      name: 'Cache',
      description: 'Industrial warehouse',
      size: { width: 1280, height: 720 },
      ct_spawn: [
        { x: 100, y: 360, angle: 0 },
        { x: 80, y: 340, angle: 0 },
        { x: 120, y: 380, angle: 0 },
        { x: 100, y: 320, angle: 0 },
        { x: 100, y: 400, angle: 0 }
      ],
      t_spawn: [
        { x: 1180, y: 360, angle: 180 },
        { x: 1200, y: 340, angle: 180 },
        { x: 1160, y: 380, angle: 180 },
        { x: 1180, y: 320, angle: 180 },
        { x: 1180, y: 400, angle: 180 }
      ],
      bomb_sites: {
        'A' => { x: 350, y: 200, radius: 65 },
        'B' => { x: 930, y: 520, radius: 65 }
      },
      walls: [
        # Main warehouse structure
        [250, 150, 450, 150], # A site building top
        [250, 150, 250, 250], # A site building left
        [450, 150, 450, 300], # A site building right
        [250, 250, 350, 250], # A site building bottom partial
        
        # Central warehouse
        [500, 280, 780, 280], # Central building top
        [500, 280, 500, 440], # Central building left
        [780, 280, 780, 440], # Central building right
        [500, 440, 780, 440], # Central building bottom
        
        # B site warehouse
        [830, 470, 1030, 470], # B site building top
        [830, 470, 830, 570], # B site building left
        [1030, 470, 1030, 570], # B site building right
        [830, 570, 1030, 570], # B site building bottom
      ],
      tactical_positions: {
        't' => [
          { x: 550, y: 200, type: 'main' },
          { x: 640, y: 360, type: 'mid' },
          { x: 780, y: 520, type: 'highway' }
        ],
        'ct' => [
          { x: 200, y: 200, type: 'quad' },
          { x: 500, y: 200, type: 'main' },
          { x: 1080, y: 440, type: 'checkers' }
        ]
      }
    },
    
    # Hostage Rescue Maps
    'office' => {
      name: 'Office',
      description: 'Hostage rescue in office building',
      game_mode: 'hostage_rescue',
      size: { width: 1280, height: 720 },
      ct_spawn: [
        { x: 80, y: 360, angle: 0 },
        { x: 100, y: 340, angle: 0 },
        { x: 120, y: 380, angle: 0 },
        { x: 60, y: 320, angle: 0 },
        { x: 140, y: 360, angle: 0 }
      ],
      t_spawn: [
        { x: 900, y: 200, angle: 180 },
        { x: 920, y: 220, angle: 180 },
        { x: 880, y: 180, angle: 180 },
        { x: 940, y: 200, angle: 180 },
        { x: 900, y: 240, angle: 180 }
      ],
      hostage_positions: [
        { id: 1, x: 800, y: 150, health: 100, rescued: false, being_rescued: false, rescuer: nil, fear_level: 0.0 },
        { id: 2, x: 850, y: 180, health: 100, rescued: false, being_rescued: false, rescuer: nil, fear_level: 0.0 },
        { id: 3, x: 950, y: 140, health: 100, rescued: false, being_rescued: false, rescuer: nil, fear_level: 0.0 },
        { id: 4, x: 900, y: 500, health: 100, rescued: false, being_rescued: false, rescuer: nil, fear_level: 0.0 }
      ],
      rescue_zones: [
        { x: 120, y: 360, radius: 80 }
      ],
      walls: [
        # Outer walls
        [200, 80, 1100, 80], # Top wall
        [200, 80, 200, 580], # Left wall
        [1100, 80, 1100, 580], # Right wall
        [200, 580, 1100, 580], # Bottom wall
        
        # Interior office walls
        [400, 120, 400, 300], # Office partition 1
        [600, 120, 600, 300], # Office partition 2
        [800, 120, 800, 300], # Office partition 3
        [400, 400, 1000, 400], # Corridor wall
        [700, 400, 700, 540], # Room divider
      ],
      tactical_positions: {
        't' => [
          { x: 750, y: 160, type: 'hostage_guard' },
          { x: 920, y: 450, type: 'corridor' },
          { x: 500, y: 200, type: 'office' }
        ],
        'ct' => [
          { x: 300, y: 200, type: 'entry' },
          { x: 250, y: 450, type: 'approach' },
          { x: 150, y: 360, type: 'rescue_zone' }
        ]
      }
    },
    
    'italy' => {
      name: 'Italy',
      description: 'Mediterranean hostage rescue',
      game_mode: 'hostage_rescue',
      size: { width: 1280, height: 720 },
      ct_spawn: [
        { x: 100, y: 500, angle: 90 },
        { x: 120, y: 520, angle: 90 },
        { x: 80, y: 480, angle: 90 },
        { x: 140, y: 500, angle: 90 },
        { x: 100, y: 540, angle: 90 }
      ],
      t_spawn: [
        { x: 900, y: 150, angle: 270 },
        { x: 920, y: 170, angle: 270 },
        { x: 880, y: 130, angle: 270 },
        { x: 940, y: 150, angle: 270 },
        { x: 900, y: 190, angle: 270 }
      ],
      hostage_positions: [
        { id: 1, x: 850, y: 120, health: 100, rescued: false, being_rescued: false, rescuer: nil, fear_level: 0.0 },
        { id: 2, x: 950, y: 140, health: 100, rescued: false, being_rescued: false, rescuer: nil, fear_level: 0.0 },
        { id: 3, x: 880, y: 200, health: 100, rescued: false, being_rescued: false, rescuer: nil, fear_level: 0.0 },
        { id: 4, x: 750, y: 300, health: 100, rescued: false, being_rescued: false, rescuer: nil, fear_level: 0.0 }
      ],
      rescue_zones: [
        { x: 120, y: 520, radius: 70 }
      ],
      walls: [
        # Main structure
        [300, 60, 1100, 60], # Top wall
        [300, 60, 300, 400], # Left wall
        [1100, 60, 1100, 400], # Right wall
        [300, 400, 1100, 400], # Bottom inner wall
        
        # Interior walls
        [500, 100, 500, 350], # Interior wall 1
        [700, 100, 700, 350], # Interior wall 2
        [900, 100, 900, 250], # Interior wall 3
        
        # Lower area walls
        [200, 450, 800, 450], # Lower partition
        [600, 450, 600, 600], # Vertical partition
      ],
      tactical_positions: {
        't' => [
          { x: 800, y: 180, type: 'hostage_guard' },
          { x: 650, y: 250, type: 'corridor' },
          { x: 950, y: 180, type: 'upper_area' }
        ],
        'ct' => [
          { x: 400, y: 300, type: 'entry' },
          { x: 250, y: 500, type: 'approach' },
          { x: 120, y: 520, type: 'rescue_zone' }
        ]
      }
    }
  }
  
  ROUND_TIME = 115 # seconds
  BUY_TIME = 15 # seconds
  BOMB_TIMER = 35 # seconds
  DEFUSE_TIME = 5 # seconds (with kit: 2.5)
  HOSTAGE_RESCUE_TIME = 3 # seconds to rescue a hostage
  HOSTAGE_MAX_HEALTH = 100
  HOSTAGE_FOLLOW_DISTANCE = 50 # pixels
  
  # Admin System Constants
  ADMIN_LEVELS = {
    0 => 'Player',
    1 => 'Moderator',
    2 => 'Admin', 
    3 => 'Super Admin',
    4 => 'Owner'
  }
  
  ADMIN_PERMISSIONS = {
    'kick' => 1,
    'ban_temp' => 1,
    'mute' => 1,
    'ban_perm' => 2,
    'change_map' => 2,
    'restart_round' => 2,
    'god_mode' => 2,
    'spectate_all' => 2,
    'config_server' => 3,
    'manage_admins' => 4,
    'demo_record' => 2,
    'demo_playback' => 1
  }
  
  # Default admin credentials (in production, use secure authentication)
  ADMIN_CREDENTIALS = {
    'admin' => { password: 'admin123', level: 4 },
    'mod' => { password: 'mod123', level: 1 },
    'test' => { password: 'test123', level: 2 }
  }
  
  # Ban file storage
  BAN_FILE = File.expand_path('bans.json', __dir__)
  MUTE_FILE = File.expand_path('mutes.json', __dir__)
  DEMO_DIR = File.expand_path('demos', __dir__)
  
  def initialize(...)
    super
    @player_id = nil
    # Initialize progression system
    @progression_manager = ProgressionManager.new
    @match_started = false
    @game_state = {
      round: 1,
      ct_score: 0,
      t_score: 0,
      round_time: ROUND_TIME,
      phase: 'warmup', # warmup, buy_time, round_active, round_end
      bomb_planted: false,
      bomb_site: nil,
      bomb_timer: nil,
      bomb_position: nil,
      defusing_player: nil,
      defuse_start_time: nil,
      players: {},
      bots: {},
      spectators: {}, # Track spectating players
      grenades: [],
      dropped_weapons: [],
      kill_feed: [],
      round_winner: nil,
      mvp_player: nil,
      # Map system
      current_map: 'dust2',
      map_rotation: ['dust2', 'inferno', 'mirage', 'cache', 'office', 'italy'],
      map_rotation_index: 0,
      # Hostage system
      hostages: {},
      hostages_rescued: 0,
      hostages_remaining: 0,
      # Map voting system
      map_vote_active: false,
      map_vote_options: [],
      map_votes: {},
      map_vote_timer: 0,
      # Admin system
      admin_sessions: {}, # player_id => { username, level, authenticated }
      reports: [],
      muted_players: {},
      server_config: {
        round_time: ROUND_TIME,
        buy_time: BUY_TIME,
        bomb_timer: BOMB_TIMER,
        defuse_time: DEFUSE_TIME,
        friendly_fire: false,
        auto_restart: true,
        max_rounds: 30,
        auto_anticheat: true
      },
      bans: {},
      demo_recording: false,
      demo_data: [],
      anticheat_violations: {}
    }
    @game_running = false
    @last_bot_update = Time.now
    @last_round_update = Time.now
  end
  
  def bind(page)
    super
    Console.info(self, "CS2D bind method called - WebSocket connection established")
    
    # Initialize minimal game state
    @player_id = SecureRandom.uuid
    @game_state = {
      players: {},
      phase: 'waiting',
      round_time: 30,
      ct_score: 0,
      t_score: 0
    }
    
    # Add the connected player
    @game_state[:players][@player_id] = {
      id: @player_id,
      name: "Player_#{@player_id[0..7]}",
      team: 'ct',
      x: 640,
      y: 360,
      health: 100,
      alive: true
    }
    
    Console.info(self, "CS2D game state initialized for player #{@player_id}")
    self.update!
    Console.info(self, "CS2D render update sent via WebSocket")
  end
  
  def close
    @game_running = false
    @game_loop&.stop if @game_loop
    
    # Clean up player and spectator state
    if @player_id
      @game_state[:players].delete(@player_id)
      @game_state[:spectators].delete(@player_id)
    end
    
    # End match tracking and save profiles
    if @match_started && @progression_manager
      end_match_tracking
      @progression_manager.save_all_profiles
    end
    
    super
  end
  
  def handle(event)
    return unless @player_id && @game_running
    
    case event[:type]
    when "player_move"
      handle_player_move(event)
    when "player_shoot"
      handle_player_shoot(event)
    when "player_reload"
      handle_player_reload(event)
    when "buy_weapon"
      handle_buy_weapon(event)
    when "plant_bomb"
      handle_plant_bomb(event)
    when "defuse_bomb"
      handle_defuse_bomb(event)
    when "rescue_hostage"
      handle_rescue_hostage(event)
    when "drop_weapon"
      handle_drop_weapon(event)
    when "chat_message"
      handle_chat(event)
    when "change_team"
      handle_team_change(event)
    when "player_angle"
      handle_player_angle(event)
    when "throw_grenade"
      handle_throw_grenade(event)
    when "spectator_next"
      handle_spectator_next(event)
    when "spectator_prev"
      handle_spectator_prev(event)
    when "weapon_skin_selection"
      handle_weapon_skin_selection(event)
    when "attachment_toggle"
      handle_attachment_toggle(event)
    when "weapon_switch"
      handle_weapon_switch(event)
    when "spectator_free_cam"
      handle_spectator_free_cam(event)
    when "spectator_camera_move"
      handle_spectator_camera_move(event)
    when "vote_map"
      handle_map_vote(event)
    when "start_map_vote"
      start_map_vote
    # Progression system events
    when "get_player_data"
      handle_get_player_data(event)
    when "get_leaderboard"
      handle_get_leaderboard(event)
    when "get_achievements"
      handle_get_achievements(event)
    when "get_match_history"
      handle_get_match_history(event)
    when "claim_daily_bonus"
      handle_claim_daily_bonus(event)
    end
  end
  
  def handle_player_move(event)
    player = @game_state[:players][@player_id]
    return unless player && player[:alive]
    
    # Anti-cheat: Check for violations before processing movement
    violations = check_anticheat_violations(player)
    if violations.any?
      Console.warn(self, "Anti-cheat violations detected for #{player[:name]}: #{violations.join(', ')}")
      record_demo_event('anticheat_violation', { player: player[:name], violations: violations })
    end
    
    # God mode check - admins with god mode can move freely
    if player[:god_mode]
      player[:x] = event[:x] if event[:x]
      player[:y] = event[:y] if event[:y]
      record_demo_event('player_move', { player: player[:name], x: player[:x], y: player[:y], god_mode: true })
      broadcast_game_state
      return
    end
    
    # Apply weapon speed modifier
    weapon = WEAPONS[player[:current_weapon]]
    speed_modifier = weapon ? weapon[:speed] : 1.0
    
    dx = (event[:dx] || 0) * speed_modifier
    dy = (event[:dy] || 0) * speed_modifier
    
    # Calculate new position
    new_x = player[:x] + dx
    new_y = player[:y] + dy
    
    # Bounds checking first
    new_x = [[new_x, 20].max, 1260].min
    new_y = [[new_y, 20].max, 700].min
    
    # Check wall collisions
    unless check_wall_collision(new_x, new_y)
      player[:x] = new_x
      player[:y] = new_y
    else
      # Try moving only in X direction
      unless check_wall_collision(new_x, player[:y])
        player[:x] = new_x
      else
        # Try moving only in Y direction
        unless check_wall_collision(player[:x], new_y)
          player[:y] = new_y
        end
        # If both fail, don't move
      end
    end
    
    # Record movement for demo system
    record_demo_event('player_move', { player: player[:name], x: player[:x], y: player[:y] })
    
    broadcast_game_state
  end
  
  def handle_player_angle(event)
    player = @game_state[:players][@player_id]
    return unless player
    
    player[:angle] = event[:angle] if event[:angle]
  end
  
  def handle_player_shoot(event)
    player = @game_state[:players][@player_id]
    return unless player && player[:alive]
    
    weapon = WEAPONS[player[:current_weapon]]
    return unless weapon && weapon[:ammo]
    
    # Initialize weapon state if not exists
    player[:weapon_state] ||= {}
    weapon_state = player[:weapon_state][player[:current_weapon]] ||= {
      shots_fired: 0,
      last_shot_time: 0,
      recoil_accumulation: 0.0,
      current_attachment: nil
    }
    
    # Check fire rate
    now = Time.now.to_f * 1000
    fire_delay = 60000.0 / weapon[:rate] # Convert RPM to ms between shots
    return if now - weapon_state[:last_shot_time] < fire_delay
    
    # Check ammo
    current_ammo = player[:ammo][player[:current_weapon]] || 0
    return if current_ammo <= 0
    
    # Calculate burst fire for Glock
    shots_to_fire = 1
    if weapon[:burst_fire] && event[:burst]
      shots_to_fire = [3, current_ammo].min
    end
    
    # Calculate spray pattern and recoil
    spray_data = SPRAY_PATTERNS[weapon[:spray_pattern]] || SPRAY_PATTERNS['moderate']
    
    # Calculate recoil based on consecutive shots
    time_since_last = now - weapon_state[:last_shot_time]
    if time_since_last > spray_data[:recovery_time] * 1000
      weapon_state[:recoil_accumulation] *= 0.7 # Partial recovery
      weapon_state[:shots_fired] = 0 if time_since_last > spray_data[:recovery_time] * 2000
    end
    
    shots_to_fire.times do |shot_index|
      break if player[:ammo][player[:current_weapon]] <= 0
      
      # Deduct ammo
      player[:ammo][player[:current_weapon]] -= 1
      weapon_state[:shots_fired] += 1
      weapon_state[:last_shot_time] = now + (shot_index * 50) # Burst delay
      
      # Calculate accuracy with spray pattern
      base_angle = event[:angle] || player[:angle]
      shot_number = [weapon_state[:shots_fired] - 1, spray_data[:pattern].length - 1].min
      recoil_offset = spray_data[:pattern][shot_number] || [0, 0]
      
      # Apply weapon attachments
      attachment_modifier = 1.0
      if weapon[:attachments] && weapon_state[:current_attachment]
        attachment = ATTACHMENTS[weapon_state[:current_attachment]]
        attachment_modifier = attachment[:stat_modifiers][:accuracy] || 1.0 if attachment
      end
      
      # Calculate final angle with recoil
      recoil_x = recoil_offset[0] * (weapon_state[:recoil_accumulation] + 1) * attachment_modifier
      recoil_y = recoil_offset[1] * (weapon_state[:recoil_accumulation] + 1) * attachment_modifier
      final_angle = base_angle + (recoil_x * 0.1) # Convert to radians
      
      # Movement accuracy penalty
      movement_penalty = calculate_movement_penalty(player, weapon)
      accuracy_modifier = weapon[:accuracy] * movement_penalty * attachment_modifier
      
      # Apply random spread based on accuracy
      spread = (1.0 - accuracy_modifier) * spray_data[:max_spread]
      angle_spread = (rand - 0.5) * spread * 0.1
      final_angle += angle_spread
      
      # Check for hit with modified damage
      final_damage = calculate_damage_with_range_falloff(weapon, player, final_angle)
      check_bullet_hit(player, final_angle, final_damage, weapon)
      
      # Accumulate recoil
      weapon_state[:recoil_accumulation] += 0.2
      weapon_state[:recoil_accumulation] = [weapon_state[:recoil_accumulation], spray_data[:max_spread]].min
    end
    
    # Play appropriate sound effect
    sound_name = weapon[:sound] || 'shoot'
    if weapon_state[:current_attachment] == 'silencer'
      sound_name = weapon[:sound]&.include?('silenced') ? weapon[:sound] : 'silenced_shot'
    end
    play_sound(sound_name)
    
    # Update player's last shot time
    player[:last_shot] = now
    
    # Track weapon usage for progression
    @progression_manager&.track_shot_fired(@player_id, player[:current_weapon], shots_to_fire > 1)
    
    # Record shooting for demo system
    record_demo_event('player_shoot', {
      player: player[:name],
      weapon: player[:current_weapon],
      shots_fired: shots_to_fire,
      x: player[:x],
      y: player[:y],
      angle: base_angle,
      final_angle: final_angle,
      recoil: weapon_state[:recoil_accumulation],
      ammo_remaining: player[:ammo][player[:current_weapon]]
    })
    
    broadcast_game_state
  end
  
  # Note: Enhanced reload system implemented later in the file
  
  def handle_buy_weapon(event)
    player = @game_state[:players][@player_id]
    return unless player && player[:alive]
    return unless @game_state[:phase] == 'buy_time'
    
    weapon_key = event[:weapon]
    weapon = WEAPONS[weapon_key]
    return unless weapon && weapon[:price]
    
    # Check team restrictions
    if weapon[:teams] && !weapon[:teams].include?(player[:team])
      play_sound('error')
      return
    end
    
    # Check if player can afford
    if player[:money] < weapon[:price]
      play_sound('error')
      return
    end
    
    # Handle different weapon categories
    case weapon[:category]
    when 'grenade'
      # Limit grenades (max 4 total, max 2 of each type)
      return if player[:grenades].length >= 4
      return if player[:grenades].count { |g| g == weapon_key } >= 2
      
      player[:grenades] << weapon_key
      
    when 'equipment'
      if weapon_key.include?('kevlar')
        # Upgrade armor
        current_armor = player[:armor] || 0
        if weapon_key == 'kevlar_helmet'
          player[:armor] = 100
          player[:has_helmet] = true
        else
          player[:armor] = 100
        end
      elsif weapon_key == 'defuse_kit'
        return unless player[:team] == 'ct'
        player[:has_defuse_kit] = true
      end
      
    else
      # Primary and secondary weapons
      old_weapon = player[:current_weapon]
      
      # Replace weapon of same category or add new
      if weapon[:category] == 'pistol'
        # Remove old pistol
        player[:weapons].delete_if { |w| WEAPONS[w] && WEAPONS[w][:category] == 'pistol' }
      else
        # Remove old primary weapon
        player[:weapons].delete_if { |w| WEAPONS[w] && WEAPONS[w][:category] != 'pistol' }
      end
      
      player[:weapons] << weapon_key
      player[:current_weapon] = weapon_key
      
      # Initialize weapon state
      player[:weapon_state] ||= {}
      player[:weapon_state][weapon_key] = {
        shots_fired: 0,
        last_shot_time: 0,
        recoil_accumulation: 0.0,
        current_attachment: nil
      }
      
      # Initialize ammo
      player[:ammo][weapon_key] = weapon[:ammo]
      player[:reserve_ammo][weapon_key] = weapon[:reserve]
    end
    
    # Deduct money
    player[:money] -= weapon[:price]
    
    # Apply weapon skins if available
    if player[:weapon_skins] && player[:weapon_skins][weapon_key]
      update_weapon_appearance(player, weapon_key, player[:weapon_skins][weapon_key])
    end
    
    play_sound('buy')
    broadcast_game_state
  end
  
  def handle_plant_bomb(event)
    player = @game_state[:players][@player_id]
    return unless player && player[:alive] && player[:team] == 't' && player[:has_bomb]
    return if @game_state[:bomb_planted]
    
    # Check if at bomb site
    site = at_bomb_site?(player[:x], player[:y])
    return unless site
    
    @game_state[:bomb_planted] = true
    @game_state[:bomb_site] = site
    @game_state[:bomb_timer] = BOMB_TIMER
    player[:has_bomb] = false
    
    # Track bomb plant in progression system
    @progression_manager&.track_objective(player[:id], :bomb_plant, success: true)
    
    play_sound('bomb_plant')
    add_to_kill_feed("#{player[:name]} planted the bomb at site #{site}")
    
    # Start bomb countdown
    start_bomb_timer
    
    broadcast_game_state
  end
  
  def handle_defuse_bomb(event)
    player = @game_state[:players][@player_id]
    return unless player && player[:alive] && player[:team] == 'ct'
    return unless @game_state[:bomb_planted]
    
    # Check if near bomb
    site = @game_state[:bomb_site]
    return unless at_bomb_site?(player[:x], player[:y]) == site
    
    defuse_time = player[:has_defuse_kit] ? 2.5 : DEFUSE_TIME
    
    # Start defusing (simplified - instant for now)
    @game_state[:bomb_planted] = false
    @game_state[:bomb_timer] = nil
    
    # Track bomb defuse in progression system
    @progression_manager&.track_objective(player[:id], :bomb_defuse, success: true)
    
    play_sound('bomb_defuse')
    add_to_kill_feed("#{player[:name]} defused the bomb!")
    
    # CT wins the round
    end_round('ct')
    
    broadcast_game_state
  end
  
  def handle_rescue_hostage(event)
    player = @game_state[:players][@player_id]
    return unless player && player[:alive] && player[:team] == 'ct'
    return unless is_hostage_rescue_mode?
    
    hostage_id = event[:hostage_id]
    return unless hostage_id
    
    if start_hostage_rescue(@player_id, hostage_id)
      # Track hostage rescue in progression system
      @progression_manager&.track_objective(player[:id], :hostage_rescue, success: true)
      
      play_sound('hostage_rescue')
      broadcast_game_state
    end
  end
  
  def handle_throw_grenade(event)
    player = @game_state[:players][@player_id]
    return unless player && player[:alive]
    
    grenade_type = event[:grenade_type]
    return unless player[:grenades].include?(grenade_type)
    
    # Get throw parameters
    angle = event[:angle] || player[:angle]
    power = event[:power] || 1.0 # 0.5 to 1.5 for varying throw strength
    cook_time = event[:cook_time] || 0 # Time grenade was cooked
    
    # Remove grenade from inventory
    player[:grenades].delete_at(player[:grenades].index(grenade_type))
    
    # Create grenade physics object
    create_grenade_physics(player, grenade_type, angle, power, cook_time)
    
    play_sound('grenade_throw')
    broadcast_game_state
  end
  
  def handle_team_change(event)
    player = @game_state[:players][@player_id]
    return unless player
    
    new_team = event[:team]
    return unless ['ct', 't'].include?(new_team)
    return if player[:team] == new_team
    
    player[:team] = new_team
    spawn_point = get_spawn_point(new_team)
    player[:x] = spawn_point[:x]
    player[:y] = spawn_point[:y]
    
    # Reset equipment for new team
    player[:weapons] = [new_team == 'ct' ? 'usp' : 'glock']
    player[:current_weapon] = new_team == 'ct' ? 'usp' : 'glock'
    player[:has_bomb] = false
    
    broadcast_game_state
  end
  
  def handle_drop_weapon(event)
    # Drop current weapon logic
  end
  
  def handle_chat(event)
    player = @game_state[:players][@player_id]
    return unless player
    
    message = event[:message]
    return if message.nil? || message.strip.empty?
    
    # Check if player is muted
    if player[:muted]
      # Check if mute has expired
      if player[:mute_expires] && Time.now.to_f > player[:mute_expires]
        player[:muted] = false
        player[:mute_expires] = nil
        @game_state[:muted_players].delete(@player_id)
        save_mutes
        add_to_kill_feed("#{player[:name]}'s mute has expired")
      else
        # Player is still muted, don't process message
        return
      end
    end
    
    # Handle chat commands
    if message.start_with?('!')
      handle_chat_command(player, message)
      return
    end
    
    chat_message = {
      player: player[:name],
      team: player[:team],
      message: message,
      timestamp: Time.now.to_f
    }
    
    # Record chat for demo system
    record_demo_event('chat_message', chat_message)
    
    broadcast_chat_message(chat_message)
  end
  
  def handle_chat_command(player, command)
    case command.downcase
    # Public commands
    when '!mapvote', '!votemap'
      start_map_vote unless @game_state[:map_vote_active]
    when /^!vote\s+(\d+)$/
      if @game_state[:map_vote_active]
        index = $1.to_i - 1
        if index >= 0 && index < @game_state[:map_vote_options].size
          map_name = @game_state[:map_vote_options][index]
          @game_state[:map_votes][@player_id] = map_name
          add_to_kill_feed("#{player[:name]} voted for #{MAPS[map_name][:name]}")
          broadcast_game_state
        end
      end
    when '!maps'
      map_list = MAPS.keys.map { |key| MAPS[key][:name] }.join(', ')
      current_map_name = MAPS[@game_state[:current_map]][:name]
      add_to_kill_feed("Current: #{current_map_name} | Available: #{map_list}")
    when /^!report\s+(.+?)(?:\s+(.+))?$/
      target_name, reason = $1, $2 || "Cheating/Griefing"
      if report_player(target_name, reason)
        add_to_kill_feed("Report submitted for #{target_name}")
      else
        add_to_kill_feed("Failed to report #{target_name}")
      end
    when '!adminhelp'
      if is_admin?
        show_admin_commands
      else
        add_to_kill_feed("Available commands: !mapvote, !vote <num>, !maps, !report <player> [reason]")
      end
    
    # Admin authentication
    when /^!login\s+(.+?)\s+(.+)$/
      username, password = $1, $2
      if authenticate_admin(username, password)
        add_to_kill_feed("#{player[:name]} authenticated as admin")
      else
        add_to_kill_feed("Invalid admin credentials")
      end
    when '!logout'
      if logout_admin
        add_to_kill_feed("#{player[:name]} logged out of admin")
      end
    when '!admin'
      if is_admin?
        session = @game_state[:admin_sessions][@player_id]
        level_name = ADMIN_LEVELS[session[:level]]
        add_to_kill_feed("#{player[:name]} is #{level_name} (Level #{session[:level]})")
      else
        add_to_kill_feed("#{player[:name]} is not an admin")
      end
    
    # Admin moderation commands
    when /^!kick\s+(.+?)(?:\s+(.+))?$/
      target_name, reason = $1, $2
      if admin_kick_player(target_name, reason)
        # Success message handled in method
      else
        add_to_kill_feed("Failed to kick #{target_name} - insufficient permissions or player not found")
      end
    when /^!ban\s+(.+?)(?:\s+(\d+))?(?:\s+(.+))?$/
      target_name, hours, reason = $1, $2&.to_i, $3
      if admin_ban_player(target_name, hours, reason)
        # Success message handled in method
      else
        add_to_kill_feed("Failed to ban #{target_name} - insufficient permissions or player not found")
      end
    when /^!unban\s+(.+)$/
      ip_address = $1
      if admin_unban_player(ip_address)
        # Success message handled in method
      else
        add_to_kill_feed("Failed to unban #{ip_address} - insufficient permissions or ban not found")
      end
    when /^!mute\s+(.+?)(?:\s+(\d+))?(?:\s+(.+))?$/
      target_name, minutes, reason = $1, $2&.to_i || 60, $3
      if admin_mute_player(target_name, minutes, reason)
        # Success message handled in method
      else
        add_to_kill_feed("Failed to mute #{target_name} - insufficient permissions or player not found")
      end
    when /^!unmute\s+(.+)$/
      target_name = $1
      if admin_unmute_player(target_name)
        # Success message handled in method
      else
        add_to_kill_feed("Failed to unmute #{target_name} - insufficient permissions or player not found")
      end
    
    # Admin game control commands
    when '!restart', '!restartround'
      if admin_restart_round
        # Success message handled in method
      else
        add_to_kill_feed("Insufficient permissions for restart round")
      end
    when /^!changemap\s+(.+)$/
      map_name = $1
      if admin_change_map(map_name)
        # Success message handled in method
      else
        add_to_kill_feed("Failed to change map - insufficient permissions or map not found")
      end
    when /^!god(?:\s+(.+))?$/
      target_name = $1
      if admin_toggle_god_mode(target_name)
        # Success message handled in method
      else
        add_to_kill_feed("Failed to toggle god mode - insufficient permissions")
      end
    
    # Admin server configuration
    when /^!config\s+(.+?)\s+(.+)$/
      setting, value = $1, $2
      if admin_set_config(setting, value)
        # Success message handled in method
      else
        add_to_kill_feed("Failed to set #{setting} - insufficient permissions or invalid setting")
      end
    when '!showconfig'
      if has_permission?('config_server')
        show_server_config
      else
        add_to_kill_feed("Insufficient permissions to view server config")
      end
    
    # Admin demo commands
    when /^!record(?:\s+(.+))?$/
      filename = $1
      if admin_start_demo_recording(filename)
        # Success message handled in method
      else
        add_to_kill_feed("Failed to start demo recording - insufficient permissions or already recording")
      end
    when '!stoprecord'
      if admin_stop_demo_recording
        # Success message handled in method
      else
        add_to_kill_feed("Failed to stop demo recording - insufficient permissions or not recording")
      end
    
    # Admin spectator commands
    when '!spec', '!spectate'
      if admin_enter_spectator_mode
        # Success message handled in method
      else
        add_to_kill_feed("Failed to enter admin spectator mode - insufficient permissions")
      end
    
    # Admin information commands
    when '!players'
      show_player_list if is_admin?
    when '!reports'
      show_reports if has_permission?('kick')
    when '!bans'
      show_ban_list if has_permission?('ban_temp')
    when /^!handlereport\s+(\w+)\s+(.+)$/
      report_id, action = $1, $2
      if admin_handle_report(report_id, action)
        # Success message handled in method
      else
        add_to_kill_feed("Failed to handle report - insufficient permissions or report not found")
      end
    
    else
      # Unknown command - show help for admins, ignore for regular players
      if is_admin?
        add_to_kill_feed("Unknown command. Type !adminhelp for available commands")
      end
    end
  end
  
  # Admin UI helper methods
  def show_admin_commands
    session = @game_state[:admin_sessions][@player_id]
    level = session[:level]
    
    commands = []
    commands << "!login <user> <pass> - Login as admin"
    commands << "!logout - Logout from admin"
    commands << "!admin - Show admin status"
    
    if level >= 1
      commands << "!kick <player> [reason] - Kick player"
      commands << "!mute <player> [minutes] [reason] - Mute player"
      commands << "!unmute <player> - Unmute player"
      commands << "!reports - Show pending reports"
      commands << "!handlereport <id> <action> - Handle report (kick/ban_temp/ban_perm/dismiss)"
      commands << "!players - Show player list"
      commands << "!bans - Show ban list"
    end
    
    if level >= 2
      commands << "!ban <player> [hours] [reason] - Ban player (no hours = permanent)"
      commands << "!restart - Restart round"
      commands << "!changemap <map> - Change map"
      commands << "!god [player] - Toggle god mode"
      commands << "!record [filename] - Start demo recording"
      commands << "!stoprecord - Stop demo recording"
      commands << "!spec - Enter admin spectator mode"
    end
    
    if level >= 3
      commands << "!config <setting> <value> - Configure server"
      commands << "!showconfig - Show server configuration"
      commands << "!unban <ip> - Unban IP address"
    end
    
    commands.each_with_index do |cmd, i|
      add_to_kill_feed("[#{i + 1}/#{commands.size}] #{cmd}")
      # Add small delay to prevent spam
      sleep 0.1 if i > 0 && i % 5 == 0
    end
  end
  
  def show_server_config
    config = @game_state[:server_config]
    add_to_kill_feed("Server Configuration:")
    config.each do |key, value|
      add_to_kill_feed("  #{key}: #{value}")
    end
  end
  
  def show_player_list
    players = @game_state[:players].values
    add_to_kill_feed("Online Players (#{players.size}):")
    
    players.each do |player|
      status_info = []
      status_info << "#{player[:team].upcase}"
      status_info << (player[:alive] ? "Alive" : "Dead")
      status_info << "Admin" if is_admin?(player[:id])
      status_info << "Muted" if player[:muted]
      status_info << "God" if player[:god_mode]
      
      status = status_info.join(", ")
      add_to_kill_feed("  #{player[:name]} (#{status})")
    end
  end
  
  def show_reports
    reports = @game_state[:reports].reject { |r| r[:handled] }
    add_to_kill_feed("Pending Reports (#{reports.size}):")
    
    reports.each do |report|
      time_ago = ((Time.now.to_f - report[:timestamp]) / 60).round
      add_to_kill_feed("  [#{report[:id][0..7]}] #{report[:target_name]} by #{report[:reporter_name]} (#{time_ago}m ago) - #{report[:reason]}")
    end
    
    if reports.empty?
      add_to_kill_feed("  No pending reports")
    end
  end
  
  def show_ban_list
    @game_state[:bans] ||= {}
    active_bans = @game_state[:bans].select do |ip, ban|
      ban['expires_at'].nil? || ban['expires_at'] > Time.now.to_f
    end
    
    add_to_kill_feed("Active Bans (#{active_bans.size}):")
    
    active_bans.each do |ip, ban|
      duration = ban['expires_at'] ? "#{((ban['expires_at'] - Time.now.to_f) / 3600).round}h left" : "Permanent"
      add_to_kill_feed("  #{ban['name']} (#{ip}) - #{duration} - #{ban['reason']}")
    end
    
    if active_bans.empty?
      add_to_kill_feed("  No active bans")
    end
  end
  
  # Spectator event handlers
  def handle_spectator_next(event)
    player = @game_state[:players][@player_id]
    return unless player && player[:spectating]
    
    alive_players = get_alive_teammates(player[:team])
    return if alive_players.empty?
    
    current_index = alive_players.find_index { |p| p[:id] == player[:spectator_target] } || -1
    next_index = (current_index + 1) % alive_players.length
    
    player[:spectator_target] = alive_players[next_index][:id]
    player[:spectator_mode] = 'follow'
    
    broadcast_game_state
  end
  
  def handle_spectator_prev(event)
    player = @game_state[:players][@player_id]
    return unless player && player[:spectating]
    
    alive_players = get_alive_teammates(player[:team])
    return if alive_players.empty?
    
    current_index = alive_players.find_index { |p| p[:id] == player[:spectator_target] } || 0
    prev_index = (current_index - 1) % alive_players.length
    
    player[:spectator_target] = alive_players[prev_index][:id]
    player[:spectator_mode] = 'follow'
    
    broadcast_game_state
  end
  
  def handle_spectator_free_cam(event)
    player = @game_state[:players][@player_id]
    return unless player && player[:spectating]
    
    player[:spectator_mode] = 'free'
    player[:spectator_target] = nil
    player[:spectator_camera_x] = event[:x] if event[:x]
    player[:spectator_camera_y] = event[:y] if event[:y]
    
    broadcast_game_state
  end
  
  def handle_spectator_camera_move(event)
    player = @game_state[:players][@player_id]
    return unless player && player[:spectating] && player[:spectator_mode] == 'free'
    
    player[:spectator_camera_x] += event[:dx] || 0
    player[:spectator_camera_y] += event[:dy] || 0
    
    # Bounds checking for free cam
    player[:spectator_camera_x] = [[player[:spectator_camera_x], 0].max, 1280].min
    player[:spectator_camera_y] = [[player[:spectator_camera_y], 0].max, 720].min
  end
  
  # Spectator helper methods
  def enter_spectator_mode(player)
    player[:spectating] = true
    player[:spectator_mode] = 'follow'
    
    # Add to spectators list
    @game_state[:spectators][player[:id]] = {
      id: player[:id],
      name: player[:name],
      team: player[:team]
    }
    
    # Find first alive teammate to spectate
    alive_teammates = get_alive_teammates(player[:team])
    if !alive_teammates.empty?
      player[:spectator_target] = alive_teammates.first[:id]
    else
      # No teammates alive, find any alive player
      alive_players = @game_state[:players].values.select { |p| p[:alive] }
      if !alive_players.empty?
        player[:spectator_target] = alive_players.first[:id]
      else
        # Nobody alive, use free cam
        player[:spectator_mode] = 'free'
        player[:spectator_camera_x] = 640
        player[:spectator_camera_y] = 360
      end
    end
  end
  
  def exit_spectator_mode(player)
    player[:spectating] = false
    player[:spectator_target] = nil
    player[:spectator_mode] = 'follow'
    
    # Remove from spectators list
    @game_state[:spectators].delete(player[:id])
  end
  
  def get_alive_teammates(team)
    @game_state[:players].values.select { |p| p[:team] == team && p[:alive] && !p[:spectating] }
  end
  
  def get_spectator_count
    @game_state[:spectators].size
  end
  
  # Map system methods
  def handle_map_vote(event)
    return unless @game_state[:map_vote_active]
    
    player = @game_state[:players][@player_id]
    return unless player
    
    map_name = event[:map]
    return unless @game_state[:map_vote_options].include?(map_name)
    
    @game_state[:map_votes][@player_id] = map_name
    add_to_kill_feed("#{player[:name]} voted for #{MAPS[map_name][:name]}")
    broadcast_game_state
  end
  
  def start_map_vote
    return if @game_state[:map_vote_active]
    
    # Select 3 random maps for voting (excluding current map)
    available_maps = MAPS.keys.reject { |map| map == @game_state[:current_map] }
    @game_state[:map_vote_options] = available_maps.sample(3)
    @game_state[:map_vote_active] = true
    @game_state[:map_votes] = {}
    @game_state[:map_vote_timer] = 20 # 20 seconds to vote
    
    add_to_kill_feed("Map vote started! Type !vote <number> in chat")
    broadcast_game_state
    
    # Start vote timer
    Async do
      sleep 20
      end_map_vote if @game_state[:map_vote_active]
    end
  end
  
  def end_map_vote
    return unless @game_state[:map_vote_active]
    
    # Count votes
    vote_counts = Hash.new(0)
    @game_state[:map_votes].each_value { |map| vote_counts[map] += 1 }
    
    # Determine winner (most votes, random if tie)
    if vote_counts.empty?
      # No votes, random map
      new_map = @game_state[:map_vote_options].sample
    else
      max_votes = vote_counts.values.max
      winners = vote_counts.select { |_, count| count == max_votes }.keys
      new_map = winners.sample
    end
    
    @game_state[:map_vote_active] = false
    @game_state[:map_vote_options] = []
    @game_state[:map_votes] = {}
    
    add_to_kill_feed("Map vote ended! Next map: #{MAPS[new_map][:name]}")
    change_map(new_map)
  end
  
  def change_map(new_map_name)
    return unless MAPS[new_map_name]
    
    old_map = @game_state[:current_map]
    @game_state[:current_map] = new_map_name
    
    # Update rotation index
    @game_state[:map_rotation_index] = @game_state[:map_rotation].index(new_map_name) || 0
    
    add_to_kill_feed("Map changed to #{MAPS[new_map_name][:name]}")
    
    # Initialize hostages if it's a hostage rescue map
    initialize_hostages_for_map
    
    # Reset round and respawn all players
    start_new_round
    
    broadcast_game_state
  end
  
  def next_map_in_rotation
    @game_state[:map_rotation_index] = (@game_state[:map_rotation_index] + 1) % @game_state[:map_rotation].size
    new_map = @game_state[:map_rotation][@game_state[:map_rotation_index]]
    change_map(new_map)
  end
  
  def get_defensive_positions(site)
    current_map = get_current_map_data
    return [] unless current_map
    
    # Get tactical positions for CT team near the specified site
    site_data = current_map[:bomb_sites][site]
    return [] unless site_data
    
    positions = current_map[:tactical_positions]['ct'] || []
    # Filter positions within reasonable distance of bomb site
    positions.select do |pos|
      distance = Math.sqrt((pos[:x] - site_data[:x])**2 + (pos[:y] - site_data[:y])**2)
      distance <= 200 # Within 200 units of bomb site
    end
  end
  
  def get_tactical_position(team, position_type = nil)
    current_map = get_current_map_data
    return nil unless current_map
    
    positions = current_map[:tactical_positions][team] || []
    return nil if positions.empty?
    
    if position_type
      filtered = positions.select { |pos| pos[:type] == position_type }
      return filtered.sample if filtered.any?
    end
    
    positions.sample
  end
  
  private
  
  def start_round_timer
    # Simplified: Timer is handled client-side to avoid async issues
    # The game state phase and time are managed through player actions
  end
  
  def start_bomb_timer
    # Simplified: Bomb timer is handled client-side to avoid async issues
    # The bomb timer countdown is managed in JavaScript
    return unless @game_state[:bomb_planted]
    broadcast_game_state
  end
  
  def end_round(winning_team)
    @game_state[:phase] = 'round_end'
    
    # Track round end in progression system
    @progression_manager&.track_round_end(winning_team.to_sym, 'elimination')
    
    if winning_team == 'ct'
      @game_state[:ct_score] += 1
      award_money('ct', 3250) # Win bonus
      award_money('t', 1400) # Loss bonus
    else
      @game_state[:t_score] += 1
      award_money('t', 3250)
      award_money('ct', 1400)
    end
    
    add_to_kill_feed("#{winning_team.upcase} wins the round!")
    
    # Check for match end and map rotation
    total_score = @game_state[:ct_score] + @game_state[:t_score]
    
    # Start map vote after every 10 rounds, or if one team has won 16 rounds
    if (total_score % 10 == 0 && total_score > 0) || 
       @game_state[:ct_score] >= 16 || @game_state[:t_score] >= 16
      
      # Reset scores for new match
      if @game_state[:ct_score] >= 16 || @game_state[:t_score] >= 16
        # End match tracking before reset
        end_match_tracking
        
        @game_state[:ct_score] = 0
        @game_state[:t_score] = 0
        @game_state[:round] = 0
        @match_started = false
      end
      
      # Start map vote after a short delay
      Async do
        sleep 3
        start_map_vote unless @game_state[:map_vote_active]
      end
    end
    
    broadcast_game_state
  end
  
  def start_new_round
    @game_state[:round] += 1
    @game_state[:phase] = 'buy_time'
    @game_state[:round_time] = BUY_TIME
    @game_state[:bomb_planted] = false
    @game_state[:bomb_site] = nil
    @game_state[:bomb_timer] = nil
    
    # Reset hostages for new round if in hostage rescue mode
    if is_hostage_rescue_mode?
      initialize_hostages_for_map
    end
    
    # Respawn all players
    @game_state[:players].each do |id, player|
      player[:alive] = true
      player[:health] = 100
      spawn_point = get_spawn_point(player[:team])
      player[:x] = spawn_point[:x]
      player[:y] = spawn_point[:y]
      
      # Exit spectator mode when respawning
      exit_spectator_mode(player) if player[:spectating]
      
      # Give bomb to random T
      if player[:team] == 't'
        player[:has_bomb] = @game_state[:players].values.none? { |p| p[:has_bomb] && p[:team] == 't' }
      end
    end
    
    # Handle bot purchases during buy time
    handle_bot_purchases
    
    broadcast_game_state
  end
  
  # Helper functions for enhanced weapon system
  def calculate_movement_penalty(player, weapon)
    # Get player velocity (simplified)
    velocity = player[:velocity] || 0
    speed_threshold = 100 # Units per second
    
    if velocity > speed_threshold
      # Moving penalty based on weapon type
      case weapon[:category]
      when 'sniper'
        return 0.2 # Snipers heavily penalized while moving
      when 'rifle'
        return 0.6 # Rifles moderately penalized
      when 'smg', 'shotgun'
        return 0.8 # SMGs less penalized for run-and-gun
      when 'pistol'
        return 0.9 # Pistols least penalized
      else
        return 0.7
      end
    end
    
    return 1.0 # No penalty when stationary
  end
  
  def calculate_damage_with_range_falloff(weapon, shooter, angle)
    base_damage = weapon[:damage]
    max_range = weapon[:range] || 1000
    
    # Find closest target in line of fire
    closest_distance = Float::INFINITY
    @game_state[:players].each do |id, target|
      next if id == shooter[:id] || !target[:alive] || target[:team] == shooter[:team]
      
      dx = target[:x] - shooter[:x]
      dy = target[:y] - shooter[:y]
      distance = Math.sqrt(dx * dx + dy * dy)
      
      target_angle = Math.atan2(dy, dx)
      angle_diff = (target_angle - angle).abs
      
      if angle_diff < 0.1 && distance < closest_distance
        closest_distance = distance
      end
    end
    
    return base_damage if closest_distance == Float::INFINITY
    
    # Apply range falloff
    if closest_distance > max_range
      falloff_factor = (max_range / closest_distance) * 0.3 # 30% damage at max range
    else
      falloff_factor = 1.0 - ((closest_distance / max_range) * 0.3) # Linear falloff
    end
    
    # Penetration affects damage maintenance at range
    penetration_bonus = weapon[:penetration] || 0.5
    falloff_factor = [falloff_factor + (penetration_bonus * 0.2), 1.0].min
    
    (base_damage * falloff_factor).round
  end
  
  def check_bullet_hit(shooter, angle, damage, weapon = nil)
    weapon ||= WEAPONS[shooter[:current_weapon]] || {}
    max_range = weapon[:range] || 1000
    hit_registered = false
    
    # Handle shotgun pellets
    if weapon[:pellets]
      weapon[:pellets].times do |pellet|
        pellet_angle = angle + (rand - 0.5) * 0.2 # Spread per pellet
        pellet_damage = damage / weapon[:pellets]
        hit_registered |= check_single_bullet_hit(shooter, pellet_angle, pellet_damage, weapon, max_range)
      end
    else
      hit_registered = check_single_bullet_hit(shooter, angle, damage, weapon, max_range)
    end
    
    hit_registered
  end
  
  def check_single_bullet_hit(shooter, angle, damage, weapon, max_range)
    # Check player hits
    @game_state[:players].each do |id, target|
      next if id == shooter[:id] || !target[:alive]
      next if target[:team] == shooter[:team] # No friendly fire
      
      # Enhanced distance and angle check
      dx = target[:x] - shooter[:x]
      dy = target[:y] - shooter[:y]
      distance = Math.sqrt(dx * dx + dy * dy)
      
      # Check if within weapon range
      next if distance > max_range
      
      target_angle = Math.atan2(dy, dx)
      angle_diff = (target_angle - angle).abs
      angle_diff = [angle_diff, 2 * Math::PI - angle_diff].min # Handle wrapping
      
      # Hit cone based on weapon accuracy and distance
      base_accuracy = weapon[:accuracy] || 0.7
      hit_cone = (1.0 - base_accuracy) * 0.3 # Better accuracy = smaller hit cone
      distance_factor = distance / max_range
      adjusted_hit_cone = hit_cone * (1 + distance_factor) # Harder to hit at range
      
      if angle_diff < adjusted_hit_cone
        # Check for headshot (simplified - top portion of player)
        headshot = rand < 0.1 && weapon[:category] != 'shotgun' # 10% chance, no shotgun headshots
        
        # Calculate final damage with armor and headshot
        final_damage = damage
        if headshot
          final_damage *= (weapon[:category] == 'sniper' ? 4.0 : 2.0) # Sniper rifles do more headshot damage
        end
        
        # Apply armor reduction
        if target[:armor] > 0
          armor_reduction = weapon[:penetration] || 0.5
          damage_multiplier = 0.5 + (armor_reduction * 0.5) # High penetration weapons ignore more armor
          final_damage *= damage_multiplier
          
          # Damage armor
          armor_damage = final_damage * 0.5
          target[:armor] = [target[:armor] - armor_damage, 0].max.round
        end
        
        # Apply damage
        target[:health] -= final_damage.round
        target[:health] = [target[:health], 0].max
        
        # Track hit for progression
        @progression_manager&.track_shot_hit(shooter[:id], shooter[:current_weapon])
        
        if target[:health] <= 0
          target[:alive] = false
          target[:deaths] += 1
          shooter[:kills] += 1
          
          # Kill rewards based on weapon type
          kill_reward = case weapon[:category]
          when 'pistol' then 400
          when 'smg' then 600
          when 'rifle' then 300
          when 'sniper' then 100
          when 'shotgun' then 900
          else 300
          end
          
          shooter[:money] += kill_reward
          
          # Track kill in progression system
          weapon_name = shooter[:current_weapon] || 'unknown'
          @progression_manager&.track_kill(
            shooter[:id], 
            target[:id], 
            weapon: weapon_name, 
            headshot: headshot, 
            damage: final_damage.round
          )
          
          # Enter spectator mode for the killed player
          enter_spectator_mode(target)
          
          # Death message
          death_message = headshot ? 
            "#{shooter[:name]} headshotted #{target[:name]}" :
            "#{shooter[:name]} killed #{target[:name]}"
          add_to_kill_feed(death_message)
          play_sound('death')
          
          # Check for round end
          check_round_end
        else
          # Hit but not killed
          play_sound('hit')
        end
        
        return true # Hit registered
      end
    end
    
    # Check hostage hits in hostage rescue mode
    if is_hostage_rescue_mode? && @game_state[:hostages]
      @game_state[:hostages].each do |id, hostage|
        next if hostage[:health] <= 0
        
        # Check hit detection
        dx = hostage[:x] - shooter[:x]
        dy = hostage[:y] - shooter[:y]
        distance = Math.sqrt(dx * dx + dy * dy)
        
        if distance < 500 # Max bullet range
          target_angle = Math.atan2(dy, dx)
          angle_diff = (target_angle - angle).abs
          
          if angle_diff < 0.1 # Hit cone
            # Hostages take more damage (they have no armor)
            damage_hostage(id, damage, shooter[:id])
            return true # Hit registered
          end
        end
      end
    end
    
    false # No hit
  end
  
  def check_round_end
    # Check hostage rescue win conditions first
    if is_hostage_rescue_mode?
      check_hostage_rescue_win_condition
      return
    end
    
    # Standard elimination checks
    ct_alive = @game_state[:players].values.count { |p| p[:team] == 'ct' && p[:alive] }
    t_alive = @game_state[:players].values.count { |p| p[:team] == 't' && p[:alive] }
    
    if ct_alive == 0
      end_round('t')
    elsif t_alive == 0
      end_round('ct')
    end
  end
  
  def apply_enhanced_flashbang_effect(grenade)
    flash_radius = 300
    max_flash_duration = 4.0 # seconds
    
    # Apply flash effect to all players (including bots)
    all_entities = @game_state[:players].merge(@game_state[:bots])
    
    all_entities.each do |id, entity|
      next unless entity[:alive]
      
      dx = entity[:x] - grenade[:x]
      dy = entity[:y] - grenade[:y]
      distance = Math.sqrt(dx * dx + dy * dy)
      
      next if distance > flash_radius
      
      # Calculate flash intensity based on distance and line of sight
      intensity = [(flash_radius - distance) / flash_radius, 0].max
      
      # Check if player is looking at the flashbang (affects intensity)
      angle_to_flash = Math.atan2(dy, dx)
      player_angle = entity[:angle] || 0
      angle_diff = (angle_to_flash - player_angle).abs
      angle_diff = [angle_diff, 2 * Math.PI - angle_diff].min # Normalize to 0-π
      
      # Reduce intensity if player is looking away (up to 50% reduction)
      if angle_diff > Math.PI / 2
        intensity *= (0.5 + 0.5 * (Math.PI - angle_diff) / (Math.PI / 2))
      end
      
      # Check line of sight (walls can block flash)
      if has_line_of_sight?(entity[:x], entity[:y], grenade[:x], grenade[:y])
        flash_duration = intensity * max_flash_duration
        
        # Apply flash effect
        if entity.key?(:flash_end_time) # Player
          entity[:flash_end_time] = Time.now.to_f + flash_duration
          entity[:flash_intensity] = intensity
          
          # Send to client for visual effect
          self.script("window.game && window.game.applyFlashEffect(#{intensity}, #{flash_duration});")
        else # Bot
          entity[:flash_end_time] = Time.now.to_f + flash_duration
          entity[:flash_intensity] = intensity
        end
      end
    end
  end
  
  def apply_enhanced_he_damage(grenade)
    explosion_radius = 200
    max_damage = 100
    
    # Apply damage to all entities (players and bots)
    all_entities = @game_state[:players].merge(@game_state[:bots])
    
    all_entities.each do |id, entity|
      next unless entity[:alive]
      
      dx = entity[:x] - grenade[:x]
      dy = entity[:y] - grenade[:y]
      distance = Math.sqrt(dx * dx + dy * dy)
      
      next if distance > explosion_radius
      
      # Calculate damage based on distance
      damage_ratio = [(explosion_radius - distance) / explosion_radius, 0].max
      base_damage = damage_ratio * max_damage
      
      # Check line of sight - walls reduce damage significantly
      if has_line_of_sight?(entity[:x], entity[:y], grenade[:x], grenade[:y])
        damage = base_damage
      else
        damage = base_damage * 0.3 # 70% damage reduction through walls
      end
      
      # Apply armor damage reduction
      if entity[:armor] && entity[:armor] > 0
        armor_absorption = [damage * 0.5, entity[:armor]].min
        entity[:armor] -= armor_absorption
        damage -= armor_absorption
        entity[:armor] = [entity[:armor], 0].max
      end
      
      # Team damage consideration
      friendly_fire = grenade[:owner_team] == entity[:team]
      if friendly_fire
        damage *= 0.35 # Reduce friendly fire damage
      end
      
      # Apply damage
      entity[:health] -= damage.to_i
      
      # Add screen shake and blood effect for players
      if entity.key?(:flash_end_time) # Player
        shake_intensity = damage_ratio * 0.5
        self.script("window.game && window.game.addScreenShake(#{shake_intensity});")
        self.script("window.game && window.game.renderer.addBlood(#{entity[:x]}, #{entity[:y]});")
      end
      
      # Handle death
      if entity[:health] <= 0
        entity[:alive] = false
        entity[:deaths] += 1
        
        # Award kill credit
        if grenade[:owner_id] && grenade[:owner_id] != id
          owner = @game_state[:players][grenade[:owner_id]] || @game_state[:bots][grenade[:owner_id]]
          if owner
            owner[:kills] += 1
            owner[:money] += friendly_fire ? -3000 : 300 # Penalty for team kill
          end
        end
        
        # Enter spectator mode for killed players
        if entity.key?(:flash_end_time) # Player
          enter_spectator_mode(entity)
        end
        
        killer_name = grenade[:owner_id] ? (@game_state[:players][grenade[:owner_id]] || @game_state[:bots][grenade[:owner_id]])[:name] : "HE Grenade"
        add_to_kill_feed("#{killer_name} fragged #{entity[:name]} with HE Grenade")
      end
    end
    
    # Apply damage to hostages in hostage rescue mode
    if is_hostage_rescue_mode? && @game_state[:hostages]
      @game_state[:hostages].each do |id, hostage|
        next if hostage[:health] <= 0
        
        dx = hostage[:x] - grenade[:x]
        dy = hostage[:y] - grenade[:y]
        distance = Math.sqrt(dx * dx + dy * dy)
        
        next if distance > explosion_radius
        
        # Calculate damage based on distance
        damage_ratio = [(explosion_radius - distance) / explosion_radius, 0].max
        base_damage = damage_ratio * max_damage
        
        # Check line of sight
        if has_line_of_sight?(hostage[:x], hostage[:y], grenade[:x], grenade[:y])
          damage = base_damage
        else
          damage = base_damage * 0.3 # 70% damage reduction through walls
        end
        
        # Apply damage to hostage
        damage_hostage(id, damage.to_i, grenade[:owner_id])
      end
    end
  end
  
  def apply_enhanced_smoke_effect(grenade)
    # Create persistent smoke cloud that blocks vision
    smoke_cloud = {
      id: SecureRandom.hex(8),
      x: grenade[:x],
      y: grenade[:y],
      radius: 80, # Will expand to full size
      max_radius: 120,
      density: 0.0, # Will increase over time
      max_density: 0.9,
      duration: 18.0, # Total lifetime in seconds
      age: 0.0,
      expansion_rate: 60, # Radius per second during expansion
      fade_start: 15.0 # When to start fading
    }
    
    @game_state[:smoke_clouds] ||= []
    @game_state[:smoke_clouds] << smoke_cloud
    
    # Send to client for visual effect
    self.script("window.game && window.game.renderer.addSmoke(#{grenade[:x]}, #{grenade[:y]});")
  end
  
  def at_bomb_site?(x, y)
    current_map = get_current_map_data
    return nil unless current_map
    
    current_map[:bomb_sites].each do |site_name, site_data|
      distance = Math.sqrt((x - site_data[:x])**2 + (y - site_data[:y])**2)
      return site_name if distance <= site_data[:radius]
    end
    nil
  end
  
  def get_spawn_point(team)
    current_map = get_current_map_data
    return { x: 640, y: 360 } unless current_map # Fallback to center
    
    spawn_points = current_map[:"#{team}_spawn"]
    return { x: 640, y: 360 } unless spawn_points&.any?
    
    # Select random spawn point and add some variation
    spawn = spawn_points.sample
    {
      x: spawn[:x] + rand(-10..10),
      y: spawn[:y] + rand(-10..10),
      angle: spawn[:angle] || 0
    }
  end
  
  def get_current_map_data
    MAPS[@game_state[:current_map]]
  end

  # Hostage system methods
  def initialize_hostages_for_map
    map_data = get_current_map_data
    @game_state[:hostages] = {}
    @game_state[:hostages_rescued] = 0
    
    if map_data && map_data[:hostage_positions]
      @game_state[:hostages_remaining] = map_data[:hostage_positions].length
      
      map_data[:hostage_positions].each do |hostage_data|
        @game_state[:hostages][hostage_data[:id]] = {
          id: hostage_data[:id],
          x: hostage_data[:x],
          y: hostage_data[:y],
          health: HOSTAGE_MAX_HEALTH,
          rescued: false,
          being_rescued: false,
          rescuer: nil,
          fear_level: 0.0,
          target_x: hostage_data[:x],
          target_y: hostage_data[:y],
          movement_speed: 0.5,
          last_damage_time: 0,
          voice_lines: []
        }
      end
      
      Console.info(self, "Initialized #{@game_state[:hostages_remaining]} hostages for #{map_data[:name]}")
    else
      @game_state[:hostages_remaining] = 0
    end
  end

  def get_current_game_mode
    map_data = get_current_map_data
    map_data ? map_data[:game_mode] : 'bomb_defusal'
  end

  def is_hostage_rescue_mode?
    get_current_game_mode == 'hostage_rescue'
  end

  def update_hostage_ai
    return unless is_hostage_rescue_mode?
    
    @game_state[:hostages].each do |id, hostage|
      next if hostage[:rescued]
      
      update_hostage_fear(hostage)
      update_hostage_following(hostage)
      update_hostage_movement(hostage)
    end
  end

  def update_hostage_fear(hostage)
    # Increase fear when gunfire or explosions are nearby
    nearby_players = @game_state[:players].values.select do |player|
      distance = Math.sqrt((player[:x] - hostage[:x])**2 + (player[:y] - hostage[:y])**2)
      distance < 150
    end
    
    # Increase fear if terrorists are nearby
    nearby_terrorists = nearby_players.select { |p| p[:team] == 't' && p[:alive] }
    hostage[:fear_level] += nearby_terrorists.length * 0.02
    
    # Decrease fear if CT is nearby and no terrorists
    if nearby_players.any? { |p| p[:team] == 'ct' && p[:alive] } && nearby_terrorists.empty?
      hostage[:fear_level] -= 0.01
    end
    
    # Natural fear decay
    hostage[:fear_level] -= 0.005
    hostage[:fear_level] = [[hostage[:fear_level], 0.0].max, 1.0].min
    
    # Fear affects movement and behavior
    if hostage[:fear_level] > 0.7
      hostage[:movement_speed] = 0.2 # Move slower when very afraid
    elsif hostage[:fear_level] > 0.3
      hostage[:movement_speed] = 0.4 # Moderate fear
    else
      hostage[:movement_speed] = 0.6 # Calm
    end
  end

  def update_hostage_following(hostage)
    return unless hostage[:being_rescued] && hostage[:rescuer]
    
    rescuer = @game_state[:players][hostage[:rescuer]]
    return unless rescuer && rescuer[:alive] && rescuer[:team] == 'ct'
    
    # Follow the rescuer
    distance = Math.sqrt((rescuer[:x] - hostage[:x])**2 + (rescuer[:y] - hostage[:y])**2)
    
    if distance > HOSTAGE_FOLLOW_DISTANCE
      # Move towards rescuer
      angle = Math.atan2(rescuer[:y] - hostage[:y], rescuer[:x] - hostage[:x])
      hostage[:target_x] = rescuer[:x] - Math.cos(angle) * (HOSTAGE_FOLLOW_DISTANCE - 10)
      hostage[:target_y] = rescuer[:y] - Math.sin(angle) * (HOSTAGE_FOLLOW_DISTANCE - 10)
      
      # Occasional follow voice line
      if rand < 0.01 # 1% chance per update
        follow_messages = [
          "I'm following you!",
          "Wait for me!",
          "Don't leave me behind!",
          "I'm right behind you!",
          "Let's get out of here!"
        ]
        hostage[:voice_lines] << follow_messages.sample
        play_sound('hostage_follow') if rand < 0.5
      end
    elsif distance < HOSTAGE_FOLLOW_DISTANCE - 20
      # Stop moving if too close
      hostage[:target_x] = hostage[:x]
      hostage[:target_y] = hostage[:y]
    end
  end

  def update_hostage_movement(hostage)
    return if hostage[:x] == hostage[:target_x] && hostage[:y] == hostage[:target_y]
    
    angle = Math.atan2(hostage[:target_y] - hostage[:y], hostage[:target_x] - hostage[:x])
    speed = hostage[:movement_speed] * 2 # Base movement speed
    
    new_x = hostage[:x] + Math.cos(angle) * speed
    new_y = hostage[:y] + Math.sin(angle) * speed
    
    # Simple collision detection with walls
    if can_move_to_position(new_x, new_y)
      hostage[:x] = new_x
      hostage[:y] = new_y
    end
  end

  def start_hostage_rescue(player_id, hostage_id)
    return false unless is_hostage_rescue_mode?
    
    player = @game_state[:players][player_id]
    hostage = @game_state[:hostages][hostage_id]
    
    return false unless player && hostage && player[:team] == 'ct' && player[:alive]
    return false if hostage[:rescued] || hostage[:being_rescued]
    
    # Check distance
    distance = Math.sqrt((player[:x] - hostage[:x])**2 + (player[:y] - hostage[:y])**2)
    return false if distance > 80
    
    hostage[:being_rescued] = true
    hostage[:rescuer] = player_id
    hostage[:rescue_start_time] = Time.now.to_f
    
    add_to_kill_feed("#{player[:name]} is rescuing a hostage")
    Console.info(self, "#{player[:name]} started rescuing hostage #{hostage_id}")
    
    # Play sound and voice line
    play_sound('hostage_rescue')
    hostage[:voice_lines] << "Thank you! Please get me out of here!"
    
    return true
  end

  def complete_hostage_rescue(hostage_id)
    hostage = @game_state[:hostages][hostage_id]
    return unless hostage && hostage[:being_rescued]
    
    rescuer = @game_state[:players][hostage[:rescuer]]
    return unless rescuer
    
    # Check if hostage reached rescue zone
    map_data = get_current_map_data
    return unless map_data && map_data[:rescue_zones]
    
    in_rescue_zone = map_data[:rescue_zones].any? do |zone|
      distance = Math.sqrt((hostage[:x] - zone[:x])**2 + (hostage[:y] - zone[:y])**2)
      distance <= zone[:radius]
    end
    
    if in_rescue_zone
      hostage[:rescued] = true
      hostage[:being_rescued] = false
      @game_state[:hostages_rescued] += 1
      @game_state[:hostages_remaining] -= 1
      
      # Award money to rescuer and team
      rescuer[:money] += 2500
      @game_state[:players].values.select { |p| p[:team] == 'ct' }.each { |p| p[:money] += 300 }
      
      add_to_kill_feed("#{rescuer[:name]} rescued a hostage! (+2500$)")
      Console.info(self, "Hostage #{hostage_id} rescued by #{rescuer[:name]}")
      
      # Play rescue zone sound and voice line
      play_sound('rescue_zone')
      hostage[:voice_lines] << "I'm safe! Thank you so much!"
      
      # Check win condition
      check_hostage_rescue_win_condition
    end
  end

  def damage_hostage(hostage_id, damage, attacker_id = nil)
    hostage = @game_state[:hostages][hostage_id]
    return unless hostage && !hostage[:rescued]
    
    hostage[:health] -= damage
    hostage[:fear_level] += 0.3
    hostage[:last_damage_time] = Time.now.to_f
    
    if hostage[:health] <= 0
      hostage[:health] = 0
      attacker = attacker_id ? @game_state[:players][attacker_id] : nil
      
      if attacker
        # Penalty for killing hostage
        if attacker[:team] == 'ct'
          attacker[:money] -= 3250 # Heavy penalty for CT
          add_to_kill_feed("#{attacker[:name]} killed a hostage (-3250$)")
        else
          attacker[:money] -= 1500 # Moderate penalty for T
          add_to_kill_feed("#{attacker[:name]} killed a hostage (-1500$)")
        end
        
        attacker[:money] = [attacker[:money], 0].max
      end
      
      @game_state[:hostages_remaining] -= 1
      hostage[:voice_lines] << "Help... me..."
      
      # Play death sound
      play_sound('hostage_death')
      Console.info(self, "Hostage #{hostage_id} killed by #{attacker ? attacker[:name] : 'unknown'}")
      check_hostage_rescue_win_condition
    else
      hostage[:voice_lines] << "Please don't hurt me!"
      # Play hurt sound
      play_sound('hostage_hurt')
    end
  end

  def check_hostage_rescue_zones
    return unless is_hostage_rescue_mode?
    
    @game_state[:hostages].each do |id, hostage|
      next unless hostage[:being_rescued] && !hostage[:rescued]
      
      complete_hostage_rescue(id)
    end
  end

  def check_hostage_rescue_win_condition
    return unless is_hostage_rescue_mode?
    
    total_hostages = @game_state[:hostages].length
    return if total_hostages == 0
    
    # CT wins if all hostages are rescued
    if @game_state[:hostages_rescued] >= total_hostages
      end_round('ct', 'All hostages rescued')
      return
    end
    
    # T wins if all hostages are dead
    dead_hostages = @game_state[:hostages].values.count { |h| h[:health] <= 0 }
    if dead_hostages >= total_hostages - @game_state[:hostages_rescued]
      end_round('t', 'All hostages eliminated')
      return
    end
    
    # Standard elimination check
    ct_alive = @game_state[:players].values.count { |p| p[:team] == 'ct' && p[:alive] }
    t_alive = @game_state[:players].values.count { |p| p[:team] == 't' && p[:alive] }
    
    if ct_alive == 0
      end_round('t', 'Counter-Terrorists eliminated')
    elsif t_alive == 0
      end_round('ct', 'Terrorists eliminated')
    end
  end
  
  def check_wall_collision(x, y, radius = 15)
    current_map = get_current_map_data
    return false unless current_map
    
    current_map[:walls].each do |wall|
      x1, y1, x2, y2 = wall
      
      # Check collision with wall line segment
      if line_circle_collision(x1, y1, x2, y2, x, y, radius)
        return true
      end
    end
    false
  end
  
  def line_circle_collision(x1, y1, x2, y2, cx, cy, radius)
    # Distance from center to line
    line_length = Math.sqrt((x2 - x1)**2 + (y2 - y1)**2)
    return false if line_length == 0
    
    # Project circle center onto line
    t = [0, [1, ((cx - x1) * (x2 - x1) + (cy - y1) * (y2 - y1)) / (line_length**2)].min].max
    
    # Closest point on line
    closest_x = x1 + t * (x2 - x1)
    closest_y = y1 + t * (y2 - y1)
    
    # Distance from circle center to closest point
    distance = Math.sqrt((cx - closest_x)**2 + (cy - closest_y)**2)
    
    distance <= radius
  end
  
  def get_defensive_position(site)
    # Use new map system for defensive positions
    positions = get_defensive_positions(site)
    return positions.sample if positions.any?
    
    # Fallback to bomb site position if no tactical positions defined
    current_map = get_current_map_data
    if current_map && current_map[:bomb_sites][site]
      site_data = current_map[:bomb_sites][site]
      return {
        x: site_data[:x] + rand(-50..50),
        y: site_data[:y] + rand(-50..50)
      }
    end
    
    # Ultimate fallback
    { x: 640, y: 360 }
  end
  
  def award_money(team, amount)
    @game_state[:players].each do |_, player|
      if player[:team] == team
        player[:money] = [player[:money] + amount, 16000].min # Max money
      end
    end
  end
  
  def add_to_kill_feed(message)
    @game_state[:kill_feed] << {
      message: message,
      timestamp: Time.now.to_f
    }
    # Keep only last 5 messages
    @game_state[:kill_feed] = @game_state[:kill_feed].last(5)
  end
  
  def play_sound(sound_name)
    self.script("window.game && window.game.playSound('#{sound_name}');")
  end
  
  def broadcast_game_state
    return unless @page
    # Include player_id and current map data in the broadcast
    current_map_data = get_current_map_data
    state_with_player = @game_state.merge(
      current_player_id: @player_id,
      current_map_data: current_map_data
    )
    begin
      self.script("window.game && window.game.updateGameState(#{state_with_player.to_json});")
    rescue Live::PageError => e
      # Page disconnected, stop game loop
      @game_running = false
      puts "Page disconnected: #{e.message}"
    end
  end
  
  def broadcast_chat_message(message)
    return unless @page
    begin
      self.script("window.game && window.game.receiveChatMessage(#{message.to_json});")
    rescue Live::PageError => e
      # Page disconnected
      puts "Page disconnected during chat: #{e.message}"
    end
  end
  
  # Bot AI Methods
  def initialize_bots
    # Create 4 terrorist bots
    4.times do |i|
      bot_id = "bot_t_#{i}"
      spawn_point = get_spawn_point('t')
      
      @game_state[:bots][bot_id] = {
        id: bot_id,
        name: ["Phoenix", "Leet", "Guerilla", "Elite"][i],
        team: 't',
        x: spawn_point[:x],
        y: spawn_point[:y],
        angle: 0,
        health: 100,
        armor: 0,
        money: 800,
        weapons: ['glock', 'ak47'],
        current_weapon: 'ak47',
        ammo: { 'glock' => 20, 'ak47' => 30 },
        reserve_ammo: { 'glock' => 120, 'ak47' => 90 },
        grenades: [],
        has_bomb: i == 0, # First bot gets bomb
        has_defuse_kit: false,
        alive: true,
        kills: 0,
        deaths: 0,
        score: 0,
        is_bot: true,
        last_shot: 0,
        target: nil,
        path: [],
        state: is_hostage_rescue_mode? ? 'guarding_hostages' : 'roaming', # Different states based on game mode
        last_think: Time.now,
        assigned_site: nil,
        last_site_rotation: Time.now,
        # Spectator state (bots don't use these, but needed for consistency)
        spectating: false,
        spectator_target: nil,
        spectator_mode: 'follow',
        spectator_camera_x: 0,
        spectator_camera_y: 0
      }
      
      @game_state[:players][bot_id] = @game_state[:bots][bot_id]
    end
    
    # Create 4 counter-terrorist bots
    4.times do |i|
      bot_id = "bot_ct_#{i}"
      spawn_point = get_spawn_point('ct')
      
      @game_state[:bots][bot_id] = {
        id: bot_id,
        name: ["Seal Team 6", "GSG-9", "SAS", "GIGN"][i],
        team: 'ct',
        x: spawn_point[:x],
        y: spawn_point[:y],
        angle: 0,
        health: 100,
        armor: 0,
        money: 800,
        weapons: ['usp', 'm4a1'],
        current_weapon: 'm4a1',
        ammo: { 'usp' => 12, 'm4a1' => 30 },
        reserve_ammo: { 'usp' => 90, 'm4a1' => 90 },
        grenades: [],
        has_bomb: false,
        has_defuse_kit: i < 2, # First 2 CT bots get defuse kits
        alive: true,
        kills: 0,
        deaths: 0,
        score: 0,
        is_bot: true,
        last_shot: 0,
        target: nil,
        path: [],
        state: is_hostage_rescue_mode? ? 'rescuing_hostages' : (i < 2 ? 'defending_a' : 'defending_b'), # Different states based on game mode
        last_think: Time.now,
        assigned_site: i < 2 ? 'A' : 'B',
        last_site_rotation: Time.now,
        defensive_position: get_defensive_position(i < 2 ? 'A' : 'B'),
        alert_level: 0, # 0=calm, 1=suspicious, 2=engaged
        # Spectator state (bots don't use these, but needed for consistency)
        spectating: false,
        spectator_target: nil,
        spectator_mode: 'follow',
        spectator_camera_x: 0,
        spectator_camera_y: 0
      }
      
      @game_state[:players][bot_id] = @game_state[:bots][bot_id]
    end
  end
  
  # Admin System Methods
  def initialize_admin_system
    # Create admin directories if they don't exist
    Dir.mkdir(File.dirname(BAN_FILE), 0755) unless Dir.exist?(File.dirname(BAN_FILE))
    Dir.mkdir(DEMO_DIR, 0755) unless Dir.exist?(DEMO_DIR)
    
    # Load existing bans and mutes
    load_bans
    load_mutes
    
    # Initialize demo system
    @demo_start_time = nil
  end
  
  def load_bans
    return unless File.exist?(BAN_FILE)
    
    begin
      bans = JSON.parse(File.read(BAN_FILE))
      @game_state[:bans] = bans
    rescue JSON::ParserError => e
      Console.warn(self, "Failed to load bans: #{e.message}")
      @game_state[:bans] = {}
    end
  end
  
  def save_bans
    begin
      File.write(BAN_FILE, JSON.pretty_generate(@game_state[:bans] || {}))
    rescue => e
      Console.error(self, "Failed to save bans: #{e.message}")
    end
  end
  
  def load_mutes
    return unless File.exist?(MUTE_FILE)
    
    begin
      mutes = JSON.parse(File.read(MUTE_FILE))
      @game_state[:muted_players] = mutes
    rescue JSON::ParserError => e
      Console.warn(self, "Failed to load mutes: #{e.message}")
      @game_state[:muted_players] = {}
    end
  end
  
  def save_mutes
    begin
      File.write(MUTE_FILE, JSON.pretty_generate(@game_state[:muted_players]))
    rescue => e
      Console.error(self, "Failed to save mutes: #{e.message}")
    end
  end
  
  # Admin authentication methods
  def authenticate_admin(username, password)
    return false unless ADMIN_CREDENTIALS[username]
    
    credentials = ADMIN_CREDENTIALS[username]
    return false unless credentials[:password] == password
    
    # Create admin session
    @game_state[:admin_sessions][@player_id] = {
      username: username,
      level: credentials[:level],
      authenticated: true,
      login_time: Time.now.to_f
    }
    
    add_to_kill_feed("#{username} logged in as #{ADMIN_LEVELS[credentials[:level]]}")
    true
  end
  
  def is_admin?(player_id = @player_id)
    session = @game_state[:admin_sessions][player_id]
    session && session[:authenticated] && session[:level] > 0
  end
  
  def admin_level(player_id = @player_id)
    session = @game_state[:admin_sessions][player_id]
    return 0 unless session && session[:authenticated]
    session[:level]
  end
  
  def has_permission?(permission, player_id = @player_id)
    required_level = ADMIN_PERMISSIONS[permission] || 999
    admin_level(player_id) >= required_level
  end
  
  def logout_admin(player_id = @player_id)
    session = @game_state[:admin_sessions][player_id]
    return false unless session
    
    username = session[:username]
    @game_state[:admin_sessions].delete(player_id)
    add_to_kill_feed("#{username} logged out")
    true
  end
  
  # Admin command methods
  def admin_kick_player(target_name, reason = "No reason given")
    return false unless has_permission?('kick')
    
    target = find_player_by_name(target_name)
    return false unless target
    
    # Remove from game
    @game_state[:players].delete(target[:id])
    @game_state[:spectators].delete(target[:id])
    
    session = @game_state[:admin_sessions][@player_id]
    admin_name = session[:username]
    add_to_kill_feed("#{admin_name} kicked #{target[:name]} (#{reason})")
    
    # In a real implementation, you'd also disconnect the player's WebSocket
    broadcast_game_state
    true
  end
  
  def admin_ban_player(target_name, duration_hours = nil, reason = "No reason given")
    permission = duration_hours ? 'ban_perm' : 'ban_temp'
    return false unless has_permission?(permission)
    
    target = find_player_by_name(target_name)
    return false unless target
    
    @game_state[:bans] ||= {}
    
    ban_data = {
      name: target[:name],
      ip: target[:ip_address],
      reason: reason,
      banned_by: @game_state[:admin_sessions][@player_id][:username],
      banned_at: Time.now.to_f,
      expires_at: duration_hours ? Time.now.to_f + (duration_hours * 3600) : nil
    }
    
    @game_state[:bans][target[:ip_address]] = ban_data
    save_bans
    
    # Also kick the player
    admin_kick_player(target_name, "Banned: #{reason}")
    
    duration_text = duration_hours ? "#{duration_hours} hours" : "permanently"
    add_to_kill_feed("#{target[:name]} banned #{duration_text} (#{reason})")
    true
  end
  
  def admin_unban_player(ip_address)
    return false unless has_permission?('ban_perm')
    
    @game_state[:bans] ||= {}
    ban = @game_state[:bans][ip_address]
    return false unless ban
    
    @game_state[:bans].delete(ip_address)
    save_bans
    
    session = @game_state[:admin_sessions][@player_id]
    add_to_kill_feed("#{session[:username]} unbanned #{ban['name']}")
    true
  end
  
  def admin_mute_player(target_name, duration_minutes = 60, reason = "No reason given")
    return false unless has_permission?('mute')
    
    target = find_player_by_name(target_name)
    return false unless target
    
    expires_at = Time.now.to_f + (duration_minutes * 60)
    
    @game_state[:muted_players][target[:id]] = {
      name: target[:name],
      reason: reason,
      muted_by: @game_state[:admin_sessions][@player_id][:username],
      muted_at: Time.now.to_f,
      expires_at: expires_at
    }
    
    target[:muted] = true
    target[:mute_expires] = expires_at
    save_mutes
    
    add_to_kill_feed("#{target[:name]} muted for #{duration_minutes} minutes (#{reason})")
    broadcast_game_state
    true
  end
  
  def admin_unmute_player(target_name)
    return false unless has_permission?('mute')
    
    target = find_player_by_name(target_name)
    return false unless target
    
    @game_state[:muted_players].delete(target[:id])
    target[:muted] = false
    target[:mute_expires] = nil
    save_mutes
    
    session = @game_state[:admin_sessions][@player_id]
    add_to_kill_feed("#{session[:username]} unmuted #{target[:name]}")
    broadcast_game_state
    true
  end
  
  def admin_restart_round
    return false unless has_permission?('restart_round')
    
    session = @game_state[:admin_sessions][@player_id]
    add_to_kill_feed("#{session[:username]} restarted the round")
    
    # Reset all players
    @game_state[:players].each do |_, player|
      next if player[:is_bot]
      
      spawn_point = get_spawn_point(player[:team])
      player[:x] = spawn_point[:x]
      player[:y] = spawn_point[:y]
      player[:health] = 100
      player[:alive] = true
      player[:spectating] = false
      player[:weapons] = [player[:team] == 'ct' ? 'usp' : 'glock']
      player[:current_weapon] = player[:team] == 'ct' ? 'usp' : 'glock'
      player[:ammo] = { player[:current_weapon] => WEAPONS[player[:current_weapon]][:ammo] }
      player[:reserve_ammo] = { player[:current_weapon] => WEAPONS[player[:current_weapon]][:reserve] }
    end
    
    # Reset bots
    @game_state[:bots].each do |_, bot|
      spawn_point = get_spawn_point(bot[:team])
      bot[:x] = spawn_point[:x]
      bot[:y] = spawn_point[:y]
      bot[:health] = 100
      bot[:alive] = true
    end
    
    # Reset round state
    @game_state[:bomb_planted] = false
    @game_state[:bomb_site] = nil
    @game_state[:bomb_timer] = nil
    @game_state[:bomb_position] = nil
    @game_state[:phase] = 'buy_time'
    @game_state[:round_time] = @game_state[:server_config][:buy_time]
    @game_state[:grenades] = []
    @game_state[:smoke_clouds] = []
    @game_state[:dropped_weapons] = []
    
    broadcast_game_state
    true
  end
  
  def admin_change_map(map_name)
    return false unless has_permission?('change_map')
    
    # Find map by partial name match
    map_key = MAPS.keys.find { |key| MAPS[key][:name].downcase.include?(map_name.downcase) || key == map_name }
    return false unless map_key
    
    session = @game_state[:admin_sessions][@player_id]
    add_to_kill_feed("#{session[:username]} changed map to #{MAPS[map_key][:name]}")
    
    change_map(map_key)
    true
  end
  
  def admin_toggle_god_mode(target_name = nil)
    return false unless has_permission?('god_mode')
    
    if target_name
      target = find_player_by_name(target_name)
      return false unless target
    else
      target = @game_state[:players][@player_id]
    end
    
    target[:god_mode] = !target[:god_mode]
    session = @game_state[:admin_sessions][@player_id]
    
    status = target[:god_mode] ? "enabled" : "disabled"
    add_to_kill_feed("#{session[:username]} #{status} god mode for #{target[:name]}")
    
    broadcast_game_state
    true
  end
  
  def find_player_by_name(name)
    name_lower = name.downcase
    @game_state[:players].values.find { |p| p[:name].downcase.include?(name_lower) }
  end
  
  # Server configuration methods
  def admin_set_config(setting, value)
    return false unless has_permission?('config_server')
    
    valid_settings = %w[round_time buy_time bomb_timer defuse_time friendly_fire auto_restart max_rounds]
    return false unless valid_settings.include?(setting)
    
    case setting
    when 'round_time', 'buy_time', 'bomb_timer', 'max_rounds'
      value = value.to_i
      return false if value <= 0
    when 'defuse_time'
      value = value.to_f
      return false if value <= 0
    when 'friendly_fire', 'auto_restart'
      value = value.to_s.downcase == 'true'
    end
    
    @game_state[:server_config][setting.to_sym] = value
    
    session = @game_state[:admin_sessions][@player_id]
    add_to_kill_feed("#{session[:username]} set #{setting} to #{value}")
    
    # Apply immediate changes
    case setting
    when 'round_time'
      @game_state[:round_time] = value if @game_state[:phase] == 'round_active'
    when 'buy_time'
      @game_state[:round_time] = value if @game_state[:phase] == 'buy_time'
    end
    
    broadcast_game_state
    true
  end
  
  # Player reporting system
  def report_player(target_name, reason = "Cheating/Griefing")
    target = find_player_by_name(target_name)
    return false unless target
    
    reporter = @game_state[:players][@player_id]
    return false unless reporter
    
    # Prevent duplicate reports from same player
    return false if target[:reported_by].include?(@player_id)
    
    report = {
      id: SecureRandom.uuid,
      target_id: target[:id],
      target_name: target[:name],
      reporter_id: @player_id,
      reporter_name: reporter[:name],
      reason: reason,
      timestamp: Time.now.to_f,
      handled: false
    }
    
    @game_state[:reports] << report
    target[:reported_by] << @player_id
    
    add_to_kill_feed("#{reporter[:name]} reported #{target[:name]}")
    
    # Notify admins
    notify_admins("New report: #{target[:name]} reported by #{reporter[:name]} (#{reason})")
    
    broadcast_game_state
    true
  end
  
  def admin_handle_report(report_id, action = 'dismiss')
    return false unless has_permission?('kick')
    
    report = @game_state[:reports].find { |r| r[:id] == report_id }
    return false unless report || report[:handled]
    
    report[:handled] = true
    report[:handled_by] = @game_state[:admin_sessions][@player_id][:username]
    report[:handled_at] = Time.now.to_f
    report[:action] = action
    
    session = @game_state[:admin_sessions][@player_id]
    
    case action
    when 'kick'
      admin_kick_player(report[:target_name], "Report verified")
    when 'ban_temp'
      admin_ban_player(report[:target_name], 24, "Report verified - 24h ban")
    when 'ban_perm'
      admin_ban_player(report[:target_name], nil, "Report verified - permanent ban")
    when 'dismiss'
      add_to_kill_feed("#{session[:username]} dismissed report against #{report[:target_name]}")
    end
    
    true
  end
  
  # Demo recording system
  def admin_start_demo_recording(filename = nil)
    return false unless has_permission?('demo_record')
    
    filename ||= "demo_#{Time.now.strftime('%Y%m%d_%H%M%S')}.json"
    @demo_filename = filename
    @demo_start_time = Time.now.to_f
    @game_state[:demo_recording] = true
    @game_state[:demo_data] = []
    
    session = @game_state[:admin_sessions][@player_id]
    add_to_kill_feed("#{session[:username]} started demo recording: #{filename}")
    
    broadcast_game_state
    true
  end
  
  def admin_stop_demo_recording
    return false unless has_permission?('demo_record')
    return false unless @game_state[:demo_recording]
    
    @game_state[:demo_recording] = false
    
    # Save demo to file
    demo_path = File.join(DEMO_DIR, @demo_filename)
    demo_content = {
      version: "1.0",
      map: @game_state[:current_map],
      start_time: @demo_start_time,
      end_time: Time.now.to_f,
      duration: Time.now.to_f - @demo_start_time,
      data: @game_state[:demo_data]
    }
    
    begin
      File.write(demo_path, JSON.pretty_generate(demo_content))
    rescue => e
      Console.error(self, "Failed to save demo: #{e.message}")
      return false
    end
    
    session = @game_state[:admin_sessions][@player_id]
    add_to_kill_feed("#{session[:username]} stopped demo recording")
    
    @game_state[:demo_data] = []
    broadcast_game_state
    true
  end
  
  def record_demo_event(event_type, data)
    return unless @game_state[:demo_recording]
    
    demo_event = {
      type: event_type,
      timestamp: Time.now.to_f - @demo_start_time,
      data: data
    }
    
    @game_state[:demo_data] << demo_event
  end
  
  # Anti-cheat system
  def check_anticheat_violations(player)
    violations = []
    player_id = player[:id]
    
    @game_state[:anticheat_violations][player_id] ||= {
      speed_violations: 0,
      teleport_violations: 0,
      aim_violations: 0,
      last_positions: [],
      last_check: Time.now.to_f
    }
    
    ac_data = @game_state[:anticheat_violations][player_id]
    now = Time.now.to_f
    
    # Speed check
    if ac_data[:last_positions].size > 0
      last_pos = ac_data[:last_positions].last
      distance = Math.sqrt((player[:x] - last_pos[:x])**2 + (player[:y] - last_pos[:y])**2)
      time_diff = now - last_pos[:timestamp]
      
      if time_diff > 0
        speed = distance / time_diff
        max_speed = 250 # pixels per second
        
        if speed > max_speed * 1.5 # Allow some tolerance
          ac_data[:speed_violations] += 1
          violations << "Speed hacking (#{speed.round} > #{max_speed})"
        end
      end
    end
    
    # Teleport check
    if ac_data[:last_positions].size >= 2
      recent_positions = ac_data[:last_positions].last(3)
      
      recent_positions.each_cons(2) do |pos1, pos2|
        distance = Math.sqrt((pos2[:x] - pos1[:x])**2 + (pos2[:y] - pos1[:y])**2)
        time_diff = pos2[:timestamp] - pos1[:timestamp]
        
        if distance > 100 && time_diff < 0.1 # Teleported more than 100 pixels in 0.1s
          ac_data[:teleport_violations] += 1
          violations << "Teleporting"
        end
      end
    end
    
    # Store current position
    ac_data[:last_positions] << {
      x: player[:x],
      y: player[:y],
      timestamp: now
    }
    
    # Keep only last 10 positions
    ac_data[:last_positions] = ac_data[:last_positions].last(10)
    ac_data[:last_check] = now
    
    # Auto-punishment for violations
    if ac_data[:speed_violations] > 5 || ac_data[:teleport_violations] > 3
      auto_anticheat_action(player, violations)
    end
    
    violations
  end
  
  def auto_anticheat_action(player, violations)
    return unless @game_state[:server_config][:auto_anticheat]
    
    violation_text = violations.join(", ")
    
    # Auto-ban for severe violations
    @game_state[:bans] ||= {}
    @game_state[:bans][player[:ip_address]] = {
      name: player[:name],
      ip: player[:ip_address],
      reason: "Auto anti-cheat: #{violation_text}",
      banned_by: "Anti-Cheat System",
      banned_at: Time.now.to_f,
      expires_at: Time.now.to_f + (24 * 3600) # 24 hour ban
    }
    
    save_bans
    
    # Remove player
    @game_state[:players].delete(player[:id])
    @game_state[:spectators].delete(player[:id])
    
    add_to_kill_feed("#{player[:name]} auto-banned by anti-cheat: #{violation_text}")
    notify_admins("Anti-cheat auto-ban: #{player[:name]} - #{violation_text}")
    
    broadcast_game_state
  end
  
  def notify_admins(message)
    # In a real implementation, this would send notifications to all online admins
    add_to_kill_feed("[ADMIN] #{message}")
  end
  
  # Admin spectator mode with enhanced visibility
  def admin_enter_spectator_mode
    return false unless has_permission?('spectate_all')
    
    player = @game_state[:players][@player_id]
    return false unless player
    
    player[:spectating] = true
    player[:admin_spectator] = true
    player[:spectator_mode] = 'admin_free'
    player[:spectator_camera_x] = 640
    player[:spectator_camera_y] = 360
    
    # Admin spectators can see all players, including through walls
    session = @game_state[:admin_sessions][@player_id]
    add_to_kill_feed("#{session[:username]} entered admin spectator mode")
    
    broadcast_game_state
    true
  end
  
  def start_game_loop
    @game_loop = Async do
      while @game_running
        update_game_state
        sleep 0.05 # 20 FPS update rate
      end
    end
  end
  
  def update_game_state
    now = Time.now
    
    # Update round timer
    if now - @last_round_update > 1
      update_round_timer if respond_to?(:update_round_timer)
      @last_round_update = now
    end
    
    # Update bots
    if now - @last_bot_update > 0.1 # 10 Hz bot updates
      update_bots if respond_to?(:update_bots)
      ct_team_communication if respond_to?(:ct_team_communication) # Enhanced CT coordination
      update_hostage_ai if respond_to?(:update_hostage_ai) # Update hostage AI
      check_hostage_rescue_zones if respond_to?(:check_hostage_rescue_zones) # Check if hostages reach rescue zones
      @last_bot_update = now
    end
    
    # Update grenades
    update_grenades if respond_to?(:update_grenades)
    
    # Update smoke clouds
    update_smoke_clouds if respond_to?(:update_smoke_clouds)
    
    # Update player flash effects
    update_flash_effects if respond_to?(:update_flash_effects)
    
    # Check defuse progress
    check_defuse_progress if respond_to?(:check_defuse_progress)
    
    # Check weapon pickups
    check_weapon_pickups if respond_to?(:check_weapon_pickups)
    
    broadcast_game_state if @game_running
  end
  
  def update_round_timer
    case @game_state[:phase]
    when 'buy_time'
      @game_state[:round_time] -= 1
      if @game_state[:round_time] <= 0
        @game_state[:phase] = 'round_active'
        @game_state[:round_time] = ROUND_TIME
        
        # Start match tracking on first round
        if @game_state[:round] == 1 && !@match_started
          start_match_tracking
          @match_started = true
        end
        
        add_to_kill_feed("Round #{@game_state[:round]} started!")
      end
    when 'round_active'
      if @game_state[:bomb_planted]
        @game_state[:bomb_timer] -= 1
        if @game_state[:bomb_timer] <= 0
          # Bomb explodes
          end_round('t')
          add_to_kill_feed("The bomb has exploded!")
        end
      else
        @game_state[:round_time] -= 1
        if @game_state[:round_time] <= 0
          # Time runs out
          end_round('ct')
          add_to_kill_feed("Time has run out!")
        end
      end
    when 'round_end'
      # Wait a few seconds then start new round
      start_new_round if @game_state[:round_time] <= 0
    end
  end
  
  def update_bots
    @game_state[:bots].each do |bot_id, bot|
      next unless bot[:alive]
      
      # Bot AI decision making based on team
      if bot[:team] == 't'
        update_terrorist_bot(bot)
      else
        update_ct_bot(bot)
      end
    end
  end
  
  def update_terrorist_bot(bot)
    # Consider grenade usage every few seconds
    bot[:last_grenade_consider] ||= 0
    if Time.now.to_f - bot[:last_grenade_consider] > 3.0
      consider_grenade_usage(bot)
      bot[:last_grenade_consider] = Time.now.to_f
    end
    
    # Hostage rescue mode behavior
    if is_hostage_rescue_mode?
      case bot[:state]
      when 'guarding_hostages'
        t_bot_guard_hostages(bot)
      when 'roaming'
        bot_roam(bot)
      when 'attacking'
        bot_attack(bot)
      end
    else
      # Standard bomb defusal mode
      case bot[:state]
      when 'roaming'
        bot_roam(bot)
      when 'attacking'
        bot_attack(bot)
      when 'planting'
        bot_plant_bomb(bot)
      end
    end
  end
  
  def update_ct_bot(bot)
    # Update alert level based on game state
    update_ct_alert_level(bot)
    
    # Consider grenade usage every few seconds
    bot[:last_grenade_consider] ||= 0
    if Time.now.to_f - bot[:last_grenade_consider] > 3.0
      consider_grenade_usage(bot)
      bot[:last_grenade_consider] = Time.now.to_f
    end
    
    # Hostage rescue mode behavior
    if is_hostage_rescue_mode?
      case bot[:state]
      when 'rescuing_hostages'
        ct_bot_rescue_hostages(bot)
      when 'escorting_hostage'
        ct_bot_escort_hostage(bot)
      when 'attacking'
        bot_attack(bot)
      when 'roaming'
        bot_roam(bot)
      end
    else
      # Standard bomb defusal mode
      case bot[:state]
      when 'defending_a', 'defending_b'
        ct_bot_defend(bot)
      when 'rotating'
        ct_bot_rotate(bot)
      when 'retaking_a', 'retaking_b'
        ct_bot_retake(bot)
      when 'defusing'
        ct_bot_defuse(bot)
      when 'attacking'
        bot_attack(bot) # Reuse existing attack logic
    end
  end
  
  def bot_roam(bot)
    # Find nearest enemy
    nearest_enemy = find_nearest_enemy(bot)
    
    if nearest_enemy
      dist = calculate_distance(bot, nearest_enemy)
      if dist < 300 # Engagement range
        bot[:state] = 'attacking'
        bot[:target] = nearest_enemy[:id]
      else
        # Move towards enemy
        move_bot_towards(bot, nearest_enemy)
      end
    elsif bot[:has_bomb] && @game_state[:phase] == 'round_active'
      # Move to bomb site
      bot[:state] = 'planting'
      site = ['A', 'B'].sample
      move_bot_to_site(bot, site)
    else
      # Move to tactical positions instead of random patrol
      if !bot[:target_position] || distance_to_position(bot, bot[:target_position]) < 50
        # Get new tactical position
        tactical_pos = get_tactical_position(bot[:team])
        if tactical_pos
          bot[:target_position] = tactical_pos
        end
      end
      
      if bot[:target_position]
        move_bot_towards_position(bot, bot[:target_position])
      else
        # Fallback to random patrol if no tactical positions
        bot[:angle] += (rand - 0.5) * 0.2
        move_bot_forward(bot, 3)
      end
    end
  end
  
  def bot_attack(bot)
    target = @game_state[:players][bot[:target]]
    
    if target && target[:alive]
      # Face target
      dx = target[:x] - bot[:x]
      dy = target[:y] - bot[:y]
      bot[:angle] = Math.atan2(dy, dx)
      
      # Check if can shoot
      dist = Math.sqrt(dx * dx + dy * dy)
      if dist < 400 && bot[:ammo][bot[:current_weapon]] > 0
        bot_shoot(bot)
      else
        # Move closer
        move_bot_towards(bot, target)
      end
      
      # Reload if needed
      if bot[:ammo][bot[:current_weapon]] == 0
        bot_reload(bot)
      end
      
      # Use tactical grenades in combat
      if dist > 100 && dist < 300
        use_tactical_grenade(bot, target)
      end
    else
      bot[:state] = 'roaming'
      bot[:target] = nil
    end
  end
  
  def bot_plant_bomb(bot)
    return unless bot[:has_bomb]
    
    site = at_bomb_site?(bot[:x], bot[:y])
    if site
      # Plant bomb
      @game_state[:bomb_planted] = true
      @game_state[:bomb_site] = site
      @game_state[:bomb_timer] = BOMB_TIMER
      @game_state[:bomb_position] = { x: bot[:x], y: bot[:y] }
      bot[:has_bomb] = false
      bot[:state] = 'roaming'
      add_to_kill_feed("#{bot[:name]} planted the bomb at site #{site}!")
    else
      # Move to nearest bomb site
      move_bot_to_site(bot, 'A')
    end
  end
  
  def bot_shoot(bot)
    return unless can_use_weapon?(bot)
    
    weapon = WEAPONS[bot[:current_weapon]]
    return unless weapon
    
    # Initialize bot weapon state
    bot[:weapon_state] ||= {}
    weapon_state = bot[:weapon_state][bot[:current_weapon]] ||= {
      shots_fired: 0,
      last_shot_time: 0,
      recoil_accumulation: 0.0,
      current_attachment: nil
    }
    
    # Fire rate check
    now = Time.now.to_f * 1000
    fire_delay = 60000.0 / weapon[:rate]
    return if now - weapon_state[:last_shot_time] < fire_delay
    
    # Bot-specific weapon tactics
    target = @game_state[:players][bot[:target]]
    if target
      distance_to_target = Math.sqrt(
        (target[:x] - bot[:x])**2 + (target[:y] - bot[:y])**2
      )
      
      # Weapon-specific shooting behavior
      should_shoot = bot_should_shoot_with_weapon(bot, weapon, target, distance_to_target)
      return unless should_shoot
      
      # Apply bot-specific burst/spray control
      shots_to_fire = calculate_bot_shots(bot, weapon, distance_to_target)
    else
      shots_to_fire = 1
    end
    
    # Enhanced bot shooting with recoil
    shots_to_fire.times do |shot_index|
      break if bot[:ammo][bot[:current_weapon]] <= 0
      
      bot[:ammo][bot[:current_weapon]] -= 1
      weapon_state[:shots_fired] += 1
      weapon_state[:last_shot_time] = now + (shot_index * 50)
      
      # Apply bot accuracy with weapon characteristics
      accuracy_factor = calculate_bot_accuracy(bot, weapon, distance_to_target || 0)
      final_angle = bot[:angle] + apply_bot_spray_pattern(weapon_state, weapon, accuracy_factor)
      
      # Check hit with enhanced system
      final_damage = calculate_damage_with_range_falloff(weapon, bot, final_angle)
      check_bullet_hit(bot, final_angle, final_damage, weapon)
      
      # Update recoil accumulation
      weapon_state[:recoil_accumulation] += 0.15 # Bots have slightly better recoil control
    end
    
    bot[:last_shot] = now
  end
  
  # Enhanced Bot Weapon AI
  def bot_should_shoot_with_weapon(bot, weapon, target, distance)
    case weapon[:category]
    when 'sniper'
      # Snipers prefer long-range shots and stationary targets
      return distance > 800 && target[:velocity] < 50
    when 'rifle'
      # Rifles are versatile, good at medium range
      return distance < 1200
    when 'smg'
      # SMGs prefer close-range aggressive play
      return distance < 600
    when 'shotgun'
      # Shotguns only at close range
      return distance < 300
    when 'pistol'
      # Pistols for eco rounds or close backup
      return distance < 500
    else
      return distance < 800
    end
  end
  
  def calculate_bot_shots(bot, weapon, distance)
    case weapon[:category]
    when 'sniper'
      return 1 # Always single shot
    when 'rifle'
      # Short bursts at long range, longer at close
      return distance > 800 ? [2, 3].sample : [3, 5].sample
    when 'smg'
      # SMGs can spray more
      return distance > 400 ? [4, 6].sample : [6, 10].sample
    when 'shotgun'
      return 1 # Single shots
    when 'pistol'
      return weapon[:burst_fire] ? 3 : [1, 2].sample
    else
      return [2, 4].sample
    end
  end
  
  def calculate_bot_accuracy(bot, weapon, distance)
    # Base bot skill level (0.7-0.9 depending on difficulty)
    base_skill = 0.8
    
    # Weapon accuracy modifier
    weapon_accuracy = weapon[:accuracy] || 0.7
    
    # Distance penalty
    max_range = weapon[:range] || 1000
    distance_penalty = distance > max_range * 0.5 ? 0.8 : 1.0
    
    # Movement penalty (bots are better at counter-strafing)
    movement_penalty = bot[:velocity] > 50 ? 0.9 : 1.0
    
    base_skill * weapon_accuracy * distance_penalty * movement_penalty
  end
  
  def apply_bot_spray_pattern(weapon_state, weapon, accuracy_factor)
    spray_data = SPRAY_PATTERNS[weapon[:spray_pattern]] || SPRAY_PATTERNS['moderate']
    shot_number = [weapon_state[:shots_fired] - 1, spray_data[:pattern].length - 1].min
    recoil_offset = spray_data[:pattern][shot_number] || [0, 0]
    
    # Bots have better spray control than players
    bot_compensation = 0.7
    recoil_x = recoil_offset[0] * (1 - bot_compensation) * (1 - accuracy_factor)
    recoil_y = recoil_offset[1] * (1 - bot_compensation) * (1 - accuracy_factor)
    
    # Convert to angle offset (simplified)
    (recoil_x + recoil_y) * 0.05
  end
  
  # Enhanced Bot Weapon Selection
  def bot_select_best_weapon(bot, situation = :general)
    available_weapons = bot[:weapons].map { |w| WEAPONS[w] }.compact
    return bot[:current_weapon] if available_weapons.empty?
    
    case situation
    when :long_range
      preferred = ['awp', 'scout', 'ak47', 'm4a1', 'aug', 'sg552']
    when :close_range
      preferred = ['m3', 'xm1014', 'p90', 'mp5navy', 'mac10', 'tmp']
    when :eco_round
      preferred = ['deagle', 'p228', 'fiveseven', 'glock', 'usp']
    when :anti_eco
      preferred = ['p90', 'ump45', 'famas', 'galil']
    else
      preferred = ['ak47', 'm4a1', 'm4a4', 'awp']
    end
    
    # Find best available weapon from preferred list
    best_weapon = nil
    preferred.each do |weapon_key|
      if bot[:weapons].include?(weapon_key)
        best_weapon = weapon_key
        break
      end
    end
    
    # If no preferred weapon found, use current or default
    best_weapon || bot[:current_weapon] || bot[:weapons].first
  end
  
  # Bot Purchase Decision Making
  def bot_make_purchase_decision(bot)
    return unless @game_state[:phase] == 'buy_time'
    
    money = bot[:money]
    team = bot[:team]
    round_number = @game_state[:round]
    
    # Determine economy state
    economy_state = determine_bot_economy_state(bot, money)
    
    purchase_plan = case economy_state
    when :full_buy
      make_full_buy_plan(bot, money)
    when :force_buy
      make_force_buy_plan(bot, money)
    when :eco_round
      make_eco_buy_plan(bot, money)
    when :anti_eco
      make_anti_eco_plan(bot, money)
    else
      []
    end
    
    # Execute purchases
    purchase_plan.each do |weapon_key|
      weapon = WEAPONS[weapon_key]
      next unless weapon && money >= weapon[:price]
      
      # Check team restrictions
      next if weapon[:teams] && !weapon[:teams].include?(team)
      
      money -= weapon[:price]
      bot[:money] = money
      
      # Add to inventory
      if weapon[:category] == 'grenade'
        bot[:grenades] << weapon_key unless bot[:grenades].include?(weapon_key)
      elsif weapon_key.include?('kevlar')
        bot[:armor] = weapon_key == 'kevlar_helmet' ? 100 : 100
      elsif weapon_key == 'defuse_kit'
        bot[:has_defuse_kit] = true if team == 'ct'
      else
        bot[:weapons] << weapon_key unless bot[:weapons].include?(weapon_key)
        bot[:current_weapon] = weapon_key
      end
    end
  end
  
  def determine_bot_economy_state(bot, money)
    team_money = calculate_team_money(bot[:team])
    round_number = @game_state[:round]
    
    if money >= 5000 && team_money >= 20000
      :full_buy
    elsif money >= 2500 && team_money >= 12000
      :force_buy
    elsif round_number <= 3 || money < 2000
      :eco_round
    elsif enemy_team_likely_eco?(bot[:team])
      :anti_eco
    else
      :force_buy
    end
  end
  
  def make_full_buy_plan(bot, money)
    plan = []
    team = bot[:team]
    
    # Armor first
    plan << 'kevlar_helmet' if money >= 1000
    
    # Primary weapon
    if team == 'ct'
      plan << ['m4a1', 'm4a4', 'aug'].sample
    else
      plan << ['ak47', 'sg552'].sample
    end
    
    # AWP for some bots
    if money >= 4750 && rand < 0.3
      plan[-1] = 'awp'
    end
    
    # Utility
    plan << 'flashbang' if money >= 200
    plan << 'smokegrenade' if money >= 300
    plan << 'defuse_kit' if team == 'ct' && money >= 400
    
    plan
  end
  
  def make_force_buy_plan(bot, money)
    plan = []
    team = bot[:team]
    
    if money >= 1700
      plan << 'kevlar'
      if team == 'ct'
        plan << ['famas', 'ump45'].sample
      else
        plan << ['galil', 'ump45'].sample
      end
    else
      plan << ['deagle', 'p228'].sample
    end
    
    plan
  end
  
  def make_eco_buy_plan(bot, money)
    return [] if money < 400
    
    # Save for next round, only buy minimal
    plan = []
    plan << 'deagle' if money >= 700 && rand < 0.3
    plan
  end
  
  def make_anti_eco_plan(bot, money)
    plan = []
    plan << 'kevlar_helmet'
    plan << ['p90', 'ump45', 'famas'].sample # Anti-eco weapons
    plan << 'flashbang'
    plan
  end
  
  # Helper functions for bot economy
  def calculate_team_money(team)
    total_money = 0
    @game_state[:players].each do |id, player|
      total_money += player[:money] if player[:team] == team
    end
    
    @game_state[:bots].each do |id, bot|
      total_money += bot[:money] if bot[:team] == team
    end
    
    total_money
  end
  
  def enemy_team_likely_eco?(team)
    enemy_team = team == 'ct' ? 't' : 'ct'
    enemy_money = calculate_team_money(enemy_team)
    enemy_count = count_team_members(enemy_team)
    
    return false if enemy_count == 0
    
    average_enemy_money = enemy_money / enemy_count
    average_enemy_money < 2000 # Likely eco if average < $2000
  end
  
  def count_team_members(team)
    count = 0
    @game_state[:players].each do |id, player|
      count += 1 if player[:team] == team
    end
    
    @game_state[:bots].each do |id, bot|
      count += 1 if bot[:team] == team
    end
    
    count
  end
  
  def bot_reload(bot)
    weapon_key = bot[:current_weapon]
    weapon = WEAPONS[weapon_key]
    return unless weapon && weapon[:ammo]
    
    current = bot[:ammo][weapon_key] || 0
    reserve = bot[:reserve_ammo][weapon_key] || 0
    
    return if current >= weapon[:ammo] || reserve <= 0
    
    needed = weapon[:ammo] - current
    reload_amount = [needed, reserve].min
    
    bot[:ammo][weapon_key] = current + reload_amount
    bot[:reserve_ammo][weapon_key] = reserve - reload_amount
  end
  
  def move_bot_towards(bot, target)
    dx = target[:x] - bot[:x]
    dy = target[:y] - bot[:y]
    dist = Math.sqrt(dx * dx + dy * dy)
    
    return if dist < 50
    
    # Normalize and apply speed
    speed = 3 * (WEAPONS[bot[:current_weapon]][:speed] || 1.0)
    new_x = bot[:x] + (dx / dist) * speed
    new_y = bot[:y] + (dy / dist) * speed
    
    # Apply movement with collision detection
    apply_bot_movement(bot, new_x, new_y)
  end
  
  def move_bot_towards_position(bot, position)
    move_bot_towards(bot, position)
  end
  
  def distance_to_position(bot, position)
    dx = position[:x] - bot[:x]
    dy = position[:y] - bot[:y]
    Math.sqrt(dx * dx + dy * dy)
  end
  
  def move_bot_forward(bot, speed)
    new_x = bot[:x] + Math.cos(bot[:angle]) * speed
    new_y = bot[:y] + Math.sin(bot[:angle]) * speed
    
    # Apply movement with collision detection
    apply_bot_movement(bot, new_x, new_y)
  end
  
  def apply_bot_movement(bot, new_x, new_y)
    # Bounds checking first
    new_x = [[new_x, 20].max, 1260].min
    new_y = [[new_y, 20].max, 700].min
    
    # Check wall collisions
    unless check_wall_collision(new_x, new_y)
      bot[:x] = new_x
      bot[:y] = new_y
    else
      # Try moving only in X direction
      unless check_wall_collision(new_x, bot[:y])
        bot[:x] = new_x
      else
        # Try moving only in Y direction
        unless check_wall_collision(bot[:x], new_y)
          bot[:y] = new_y
        end
        # If both fail, try alternative path or stop
      end
    end
  end
  
  def move_bot_to_site(bot, site)
    current_map = get_current_map_data
    if current_map && current_map[:bomb_sites][site]
      site_data = current_map[:bomb_sites][site]
      target = { x: site_data[:x], y: site_data[:y] }
    else
      # Fallback positions
      target = site == 'A' ? { x: 200, y: 200 } : { x: 1080, y: 520 }
    end
    move_bot_towards(bot, target)
  end
  
  def find_nearest_enemy(bot)
    nearest = nil
    min_dist = Float::INFINITY
    
    @game_state[:players].each do |id, player|
      next if player[:team] == bot[:team] || !player[:alive] || id == bot[:id]
      
      dist = calculate_distance(bot, player)
      if dist < min_dist
        min_dist = dist
        nearest = player
      end
    end
    
    nearest
  end
  
  def calculate_distance(obj1, obj2)
    dx = obj2[:x] - obj1[:x]
    dy = obj2[:y] - obj1[:y]
    Math.sqrt(dx * dx + dy * dy)
  end
  
  # CT Bot AI Methods
  def update_ct_alert_level(bot)
    # Increase alert level if enemies are nearby or bomb is planted
    nearest_enemy = find_nearest_enemy(bot)
    
    if @game_state[:bomb_planted]
      bot[:alert_level] = 2 # Maximum alert when bomb is planted
    elsif nearest_enemy && calculate_distance(bot, nearest_enemy) < 400
      bot[:alert_level] = [bot[:alert_level] + 0.1, 2.0].min
    else
      # Slowly decrease alert level
      bot[:alert_level] = [bot[:alert_level] - 0.05, 0.0].max
    end
  end
  
  def ct_bot_defend(bot)
    # Check if bomb is planted - highest priority
    if @game_state[:bomb_planted] && bot[:has_defuse_kit]
      bot[:state] = 'defusing'
      return
    elsif @game_state[:bomb_planted]
      # Move to bomb site for retake
      bot[:state] = @game_state[:bomb_site] == 'A' ? 'retaking_a' : 'retaking_b'
      return
    end
    
    # Look for enemies
    nearest_enemy = find_nearest_enemy(bot)
    if nearest_enemy
      dist = calculate_distance(bot, nearest_enemy)
      if dist < 350
        bot[:state] = 'attacking'
        bot[:target] = nearest_enemy[:id]
        bot[:alert_level] = 2
        return
      elsif dist < 600
        # Move to intercept but stay defensive
        angle_to_enemy = Math.atan2(nearest_enemy[:y] - bot[:y], nearest_enemy[:x] - bot[:x])
        bot[:angle] = angle_to_enemy
        move_towards_with_caution(bot, nearest_enemy, 0.5)
        return
      end
    end
    
    # Check if should rotate to other site
    if should_rotate_ct(bot)
      bot[:state] = 'rotating'
      bot[:assigned_site] = bot[:assigned_site] == 'A' ? 'B' : 'A'
      bot[:last_site_rotation] = Time.now
      return
    end
    
    # Default defensive behavior - patrol around assigned site
    patrol_defensive_site(bot)
  end
  
  def ct_bot_rotate(bot)
    target_site = bot[:assigned_site]
    target_pos = get_defensive_position(target_site)
    
    move_bot_towards(bot, target_pos)
    
    # Check if reached new site
    if calculate_distance(bot, target_pos) < 50
      bot[:state] = target_site == 'A' ? 'defending_a' : 'defending_b'
      bot[:defensive_position] = target_pos
    end
    
    # Still check for immediate threats during rotation
    nearest_enemy = find_nearest_enemy(bot)
    if nearest_enemy && calculate_distance(bot, nearest_enemy) < 250
      bot[:state] = 'attacking'
      bot[:target] = nearest_enemy[:id]
    end
  end
  
  def ct_bot_retake(bot)
    bomb_pos = @game_state[:bomb_position]
    return unless bomb_pos
    
    # Check for enemies first
    nearest_enemy = find_nearest_enemy(bot)
    if nearest_enemy
      dist = calculate_distance(bot, nearest_enemy)
      if dist < 300
        bot[:state] = 'attacking'
        bot[:target] = nearest_enemy[:id]
        return
      end
    end
    
    # Move towards bomb site for retake
    move_bot_towards(bot, bomb_pos)
    
    # If close enough and has defuse kit, start defusing
    if calculate_distance(bot, bomb_pos) < 80 && bot[:has_defuse_kit]
      bot[:state] = 'defusing'
    end
  end
  
  def ct_bot_defuse(bot)
    bomb_pos = @game_state[:bomb_position]
    return unless bomb_pos && @game_state[:bomb_planted]
    
    # Check for immediate threats
    nearest_enemy = find_nearest_enemy(bot)
    if nearest_enemy && calculate_distance(bot, nearest_enemy) < 200
      # Too dangerous to defuse, fight first
      bot[:state] = 'attacking'
      bot[:target] = nearest_enemy[:id]
      return
    end
    
    # Move to bomb position
    if calculate_distance(bot, bomb_pos) > 60
      move_bot_towards(bot, bomb_pos)
    else
      # Start defusing (simulated - in real game this would trigger defuse action)
      if @game_state[:defusing_player].nil?
        @game_state[:defusing_player] = bot[:id]
        @game_state[:defuse_start_time] = Time.now.to_f
        add_to_kill_feed("#{bot[:name]} started defusing the bomb!")
      end
    end
  end
  
  def should_rotate_ct(bot)
    return false if Time.now - bot[:last_site_rotation] < 10 # Don't rotate too often
    
    # Count teammates at each site
    site_a_count = ct_bots_at_site('A')
    site_b_count = ct_bots_at_site('B')
    
    # Rotate if there's a significant imbalance
    if bot[:assigned_site] == 'A' && site_a_count > site_b_count + 1
      return true
    elsif bot[:assigned_site] == 'B' && site_b_count > site_a_count + 1
      return true
    end
    
    false
  end
  
  def ct_bots_at_site(site)
    @game_state[:bots].count do |_, bot|
      bot[:team] == 'ct' && 
      bot[:alive] && 
      (bot[:assigned_site] == site || bot[:state] == "defending_#{site.downcase}")
    end
  end
  
  def patrol_defensive_site(bot)
    site = bot[:assigned_site]
    current_pos = bot[:defensive_position] || get_defensive_position(site)
    
    # If far from defensive position, move back
    if calculate_distance(bot, current_pos) > 100
      move_bot_towards(bot, current_pos)
    else
      # Small random patrol around the position
      if rand < 0.1 # 10% chance to change patrol
        angle_offset = (rand - 0.5) * Math::PI / 2 # 45 degrees either way
        bot[:angle] += angle_offset
        move_bot_forward(bot, 2)
      end
    end
    
    # Face common approach angles
    if site == 'A'
      # Face towards terrorist approach angles
      common_angles = [Math::PI, Math::PI * 1.5, 0, Math::PI * 0.5] # Left, up, right, down
    else
      common_angles = [0, Math::PI * 0.5, Math::PI, Math::PI * 1.5] # Right, down, left, up  
    end
    
    if rand < 0.05 # 5% chance to change facing
      bot[:angle] = common_angles.sample
    end
  end
  
  def move_towards_with_caution(bot, target, speed_multiplier = 1.0)
    dx = target[:x] - bot[:x]
    dy = target[:y] - bot[:y]
    dist = Math.sqrt(dx * dx + dy * dy)
    
    return if dist < 30 # Don't get too close
    
    # Move with reduced speed for caution
    speed = 2 * speed_multiplier * (WEAPONS[bot[:current_weapon]][:speed] || 1.0)
    bot[:x] += (dx / dist) * speed
    bot[:y] += (dy / dist) * speed
    
    # Apply bounds
    bot[:x] = [[bot[:x], 20].max, 1260].min
    bot[:y] = [[bot[:y], 20].max, 700].min
  end
  
  # Bot Economy and Purchasing
  def handle_bot_purchases
    @game_state[:bots].each do |bot_id, bot|
      next unless bot[:alive]
      
      if bot[:team] == 't'
        handle_terrorist_bot_purchase(bot)
      else
        handle_ct_bot_purchase(bot)
      end
    end
  end
  
  def handle_terrorist_bot_purchase(bot)
    # T bot purchasing priority: Armor > Main weapon > Grenades > Defuse kit (never for T)
    
    # Buy armor first if needed
    if bot[:armor] < 50 && bot[:money] >= 650
      bot[:armor] = 100
      bot[:money] -= 650
    end
    
    # Upgrade weapon if money allows
    if bot[:money] >= 2700 && !bot[:weapons].include?('ak47')
      bot[:weapons] << 'ak47' unless bot[:weapons].include?('ak47')
      bot[:current_weapon] = 'ak47'
      bot[:ammo]['ak47'] = 30
      bot[:reserve_ammo]['ak47'] = 90
      bot[:money] -= 2700
    end
    
    # Buy grenades if rich enough
    if bot[:money] >= 300 && bot[:grenades].length < 2
      available_grenades = ['flashbang', 'hegrenade', 'smokegrenade']
      grenade = available_grenades.sample
      unless bot[:grenades].include?(grenade)
        bot[:grenades] << grenade
        bot[:money] -= 300
      end
    end
  end
  
  def handle_ct_bot_purchase(bot)
    # CT bot purchasing priority: Defuse kit > Armor > Main weapon > Grenades
    
    # Buy defuse kit first (critical for CT strategy)
    if !bot[:has_defuse_kit] && bot[:money] >= 400
      bot[:has_defuse_kit] = true
      bot[:money] -= 400
    end
    
    # Buy armor if needed
    if bot[:armor] < 50 && bot[:money] >= 650
      bot[:armor] = 100
      bot[:money] -= 650
      
      # Buy helmet too if enough money
      if bot[:money] >= 350
        bot[:money] -= 350 # Helmet upgrade
      end
    end
    
    # Upgrade to M4A1 if money allows and don't have it
    if bot[:money] >= 3100 && !bot[:weapons].include?('m4a1')
      bot[:weapons] << 'm4a1' unless bot[:weapons].include?('m4a1')
      bot[:current_weapon] = 'm4a1'
      bot[:ammo]['m4a1'] = 30
      bot[:reserve_ammo]['m4a1'] = 90
      bot[:money] -= 3100
    end
    
    # Consider AWP if very rich
    if bot[:money] >= 4750 && !bot[:weapons].include?('awp') && rand < 0.3
      bot[:weapons] << 'awp' unless bot[:weapons].include?('awp')
      bot[:current_weapon] = 'awp'
      bot[:ammo]['awp'] = 10
      bot[:reserve_ammo]['awp'] = 30
      bot[:money] -= 4750
    end
    
    # Buy grenades if money permits
    if bot[:money] >= 300 && bot[:grenades].length < 2
      # CT bots prefer flashbangs and smokes for retakes
      preferred_grenades = ['flashbang', 'smokegrenade', 'hegrenade']
      grenade = preferred_grenades.sample
      unless bot[:grenades].include?(grenade)
        bot[:grenades] << grenade
        bot[:money] -= 300
      end
    end
  end
  
  # Enhanced CT bot coordination
  def ct_team_communication
    # Count alive CT and T players
    alive_cts = @game_state[:players].values.count { |p| p[:team] == 'ct' && p[:alive] }
    alive_ts = @game_state[:players].values.count { |p| p[:team] == 't' && p[:alive] }
    
    # Emergency rotation if site is heavily outnumbered
    if alive_cts > 0 && alive_ts > 0
      @game_state[:bots].each do |bot_id, bot|
        next unless bot[:team] == 'ct' && bot[:alive]
        
        # Force rotation if one site is being rushed
        site_a_threats = count_enemies_near_site('A')
        site_b_threats = count_enemies_near_site('B')
        
        if site_a_threats > 2 && bot[:assigned_site] == 'B'
          bot[:state] = 'rotating'
          bot[:assigned_site] = 'A'
          add_to_kill_feed("#{bot[:name]}: Rotating to A!")
        elsif site_b_threats > 2 && bot[:assigned_site] == 'A'
          bot[:state] = 'rotating' 
          bot[:assigned_site] = 'B'
          add_to_kill_feed("#{bot[:name]}: Rotating to B!")
        end
      end
    end
  end
  
  def count_enemies_near_site(site)
    site_pos = site == 'A' ? { x: 200, y: 200 } : { x: 1080, y: 520 }
    
    @game_state[:players].values.count do |player|
      player[:team] == 't' && 
      player[:alive] && 
      calculate_distance(player, site_pos) < 300
    end
  end
  
  def consider_grenade_usage(bot)
    return unless bot[:grenades] && bot[:grenades].any?
    
    # Find potential targets
    enemies = find_enemies_in_range(bot, 400)
    return unless enemies.any?
    
    # Check if bot should use grenades tactically
    if bot[:team] == 't'
      consider_terrorist_grenades(bot, enemies)
    else
      consider_ct_grenades(bot, enemies)
    end
  end
  
  def consider_terrorist_grenades(bot, enemies)
    # Terrorist priorities: Clear areas, damage groups, block rotations
    
    if enemies.length >= 2 && bot[:grenades].include?('hegrenade')
      # Use HE grenade against grouped enemies
      target_center = calculate_enemy_center(enemies)
      if should_throw_he_grenade?(bot, target_center, enemies)
        throw_bot_grenade(bot, 'hegrenade', target_center)
        return
      end
    end
    
    if bot[:grenades].include?('smokegrenade')
      # Use smoke to block CT rotations or cover bomb plants
      smoke_target = find_smoke_target_t(bot)
      if smoke_target
        throw_bot_grenade(bot, 'smokegrenade', smoke_target)
        return
      end
    end
    
    if bot[:grenades].include?('flashbang') && enemies.length >= 1
      # Use flashbang before pushing
      target = enemies[0]
      if should_throw_flashbang?(bot, target)
        throw_bot_grenade(bot, 'flashbang', { x: target[:x], y: target[:y] })
        return
      end
    end
  end
  
  def consider_ct_grenades(bot, enemies)
    # CT priorities: Delay pushes, retake sites, deny areas
    
    if bot[:grenades].include?('smokegrenade')
      # Use smoke to slow terrorist pushes or cover retakes
      smoke_target = find_smoke_target_ct(bot, enemies)
      if smoke_target
        throw_bot_grenade(bot, 'smokegrenade', smoke_target)
        return
      end
    end
    
    if enemies.length >= 2 && bot[:grenades].include?('hegrenade')
      # Use HE grenade against terrorist groups
      target_center = calculate_enemy_center(enemies)
      if should_throw_he_grenade?(bot, target_center, enemies)
        throw_bot_grenade(bot, 'hegrenade', target_center)
        return
      end
    end
    
    if bot[:grenades].include?('flashbang') && enemies.length >= 1
      # Use flashbang for retakes
      if bot[:state] && bot[:state].include?('retaking')
        target = enemies[0]
        throw_bot_grenade(bot, 'flashbang', { x: target[:x], y: target[:y] })
        return
      end
    end
  end
  
  def find_enemies_in_range(bot, range)
    all_entities = bot[:team] == 't' ? @game_state[:players] : @game_state[:players].merge(@game_state[:bots])
    
    all_entities.values.select do |entity|
      entity[:team] != bot[:team] &&
      entity[:alive] &&
      calculate_distance(bot, entity) <= range
    end
  end
  
  def calculate_enemy_center(enemies)
    return nil if enemies.empty?
    
    total_x = enemies.sum { |e| e[:x] }
    total_y = enemies.sum { |e| e[:y] }
    
    {
      x: total_x / enemies.length,
      y: total_y / enemies.length
    }
  end
  
  def should_throw_he_grenade?(bot, target, enemies)
    # Don't throw if too close to avoid self-damage
    return false if calculate_distance(bot, target) < 120
    
    # Only throw if we can hit multiple enemies or one low-health enemy
    enemies.length >= 2 || enemies.any? { |e| e[:health] < 50 }
  end
  
  def should_throw_flashbang?(bot, target)
    # Throw flashbang if enemy is in good position and we're not too close
    distance = calculate_distance(bot, target)
    distance > 80 && distance < 250
  end
  
  def find_smoke_target_t(bot)
    # Terrorists use smoke to:
    # 1. Block common angles when rushing sites
    # 2. Cover bomb plants
    # 3. Block rotations
    
    # If near bomb site, smoke common CT positions
    if at_bomb_site?(bot[:x], bot[:y])
      # Smoke CT spawn areas
      return { x: 200, y: 150 } if at_bomb_site?(bot[:x], bot[:y]) == 'A'
      return { x: 1000, y: 400 } if at_bomb_site?(bot[:x], bot[:y]) == 'B'
    end
    
    # Smoke common chokepoints
    chokepoints = [
      { x: 640, y: 200 },  # Mid
      { x: 400, y: 300 },  # A approach
      { x: 900, y: 500 }   # B approach
    ]
    
    chokepoints.min_by { |point| calculate_distance(bot, point) }
  end
  
  def find_smoke_target_ct(bot, enemies)
    # CTs use smoke to:
    # 1. Slow terrorist rushes
    # 2. Cover retake attempts
    # 3. Deny vision for defuses
    
    return nil if enemies.empty?
    
    # If retaking, smoke between enemies and bomb
    if bot[:state] && bot[:state].include?('retaking')
      if @game_state[:bomb_planted] && @game_state[:bomb_position]
        bomb_pos = @game_state[:bomb_position]
        nearest_enemy = enemies.min_by { |e| calculate_distance(e, bomb_pos) }
        
        # Smoke between enemy and bomb
        return {
          x: (nearest_enemy[:x] + bomb_pos[:x]) / 2,
          y: (nearest_enemy[:y] + bomb_pos[:y]) / 2
        }
      end
    end
    
    # Smoke enemy position if they're in a strong spot
    enemies[0] ? { x: enemies[0][:x], y: enemies[0][:y] } : nil
  end
  
  def throw_bot_grenade(bot, grenade_type, target)
    return unless bot[:grenades].include?(grenade_type)
    
    # Calculate throw angle and parameters
    angle = Math.atan2(target[:y] - bot[:y], target[:x] - bot[:x])
    power = calculate_throw_power(bot, target)
    cook_time = grenade_type == 'hegrenade' ? 1.5 : 0 # Cook HE grenades slightly
    
    # Remove grenade from inventory
    bot[:grenades].delete_at(bot[:grenades].index(grenade_type))
    
    # Create the grenade
    create_grenade_physics(bot, grenade_type, angle, power, cook_time)
    
    # Play sound and broadcast
    play_sound('grenade_throw')
    broadcast_game_state
    
    Console.info(self, "Bot #{bot[:name]} used #{grenade_type} tactically")
  end
  
  # Hostage rescue specific bot AI methods
  def t_bot_guard_hostages(bot)
    # Terrorist bots guard hostages and watch for CT attacks
    nearest_hostage = find_nearest_hostage(bot)
    return bot_roam(bot) unless nearest_hostage
    
    # Stay near hostages but watch for enemies
    enemy = find_nearest_enemy(bot)
    
    if enemy && calculate_distance(bot, enemy) < 200
      bot[:state] = 'attacking'
      bot_attack(bot)
    else
      # Patrol around hostages
      hostage_area_center = calculate_hostage_area_center
      distance_to_center = calculate_distance(bot, hostage_area_center)
      
      if distance_to_center > 100
        move_bot_towards_position(bot, hostage_area_center)
      else
        # Patrol in small area around hostages
        patrol_angle = (Time.now.to_f * 0.5 + bot[:id].hash) % (Math::PI * 2)
        patrol_x = hostage_area_center[:x] + Math.cos(patrol_angle) * 60
        patrol_y = hostage_area_center[:y] + Math.sin(patrol_angle) * 60
        move_bot_towards_position(bot, { x: patrol_x, y: patrol_y })
      end
    end
  end
  
  def ct_bot_rescue_hostages(bot)
    # CT bots try to rescue hostages
    nearest_hostage = find_nearest_available_hostage(bot)
    
    if nearest_hostage
      distance = calculate_distance(bot, nearest_hostage)
      
      if distance < 80 && !nearest_hostage[:being_rescued]
        # Start rescuing hostage
        if start_hostage_rescue(bot[:id], nearest_hostage[:id])
          bot[:state] = 'escorting_hostage'
          bot[:escorting_hostage] = nearest_hostage[:id]
          Console.info(self, "Bot #{bot[:name]} started rescuing hostage #{nearest_hostage[:id]}")
        end
      else
        # Move towards hostage
        enemy = find_nearest_enemy(bot)
        if enemy && calculate_distance(bot, enemy) < 150
          bot[:state] = 'attacking'
          bot_attack(bot)
        else
          move_bot_towards_position(bot, nearest_hostage)
        end
      end
    else
      # No hostages to rescue, patrol or attack enemies
      enemy = find_nearest_enemy(bot)
      if enemy
        bot[:state] = 'attacking'
        bot_attack(bot)
      else
        bot[:state] = 'roaming'
        bot_roam(bot)
      end
    end
  end
  
  def ct_bot_escort_hostage(bot)
    # CT bot escorts rescued hostage to rescue zone
    hostage_id = bot[:escorting_hostage]
    hostage = @game_state[:hostages][hostage_id]
    
    unless hostage && hostage[:being_rescued] && hostage[:rescuer] == bot[:id]
      # Hostage not being escorted anymore
      bot[:state] = 'rescuing_hostages'
      bot[:escorting_hostage] = nil
      return
    end
    
    # Move towards rescue zone
    map_data = get_current_map_data
    rescue_zone = map_data[:rescue_zones]&.first
    return ct_bot_rescue_hostages(bot) unless rescue_zone
    
    # Check for enemies while escorting
    enemy = find_nearest_enemy(bot)
    if enemy && calculate_distance(bot, enemy) < 100
      # Defend the hostage
      bot_attack(bot)
    else
      # Move towards rescue zone
      distance_to_zone = Math.sqrt((bot[:x] - rescue_zone[:x])**2 + (bot[:y] - rescue_zone[:y])**2)
      
      if distance_to_zone > 50
        move_bot_towards_position(bot, rescue_zone)
      else
        # Wait at rescue zone for hostage to catch up
        hostage_distance = calculate_distance(bot, hostage)
        if hostage_distance > HOSTAGE_FOLLOW_DISTANCE + 20
          # Move a bit closer to hostage if too far
          angle = Math.atan2(hostage[:y] - bot[:y], hostage[:x] - bot[:x])
          new_x = bot[:x] + Math.cos(angle) * 10
          new_y = bot[:y] + Math.sin(angle) * 10
          apply_bot_movement(bot, new_x, new_y)
        end
      end
    end
  end
  
  def find_nearest_hostage(bot)
    return nil unless @game_state[:hostages]
    
    nearest = nil
    min_distance = Float::INFINITY
    
    @game_state[:hostages].each do |id, hostage|
      next if hostage[:rescued] || hostage[:health] <= 0
      
      distance = calculate_distance(bot, hostage)
      if distance < min_distance
        min_distance = distance
        nearest = hostage
      end
    end
    
    nearest
  end
  
  def find_nearest_available_hostage(bot)
    return nil unless @game_state[:hostages]
    
    nearest = nil
    min_distance = Float::INFINITY
    
    @game_state[:hostages].each do |id, hostage|
      next if hostage[:rescued] || hostage[:health] <= 0 || hostage[:being_rescued]
      
      distance = calculate_distance(bot, hostage)
      if distance < min_distance
        min_distance = distance
        nearest = hostage
      end
    end
    
    nearest
  end
  
  def calculate_hostage_area_center
    return { x: 640, y: 360 } if @game_state[:hostages].empty?
    
    total_x = 0
    total_y = 0
    count = 0
    
    @game_state[:hostages].each do |id, hostage|
      next if hostage[:rescued] || hostage[:health] <= 0
      total_x += hostage[:x]
      total_y += hostage[:y]
      count += 1
    end
    
    return { x: 640, y: 360 } if count == 0
    
    { x: total_x / count, y: total_y / count }
  end
  
  def calculate_distance(entity1, entity2)
    Math.sqrt((entity1[:x] - entity2[:x])**2 + (entity1[:y] - entity2[:y])**2)
  end

  def can_move_to_position(x, y)
    # Check wall collisions for hostage movement
    !check_wall_collision(x, y, 12) # Hostages have smaller collision radius
  end
  
  def calculate_throw_power(bot, target)
    distance = calculate_distance(bot, target)
    # Adjust power based on distance (0.8 to 1.2)
    [0.8 + (distance / 400.0) * 0.4, 1.2].min
  end
  
  def use_tactical_grenade(bot, target)
    return unless bot[:grenades] && bot[:grenades].any?
    
    # Limit grenade usage frequency
    bot[:last_grenade_throw] ||= 0
    return if Time.now.to_f - bot[:last_grenade_throw] < 10.0
    
    distance = calculate_distance(bot, target)
    
    # Use flashbang for medium range engagements
    if distance > 150 && distance < 300 && bot[:grenades].include?('flashbang')
      if rand < 0.3 # 30% chance
        throw_bot_grenade(bot, 'flashbang', { x: target[:x], y: target[:y] })
        bot[:last_grenade_throw] = Time.now.to_f
      end
    end
  end
  
  def create_grenade_physics(player, grenade_type, angle, power, cook_time)
    # Calculate initial velocity based on angle and power
    base_velocity = 400 * power # Base throw velocity
    
    # Convert angle to velocity components
    vx = Math.cos(angle) * base_velocity
    vy = Math.sin(angle) * base_velocity
    
    # Determine timer based on grenade type and cooking
    base_timer = case grenade_type
                 when 'flashbang' then 1.5
                 when 'hegrenade' then 4.0
                 when 'smokegrenade' then 2.0
                 end
    
    timer = [base_timer - cook_time, 0.1].max # Minimum 0.1s to prevent instant explosion
    
    grenade = {
      id: SecureRandom.hex(8),
      type: grenade_type,
      x: player[:x] + Math.cos(angle) * 25, # Start in front of player
      y: player[:y] + Math.sin(angle) * 25,
      vx: vx,
      vy: vy,
      timer: timer,
      owner_id: @player_id,
      owner_team: player[:team],
      bounces: 0,
      max_bounces: grenade_type == 'smokegrenade' ? 2 : 3,
      gravity: 200, # pixels/second^2
      friction: 0.95,
      bounce_damping: 0.6,
      rotation: 0,
      angular_velocity: rand(-10..10),
      trail_points: [],
      last_sound_time: 0
    }
    
    @game_state[:grenades] << grenade
  end
  
  def update_grenades
    dt = 0.05 # 20 FPS update rate
    current_map = get_current_map_data
    
    @game_state[:grenades].each do |grenade|
      # Store previous position for collision detection
      prev_x = grenade[:x]
      prev_y = grenade[:y]
      
      # Apply gravity
      grenade[:vy] += grenade[:gravity] * dt
      
      # Update position
      grenade[:x] += grenade[:vx] * dt
      grenade[:y] += grenade[:vy] * dt
      
      # Update rotation
      grenade[:rotation] += grenade[:angular_velocity] * dt
      
      # Add trail point for visual effect
      grenade[:trail_points] << { x: grenade[:x], y: grenade[:y], time: Time.now.to_f }
      grenade[:trail_points].select! { |p| Time.now.to_f - p[:time] < 0.5 } # Keep 0.5s of trail
      
      # Wall collision detection and bouncing
      if current_map
        handle_grenade_collisions(grenade, current_map, prev_x, prev_y)
      else
        # Basic boundary collision if no map data
        handle_basic_boundaries(grenade)
      end
      
      # Apply friction when rolling on ground
      if grenade[:vy].abs < 50 # Consider on ground if vertical velocity is low
        grenade[:vx] *= grenade[:friction]
        grenade[:angular_velocity] *= 0.9
      end
      
      # Play bounce sound
      if Time.now.to_f - grenade[:last_sound_time] > 0.2 && grenade[:bounces] > 0
        play_sound('grenade_bounce')
        grenade[:last_sound_time] = Time.now.to_f
      end
      
      # Update timer
      grenade[:timer] -= dt
      
      # Explode when timer expires
      if grenade[:timer] <= 0
        explode_grenade(grenade)
        @game_state[:grenades].delete(grenade)
      end
    end
    
    # Remove old grenades that might be stuck
    @game_state[:grenades].select! { |g| g[:timer] > -10 }
  end
  
  def handle_grenade_collisions(grenade, map_data, prev_x, prev_y)
    # Check collision with walls
    map_data[:walls].each do |wall|
      if line_intersects_rect?(prev_x, prev_y, grenade[:x], grenade[:y], wall)
        # Determine collision normal
        normal = get_wall_normal(grenade, wall, prev_x, prev_y)
        
        # Reflect velocity
        dot_product = grenade[:vx] * normal[:x] + grenade[:vy] * normal[:y]
        grenade[:vx] -= 2 * dot_product * normal[:x]
        grenade[:vy] -= 2 * dot_product * normal[:y]
        
        # Apply bounce damping
        grenade[:vx] *= grenade[:bounce_damping]
        grenade[:vy] *= grenade[:bounce_damping]
        
        # Move grenade out of wall
        grenade[:x] = prev_x + normal[:x] * 5
        grenade[:y] = prev_y + normal[:y] * 5
        
        # Increment bounce counter
        grenade[:bounces] += 1
        
        # Update angular velocity based on bounce
        grenade[:angular_velocity] = rand(-15..15)
        
        break # Only handle one collision per frame
      end
    end
  end
  
  def handle_basic_boundaries(grenade)
    map_bounds = { width: 1280, height: 720 }
    
    # Left/right boundaries
    if grenade[:x] < 0 || grenade[:x] > map_bounds[:width]
      grenade[:vx] *= -grenade[:bounce_damping]
      grenade[:x] = grenade[:x] < 0 ? 0 : map_bounds[:width]
      grenade[:bounces] += 1
    end
    
    # Top/bottom boundaries
    if grenade[:y] < 0 || grenade[:y] > map_bounds[:height]
      grenade[:vy] *= -grenade[:bounce_damping]
      grenade[:y] = grenade[:y] < 0 ? 0 : map_bounds[:height]
      grenade[:bounces] += 1
    end
  end
  
  def line_intersects_rect?(x1, y1, x2, y2, rect)
    # Simple AABB line intersection test
    return false if x2 < rect[:x] || x1 > rect[:x] + rect[:width]
    return false if y2 < rect[:y] || y1 > rect[:y] + rect[:height]
    true
  end
  
  def get_wall_normal(grenade, wall, prev_x, prev_y)
    # Determine which side of the wall was hit
    center_x = wall[:x] + wall[:width] / 2
    center_y = wall[:y] + wall[:height] / 2
    
    dx = grenade[:x] - center_x
    dy = grenade[:y] - center_y
    
    # Determine predominant direction
    if dx.abs > dy.abs
      # Horizontal collision
      { x: dx > 0 ? 1 : -1, y: 0 }
    else
      # Vertical collision
      { x: 0, y: dy > 0 ? 1 : -1 }
    end
  end
  
  def explode_grenade(grenade)
    case grenade[:type]
    when 'flashbang'
      apply_enhanced_flashbang_effect(grenade)
    when 'hegrenade'
      apply_enhanced_he_damage(grenade)
    when 'smokegrenade'
      apply_enhanced_smoke_effect(grenade)
    end
    
    # Create explosion visual effect
    create_explosion_effect(grenade[:x], grenade[:y], grenade[:type])
    
    # Play explosion sound
    play_sound("#{grenade[:type]}_explode")
  end
  
  def has_line_of_sight?(x1, y1, x2, y2)
    # Check if there are any walls blocking the line of sight
    current_map = get_current_map_data
    return true unless current_map
    
    # Simple line-wall intersection test
    current_map[:walls].each do |wall|
      if line_intersects_rect?(x1, y1, x2, y2, wall)
        return false
      end
    end
    
    true
  end
  
  def update_smoke_clouds
    dt = 0.05
    @game_state[:smoke_clouds] ||= []
    
    @game_state[:smoke_clouds].each do |smoke|
      smoke[:age] += dt
      
      # Expansion phase (first 2 seconds)
      if smoke[:age] < 2.0 && smoke[:radius] < smoke[:max_radius]
        smoke[:radius] += smoke[:expansion_rate] * dt
        smoke[:density] = [smoke[:density] + 0.3 * dt, smoke[:max_density]].min
      end
      
      # Stable phase
      if smoke[:age] >= 2.0 && smoke[:age] < smoke[:fade_start]
        smoke[:density] = smoke[:max_density]
      end
      
      # Fade phase
      if smoke[:age] >= smoke[:fade_start]
        fade_progress = (smoke[:age] - smoke[:fade_start]) / (smoke[:duration] - smoke[:fade_start])
        smoke[:density] = smoke[:max_density] * (1 - fade_progress)
      end
    end
    
    # Remove expired smoke clouds
    @game_state[:smoke_clouds].select! { |smoke| smoke[:age] < smoke[:duration] }
  end
  
  def update_flash_effects
    current_time = Time.now.to_f
    
    # Update player flash effects
    @game_state[:players].each do |id, player|
      if player[:flash_end_time] && current_time < player[:flash_end_time]
        # Calculate remaining flash intensity (gradual recovery)
        time_remaining = player[:flash_end_time] - current_time
        total_duration = 4.0 # Assume max duration for calculation
        recovery_progress = 1.0 - (time_remaining / total_duration)
        
        # Non-linear recovery (slower at first, faster later)
        current_intensity = player[:flash_intensity] * (1.0 - recovery_progress ** 1.5)
        
        # Send update to client
        if id == @player_id
          self.script("window.game && window.game.updateFlashEffect(#{current_intensity});")
        end
      else
        # Clear flash effect
        player[:flash_end_time] = nil
        player[:flash_intensity] = 0
        if id == @player_id
          self.script("window.game && window.game.updateFlashEffect(0);")
        end
      end
    end
    
    # Update bot flash effects
    @game_state[:bots].each do |id, bot|
      if bot[:flash_end_time] && current_time >= bot[:flash_end_time]
        bot[:flash_end_time] = nil
        bot[:flash_intensity] = 0
      end
    end
  end
  
  def is_vision_blocked_by_smoke?(x1, y1, x2, y2)
    @game_state[:smoke_clouds] ||= []
    
    @game_state[:smoke_clouds].each do |smoke|
      # Check if line of sight passes through smoke cloud
      if line_passes_through_circle?(x1, y1, x2, y2, smoke[:x], smoke[:y], smoke[:radius])
        # Consider density - higher density = more blocking
        if smoke[:density] > 0.5
          return true
        end
      end
    end
    
    false
  end
  
  def line_passes_through_circle?(x1, y1, x2, y2, cx, cy, radius)
    # Calculate distance from circle center to line segment
    dx = x2 - x1
    dy = y2 - y1
    
    # Vector from line start to circle center
    fx = x1 - cx
    fy = y1 - cy
    
    # Quadratic formula components
    a = dx * dx + dy * dy
    b = 2 * (fx * dx + fy * dy)
    c = (fx * fx + fy * fy) - radius * radius
    
    discriminant = b * b - 4 * a * c
    
    return discriminant >= 0
  end
  
  def create_explosion_effect(x, y, type)
    effect_size = case type
                  when 'flashbang' then 40
                  when 'hegrenade' then 60
                  when 'smokegrenade' then 30
                  else 40
                  end
    
    self.script("window.game && window.game.createExplosionEffect(#{x}, #{y}, #{effect_size}, '#{type}');")
  end
  
  def check_defuse_progress
    return unless @game_state[:defusing_player] && @game_state[:defuse_start_time]
    
    player = @game_state[:players][@game_state[:defusing_player]]
    return unless player && player[:alive]
    
    defuse_time = player[:has_defuse_kit] ? 2.5 : DEFUSE_TIME
    elapsed = Time.now - @game_state[:defuse_start_time]
    
    if elapsed >= defuse_time
      # Defuse complete
      @game_state[:bomb_planted] = false
      @game_state[:bomb_timer] = nil
      @game_state[:defusing_player] = nil
      @game_state[:defuse_start_time] = nil
      
      add_to_kill_feed("#{player[:name]} defused the bomb!")
      player[:money] += 300
      end_round('ct')
    end
  end
  
  def check_weapon_pickups
    player = @game_state[:players][@player_id]
    return unless player && player[:alive]
    
    @game_state[:dropped_weapons].each do |weapon|
      dist = calculate_distance(player, weapon)
      if dist < 30
        # Pick up weapon
        if !player[:weapons].include?(weapon[:weapon])
          player[:weapons] << weapon[:weapon]
          player[:ammo][weapon[:weapon]] = weapon[:ammo]
          player[:reserve_ammo][weapon[:weapon]] = weapon[:reserve]
          player[:current_weapon] = weapon[:weapon]
          @game_state[:dropped_weapons].delete(weapon)
          play_sound('pickup')
        end
      end
    end
  end
  
  def send_message(message)
    self.script("window.game && window.game.receiveMessage(#{message.to_json});")
  end
  
  def render(builder)
    Console.info(self, "CS2D render method called - rendering complete game interface")
    
    # Game styles
    builder.tag(:style, type: "text/css") do
      builder.raw(<<~CSS)
        html, body {
          margin: 0;
          padding: 0;
          background: #111;
          color: white;
          font-family: Arial, sans-serif;
          overflow: hidden;
        }
        
        .game-container {
          width: 100vw;
          height: 100vh;
          position: relative;
          background: linear-gradient(135deg, #1a1a1a, #2a2a2a);
        }
        
        .game-canvas {
          display: block;
          margin: 0 auto;
          background: #333;
          border: 2px solid #555;
        }
        
        .game-hud {
          position: absolute;
          bottom: 20px;
          left: 20px;
          right: 20px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: rgba(0,0,0,0.8);
          padding: 15px;
          border-radius: 10px;
        }
        
        .game-info {
          position: absolute;
          top: 20px;
          left: 20px;
          right: 20px;
          text-align: center;
          color: #00ff41;
          font-size: 24px;
          font-weight: bold;
        }
        
        .connection-status {
          position: absolute;
          top: 60px;
          right: 20px;
          background: #00aa00;
          color: white;
          padding: 10px;
          border-radius: 5px;
          font-size: 14px;
        }
        
        .controls {
          position: absolute;
          bottom: 80px;
          left: 20px;
          color: #ccc;
          font-size: 14px;
        }
      CSS
    end
    
    # Game container
    builder.tag(:div, class: "game-container") do
      # Game title
      builder.tag(:div, class: "game-info") do
        builder.text("CS2D - Counter-Strike 2D")
      end
      
      # Connection status
      builder.tag(:div, class: "connection-status") do
        builder.text("✓ WebSocket Connected")
      end
      
      # Game canvas
      builder.tag(:canvas, class: "game-canvas", id: "gameCanvas", width: 1280, height: 720, 
                 style: "margin-top: 80px;", tabindex: 0)
      
      # Controls info
      builder.tag(:div, class: "controls") do
        builder.text("Controls: WASD to move, Mouse to aim, Click to shoot")
      end
      
      # HUD
      builder.tag(:div, class: "game-hud") do
        builder.tag(:div) do
          builder.text("Health: ")
          builder.tag(:span, id: "health", style: "color: #ff4444;") { builder.text("100") }
        end
        builder.tag(:div) do
          builder.text("Player: ")
          builder.tag(:span, id: "playerName", style: "color: #44ff44;") do
            builder.text(@game_state&.dig(:players, @player_id, :name) || "Player")
          end
        end
        builder.tag(:div) do
          builder.text("Score: CT ")
          builder.tag(:span, id: "ctScore", style: "color: #4488ff;") do
            builder.text(@game_state&.[](:ct_score) || 0)
          end
          builder.text(" - ")
          builder.tag(:span, id: "tScore", style: "color: #ff8844;") do
            builder.text(@game_state&.[](:t_score) || 0)
          end
          builder.text(" T")
        end
      end
    end
    
    # Game JavaScript
    builder.tag(:script, type: "text/javascript") do
      builder.raw(<<~JS)
        console.log('CS2D: Initializing game...');
        
        class CS2DGame {
          constructor() {
            this.canvas = document.getElementById('gameCanvas');
            this.ctx = this.canvas.getContext('2d');
            this.player = {
              x: 640,
              y: 360,
              angle: 0,
              health: 100
            };
            this.keys = {};
            this.mouse = { x: 0, y: 0 };
            
            this.setupInput();
            this.gameLoop();
            
            console.log('CS2D: Game initialized successfully');
          }
          
          setupInput() {
            // Keyboard input
            document.addEventListener('keydown', (e) => {
              this.keys[e.key.toLowerCase()] = true;
              console.log('Key pressed:', e.key);
            });
            
            document.addEventListener('keyup', (e) => {
              this.keys[e.key.toLowerCase()] = false;
            });
            
            // Mouse input
            this.canvas.addEventListener('mousemove', (e) => {
              const rect = this.canvas.getBoundingClientRect();
              this.mouse.x = e.clientX - rect.left;
              this.mouse.y = e.clientY - rect.top;
            });
            
            this.canvas.addEventListener('click', (e) => {
              console.log('Mouse clicked at:', this.mouse.x, this.mouse.y);
              this.shoot();
            });
            
            // Focus canvas for input
            this.canvas.focus();
          }
          
          update() {
            // Handle movement
            const speed = 3;
            if (this.keys['w'] || this.keys['arrowup']) {
              this.player.y = Math.max(20, this.player.y - speed);
            }
            if (this.keys['s'] || this.keys['arrowdown']) {
              this.player.y = Math.min(this.canvas.height - 20, this.player.y + speed);
            }
            if (this.keys['a'] || this.keys['arrowleft']) {
              this.player.x = Math.max(20, this.player.x - speed);
            }
            if (this.keys['d'] || this.keys['arrowright']) {
              this.player.x = Math.min(this.canvas.width - 20, this.player.x + speed);
            }
            
            // Update player angle based on mouse
            const dx = this.mouse.x - this.player.x;
            const dy = this.mouse.y - this.player.y;
            this.player.angle = Math.atan2(dy, dx);
          }
          
          shoot() {
            // Simple shooting feedback
            console.log('BANG! Shot fired');
            
            // Visual effect
            this.ctx.save();
            this.ctx.translate(this.player.x, this.player.y);
            this.ctx.rotate(this.player.angle);
            this.ctx.strokeStyle = '#ffff00';
            this.ctx.lineWidth = 3;
            this.ctx.beginPath();
            this.ctx.moveTo(0, 0);
            this.ctx.lineTo(50, 0);
            this.ctx.stroke();
            this.ctx.restore();
          }
          
          render() {
            // Clear canvas
            this.ctx.fillStyle = '#2a4a2a';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            
            // Draw grid
            this.ctx.strokeStyle = '#333';
            this.ctx.lineWidth = 1;
            for (let x = 0; x < this.canvas.width; x += 50) {
              this.ctx.beginPath();
              this.ctx.moveTo(x, 0);
              this.ctx.lineTo(x, this.canvas.height);
              this.ctx.stroke();
            }
            for (let y = 0; y < this.canvas.height; y += 50) {
              this.ctx.beginPath();
              this.ctx.moveTo(0, y);
              this.ctx.lineTo(this.canvas.width, y);
              this.ctx.stroke();
            }
            
            // Draw player
            this.ctx.save();
            this.ctx.translate(this.player.x, this.player.y);
            this.ctx.rotate(this.player.angle);
            
            // Player body
            this.ctx.fillStyle = '#4CAF50';
            this.ctx.fillRect(-15, -10, 30, 20);
            
            // Player weapon
            this.ctx.fillStyle = '#8B4513';
            this.ctx.fillRect(15, -2, 25, 4);
            
            // Player direction indicator
            this.ctx.fillStyle = '#ff0000';
            this.ctx.fillRect(15, -1, 3, 2);
            
            this.ctx.restore();
            
            // Draw crosshair at mouse position
            this.ctx.strokeStyle = '#ff0000';
            this.ctx.lineWidth = 2;
            this.ctx.beginPath();
            this.ctx.moveTo(this.mouse.x - 10, this.mouse.y);
            this.ctx.lineTo(this.mouse.x + 10, this.mouse.y);
            this.ctx.moveTo(this.mouse.x, this.mouse.y - 10);
            this.ctx.lineTo(this.mouse.x, this.mouse.y + 10);
            this.ctx.stroke();
            
            // Draw UI text
            this.ctx.fillStyle = '#ffffff';
            this.ctx.font = '16px Arial';
            this.ctx.fillText(`Position: (${Math.round(this.player.x)}, ${Math.round(this.player.y)})`, 10, 30);
            this.ctx.fillText(`Angle: ${Math.round(this.player.angle * 180 / Math.PI)}°`, 10, 50);
            this.ctx.fillText(`Mouse: (${Math.round(this.mouse.x)}, ${Math.round(this.mouse.y)})`, 10, 70);
          }
          
          gameLoop() {
            this.update();
            this.render();
            requestAnimationFrame(() => this.gameLoop());
          }
        }
        
        // Start game when page loads
        window.addEventListener('load', () => {
          console.log('CS2D: Page loaded, starting game...');
          window.game = new CS2DGame();
        });
        
        // Also start immediately if already loaded
        if (document.readyState === 'complete') {
          console.log('CS2D: Document ready, starting game immediately...');
          window.game = new CS2DGame();
        }
      JS
    end
    
    Console.info(self, "CS2D render completed - full game interface sent")
  end
  
  def render_simplified_game_scripts(builder)
    Console.info(self, "Rendering simplified CS2D game scripts...")
    
    builder.tag(:script, type: "text/javascript") do
      builder.raw(<<~JS)
        console.log('=== CS2D: SIMPLIFIED GAME SCRIPTS LOADING ===');
        
        // Basic game initialization
        window.CS2DGame = class {
          constructor(viewId, playerId) {
            this.viewId = viewId;
            this.playerId = playerId;
            this.running = false;
            this.canvas = document.getElementById('game-canvas');
            this.ctx = this.canvas ? this.canvas.getContext('2d') : null;
            console.log('CS2D: Game instance created', {viewId, playerId});
            
            if (this.ctx) {
              this.initializeGame();
            }
          }
          
          initializeGame() {
            console.log('CS2D: Initializing basic game...');
            this.running = true;
            
            // Draw initial game state
            this.ctx.fillStyle = '#1a3d1a';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            
            // Draw title
            this.ctx.fillStyle = '#00ff41';
            this.ctx.font = 'bold 64px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('CS2D', this.canvas.width/2, 200);
            
            // Draw status
            this.ctx.fillStyle = '#ffffff';
            this.ctx.font = '24px Arial';
            this.ctx.fillText('Game Initialized Successfully!', this.canvas.width/2, 300);
            this.ctx.fillText('Use WASD to move, Mouse to aim', this.canvas.width/2, 350);
            this.ctx.fillText('Click to shoot (when implemented)', this.canvas.width/2, 400);
            
            // Draw simple player representation
            this.playerX = this.canvas.width / 2;
            this.playerY = this.canvas.height / 2;
            this.drawPlayer();
            
            // Setup basic input handling
            this.setupInput();
            
            console.log('CS2D: Basic game initialized successfully');
          }
          
          drawPlayer() {
            // Draw player as a simple colored circle
            this.ctx.fillStyle = '#4CAF50';
            this.ctx.beginPath();
            this.ctx.arc(this.playerX, this.playerY, 20, 0, 2 * Math.PI);
            this.ctx.fill();
            
            // Draw player indicator
            this.ctx.fillStyle = '#ffffff';
            this.ctx.font = '12px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('YOU', this.playerX, this.playerY + 5);
          }
          
          setupInput() {
            const keys = {};
            
            window.addEventListener('keydown', (e) => {
              keys[e.key.toLowerCase()] = true;
              this.handleInput(keys);
            });
            
            window.addEventListener('keyup', (e) => {
              keys[e.key.toLowerCase()] = false;
            });
            
            console.log('CS2D: Input handling setup complete');
          }
          
          handleInput(keys) {
            let moved = false;
            const speed = 5;
            
            if (keys['w'] || keys['arrowup']) {
              this.playerY = Math.max(30, this.playerY - speed);
              moved = true;
            }
            if (keys['s'] || keys['arrowdown']) {
              this.playerY = Math.min(this.canvas.height - 30, this.playerY + speed);
              moved = true;
            }
            if (keys['a'] || keys['arrowleft']) {
              this.playerX = Math.max(30, this.playerX - speed);
              moved = true;
            }
            if (keys['d'] || keys['arrowright']) {
              this.playerX = Math.min(this.canvas.width - 30, this.playerX + speed);
              moved = true;
            }
            
            if (moved) {
              // Redraw the scene
              this.ctx.fillStyle = '#1a3d1a';
              this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
              
              // Redraw title (smaller)
              this.ctx.fillStyle = '#00ff41';
              this.ctx.font = 'bold 32px Arial';
              this.ctx.textAlign = 'center';
              this.ctx.fillText('CS2D - Basic Movement Test', this.canvas.width/2, 50);
              
              // Draw player at new position
              this.drawPlayer();
              
              console.log('Player moved to:', this.playerX, this.playerY);
            }
          }
        };
        
        // Initialize game when ready
        window.initCS2DGame = function(viewId, playerId) {
          console.log('initCS2DGame called with:', viewId, playerId);
          try {
            window.game = new CS2DGame(viewId, playerId);
            console.log('CS2D: Game initialized successfully');
            return true;
          } catch (error) {
            console.error('CS2D: Game initialization failed:', error);
            return false;
          }
        };
        
        // Auto-initialize after a short delay
        setTimeout(() => {
          console.log('CS2D: Auto-initializing game...');
          const container = document.getElementById('cs2d-container');
          const viewId = container ? container.dataset.live || '#{@id}' : '#{@id}';
          initCS2DGame(viewId, '#{@player_id}');
        }, 1000);
        
        console.log('=== CS2D: SIMPLIFIED SCRIPTS LOADED ===');
      JS
    end
  end
  
  def render_simple_test(builder)
    script_content = %{
      console.log('SIMPLE TEST: Immediate execution');
      document.body.style.backgroundColor = '#333';
      
      window.addEventListener('DOMContentLoaded', function() {
        console.log('SIMPLE TEST: DOM ready');
        var canvas = document.getElementById('game-canvas');
        if (canvas) {
          var ctx = canvas.getContext('2d');
          ctx.fillStyle = '#fff';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.fillStyle = '#f00';
          ctx.font = '60px Arial';
          ctx.fillText('CS2D LOADING', 400, 360);
        }
      });
    }
    
    builder.tag(:script, type: "text/javascript") do
      builder.raw(script_content)
    end
  end
  
  def render_game_container(builder)
    builder.tag(:div, id: "cs2d-container", data: { live: @id }, 
                style: "width: 100%; height: 100vh; margin: 0; padding: 0; overflow: hidden; background: #000; position: relative;") do
      # Game canvas
      builder.tag(:canvas, id: "game-canvas", width: 1280, height: 720,
                 style: "display: block; margin: 0 auto; cursor: crosshair;",
                 tabIndex: 0)
      
      # Game UI overlay
      builder.tag(:div, id: "game-ui", style: "position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none;") do
        render_hud(builder)
        render_kill_feed(builder)
        render_buy_menu(builder)
        render_scoreboard(builder)
        render_chat(builder)
        render_spectator_ui(builder)
        render_map_voting_ui(builder)
        render_admin_panel(builder)
      end
    end
  end
  
  def render_hud(builder)
    # Top HUD - Round info and scores
    builder.tag(:div, style: "position: absolute; top: 0; left: 0; right: 0; height: 80px; background: linear-gradient(to bottom, rgba(0,0,0,0.8), transparent); display: flex; justify-content: space-between; align-items: center; padding: 10px 20px;") do
      # Team scores
      builder.tag(:div, style: "display: flex; gap: 20px; font-family: 'Arial', sans-serif;") do
        builder.tag(:div, id: "ct-score", style: "color: #5B9BD5; font-size: 32px; font-weight: bold;") { builder.text("CT: #{@game_state[:ct_score]}") }
        builder.tag(:div, style: "color: white; font-size: 32px;") { builder.text("-") }
        builder.tag(:div, id: "t-score", style: "color: #FFA500; font-size: 32px; font-weight: bold;") { builder.text("T: #{@game_state[:t_score]}") }
      end
      
      # Round timer
      builder.tag(:div, id: "round-timer", style: "font-size: 36px; font-weight: bold; color: white; font-family: 'monospace';") do
        minutes = @game_state[:round_time] / 60
        seconds = @game_state[:round_time] % 60
        builder.text(sprintf("%d:%02d", minutes, seconds))
      end
      
      # Round info and hostage status
      builder.tag(:div, style: "text-align: right; color: white; font-family: 'Arial', sans-serif;") do
        builder.tag(:div, id: "round-number", style: "font-size: 18px;") { builder.text("Round #{@game_state[:round]}") }
        builder.tag(:div, id: "game-phase", style: "font-size: 14px; color: #aaa;") { builder.text(@game_state[:phase].capitalize.gsub('_', ' ')) }
        
        # Hostage status for hostage rescue mode
        if is_hostage_rescue_mode?
          builder.tag(:div, id: "hostage-status", style: "margin-top: 5px;") do
            total_hostages = @game_state[:hostages]&.length || 0
            rescued = @game_state[:hostages_rescued] || 0
            remaining = @game_state[:hostages_remaining] || 0
            
            builder.tag(:div, style: "display: flex; align-items: center; gap: 5px; justify-content: flex-end;") do
              builder.tag(:div, style: "width: 16px; height: 16px; background: url('/_static/hostage_icon.png') center/contain no-repeat;")
              builder.tag(:div, style: "font-size: 16px; color: #90EE90;") { builder.text("Rescued: #{rescued}") }
            end
            builder.tag(:div, style: "display: flex; align-items: center; gap: 5px; justify-content: flex-end;") do
              builder.tag(:div, style: "width: 16px; height: 16px; background: url('/_static/hostage_icon.png') center/contain no-repeat; filter: sepia(1) hue-rotate(25deg);")
              builder.tag(:div, style: "font-size: 16px; color: #FFB347;") { builder.text("Remaining: #{remaining}") }
            end
          end
        end
      end
    end
    
    # Bottom HUD - Player stats
    builder.tag(:div, style: "position: absolute; bottom: 0; left: 0; right: 0; height: 120px; background: linear-gradient(to top, rgba(0,0,0,0.8), transparent); display: flex; justify-content: space-between; align-items: flex-end; padding: 20px;") do
      # Health and armor
      builder.tag(:div, style: "display: flex; flex-direction: column; gap: 5px;") do
        builder.tag(:div, style: "display: flex; align-items: center; gap: 10px;") do
          builder.tag(:div, style: "width: 40px; height: 40px; background: url('/_static/health_icon.png') center/contain no-repeat;")
          builder.tag(:div, style: "width: 200px; height: 30px; background: rgba(0,0,0,0.5); border: 2px solid #333; position: relative;") do
            builder.tag(:div, id: "health-bar", style: "height: 100%; width: 100%; background: linear-gradient(to right, #ff0000, #ff6666);")
            builder.tag(:div, id: "health-text", style: "position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); color: white; font-weight: bold;") { builder.text("100") }
          end
        end
        
        builder.tag(:div, style: "display: flex; align-items: center; gap: 10px;") do
          builder.tag(:div, style: "width: 40px; height: 40px; background: url('/_static/armor_icon.png') center/contain no-repeat;")
          builder.tag(:div, style: "width: 200px; height: 30px; background: rgba(0,0,0,0.5); border: 2px solid #333; position: relative;") do
            builder.tag(:div, id: "armor-bar", style: "height: 100%; width: 0%; background: linear-gradient(to right, #4444ff, #6666ff);")
            builder.tag(:div, id: "armor-text", style: "position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); color: white; font-weight: bold;") { builder.text("0") }
          end
        end
      end
      
      # Weapon and ammo
      builder.tag(:div, style: "display: flex; flex-direction: column; align-items: center; gap: 5px;") do
        builder.tag(:div, id: "weapon-icon", style: "width: 120px; height: 60px; background: url('/_static/weapons/usp.png') center/contain no-repeat;")
        builder.tag(:div, id: "weapon-name", style: "color: white; font-size: 18px; font-weight: bold;") { builder.text("USP") }
        builder.tag(:div, id: "ammo-display", style: "color: white; font-size: 24px; font-family: monospace;") { builder.text("12 / 100") }
      end
      
      # Money and equipment
      builder.tag(:div, style: "display: flex; flex-direction: column; align-items: flex-end; gap: 5px;") do
        builder.tag(:div, id: "money", style: "color: #00ff00; font-size: 28px; font-weight: bold; font-family: monospace;") { builder.text("$800") }
        builder.tag(:div, id: "equipment", style: "display: flex; gap: 5px;") do
          # Grenade icons would go here
        end
      end
    end
  end
  
  def render_kill_feed(builder)
    builder.tag(:div, id: "kill-feed", style: "position: absolute; top: 100px; right: 20px; width: 300px; display: flex; flex-direction: column; gap: 5px; pointer-events: none;") do
      # Kill feed entries will be added dynamically
    end
  end
  
  def render_buy_menu(builder)
    builder.tag(:div, id: "buy-menu", style: "position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); background: rgba(0,0,0,0.95); border: 2px solid #444; padding: 20px; display: none; pointer-events: auto; min-width: 600px;") do
      builder.tag(:h2, style: "color: white; margin: 0 0 20px 0; text-align: center;") { builder.text("Buy Menu") }
      
      # Weapon categories
      builder.tag(:div, style: "display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px;") do
        # Pistols
        builder.tag(:div, class: "weapon-category") do
          builder.tag(:h3, style: "color: #aaa; margin: 0 0 10px 0;") { builder.text("Pistols") }
          render_weapon_list(builder, ['deagle'])
        end
        
        # Rifles
        builder.tag(:div, class: "weapon-category") do
          builder.tag(:h3, style: "color: #aaa; margin: 0 0 10px 0;") { builder.text("Rifles") }
          render_weapon_list(builder, ['ak47', 'm4a1', 'awp'])
        end
        
        # SMGs
        builder.tag(:div, class: "weapon-category") do
          builder.tag(:h3, style: "color: #aaa; margin: 0 0 10px 0;") { builder.text("SMGs") }
          render_weapon_list(builder, ['mp5', 'p90'])
        end
      end
      
      # Equipment
      builder.tag(:div, style: "margin-top: 20px; border-top: 1px solid #444; padding-top: 10px;") do
        builder.tag(:h3, style: "color: #aaa; margin: 0 0 10px 0;") { builder.text("Equipment") }
        render_weapon_list(builder, ['kevlar', 'kevlar_helmet', 'defuse_kit', 'flashbang', 'hegrenade', 'smokegrenade'])
      end
      
      builder.tag(:div, style: "text-align: center; margin-top: 20px; color: #888;") { builder.text("Press B to close") }
    end
  end
  
  def render_weapon_list(builder, weapons)
    builder.tag(:div, style: "display: flex; flex-direction: column; gap: 5px;") do
      weapons.each do |weapon_key|
        weapon = WEAPONS[weapon_key]
        builder.tag(:div, class: "weapon-item", "data-weapon": weapon_key,
                   style: "padding: 5px 10px; background: rgba(255,255,255,0.1); cursor: pointer; color: white; display: flex; justify-content: space-between;",
                   onmouseover: "this.style.background='rgba(255,255,255,0.2)'",
                   onmouseout: "this.style.background='rgba(255,255,255,0.1)'",
                   onclick: "window.game.buyWeapon('#{weapon_key}')") do
          builder.tag(:span) { builder.text(weapon[:name]) }
          builder.tag(:span, style: "color: #00ff00;") { builder.text("$#{weapon[:price]}") }
        end
      end
    end
  end
  
  def render_scoreboard(builder)
    builder.tag(:div, id: "scoreboard", style: "position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); background: rgba(0,0,0,0.95); padding: 20px; display: none; pointer-events: none; min-width: 800px;") do
      builder.tag(:h2, style: "color: white; text-align: center; margin: 0 0 20px 0;") { builder.text("Scoreboard") }
      
      builder.tag(:div, style: "display: flex; gap: 40px;") do
        # CT Team
        builder.tag(:div, style: "flex: 1;") do
          builder.tag(:h3, style: "color: #5B9BD5; margin: 0 0 10px 0;") { builder.text("Counter-Terrorists") }
          builder.tag(:table, id: "ct-scoreboard", style: "width: 100%; color: white;") do
            builder.tag(:thead) do
              builder.tag(:tr) do
                builder.tag(:th, style: "text-align: left;") { builder.text("Player") }
                builder.tag(:th, style: "text-align: center;") { builder.text("K") }
                builder.tag(:th, style: "text-align: center;") { builder.text("D") }
                builder.tag(:th, style: "text-align: center;") { builder.text("Score") }
              end
            end
            builder.tag(:tbody, id: "ct-players")
          end
        end
        
        # T Team
        builder.tag(:div, style: "flex: 1;") do
          builder.tag(:h3, style: "color: #FFA500; margin: 0 0 10px 0;") { builder.text("Terrorists") }
          builder.tag(:table, id: "t-scoreboard", style: "width: 100%; color: white;") do
            builder.tag(:thead) do
              builder.tag(:tr) do
                builder.tag(:th, style: "text-align: left;") { builder.text("Player") }
                builder.tag(:th, style: "text-align: center;") { builder.text("K") }
                builder.tag(:th, style: "text-align: center;") { builder.text("D") }
                builder.tag(:th, style: "text-align: center;") { builder.text("Score") }
              end
            end
            builder.tag(:tbody, id: "t-players")
          end
        end
      end
    end
  end
  
  def render_chat(builder)
    builder.tag(:div, id: "chat-container", style: "position: absolute; bottom: 140px; left: 20px; width: 400px; height: 200px; pointer-events: none;") do
      builder.tag(:div, id: "chat-messages", style: "height: 170px; overflow-y: auto; background: rgba(0,0,0,0.5); padding: 5px; display: none;")
      builder.tag(:input, id: "chat-input", type: "text", placeholder: "Press T to chat...",
                 style: "width: 100%; background: rgba(0,0,0,0.7); border: 1px solid #444; color: white; padding: 5px; display: none; pointer-events: auto;")
    end
  end
  
  def render_spectator_ui(builder)
    # Spectator overlay UI
    builder.tag(:div, id: "spectator-overlay", style: "position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); display: none; pointer-events: none;") do
      # Current spectator target info
      builder.tag(:div, id: "spectator-target-info", style: "background: rgba(0,0,0,0.8); padding: 15px; border: 2px solid #ff6600; text-align: center; font-family: 'Arial', sans-serif;") do
        builder.tag(:div, id: "spectator-status", style: "color: #ff6600; font-size: 16px; font-weight: bold; margin-bottom: 8px;") do
          builder.text("SPECTATING")
        end
        builder.tag(:div, id: "spectator-target-name", style: "color: white; font-size: 22px; font-weight: bold; margin-bottom: 8px;") do
          builder.text("Player Name")
        end
        builder.tag(:div, id: "spectator-target-stats", style: "color: #ccc; font-size: 14px; display: flex; justify-content: center; gap: 15px;") do
          builder.tag(:span, id: "spectator-target-health") { builder.text("100 HP") }
          builder.tag(:span, id: "spectator-target-armor") { builder.text("0 Armor") }
          builder.tag(:span, id: "spectator-target-money") { builder.text("$800") }
        end
      end
      
      # Spectator controls help
      builder.tag(:div, id: "spectator-controls", style: "background: rgba(0,0,0,0.7); padding: 10px; margin-top: 10px; text-align: center; font-size: 12px; color: #ccc;") do
        builder.text("← → : Switch Players | SPACE : Free Camera | F : Follow Mode")
      end
    end
    
    # Spectator list (top-right corner)
    builder.tag(:div, id: "spectator-list", style: "position: absolute; top: 20px; right: 20px; background: rgba(0,0,0,0.7); padding: 10px; min-width: 200px; display: none; pointer-events: none;") do
      builder.tag(:div, style: "color: #ff6600; font-size: 14px; font-weight: bold; margin-bottom: 8px; text-align: center;") do
        builder.text("SPECTATORS")
      end
      builder.tag(:div, id: "spectator-count", style: "color: white; font-size: 12px; text-align: center; margin-bottom: 8px;") do
        builder.text("0 watching")
      end
      builder.tag(:div, id: "spectator-names", style: "color: #ccc; font-size: 11px;") do
        # Spectator names will be added dynamically
      end
    end
    
    # Death message overlay
    builder.tag(:div, id: "death-overlay", style: "position: absolute; top: 30%; left: 50%; transform: translateX(-50%); display: none; pointer-events: none;") do
      builder.tag(:div, style: "background: rgba(255,0,0,0.9); padding: 20px; text-align: center; font-family: 'Arial', sans-serif; border: 3px solid #fff;") do
        builder.tag(:div, style: "color: white; font-size: 32px; font-weight: bold; margin-bottom: 10px;") do
          builder.text("YOU DIED")
        end
        builder.tag(:div, style: "color: #ccc; font-size: 16px;") do
          builder.text("Entering spectator mode...")
        end
      end
    end
  end
  
  def render_map_voting_ui(builder)
    # Map voting overlay
    builder.tag(:div, id: "map-vote-overlay", style: "position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); display: none; pointer-events: auto; z-index: 100;") do
      builder.tag(:div, style: "background: linear-gradient(135deg, rgba(0,0,0,0.95), rgba(20,20,20,0.95)); padding: 30px; border: 3px solid #ffd700; border-radius: 10px; min-width: 500px; box-shadow: 0 0 30px rgba(255,215,0,0.5);") do
        # Title
        builder.tag(:div, style: "color: #ffd700; font-size: 28px; font-weight: bold; text-align: center; margin-bottom: 20px; font-family: 'Arial', sans-serif; text-shadow: 2px 2px 4px rgba(0,0,0,0.8);") do
          builder.text("MAP VOTE")
        end
        
        # Current map info
        builder.tag(:div, id: "current-map-info", style: "text-align: center; margin-bottom: 20px; color: #ccc; font-size: 16px;") do
          current_map_name = MAPS[@game_state[:current_map]][:name] rescue "Unknown"
          builder.text("Current Map: #{current_map_name}")
        end
        
        # Vote options
        builder.tag(:div, id: "map-vote-options", style: "display: flex; flex-direction: column; gap: 15px; margin-bottom: 20px;") do
          # Vote options will be populated dynamically
        end
        
        # Vote timer
        builder.tag(:div, id: "vote-timer", style: "text-align: center; color: #ff6600; font-size: 20px; font-weight: bold; margin-bottom: 15px;") do
          builder.text("Time remaining: 20s")
        end
        
        # Vote counts
        builder.tag(:div, id: "vote-counts", style: "color: #ccc; font-size: 14px; text-align: center; margin-top: 15px;") do
          # Vote counts will be updated dynamically
        end
        
        # Instructions
        builder.tag(:div, style: "text-align: center; color: #888; font-size: 12px; margin-top: 20px; font-style: italic;") do
          builder.text("Click on a map to vote or press 1-3")
        end
      end
    end
    
    # Map change notification
    builder.tag(:div, id: "map-change-notification", style: "position: absolute; top: 20%; left: 50%; transform: translateX(-50%); display: none; pointer-events: none; z-index: 50;") do
      builder.tag(:div, style: "background: linear-gradient(135deg, rgba(0,100,0,0.9), rgba(0,150,0,0.9)); padding: 20px 40px; border: 2px solid #00ff00; border-radius: 8px; text-align: center; box-shadow: 0 0 20px rgba(0,255,0,0.4);") do
        builder.tag(:div, id: "map-change-text", style: "color: white; font-size: 24px; font-weight: bold; font-family: 'Arial', sans-serif; text-shadow: 2px 2px 4px rgba(0,0,0,0.8);") do
          builder.text("Loading new map...")
        end
      end
    end
  end
  
  def render_admin_panel(builder)
    # Only show admin panel for authenticated admins
    return unless is_admin?
    
    session = @game_state[:admin_sessions][@player_id]
    
    # Admin Panel Button
    builder.tag(:div, id: "admin-panel-button", style: "position: absolute; top: 90px; right: 20px; z-index: 200;") do
      builder.tag(:button, 
        onclick: "window.adminPanel ? window.adminPanel.toggle() : null",
        style: "background: linear-gradient(135deg, #ff6600, #ff4400); color: white; border: none; padding: 8px 16px; border-radius: 5px; font-weight: bold; cursor: pointer; font-size: 14px; box-shadow: 0 2px 10px rgba(255,100,0,0.3); transition: all 0.3s;"
      ) do
        builder.text("ADMIN")
      end
    end
    
    # Admin Panel Overlay
    builder.tag(:div, id: "admin-panel-overlay", style: "position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.7); display: none; z-index: 300; pointer-events: auto;") do
      builder.tag(:div, id: "admin-panel", style: "position: absolute; top: 10%; left: 10%; width: 80%; height: 80%; background: linear-gradient(135deg, rgba(20,20,20,0.98), rgba(40,40,40,0.98)); border: 3px solid #ff6600; border-radius: 15px; overflow: hidden; box-shadow: 0 0 50px rgba(255,100,0,0.4);") do
        
        # Admin Panel Header
        builder.tag(:div, style: "background: linear-gradient(135deg, #ff6600, #ff4400); padding: 15px 20px; color: white; font-size: 20px; font-weight: bold; display: flex; justify-content: space-between; align-items: center;") do
          builder.tag(:div) { builder.text("Admin Panel - #{session[:username]} (#{ADMIN_LEVELS[session[:level]]})") }
          builder.tag(:button,
            onclick: "window.adminPanel.close()",
            style: "background: rgba(255,255,255,0.2); border: none; color: white; padding: 5px 10px; border-radius: 3px; cursor: pointer; font-size: 18px;"
          ) { builder.text("×") }
        end
        
        # Admin Panel Content
        builder.tag(:div, style: "display: flex; height: calc(100% - 60px);") do
          
          # Left sidebar - Navigation
          builder.tag(:div, style: "width: 200px; background: rgba(0,0,0,0.3); border-right: 2px solid #ff6600;") do
            builder.tag(:div, style: "padding: 15px;") do
              render_admin_nav_button(builder, "Players", "players", session[:level] >= 1)
              render_admin_nav_button(builder, "Reports", "reports", session[:level] >= 1)
              render_admin_nav_button(builder, "Bans", "bans", session[:level] >= 1)
              render_admin_nav_button(builder, "Server Config", "config", session[:level] >= 3)
              render_admin_nav_button(builder, "Demo Recording", "demos", session[:level] >= 2)
              render_admin_nav_button(builder, "Anti-Cheat", "anticheat", session[:level] >= 2)
            end
          end
          
          # Main content area
          builder.tag(:div, style: "flex: 1; padding: 20px; overflow-y: auto;") do
            
            # Players Management Tab
            builder.tag(:div, id: "admin-tab-players", class: "admin-tab", style: "display: none;") do
              render_admin_players_tab(builder, session[:level])
            end
            
            # Reports Management Tab
            builder.tag(:div, id: "admin-tab-reports", class: "admin-tab", style: "display: none;") do
              render_admin_reports_tab(builder, session[:level])
            end
            
            # Bans Management Tab
            builder.tag(:div, id: "admin-tab-bans", class: "admin-tab", style: "display: none;") do
              render_admin_bans_tab(builder, session[:level])
            end
            
            # Server Config Tab
            builder.tag(:div, id: "admin-tab-config", class: "admin-tab", style: "display: none;") do
              render_admin_config_tab(builder, session[:level])
            end
            
            # Demo Recording Tab
            builder.tag(:div, id: "admin-tab-demos", class: "admin-tab", style: "display: none;") do
              render_admin_demos_tab(builder, session[:level])
            end
            
            # Anti-Cheat Tab
            builder.tag(:div, id: "admin-tab-anticheat", class: "admin-tab", style: "display: none;") do
              render_admin_anticheat_tab(builder, session[:level])
            end
            
            # Default welcome message
            builder.tag(:div, id: "admin-welcome", style: "text-align: center; color: #ccc; margin-top: 50px;") do
              builder.tag(:h2, style: "color: #ff6600; margin-bottom: 20px;") { builder.text("Welcome to Admin Panel") }
              builder.tag(:p) { builder.text("Select a tab from the sidebar to manage the server.") }
              builder.tag(:p, style: "margin-top: 20px; font-size: 14px; color: #888;") do
                builder.text("Your admin level: #{session[:level]} (#{ADMIN_LEVELS[session[:level]]})")
              end
            end
          end
        end
      end
    end
  end
  
  def render_admin_nav_button(builder, title, tab_id, enabled)
    if enabled
      builder.tag(:div,
        onclick: "window.adminPanel.showTab('#{tab_id}')",
        class: "admin-nav-button",
        style: "padding: 10px 15px; margin: 5px 0; background: rgba(255,102,0,0.1); color: #ff6600; border: 1px solid #ff6600; border-radius: 5px; cursor: pointer; transition: all 0.3s; user-select: none;"
      ) do
        builder.text(title)
      end
    else
      builder.tag(:div,
        style: "padding: 10px 15px; margin: 5px 0; background: rgba(100,100,100,0.1); color: #666; border: 1px solid #666; border-radius: 5px; user-select: none;"
      ) do
        builder.text("#{title} (Level #{ADMIN_PERMISSIONS.values.min || 1}+)")
      end
    end
  end
  
  def render_admin_players_tab(builder, admin_level)
    builder.tag(:h3, style: "color: #ff6600; margin-bottom: 20px;") { builder.text("Player Management") }
    
    # Player list
    builder.tag(:div, style: "background: rgba(0,0,0,0.2); border: 1px solid #333; border-radius: 5px; margin-bottom: 20px;") do
      builder.tag(:div, style: "background: #333; color: white; padding: 10px; font-weight: bold;") do
        builder.text("Online Players")
      end
      
      @game_state[:players].values.each do |player|
        builder.tag(:div, style: "padding: 10px; border-bottom: 1px solid #333; display: flex; justify-content: space-between; align-items: center;") do
          # Player info
          builder.tag(:div) do
            status_badges = []
            status_badges << player[:team].upcase
            status_badges << (player[:alive] ? "ALIVE" : "DEAD")
            status_badges << "ADMIN" if is_admin?(player[:id])
            status_badges << "MUTED" if player[:muted]
            status_badges << "GOD" if player[:god_mode]
            
            builder.tag(:div, style: "color: white; font-weight: bold;") { builder.text(player[:name]) }
            builder.tag(:div, style: "color: #ccc; font-size: 12px;") { builder.text(status_badges.join(" • ")) }
          end
          
          # Action buttons
          builder.tag(:div, style: "display: flex; gap: 5px;") do
            if admin_level >= 1
              builder.tag(:button,
                onclick: "window.adminPanel.kickPlayer('#{player[:name]}')",
                style: "background: #ff4444; color: white; border: none; padding: 4px 8px; border-radius: 3px; cursor: pointer; font-size: 12px;"
              ) { builder.text("Kick") }
              
              builder.tag(:button,
                onclick: "window.adminPanel.mutePlayer('#{player[:name]}')",
                style: "background: #ffaa00; color: white; border: none; padding: 4px 8px; border-radius: 3px; cursor: pointer; font-size: 12px;"
              ) { builder.text(player[:muted] ? "Unmute" : "Mute") }
            end
            
            if admin_level >= 2
              builder.tag(:button,
                onclick: "window.adminPanel.banPlayer('#{player[:name]}')",
                style: "background: #aa0000; color: white; border: none; padding: 4px 8px; border-radius: 3px; cursor: pointer; font-size: 12px;"
              ) { builder.text("Ban") }
              
              builder.tag(:button,
                onclick: "window.adminPanel.toggleGodMode('#{player[:name]}')",
                style: "background: #{player[:god_mode] ? '#00aa00' : '#666'}; color: white; border: none; padding: 4px 8px; border-radius: 3px; cursor: pointer; font-size: 12px;"
              ) { builder.text("God") }
            end
          end
        end
      end
    end
  end
  
  def render_admin_reports_tab(builder, admin_level)
    builder.tag(:h3, style: "color: #ff6600; margin-bottom: 20px;") { builder.text("Player Reports") }
    
    pending_reports = @game_state[:reports].reject { |r| r[:handled] }
    
    if pending_reports.empty?
      builder.tag(:div, style: "text-align: center; color: #666; margin-top: 50px;") do
        builder.text("No pending reports")
      end
    else
      pending_reports.each do |report|
        builder.tag(:div, style: "background: rgba(0,0,0,0.2); border: 1px solid #333; border-radius: 5px; margin-bottom: 15px; padding: 15px;") do
          builder.tag(:div, style: "display: flex; justify-content: space-between; align-items: start; margin-bottom: 10px;") do
            builder.tag(:div) do
              builder.tag(:div, style: "color: white; font-weight: bold; margin-bottom: 5px;") do
                builder.text("#{report[:target_name]} reported by #{report[:reporter_name]}")
              end
              builder.tag(:div, style: "color: #ff6600; font-size: 14px;") { builder.text(report[:reason]) }
              time_ago = ((Time.now.to_f - report[:timestamp]) / 60).round
              builder.tag(:div, style: "color: #888; font-size: 12px; margin-top: 5px;") do
                builder.text("#{time_ago} minutes ago • ID: #{report[:id][0..7]}")
              end
            end
            
            builder.tag(:div, style: "display: flex; gap: 5px;") do
              builder.tag(:button,
                onclick: "window.adminPanel.handleReport('#{report[:id]}', 'kick')",
                style: "background: #ff4444; color: white; border: none; padding: 6px 12px; border-radius: 3px; cursor: pointer; font-size: 12px;"
              ) { builder.text("Kick") }
              
              builder.tag(:button,
                onclick: "window.adminPanel.handleReport('#{report[:id]}', 'ban_temp')",
                style: "background: #aa0000; color: white; border: none; padding: 6px 12px; border-radius: 3px; cursor: pointer; font-size: 12px;"
              ) { builder.text("Ban 24h") }
              
              if admin_level >= 2
                builder.tag(:button,
                  onclick: "window.adminPanel.handleReport('#{report[:id]}', 'ban_perm')",
                  style: "background: #660000; color: white; border: none; padding: 6px 12px; border-radius: 3px; cursor: pointer; font-size: 12px;"
                ) { builder.text("Ban Perm") }
              end
              
              builder.tag(:button,
                onclick: "window.adminPanel.handleReport('#{report[:id]}', 'dismiss')",
                style: "background: #666; color: white; border: none; padding: 6px 12px; border-radius: 3px; cursor: pointer; font-size: 12px;"
              ) { builder.text("Dismiss") }
            end
          end
        end
      end
    end
  end
  
  def render_admin_bans_tab(builder, admin_level)
    builder.tag(:h3, style: "color: #ff6600; margin-bottom: 20px;") { builder.text("Ban Management") }
    
    @game_state[:bans] ||= {}
    active_bans = @game_state[:bans].select do |ip, ban|
      ban['expires_at'].nil? || ban['expires_at'] > Time.now.to_f
    end
    
    if active_bans.empty?
      builder.tag(:div, style: "text-align: center; color: #666; margin-top: 50px;") do
        builder.text("No active bans")
      end
    else
      active_bans.each do |ip, ban|
        builder.tag(:div, style: "background: rgba(0,0,0,0.2); border: 1px solid #333; border-radius: 5px; margin-bottom: 15px; padding: 15px;") do
          builder.tag(:div, style: "display: flex; justify-content: space-between; align-items: center;") do
            builder.tag(:div) do
              builder.tag(:div, style: "color: white; font-weight: bold;") { builder.text(ban['name']) }
              builder.tag(:div, style: "color: #ccc; font-size: 14px;") { builder.text("IP: #{ip}") }
              builder.tag(:div, style: "color: #ff6600; font-size: 12px;") { builder.text(ban['reason']) }
              builder.tag(:div, style: "color: #888; font-size: 12px; margin-top: 5px;") do
                duration = ban['expires_at'] ? "Expires in #{((ban['expires_at'] - Time.now.to_f) / 3600).round} hours" : "Permanent"
                builder.text("#{duration} • By: #{ban['banned_by']}")
              end
            end
            
            if admin_level >= 2
              builder.tag(:button,
                onclick: "window.adminPanel.unbanPlayer('#{ip}')",
                style: "background: #00aa00; color: white; border: none; padding: 6px 12px; border-radius: 3px; cursor: pointer; font-size: 12px;"
              ) { builder.text("Unban") }
            end
          end
        end
      end
    end
  end
  
  def render_admin_config_tab(builder, admin_level)
    return unless admin_level >= 3
    
    builder.tag(:h3, style: "color: #ff6600; margin-bottom: 20px;") { builder.text("Server Configuration") }
    
    config = @game_state[:server_config]
    
    builder.tag(:div, style: "display: grid; grid-template-columns: 1fr 1fr; gap: 20px;") do
      config.each do |key, value|
        builder.tag(:div, style: "background: rgba(0,0,0,0.2); border: 1px solid #333; border-radius: 5px; padding: 15px;") do
          builder.tag(:label, style: "color: white; font-weight: bold; display: block; margin-bottom: 5px;") do
            builder.text(key.to_s.gsub('_', ' ').split.map(&:capitalize).join(' '))
          end
          
          case value
          when TrueClass, FalseClass
            builder.tag(:select,
              id: "config-#{key}",
              onchange: "window.adminPanel.updateConfig('#{key}', this.value)",
              style: "width: 100%; padding: 5px; border: 1px solid #666; background: #333; color: white; border-radius: 3px;"
            ) do
              builder.tag(:option, value: "true", selected: value ? "selected" : nil) { builder.text("True") }
              builder.tag(:option, value: "false", selected: !value ? "selected" : nil) { builder.text("False") }
            end
          else
            builder.tag(:input,
              type: "number",
              id: "config-#{key}",
              value: value.to_s,
              onchange: "window.adminPanel.updateConfig('#{key}', this.value)",
              style: "width: 100%; padding: 5px; border: 1px solid #666; background: #333; color: white; border-radius: 3px;"
            )
          end
        end
      end
    end
  end
  
  def render_admin_demos_tab(builder, admin_level)
    return unless admin_level >= 2
    
    builder.tag(:h3, style: "color: #ff6600; margin-bottom: 20px;") { builder.text("Demo Recording") }
    
    if @game_state[:demo_recording]
      builder.tag(:div, style: "background: rgba(0,150,0,0.2); border: 1px solid #00aa00; border-radius: 5px; padding: 15px; margin-bottom: 20px;") do
        builder.tag(:div, style: "color: #00ff00; font-weight: bold; margin-bottom: 5px;") do
          builder.text("Recording in Progress")
        end
        builder.tag(:div, style: "color: #ccc;") { builder.text("Filename: #{@demo_filename}") }
        duration = @demo_start_time ? (Time.now.to_f - @demo_start_time).round : 0
        builder.tag(:div, style: "color: #ccc;") { builder.text("Duration: #{duration}s") }
        
        builder.tag(:button,
          onclick: "window.adminPanel.stopDemo()",
          style: "background: #ff4444; color: white; border: none; padding: 8px 16px; border-radius: 3px; cursor: pointer; margin-top: 10px;"
        ) { builder.text("Stop Recording") }
      end
    else
      builder.tag(:div, style: "background: rgba(0,0,0,0.2); border: 1px solid #333; border-radius: 5px; padding: 15px; margin-bottom: 20px;") do
        builder.tag(:div, style: "color: white; font-weight: bold; margin-bottom: 10px;") do
          builder.text("Start Demo Recording")
        end
        
        builder.tag(:input,
          type: "text",
          id: "demo-filename",
          placeholder: "demo_filename.json (optional)",
          style: "width: 70%; padding: 5px; border: 1px solid #666; background: #333; color: white; border-radius: 3px; margin-right: 10px;"
        )
        
        builder.tag(:button,
          onclick: "window.adminPanel.startDemo()",
          style: "background: #00aa00; color: white; border: none; padding: 6px 12px; border-radius: 3px; cursor: pointer;"
        ) { builder.text("Start") }
      end
    end
    
    # Demo files list (if directory exists)
    if Dir.exist?(DEMO_DIR)
      demo_files = Dir.entries(DEMO_DIR).select { |f| f.end_with?('.json') }.sort.reverse
      
      unless demo_files.empty?
        builder.tag(:h4, style: "color: white; margin-bottom: 15px;") { builder.text("Recorded Demos") }
        
        demo_files.first(10).each do |filename|
          file_path = File.join(DEMO_DIR, filename)
          file_size = (File.size(file_path) / 1024.0).round(1)
          file_time = File.mtime(file_path).strftime("%Y-%m-%d %H:%M")
          
          builder.tag(:div, style: "background: rgba(0,0,0,0.2); border: 1px solid #333; border-radius: 3px; padding: 10px; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center;") do
            builder.tag(:div) do
              builder.tag(:div, style: "color: white; font-weight: bold;") { builder.text(filename) }
              builder.tag(:div, style: "color: #ccc; font-size: 12px;") { builder.text("#{file_size}KB • #{file_time}") }
            end
            
            builder.tag(:div, style: "display: flex; gap: 5px;") do
              builder.tag(:button,
                onclick: "window.adminPanel.downloadDemo('#{filename}')",
                style: "background: #0066aa; color: white; border: none; padding: 4px 8px; border-radius: 3px; cursor: pointer; font-size: 12px;"
              ) { builder.text("Download") }
            end
          end
        end
      end
    end
  end
  
  def render_admin_anticheat_tab(builder, admin_level)
    return unless admin_level >= 2
    
    builder.tag(:h3, style: "color: #ff6600; margin-bottom: 20px;") { builder.text("Anti-Cheat System") }
    
    # Anti-cheat status
    builder.tag(:div, style: "background: rgba(0,0,0,0.2); border: 1px solid #333; border-radius: 5px; padding: 15px; margin-bottom: 20px;") do
      builder.tag(:div, style: "color: white; font-weight: bold; margin-bottom: 10px;") do
        builder.text("Anti-Cheat Status")
      end
      
      auto_enabled = @game_state[:server_config][:auto_anticheat]
      builder.tag(:div, style: "margin-bottom: 10px;") do
        builder.tag(:span, style: "color: #ccc;") { builder.text("Automatic Actions: ") }
        builder.tag(:span, style: "color: #{auto_enabled ? '#00ff00' : '#ff4444'}; font-weight: bold;") do
          builder.text(auto_enabled ? "ENABLED" : "DISABLED")
        end
      end
      
      builder.tag(:button,
        onclick: "window.adminPanel.toggleAutoAnticheat()",
        style: "background: #{auto_enabled ? '#ff4444' : '#00aa00'}; color: white; border: none; padding: 6px 12px; border-radius: 3px; cursor: pointer;"
      ) { builder.text(auto_enabled ? "Disable Auto-Actions" : "Enable Auto-Actions") }
    end
    
    # Violation summary
    violations_summary = {}
    @game_state[:anticheat_violations].each do |player_id, data|
      player_name = @game_state[:players][player_id]&.[](:name) || "Unknown"
      total_violations = data[:speed_violations] + data[:teleport_violations] + data[:aim_violations]
      violations_summary[player_name] = total_violations if total_violations > 0
    end
    
    unless violations_summary.empty?
      builder.tag(:div, style: "background: rgba(150,0,0,0.2); border: 1px solid #aa0000; border-radius: 5px; padding: 15px;") do
        builder.tag(:div, style: "color: #ff6600; font-weight: bold; margin-bottom: 10px;") do
          builder.text("Players with Violations")
        end
        
        violations_summary.each do |player_name, count|
          builder.tag(:div, style: "color: white; margin-bottom: 5px; display: flex; justify-content: space-between;") do
            builder.tag(:span) { builder.text(player_name) }
            builder.tag(:span, style: "color: #ff4444; font-weight: bold;") { builder.text("#{count} violations") }
          end
        end
      end
    else
      builder.tag(:div, style: "text-align: center; color: #666; margin-top: 30px;") do
        builder.text("No anti-cheat violations detected")
      end
    end
  end
  
  def render_complete_game_scripts(builder)
    Console.info(self, "Rendering complete CS2D game JavaScript directly in HTML...")
    
    builder.tag(:script, type: "text/javascript") do
      # Create the complete game script with visual validation
      immediate_validation_script = <<~JS
        // IMMEDIATE HTML-BASED JAVASCRIPT VALIDATION
        console.log('=== HTML SCRIPT: JavaScript executing directly in HTML ===');
        
        // Create immediate success indicator
        document.addEventListener('DOMContentLoaded', function() {
          console.log('HTML SCRIPT: DOMContentLoaded event fired');
          
          // Strategy 1: Immediate DOM manipulation
          const successDiv = document.createElement('div');
          successDiv.style.cssText = 'position: fixed; top: 20px; left: 20px; background: lime; color: black; padding: 20px; z-index: 999999; font-size: 24px; font-weight: bold; border: 5px solid red;';
          successDiv.textContent = 'HTML SCRIPT: CS2D JavaScript Loaded!';
          document.body.appendChild(successDiv);
          
          // Strategy 2: Canvas immediate drawing
          const canvas = document.getElementById('game-canvas');
          if (canvas) {
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.fillStyle = '#00FF00';
              ctx.fillRect(10, 10, 300, 80);
              ctx.fillStyle = '#000000';
              ctx.font = 'bold 20px Arial';
              ctx.fillText('HTML SCRIPT: Canvas Ready!', 20, 50);
              console.log('HTML SCRIPT: Canvas drawing successful');
            }
          }
          
          // Strategy 3: Title change
          document.title = 'HTML SCRIPT: CS2D Game Loaded!';
          
          console.log('HTML SCRIPT: Immediate validation complete');
        });
        
        // Also execute immediately without waiting for DOMContentLoaded
        if (document.body) {
          console.log('HTML SCRIPT: Document.body available immediately');
          const immediateDiv = document.createElement('div');
          immediateDiv.style.cssText = 'position: fixed; top: 100px; left: 20px; background: yellow; color: black; padding: 15px; z-index: 999999; font-size: 20px; font-weight: bold;';
          immediateDiv.textContent = 'HTML SCRIPT: Immediate Execution!';
          document.body.appendChild(immediateDiv);
        }
        
        console.log('HTML SCRIPT: Initial execution completed');
      JS
      
      # Game initialization script
      game_init_script = <<~JS
        // Initialize CS2D game after everything is loaded
        window.addEventListener('load', function() {
          console.log('HTML SCRIPT: Window load event - initializing CS2D');
          
          // Add game initialization indicator
          const initDiv = document.createElement('div');
          initDiv.style.cssText = 'position: fixed; top: 180px; left: 20px; background: cyan; color: black; padding: 15px; z-index: 999999; font-size: 18px; font-weight: bold;';
          initDiv.textContent = 'HTML SCRIPT: Initializing CS2D Game...';
          document.body.appendChild(initDiv);
          
          // Initialize the game
          const container = document.getElementById('cs2d-container');
          if (container && window.initCS2DGame) {
            const viewId = container.dataset.live || '#{@id}';
            console.log('HTML SCRIPT: Calling initCS2DGame with viewId:', viewId);
            
            try {
              window.initCS2DGame(viewId, '#{@player_id}');
              
              // Success indicator
              const gameDiv = document.createElement('div');
              gameDiv.style.cssText = 'position: fixed; top: 260px; left: 20px; background: purple; color: white; padding: 15px; z-index: 999999; font-size: 18px; font-weight: bold;';
              gameDiv.textContent = 'HTML SCRIPT: CS2D Game Initialized!';
              document.body.appendChild(gameDiv);
              
              console.log('HTML SCRIPT: CS2D game initialization successful');
            } catch (error) {
              console.error('HTML SCRIPT: Game initialization failed:', error);
              
              // Error indicator
              const errorDiv = document.createElement('div');
              errorDiv.style.cssText = 'position: fixed; top: 260px; left: 20px; background: red; color: white; padding: 15px; z-index: 999999; font-size: 18px; font-weight: bold;';
              errorDiv.textContent = 'HTML SCRIPT: Init Error: ' + error.message;
              document.body.appendChild(errorDiv);
            }
          } else {
            console.error('HTML SCRIPT: Missing container or initCS2DGame function');
            
            // Missing elements indicator
            const missingDiv = document.createElement('div');
            missingDiv.style.cssText = 'position: fixed; top: 260px; left: 20px; background: orange; color: black; padding: 15px; z-index: 999999; font-size: 18px; font-weight: bold;';
            missingDiv.textContent = 'HTML SCRIPT: Missing elements - Container:' + !!container + ' InitFunc:' + !!window.initCS2DGame;
            document.body.appendChild(missingDiv);
          }
        });
      JS
      
      # Combine all scripts - client_game_script must come before game_init_script
      complete_game_script = [
        immediate_validation_script,
        client_game_script,  # This defines CS2DGame class and initCS2DGame function
        game_init_script     # This calls initCS2DGame
      ].join("\n\n")
      
      Console.info(self, "Generated #{complete_game_script.length} characters of complete CS2D game script")
      builder.raw(complete_game_script)
    end
  end

  def inject_game_javascript
    # WebSocket injection is disabled - using HTML-based injection instead
    Console.info(self, "WebSocket JavaScript injection disabled - using HTML-based approach")
  end

  def render_game_scripts(builder)
    builder.tag(:script, type: "text/javascript") do
      # Combine all game scripts into one
      combined_script = [
        client_game_script,
        # Always define the initialization trigger
        <<~JS
          // IMMEDIATE AGGRESSIVE TEST - multiple methods to detect JS execution
          console.log('=== SCRIPT EXECUTING ===');
          
          // Method 1: Alert (most aggressive)
          alert('JAVASCRIPT IS EXECUTING!');
          
          // Method 2: Console messages
          console.warn('JS SCRIPT LOADED AND RUNNING');
          console.error('THIS IS A TEST ERROR TO ENSURE CONSOLE WORKS');
          
          // Method 3: Try to create DOM element immediately
          try {
            const jsTestDiv = document.createElement('div');
            jsTestDiv.style.cssText = 'position: fixed; top: 10px; right: 10px; background: red; color: white; padding: 20px; z-index: 99999; font-size: 20px; font-weight: bold; border: 3px solid yellow;';
            jsTestDiv.textContent = 'JS EXECUTING!';
            if (document.body) {
              document.body.appendChild(jsTestDiv);
              console.log('Test div added to body');
            } else {
              console.log('document.body not available yet');
            }
          } catch (e) {
            console.error('Error creating test div:', e);
            alert('Error in DOM creation: ' + e.message);
          }
          
          // Method 4: Window property
          window.JAVASCRIPT_IS_WORKING = true;
          console.log('Set window.JAVASCRIPT_IS_WORKING =', window.JAVASCRIPT_IS_WORKING);
          
          // Auto-initialize when DOM is ready
          console.log('JS test div created');
          
          document.addEventListener('DOMContentLoaded', function() {
            console.log('DOMContentLoaded fired');
            
            // Update the test div
            jsTestDiv.textContent = 'DOM READY!';
            jsTestDiv.style.background = 'yellow';
            
            // AGGRESSIVE canvas test - fill entire canvas
            const canvas = document.getElementById('game-canvas');
            console.log('Canvas element found:', canvas);
            console.log('Canvas style:', canvas ? canvas.style.cssText : 'no canvas');
            console.log('Canvas computed style:', canvas ? window.getComputedStyle(canvas) : 'no canvas');
            
            if (canvas) {
              console.log('Canvas size:', canvas.width, 'x', canvas.height);
              console.log('Canvas client size:', canvas.clientWidth, 'x', canvas.clientHeight);
              console.log('Canvas offset:', canvas.offsetWidth, 'x', canvas.offsetHeight);
              
              const ctx = canvas.getContext('2d');
              console.log('Canvas context:', ctx);
              
              if (ctx) {
                console.log('FILLING ENTIRE CANVAS WITH BRIGHT RED...');
                ctx.fillStyle = 'rgb(255, 0, 0)';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                
                console.log('Adding white text overlay...');
                ctx.fillStyle = 'white';
                ctx.font = 'bold 48px Arial';
                ctx.textAlign = 'center';
                ctx.fillText('CANVAS WORKS!', canvas.width/2, canvas.height/2);
                
                console.log('Canvas test complete - entire screen should be RED!');
                
                // Force a repaint
                canvas.style.display = 'none';
                canvas.offsetHeight; // trigger reflow
                canvas.style.display = 'block';
              } else {
                console.error('NO CANVAS CONTEXT AVAILABLE!');
                // Add a DOM element to show the error
                const errorDiv = document.createElement('div');
                errorDiv.style.cssText = 'position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); color: white; background: red; padding: 20px; z-index: 10000; font-size: 24px;';
                errorDiv.textContent = 'CANVAS CONTEXT FAILED';
                document.body.appendChild(errorDiv);
              }
            } else {
              console.error('NO CANVAS ELEMENT FOUND!');
              // Add a DOM element to show the error
              const errorDiv = document.createElement('div');
              errorDiv.style.cssText = 'position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); color: white; background: blue; padding: 20px; z-index: 10000; font-size: 24px;';
              errorDiv.textContent = 'NO CANVAS ELEMENT!';
              document.body.appendChild(errorDiv);
            }
            
            const container = document.getElementById('cs2d-container');
            console.log('Container found:', container);
            if (container) {
              const viewId = container.dataset.live;
              console.log('ViewId from container:', viewId);
              // Try to initialize immediately
              if (viewId && window.initCS2DGame) {
                console.log('Calling initCS2DGame with:', viewId);
                // Use a placeholder player ID initially
                window.initCS2DGame(viewId, viewId);
              } else {
                console.error('Missing viewId or initCS2DGame function');
                console.log('Available on window:', Object.keys(window));
              }
            } else {
              console.error('cs2d-container not found');
            }
          });
        JS
      ]
      
      builder.raw(combined_script.join("\n\n"))
    end
  end
  
  def client_game_script
    <<~JAVASCRIPT
      // CS2D Complete Game Implementation
      #{game_core_script}
      #{game_renderer_script}
      #{game_network_script}
      #{game_audio_script}
      #{game_input_script}
      #{game_ui_script}
      #{game_init_script}
    JAVASCRIPT
  end
  
  def game_core_script
    <<~JAVASCRIPT
      // Helper classes must be defined first
      class ObjectPool {
        constructor(createFn) {
          this.createFn = createFn;
          this.pool = [];
        }
        
        get() {
          return this.pool.pop() || this.createFn();
        }
        
        release(obj) {
          this.pool.push(obj);
        }
      }
      
      class FrustumCuller {
        constructor() {
          this.viewBounds = { x: 0, y: 0, width: 1280, height: 720 };
        }
        
        isInView(x, y, radius = 50) {
          return x + radius > this.viewBounds.x &&
                 x - radius < this.viewBounds.x + this.viewBounds.width &&
                 y + radius > this.viewBounds.y &&
                 y - radius < this.viewBounds.y + this.viewBounds.height;
        }
      }
      
      class CS2DGame {
        constructor(viewId, playerId) {
          console.log('CS2DGame constructor called with:', viewId, playerId);
          this.viewId = viewId;
          this.playerId = playerId;
          this.canvas = document.getElementById('game-canvas');
          console.log('Canvas element:', this.canvas);
          
          if (!this.canvas) {
            console.error('CRITICAL ERROR: Canvas element not found!');
            // Try to create canvas if it doesn't exist
            this.canvas = document.createElement('canvas');
            this.canvas.id = 'game-canvas';
            this.canvas.width = 1280;
            this.canvas.height = 720;
            this.canvas.style.cssText = 'display: block; margin: 0 auto; cursor: crosshair;';
            const container = document.getElementById('cs2d-container');
            if (container) {
              container.appendChild(this.canvas);
              console.log('Canvas created and appended to container');
            } else {
              document.body.appendChild(this.canvas);
              console.log('Canvas created and appended to body');
            }
          }
          
          this.ctx = this.canvas.getContext('2d');
          console.log('Canvas context:', this.ctx);
          
          // Game state - initialize with empty state
          this.gameState = {
            players: {},
            bots: {},
            spectators: {},
            round: 1,
            ct_score: 0,
            t_score: 0,
            round_time: 15,
            phase: 'buy_time',
            bomb_planted: false,
            bomb_site: null,
            bomb_timer: null,
            bomb_position: null,
            grenades: [],
            dropped_weapons: [],
            kill_feed: []
          };
          this.localPlayer = null;
          
          // Camera system
          this.camera = {
            x: 0,
            y: 0,
            targetX: 0,
            targetY: 0,
            smoothing: 0.1
          };
          
          // Spectator state
          this.spectatorMode = false;
          this.spectatorTarget = null;
          this.freeCamera = false;
          
          // Client prediction
          this.inputSequence = 0;
          this.pendingInputs = [];
          this.lastServerUpdate = Date.now();
          this.interpolationDelay = 100; // ms
          
          // Performance optimization
          this.objectPool = new ObjectPool(() => ({}));
          this.frustumCuller = new FrustumCuller();
          this.dirtyRects = [];
          
          // Initialize subsystems
          this.renderer = new GameRenderer(this);
          this.network = new NetworkManager(this);
          this.audio = new AudioManager(this);
          this.input = new InputManager(this);
          this.ui = new UIManager(this);
          
          // Start client-side timers
          this.startTimers();
          
          // Don't start game loop until we have game state
          this.lastTime = Date.now();
          this.running = false;
          
          // Request initial game state
          console.log('CS2D waiting for initial game state...');
          
          // Draw initial loading screen
          console.log('Drawing loading screen...');
          this.drawLoadingScreen();
          console.log('CS2DGame constructor finished');
          
          // Add a visible debug indicator
          const debug = document.createElement('div');
          debug.style.cssText = 'position: absolute; top: 10px; left: 10px; background: green; color: white; padding: 5px; z-index: 9999;';
          debug.textContent = 'CS2DGame initialized';
          document.body.appendChild(debug);
          
          // Draw something on canvas immediately to verify it's working
          this.ctx.fillStyle = 'red';
          this.ctx.fillRect(0, 0, 100, 100);
          this.ctx.fillStyle = 'white';
          this.ctx.font = '30px Arial';
          this.ctx.fillText('CS2D Loading...', 200, 200);
          console.log('Debug draw completed on canvas');
        }
        
        startTimers() {
          // Client-side round timer
          setInterval(() => {
            if (this.gameState.phase === 'buy_time' || this.gameState.phase === 'round_active') {
              this.gameState.round_time--;
              if (this.gameState.round_time <= 0) {
                if (this.gameState.phase === 'buy_time') {
                  this.gameState.phase = 'round_active';
                  this.gameState.round_time = 115;
                }
              }
            }
            
            // Client-side bomb timer
            if (this.gameState.bomb_planted && this.gameState.bomb_timer > 0) {
              this.gameState.bomb_timer--;
              if (this.gameState.bomb_timer < 10) {
                this.audio.play('bomb_beep');
              }
            }
            
            this.ui.update();
          }, 1000);
        }
        
        gameLoop() {
          if (!this.running) return;
          
          const now = Date.now();
          const dt = (now - this.lastTime) / 1000;
          this.lastTime = now;
          
          this.update(dt);
          this.render();
          
          requestAnimationFrame(() => this.gameLoop());
        }
        
        update(dt) {
          // Update camera with smooth following
          this.updateCamera(dt);
          
          // Update input system (including grenade cooking)
          this.input.update();
          
          // Client-side prediction
          this.input.processInput(dt);
          
          // Interpolate other players
          this.interpolatePlayers(dt);
          
          // Update local effects
          this.updateEffects(dt);
          
          // Update UI
          this.ui.update();
        }
        
        updateCamera(dt) {
          // Smooth camera movement
          this.camera.x += (this.camera.targetX - this.camera.x) * this.camera.smoothing;
          this.camera.y += (this.camera.targetY - this.camera.y) * this.camera.smoothing;
          
          // Keep camera within bounds (optional)
          this.camera.x = Math.max(0, Math.min(this.camera.x, 1280));
          this.camera.y = Math.max(0, Math.min(this.camera.y, 720));
        }
        
        render() {
          this.renderer.render();
        }
        
        interpolatePlayers(dt) {
          // Smooth movement for other players
          Object.values(this.gameState.players).forEach(player => {
            if (player.id !== this.playerId) {
              // Interpolation logic here
            }
          });
        }
        
        updateEffects(dt) {
          // Update visual effects
        }
        
        // API methods
        updateGameState(newState) {
          // Update player ID if provided
          if (newState.current_player_id) {
            this.playerId = newState.current_player_id;
          }
          
          // Server reconciliation
          const oldLocal = this.gameState.players[this.playerId];
          this.gameState = newState;
          
          // Update local player reference
          this.localPlayer = this.gameState.players[this.playerId];
          
          // Update spectator state
          this.updateSpectatorState();
          
          // Update map voting UI
          if (this.input) {
            this.input.updateMapVoteUI();
          }
          
          if (this.localPlayer) {
            // Apply pending inputs
            this.reconcileState();
            
            // Start game loop if not already running
            if (!this.running) {
              console.log('Starting game loop with player:', this.playerId);
              this.running = true;
              this.lastTime = Date.now();
              this.gameLoop();
            }
          }
        }
        
        updateSpectatorState() {
          if (this.localPlayer) {
            this.spectatorMode = this.localPlayer.spectating || false;
            this.spectatorTarget = this.localPlayer.spectator_target;
            this.freeCamera = this.localPlayer.spectator_mode === 'free';
            
            // Update camera target based on spectator mode
            if (this.spectatorMode) {
              if (this.freeCamera) {
                this.camera.targetX = this.localPlayer.spectator_camera_x || 640;
                this.camera.targetY = this.localPlayer.spectator_camera_y || 360;
              } else if (this.spectatorTarget) {
                const target = this.gameState.players[this.spectatorTarget];
                if (target) {
                  this.camera.targetX = target.x;
                  this.camera.targetY = target.y;
                }
              }
            } else if (!this.localPlayer.alive) {
              // Dead but not yet spectating
              this.spectatorMode = true;
            } else {
              // Alive, follow self
              this.camera.targetX = this.localPlayer.x;
              this.camera.targetY = this.localPlayer.y;
            }
            
            // Update UI
            this.ui.updateSpectatorUI(this.spectatorMode, this.spectatorTarget);
          }
        }
        
        drawLoadingScreen() {
          console.log('drawLoadingScreen called');
          console.log('Canvas:', this.canvas);
          console.log('Canvas dimensions:', this.canvas?.width, 'x', this.canvas?.height);
          console.log('Context:', this.ctx);
          
          if (!this.canvas) {
            console.error('No canvas element!');
            return;
          }
          
          if (!this.ctx) {
            console.error('No canvas context available!');
            // Try to get context again
            this.ctx = this.canvas.getContext('2d');
            if (!this.ctx) {
              console.error('Still no context after retry');
              return;
            }
            console.log('Got context on retry:', this.ctx);
          }
          
          console.log('About to draw...');
          try {
            // Clear with black background
            this.ctx.fillStyle = '#000000';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            console.log('Black background drawn');
            
            // Draw loading text
            this.ctx.fillStyle = '#ffffff';
            this.ctx.font = '48px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText('CS2D Loading...', this.canvas.width / 2, this.canvas.height / 2 - 50);
            console.log('Loading text drawn');
            
            // Draw smaller text
            this.ctx.font = '24px Arial';
            this.ctx.fillText('Connecting to server...', this.canvas.width / 2, this.canvas.height / 2 + 20);
            console.log('Server text drawn');
            console.log('Loading screen render complete!');
          } catch (e) {
            console.error('Error drawing loading screen:', e);
          }
        }
        
        reconcileState() {
          // Reconcile with server state
          const serverState = this.gameState.players[this.playerId];
          
          // Remove acknowledged inputs
          this.pendingInputs = this.pendingInputs.filter(input => 
            input.sequence > serverState.lastProcessedInput
          );
          
          // Replay pending inputs
          this.pendingInputs.forEach(input => {
            this.applyInput(input);
          });
        }
        
        applyInput(input) {
          // Apply input to local state
        }
        
        playSound(soundName) {
          this.audio.play(soundName);
        }
        
        buyWeapon(weaponKey) {
          this.network.sendEvent('buy_weapon', { weapon: weaponKey });
        }
        
        receiveChatMessage(message) {
          this.ui.addChatMessage(message);
        }
        
        applyFlashEffect(intensity, duration) {
          this.renderer.flashEffect(intensity);
          // Store flash effect for gradual recovery
          this.flashEffect = {
            intensity: intensity,
            duration: duration || 2.0,
            startTime: Date.now()
          };
        }
        
        updateFlashEffect(intensity) {
          if (this.renderer) {
            this.renderer.flashAlpha = intensity;
          }
        }
        
        createSmokeCloud(x, y) {
          this.renderer.addSmoke(x, y);
        }
        
        createExplosionEffect(x, y, size, type) {
          // Create visual explosion effect
          const explosion = {
            x: x,
            y: y,
            size: size || 50,
            type: type || 'hegrenade',
            time: Date.now(),
            duration: 1000 // 1 second
          };
          
          this.renderer.explosions = this.renderer.explosions || [];
          this.renderer.explosions.push(explosion);
          
          // Screen shake for explosions
          const distance = this.calculateDistanceToPlayer(x, y);
          const shakeIntensity = Math.max(0, 1.0 - distance / 200);
          this.renderer.addScreenShake(shakeIntensity);
        }
        
        calculateDistanceToPlayer(x, y) {
          const localPlayer = this.gameState.players[this.playerId];
          if (!localPlayer) return 999;
          
          const dx = x - localPlayer.x;
          const dy = y - localPlayer.y;
          return Math.sqrt(dx * dx + dy * dy);
        }
      }
    JAVASCRIPT
  end
  
  def game_renderer_script
    <<~JAVASCRIPT
      class GameRenderer {
        constructor(game) {
          this.game = game;
          this.ctx = game.ctx;
          this.canvas = game.canvas;
          
          // Visual effects
          this.flashAlpha = 0;
          this.smokeClouds = [];
          this.bloodSplatters = [];
          this.bulletTrails = [];
          this.explosions = [];
          this.screenShake = null;
          
          // Sprite cache
          this.sprites = {};
          this.loadSprites();
        }
        
        loadSprites() {
          // Load weapon sprites, player sprites, etc.
        }
        
        render() {
          // Apply screen shake
          const shake = this.updateScreenShake();
          this.ctx.save();
          if (shake) {
            this.ctx.translate(shake.x, shake.y);
          }
          
          // Clear canvas
          this.ctx.fillStyle = '#1a1a1a';
          this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
          
          // Save context and apply camera transform
          this.ctx.save();
          
          // Calculate camera offset for centering view
          const cameraOffsetX = this.canvas.width / 2 - this.game.camera.x;
          const cameraOffsetY = this.canvas.height / 2 - this.game.camera.y;
          
          this.ctx.translate(cameraOffsetX, cameraOffsetY);
          
          // Draw map
          this.drawMap();
          
          // Draw game objects in order
          this.drawBombSites();
          this.drawHostages();
          this.drawRescueZones();
          this.drawDroppedWeapons();
          this.drawPlayers();
          this.drawBullets();
          this.drawGrenades();
          this.drawEffects();
          this.drawExplosions();
          
          // Restore context for UI elements (they should stay in screen space)
          this.ctx.restore();
          
          // Restore screen shake transform
          this.ctx.restore();
          
          // Draw UI elements in screen space
          this.drawCrosshair();
          this.drawMiniMap();
          this.drawFlashEffect();
          
          // Draw spectator-specific overlays
          if (this.game.spectatorMode) {
            this.drawSpectatorOverlay();
          }
        }
        
        drawSpectatorOverlay() {
          // Show death overlay if just died
          if (this.game.localPlayer && !this.game.localPlayer.alive && !this.game.localPlayer.spectating) {
            const deathOverlay = document.getElementById('death-overlay');
            if (deathOverlay) {
              deathOverlay.style.display = 'block';
              setTimeout(() => {
                deathOverlay.style.display = 'none';
              }, 3000);
            }
          }
          
          // Show spectator UI
          const spectatorOverlay = document.getElementById('spectator-overlay');
          if (spectatorOverlay) {
            spectatorOverlay.style.display = this.game.spectatorMode ? 'block' : 'none';
          }
          
          // Update spectator info
          if (this.game.spectatorMode && this.game.spectatorTarget) {
            const target = this.game.gameState.players[this.game.spectatorTarget];
            if (target) {
              const nameEl = document.getElementById('spectator-target-name');
              const healthEl = document.getElementById('spectator-target-health');
              const armorEl = document.getElementById('spectator-target-armor');
              const moneyEl = document.getElementById('spectator-target-money');
              
              if (nameEl) nameEl.textContent = target.name || 'Unknown';
              if (healthEl) healthEl.textContent = `${target.health} HP`;
              if (armorEl) armorEl.textContent = `${target.armor} Armor`;
              if (moneyEl) moneyEl.textContent = `$${target.money}`;
            }
          }
          
          // Update spectator mode indicator
          const statusEl = document.getElementById('spectator-status');
          if (statusEl) {
            statusEl.textContent = this.game.freeCamera ? 'FREE CAMERA' : 'SPECTATING';
          }
        }
        
        drawMap() {
          // Draw map grid
          this.ctx.strokeStyle = '#333';
          this.ctx.lineWidth = 1;
          
          for (let x = 0; x <= 1280; x += 40) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, 720);
            this.ctx.stroke();
          }
          
          for (let y = 0; y <= 720; y += 40) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(1280, y);
            this.ctx.stroke();
          }
          
          // Draw map boundaries
          this.ctx.fillStyle = '#444';
          this.ctx.fillRect(0, 0, 1280, 20);  // Top wall
          this.ctx.fillRect(0, 700, 1280, 20); // Bottom wall
          this.ctx.fillRect(0, 0, 20, 720);    // Left wall
          this.ctx.fillRect(1260, 0, 20, 720); // Right wall
          
          // Draw dynamic walls from map data
          this.drawWalls();
        }
        
        drawBombSites() {
          if (!this.game.gameState.current_map_data || !this.game.gameState.current_map_data.bomb_sites) {
            // Fallback to hardcoded positions
            this.drawBombSite(200, 200, 'A', this.game.gameState.bomb_site === 'A');
            this.drawBombSite(1080, 520, 'B', this.game.gameState.bomb_site === 'B');
            return;
          }
          
          // Use dynamic map data
          const bombSites = this.game.gameState.current_map_data.bomb_sites;
          for (const [siteName, siteData] of Object.entries(bombSites)) {
            this.drawBombSite(siteData.x, siteData.y, siteName, 
              this.game.gameState.bomb_site === siteName, siteData.radius);
          }
        }
        
        drawBombSite(x, y, label, hasBomb, radius = 60) {
          // Draw bomb site area
          this.ctx.fillStyle = hasBomb ? 'rgba(255, 0, 0, 0.2)' : 'rgba(255, 255, 0, 0.1)';
          this.ctx.strokeStyle = hasBomb ? 'rgba(255, 0, 0, 0.8)' : 'rgba(255, 255, 0, 0.5)';
          this.ctx.lineWidth = 2;
          
          this.ctx.beginPath();
          this.ctx.arc(x, y, radius, 0, Math.PI * 2);
          this.ctx.fill();
          this.ctx.stroke();
          
          // Draw label
          this.ctx.fillStyle = hasBomb ? '#f00' : '#ff0';
          this.ctx.font = 'bold 24px Arial';
          this.ctx.textAlign = 'center';
          this.ctx.textBaseline = 'middle';
          this.ctx.fillText(label, x, y);
          
          // Draw bomb if planted
          if (hasBomb && this.game.gameState.bomb_planted) {
            // Pulsing bomb indicator
            const pulse = Math.sin(Date.now() * 0.01) * 0.2 + 0.8;
            this.ctx.fillStyle = `rgba(255, 0, 0, ${pulse})`;
            this.ctx.beginPath();
            this.ctx.arc(x, y + 30, 10, 0, Math.PI * 2);
            this.ctx.fill();
            
            // Timer
            if (this.game.gameState.bomb_timer) {
              this.ctx.fillStyle = '#fff';
              this.ctx.font = 'bold 16px monospace';
              this.ctx.fillText(this.game.gameState.bomb_timer + 's', x, y - 30);
            }
          }
        }
        
        drawWalls() {
          if (!this.game.gameState.current_map_data || !this.game.gameState.current_map_data.walls) {
            // Fallback walls for original map
            this.ctx.fillStyle = '#666';
            this.ctx.fillRect(400, 100, 80, 200);
            this.ctx.fillRect(800, 100, 80, 200);
            this.ctx.fillRect(300, 400, 200, 80);
            this.ctx.fillRect(780, 400, 200, 80);
            this.ctx.fillRect(100, 300, 100, 40);
            this.ctx.fillRect(1080, 300, 100, 40);
            this.ctx.fillRect(590, 200, 100, 20);
            this.ctx.fillRect(590, 500, 100, 20);
            this.ctx.fillRect(640, 220, 20, 280);
            return;
          }
          
          // Draw dynamic walls from map data
          this.ctx.strokeStyle = '#666';
          this.ctx.lineWidth = 8;
          this.ctx.lineCap = 'round';
          
          const walls = this.game.gameState.current_map_data.walls;
          walls.forEach(wall => {
            const [x1, y1, x2, y2] = wall;
            this.ctx.beginPath();
            this.ctx.moveTo(x1, y1);
            this.ctx.lineTo(x2, y2);
            this.ctx.stroke();
          });
        }
        
        drawPlayers() {
          Object.values(this.game.gameState.players).forEach(player => {
            if (!player.alive) return;
            if (!this.game.frustumCuller.isInView(player.x, player.y)) return;
            
            this.drawPlayer(player);
          });
        }
        
        drawPlayer(player) {
          const isLocal = player.id === this.game.playerId;
          const color = player.team === 'ct' ? '#5B9BD5' : '#FFA500';
          
          // Player shadow
          this.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
          this.ctx.beginPath();
          this.ctx.ellipse(player.x, player.y + 5, 18, 8, 0, 0, Math.PI * 2);
          this.ctx.fill();
          
          // Player body
          this.ctx.fillStyle = isLocal ? '#0f0' : color;
          this.ctx.strokeStyle = isLocal ? '#fff' : '#000';
          this.ctx.lineWidth = 2;
          
          this.ctx.beginPath();
          this.ctx.arc(player.x, player.y, 15, 0, Math.PI * 2);
          this.ctx.fill();
          this.ctx.stroke();
          
          // Weapon direction
          this.ctx.strokeStyle = '#fff';
          this.ctx.lineWidth = 3;
          this.ctx.beginPath();
          this.ctx.moveTo(player.x, player.y);
          this.ctx.lineTo(
            player.x + Math.cos(player.angle || 0) * 25,
            player.y + Math.sin(player.angle || 0) * 25
          );
          this.ctx.stroke();
          
          // Player name
          if (!isLocal) {
            this.ctx.fillStyle = '#fff';
            this.ctx.font = '12px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(player.name, player.x, player.y - 25);
          }
          
          // Health bar
          if (!isLocal && player.health < 100) {
            const barWidth = 30;
            const barHeight = 4;
            
            this.ctx.fillStyle = 'rgba(0,0,0,0.5)';
            this.ctx.fillRect(player.x - barWidth/2, player.y - 20, barWidth, barHeight);
            
            const healthColor = player.health > 66 ? '#0f0' : player.health > 33 ? '#fa0' : '#f00';
            this.ctx.fillStyle = healthColor;
            this.ctx.fillRect(player.x - barWidth/2, player.y - 20, barWidth * (player.health/100), barHeight);
          }
          
          // Bomb carrier indicator
          if (player.has_bomb) {
            this.ctx.fillStyle = '#ff0';
            this.ctx.font = 'bold 16px Arial';
            this.ctx.fillText('💣', player.x, player.y + 30);
          }
          
          // Defuse kit indicator
          if (player.has_defuse_kit) {
            this.ctx.fillStyle = '#0ff';
            this.ctx.font = '12px Arial';
            this.ctx.fillText('🔧', player.x + 20, player.y);
          }
        }
        
        drawHostages() {
          if (!this.game.gameState.hostages) return;
          
          Object.values(this.game.gameState.hostages).forEach(hostage => {
            if (hostage.health <= 0) {
              this.drawDeadHostage(hostage);
            } else {
              this.drawHostage(hostage);
            }
          });
        }
        
        drawHostage(hostage) {
          if (!this.game.frustumCuller.isInView(hostage.x, hostage.y)) return;
          
          // Hostage shadow
          this.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
          this.ctx.beginPath();
          this.ctx.ellipse(hostage.x, hostage.y + 5, 12, 6, 0, 0, Math.PI * 2);
          this.ctx.fill();
          
          // Hostage body - color depends on state
          let bodyColor = '#4169E1'; // Default blue
          if (hostage.being_rescued) {
            bodyColor = '#32CD32'; // Green when being rescued
          } else if (hostage.fear_level > 0.5) {
            bodyColor = '#FF6347'; // Red when afraid
          }
          
          this.ctx.fillStyle = bodyColor;
          this.ctx.strokeStyle = '#000';
          this.ctx.lineWidth = 2;
          
          this.ctx.beginPath();
          this.ctx.arc(hostage.x, hostage.y, 12, 0, Math.PI * 2);
          this.ctx.fill();
          this.ctx.stroke();
          
          // Hostage icon
          this.ctx.fillStyle = '#fff';
          this.ctx.font = '16px Arial';
          this.ctx.textAlign = 'center';
          this.ctx.fillText('H', hostage.x, hostage.y + 5);
          
          // Health bar
          if (hostage.health < 100) {
            const barWidth = 24;
            const barHeight = 4;
            const healthPercent = hostage.health / 100;
            
            // Background
            this.ctx.fillStyle = 'rgba(255, 0, 0, 0.7)';
            this.ctx.fillRect(hostage.x - barWidth/2, hostage.y - 20, barWidth, barHeight);
            
            // Health
            this.ctx.fillStyle = 'rgba(0, 255, 0, 0.9)';
            this.ctx.fillRect(hostage.x - barWidth/2, hostage.y - 20, barWidth * healthPercent, barHeight);
            
            // Border
            this.ctx.strokeStyle = '#000';
            this.ctx.lineWidth = 1;
            this.ctx.strokeRect(hostage.x - barWidth/2, hostage.y - 20, barWidth, barHeight);
          }
          
          // Being rescued indicator
          if (hostage.being_rescued) {
            this.ctx.fillStyle = '#32CD32';
            this.ctx.font = '12px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('RESCUE', hostage.x, hostage.y - 30);
          }
          
          // Fear level indicator (for debugging/visual feedback)
          if (hostage.fear_level > 0.3) {
            const fearIntensity = Math.min(hostage.fear_level, 1.0);
            this.ctx.fillStyle = `rgba(255, 0, 0, ${fearIntensity * 0.3})`;
            this.ctx.beginPath();
            this.ctx.arc(hostage.x, hostage.y, 15 + fearIntensity * 5, 0, Math.PI * 2);
            this.ctx.fill();
          }
        }
        
        drawDeadHostage(hostage) {
          if (!this.game.frustumCuller.isInView(hostage.x, hostage.y)) return;
          
          // Dead hostage body
          this.ctx.fillStyle = '#666';
          this.ctx.strokeStyle = '#000';
          this.ctx.lineWidth = 2;
          
          this.ctx.beginPath();
          this.ctx.arc(hostage.x, hostage.y, 12, 0, Math.PI * 2);
          this.ctx.fill();
          this.ctx.stroke();
          
          // X mark for dead
          this.ctx.strokeStyle = '#ff0000';
          this.ctx.lineWidth = 3;
          this.ctx.beginPath();
          this.ctx.moveTo(hostage.x - 8, hostage.y - 8);
          this.ctx.lineTo(hostage.x + 8, hostage.y + 8);
          this.ctx.moveTo(hostage.x + 8, hostage.y - 8);
          this.ctx.lineTo(hostage.x - 8, hostage.y + 8);
          this.ctx.stroke();
        }
        
        drawRescueZones() {
          if (!this.game.gameState.current_map_data || 
              !this.game.gameState.current_map_data.rescue_zones) return;
          
          this.game.gameState.current_map_data.rescue_zones.forEach(zone => {
            if (!this.game.frustumCuller.isInView(zone.x, zone.y)) return;
            
            // Rescue zone circle
            this.ctx.strokeStyle = '#32CD32';
            this.ctx.fillStyle = 'rgba(50, 205, 50, 0.1)';
            this.ctx.lineWidth = 3;
            
            this.ctx.beginPath();
            this.ctx.arc(zone.x, zone.y, zone.radius, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.stroke();
            
            // Rescue zone label
            this.ctx.fillStyle = '#32CD32';
            this.ctx.font = 'bold 18px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('RESCUE', zone.x, zone.y + 5);
          });
        }
        
        drawBullets() {
          // Draw bullet trails
          this.ctx.strokeStyle = 'rgba(255, 255, 0, 0.8)';
          this.ctx.lineWidth = 1;
          
          this.bulletTrails.forEach((trail, index) => {
            const alpha = 1 - (Date.now() - trail.time) / 100;
            if (alpha <= 0) {
              this.bulletTrails.splice(index, 1);
              return;
            }
            
            this.ctx.strokeStyle = `rgba(255, 255, 0, ${alpha})`;
            this.ctx.beginPath();
            this.ctx.moveTo(trail.x1, trail.y1);
            this.ctx.lineTo(trail.x2, trail.y2);
            this.ctx.stroke();
          });
        }
        
        drawGrenades() {
          // Draw trajectory prediction first
          this.drawTrajectoryPreview();
          
          // Draw thrown grenades
          if (!this.game.gameState.grenades) return;
          
          this.game.gameState.grenades.forEach(grenade => {
            // Grenade body with enhanced visuals
            let color = '#888';
            let glowColor = 'rgba(255, 255, 255, 0.3)';
            
            if (grenade.type === 'flashbang') {
              color = '#fff';
              glowColor = 'rgba(255, 255, 255, 0.6)';
            } else if (grenade.type === 'hegrenade') {
              color = '#f00';
              glowColor = 'rgba(255, 0, 0, 0.6)';
            } else if (grenade.type === 'smokegrenade') {
              color = '#888';
              glowColor = 'rgba(128, 128, 128, 0.4)';
            }
            
            // Draw glow effect
            this.ctx.shadowColor = glowColor;
            this.ctx.shadowBlur = 8;
            
            this.ctx.fillStyle = color;
            this.ctx.strokeStyle = '#000';
            this.ctx.lineWidth = 2;
            
            this.ctx.beginPath();
            this.ctx.arc(grenade.x, grenade.y, 6, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.stroke();
            
            // Reset shadow
            this.ctx.shadowBlur = 0;
            
            // Enhanced trail effect with multiple points
            if (grenade.trail_points && grenade.trail_points.length > 1) {
              this.ctx.strokeStyle = glowColor;
              this.ctx.lineWidth = 2;
              this.ctx.beginPath();
              
              grenade.trail_points.forEach((point, index) => {
                if (index === 0) {
                  this.ctx.moveTo(point.x, point.y);
                } else {
                  this.ctx.lineTo(point.x, point.y);
                }
              });
              
              this.ctx.stroke();
            }
            
            // Rotation effect
            if (grenade.rotation !== undefined) {
              this.ctx.save();
              this.ctx.translate(grenade.x, grenade.y);
              this.ctx.rotate(grenade.rotation);
              
              // Draw small rotation indicator
              this.ctx.strokeStyle = '#000';
              this.ctx.lineWidth = 1;
              this.ctx.beginPath();
              this.ctx.moveTo(-3, 0);
              this.ctx.lineTo(3, 0);
              this.ctx.stroke();
              
              this.ctx.restore();
            }
            
            // Timer indicator for cooked grenades
            if (grenade.timer < 2.0) {
              const radius = 12;
              const angle = (grenade.timer / 2.0) * Math.PI * 2;
              
              this.ctx.strokeStyle = '#ff0000';
              this.ctx.lineWidth = 3;
              this.ctx.beginPath();
              this.ctx.arc(grenade.x, grenade.y, radius, -Math.PI/2, -Math.PI/2 + angle);
              this.ctx.stroke();
            }
          });
        }
        
        drawTrajectoryPreview() {
          if (!this.game.showTrajectoryPreview || !this.game.input.cookingGrenade) return;
          
          const localPlayer = this.game.gameState.players[this.game.playerId];
          if (!localPlayer) return;
          
          const angle = this.game.input.getThrowAngle();
          const power = this.game.input.getThrowPower();
          
          // Simulate trajectory
          const trajectory = this.calculateTrajectory(localPlayer.x, localPlayer.y, angle, power);
          
          // Draw trajectory line
          this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
          this.ctx.lineWidth = 2;
          this.ctx.setLineDash([5, 5]);
          this.ctx.beginPath();
          
          trajectory.forEach((point, index) => {
            if (index === 0) {
              this.ctx.moveTo(point.x, point.y);
            } else {
              this.ctx.lineTo(point.x, point.y);
            }
          });
          
          this.ctx.stroke();
          this.ctx.setLineDash([]);
          
          // Draw impact point
          if (trajectory.length > 0) {
            const lastPoint = trajectory[trajectory.length - 1];
            this.ctx.fillStyle = 'rgba(255, 0, 0, 0.8)';
            this.ctx.beginPath();
            this.ctx.arc(lastPoint.x, lastPoint.y, 8, 0, Math.PI * 2);
            this.ctx.fill();
          }
          
          // Draw cooking timer indicator
          if (this.game.input.cookingGrenade) {
            const cookTime = (Date.now() - this.game.input.cookingGrenade.startTime) / 1000;
            const maxCookTime = this.game.input.cookingGrenade.maxCookTime;
            const cookProgress = Math.min(cookTime / maxCookTime, 1.0);
            
            // Draw timer circle around player
            const radius = 30;
            const angle = cookProgress * Math.PI * 2;
            
            this.ctx.strokeStyle = cookProgress > 0.8 ? '#ff0000' : '#ffff00';
            this.ctx.lineWidth = 4;
            this.ctx.beginPath();
            this.ctx.arc(localPlayer.x, localPlayer.y, radius, -Math.PI/2, -Math.PI/2 + angle);
            this.ctx.stroke();
          }
        }
        
        calculateTrajectory(startX, startY, angle, power) {
          const points = [];
          const dt = 0.05;
          const maxTime = 5.0;
          const gravity = 200;
          const baseVelocity = 400 * power;
          
          let x = startX + Math.cos(angle) * 25;
          let y = startY + Math.sin(angle) * 25;
          let vx = Math.cos(angle) * baseVelocity;
          let vy = Math.sin(angle) * baseVelocity;
          
          for (let t = 0; t < maxTime; t += dt) {
            points.push({ x: x, y: y });
            
            // Check for collision with boundaries
            if (x < 0 || x > 1280 || y < 0 || y > 720) {
              break;
            }
            
            // Update physics
            vy += gravity * dt;
            x += vx * dt;
            y += vy * dt;
            
            // Simple collision detection (bounce once)
            if (x < 0 || x > 1280) {
              vx *= -0.6;
              x = Math.max(0, Math.min(1280, x));
            }
            if (y < 0 || y > 720) {
              vy *= -0.6;
              y = Math.max(0, Math.min(720, y));
            }
            
            // Limit points to prevent performance issues
            if (points.length > 100) break;
          }
          
          return points;
        }
        
        drawDroppedWeapons() {
          // Draw weapons on ground
          if (!this.game.gameState.dropped_weapons) return;
          
          this.game.gameState.dropped_weapons.forEach(weapon => {
            // Weapon box
            this.ctx.fillStyle = 'rgba(255, 255, 0, 0.3)';
            this.ctx.strokeStyle = '#ff0';
            this.ctx.lineWidth = 2;
            
            this.ctx.fillRect(weapon.x - 15, weapon.y - 10, 30, 20);
            this.ctx.strokeRect(weapon.x - 15, weapon.y - 10, 30, 20);
            
            // Weapon name
            this.ctx.fillStyle = '#fff';
            this.ctx.font = '10px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(weapon.weapon.toUpperCase(), weapon.x, weapon.y);
          });
        }
        
        drawEffects() {
          // Draw smoke clouds
          this.smokeClouds.forEach((smoke, index) => {
            const age = Date.now() - smoke.time;
            if (age > 15000) {
              this.smokeClouds.splice(index, 1);
              return;
            }
            
            const alpha = Math.min(1, age / 1000) * Math.max(0, 1 - age / 15000);
            const radius = 50 + age / 100;
            
            this.ctx.fillStyle = `rgba(128, 128, 128, ${alpha * 0.5})`;
            this.ctx.beginPath();
            this.ctx.arc(smoke.x, smoke.y, radius, 0, Math.PI * 2);
            this.ctx.fill();
          });
          
          // Draw blood splatters
          this.bloodSplatters.forEach((blood, index) => {
            const age = Date.now() - blood.time;
            if (age > 5000) {
              this.bloodSplatters.splice(index, 1);
              return;
            }
            
            const alpha = 1 - age / 5000;
            this.ctx.fillStyle = `rgba(150, 0, 0, ${alpha})`;
            this.ctx.beginPath();
            this.ctx.arc(blood.x, blood.y, 5, 0, Math.PI * 2);
            this.ctx.fill();
          });
        }
        
        drawCrosshair() {
          const localPlayer = this.game.gameState.players[this.game.playerId];
          if (!localPlayer || !localPlayer.alive) return;
          
          const mouseX = this.game.input.mouseX;
          const mouseY = this.game.input.mouseY;
          
          this.ctx.strokeStyle = '#0f0';
          this.ctx.lineWidth = 2;
          
          // Draw crosshair lines
          this.ctx.beginPath();
          this.ctx.moveTo(mouseX - 15, mouseY);
          this.ctx.lineTo(mouseX - 5, mouseY);
          this.ctx.moveTo(mouseX + 5, mouseY);
          this.ctx.lineTo(mouseX + 15, mouseY);
          this.ctx.moveTo(mouseX, mouseY - 15);
          this.ctx.lineTo(mouseX, mouseY - 5);
          this.ctx.moveTo(mouseX, mouseY + 5);
          this.ctx.lineTo(mouseX, mouseY + 15);
          this.ctx.stroke();
        }
        
        drawMiniMap() {
          const mapSize = 150;
          const mapX = this.canvas.width - mapSize - 20;
          const mapY = 20;
          const scale = mapSize / 1280;
          
          // Background
          this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
          this.ctx.fillRect(mapX, mapY, mapSize, mapSize * (720/1280));
          
          // Border
          this.ctx.strokeStyle = '#666';
          this.ctx.lineWidth = 2;
          this.ctx.strokeRect(mapX, mapY, mapSize, mapSize * (720/1280));
          
          // Draw dynamic map features
          this.drawMinimapWalls(mapX, mapY, scale);
          this.drawMinimapBombSites(mapX, mapY, scale);
          this.drawMinimapHostages(mapX, mapY, scale);
          this.drawMinimapRescueZones(mapX, mapY, scale);
          
          // Draw players
          Object.values(this.game.gameState.players).forEach(player => {
            if (!player.alive) return;
            
            const isLocal = player.id === this.game.playerId;
            const color = isLocal ? '#0f0' : (player.team === 'ct' ? '#5B9BD5' : '#FFA500');
            
            this.ctx.fillStyle = color;
            this.ctx.beginPath();
            this.ctx.arc(
              mapX + player.x * scale,
              mapY + player.y * scale,
              isLocal ? 4 : 3,
              0,
              Math.PI * 2
            );
            this.ctx.fill();
            
            // Draw view direction for local player
            if (isLocal) {
              this.ctx.strokeStyle = color;
              this.ctx.lineWidth = 1;
              this.ctx.beginPath();
              this.ctx.moveTo(mapX + player.x * scale, mapY + player.y * scale);
              this.ctx.lineTo(
                mapX + (player.x + Math.cos(player.angle || 0) * 50) * scale,
                mapY + (player.y + Math.sin(player.angle || 0) * 50) * scale
              );
              this.ctx.stroke();
            }
          });
          
          // Draw bomb if planted
          if (this.game.gameState.bomb_planted && this.game.gameState.bomb_position) {
            const pulse = Math.sin(Date.now() * 0.01) * 0.3 + 0.7;
            this.ctx.fillStyle = `rgba(255, 0, 0, ${pulse})`;
            this.ctx.beginPath();
            this.ctx.arc(
              mapX + this.game.gameState.bomb_position.x * scale,
              mapY + this.game.gameState.bomb_position.y * scale,
              5,
              0,
              Math.PI * 2
            );
            this.ctx.fill();
          }
        }
        
        drawMinimapWalls(mapX, mapY, scale) {
          if (!this.game.gameState.current_map_data || !this.game.gameState.current_map_data.walls) {
            // Fallback walls for original map
            this.ctx.fillStyle = '#333';
            const fallbackWalls = [
              [400, 100, 80, 200], [800, 100, 80, 200], [300, 400, 200, 80],
              [780, 400, 200, 80], [590, 200, 100, 20], [590, 500, 100, 20], [640, 220, 20, 280]
            ];
            fallbackWalls.forEach(wall => {
              this.ctx.fillRect(mapX + wall[0] * scale, mapY + wall[1] * scale, wall[2] * scale, wall[3] * scale);
            });
            return;
          }
          
          // Draw dynamic walls as lines on minimap
          this.ctx.strokeStyle = '#666';
          this.ctx.lineWidth = 2;
          
          const walls = this.game.gameState.current_map_data.walls;
          walls.forEach(wall => {
            const [x1, y1, x2, y2] = wall;
            this.ctx.beginPath();
            this.ctx.moveTo(mapX + x1 * scale, mapY + y1 * scale);
            this.ctx.lineTo(mapX + x2 * scale, mapY + y2 * scale);
            this.ctx.stroke();
          });
        }
        
        drawMinimapBombSites(mapX, mapY, scale) {
          if (!this.game.gameState.current_map_data || !this.game.gameState.current_map_data.bomb_sites) {
            // Fallback bomb sites
            this.ctx.fillStyle = 'rgba(255, 255, 0, 0.5)';
            this.ctx.beginPath();
            this.ctx.arc(mapX + 200 * scale, mapY + 200 * scale, 8, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.fillStyle = '#ff0';
            this.ctx.font = '10px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('A', mapX + 200 * scale, mapY + 200 * scale + 3);
            
            this.ctx.fillStyle = 'rgba(255, 255, 0, 0.5)';
            this.ctx.beginPath();
            this.ctx.arc(mapX + 1080 * scale, mapY + 520 * scale, 8, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.fillText('B', mapX + 1080 * scale, mapY + 520 * scale + 3);
            return;
          }
          
          // Draw dynamic bomb sites
          const bombSites = this.game.gameState.current_map_data.bomb_sites;
          for (const [siteName, siteData] of Object.entries(bombSites)) {
            const planted = this.game.gameState.bomb_site === siteName;
            this.ctx.fillStyle = planted ? 'rgba(255, 0, 0, 0.7)' : 'rgba(255, 255, 0, 0.5)';
            this.ctx.beginPath();
            this.ctx.arc(mapX + siteData.x * scale, mapY + siteData.y * scale, 8, 0, Math.PI * 2);
            this.ctx.fill();
            
            this.ctx.fillStyle = planted ? '#f00' : '#ff0';
            this.ctx.font = '10px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(siteName, mapX + siteData.x * scale, mapY + siteData.y * scale + 3);
          }
        }
        
        drawMinimapHostages(mapX, mapY, scale) {
          if (!this.game.gameState.hostages) return;
          
          Object.values(this.game.gameState.hostages).forEach(hostage => {
            if (hostage.health <= 0) {
              // Dead hostage - gray with X
              this.ctx.fillStyle = 'rgba(100, 100, 100, 0.8)';
              this.ctx.beginPath();
              this.ctx.arc(mapX + hostage.x * scale, mapY + hostage.y * scale, 4, 0, Math.PI * 2);
              this.ctx.fill();
              
              this.ctx.strokeStyle = '#ff0000';
              this.ctx.lineWidth = 1;
              this.ctx.beginPath();
              this.ctx.moveTo(mapX + hostage.x * scale - 3, mapY + hostage.y * scale - 3);
              this.ctx.lineTo(mapX + hostage.x * scale + 3, mapY + hostage.y * scale + 3);
              this.ctx.moveTo(mapX + hostage.x * scale + 3, mapY + hostage.y * scale - 3);
              this.ctx.lineTo(mapX + hostage.x * scale - 3, mapY + hostage.y * scale + 3);
              this.ctx.stroke();
            } else if (hostage.rescued) {
              // Rescued hostage - green
              this.ctx.fillStyle = 'rgba(50, 205, 50, 0.8)';
              this.ctx.beginPath();
              this.ctx.arc(mapX + hostage.x * scale, mapY + hostage.y * scale, 4, 0, Math.PI * 2);
              this.ctx.fill();
            } else if (hostage.being_rescued) {
              // Being rescued - yellow/green
              this.ctx.fillStyle = 'rgba(255, 215, 0, 0.8)';
              this.ctx.beginPath();
              this.ctx.arc(mapX + hostage.x * scale, mapY + hostage.y * scale, 4, 0, Math.PI * 2);
              this.ctx.fill();
            } else {
              // Normal hostage - blue
              this.ctx.fillStyle = 'rgba(65, 105, 225, 0.8)';
              this.ctx.beginPath();
              this.ctx.arc(mapX + hostage.x * scale, mapY + hostage.y * scale, 4, 0, Math.PI * 2);
              this.ctx.fill();
            }
            
            // Small 'H' label
            this.ctx.fillStyle = '#fff';
            this.ctx.font = '8px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('H', mapX + hostage.x * scale, mapY + hostage.y * scale + 2);
          });
        }
        
        drawMinimapRescueZones(mapX, mapY, scale) {
          if (!this.game.gameState.current_map_data || 
              !this.game.gameState.current_map_data.rescue_zones) return;
          
          this.game.gameState.current_map_data.rescue_zones.forEach(zone => {
            // Rescue zone circle
            this.ctx.strokeStyle = 'rgba(50, 205, 50, 0.6)';
            this.ctx.fillStyle = 'rgba(50, 205, 50, 0.2)';
            this.ctx.lineWidth = 1;
            
            this.ctx.beginPath();
            this.ctx.arc(mapX + zone.x * scale, mapY + zone.y * scale, zone.radius * scale, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.stroke();
            
            // 'R' label
            this.ctx.fillStyle = '#32CD32';
            this.ctx.font = '10px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('R', mapX + zone.x * scale, mapY + zone.y * scale + 3);
          });
        }
        
        drawFlashEffect() {
          if (this.flashAlpha > 0) {
            this.ctx.fillStyle = `rgba(255, 255, 255, ${this.flashAlpha})`;
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            this.flashAlpha -= 0.02;
          }
        }
        
        flashEffect(intensity) {
          this.flashAlpha = intensity;
        }
        
        addSmoke(x, y) {
          this.smokeClouds.push({ x, y, time: Date.now() });
        }
        
        addBlood(x, y) {
          this.bloodSplatters.push({ x, y, time: Date.now() });
        }
        
        addBulletTrail(x1, y1, x2, y2) {
          this.bulletTrails.push({ x1, y1, x2, y2, time: Date.now() });
        }
        
        addScreenShake(intensity) {
          this.screenShake = {
            intensity: intensity,
            duration: intensity * 500, // 500ms per intensity unit
            startTime: Date.now()
          };
        }
        
        updateScreenShake() {
          if (!this.screenShake) return { x: 0, y: 0 };
          
          const elapsed = Date.now() - this.screenShake.startTime;
          if (elapsed > this.screenShake.duration) {
            this.screenShake = null;
            return { x: 0, y: 0 };
          }
          
          const progress = elapsed / this.screenShake.duration;
          const currentIntensity = this.screenShake.intensity * (1 - progress);
          
          return {
            x: (Math.random() - 0.5) * currentIntensity * 20,
            y: (Math.random() - 0.5) * currentIntensity * 20
          };
        }
        
        drawExplosions() {
          this.explosions = this.explosions || [];
          
          this.explosions.forEach((explosion, index) => {
            const age = Date.now() - explosion.time;
            if (age > explosion.duration) {
              this.explosions.splice(index, 1);
              return;
            }
            
            const progress = age / explosion.duration;
            const alpha = Math.max(0, 1 - progress);
            const radius = explosion.size * (1 + progress * 2);
            
            // Main explosion circle
            this.ctx.fillStyle = `rgba(255, ${255 - progress * 200}, 0, ${alpha * 0.8})`;
            this.ctx.beginPath();
            this.ctx.arc(explosion.x, explosion.y, radius, 0, Math.PI * 2);
            this.ctx.fill();
            
            // Inner bright core
            this.ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
            this.ctx.beginPath();
            this.ctx.arc(explosion.x, explosion.y, radius * 0.3, 0, Math.PI * 2);
            this.ctx.fill();
            
            // Sparks/debris effect
            for (let i = 0; i < 8; i++) {
              const angle = (i / 8) * Math.PI * 2;
              const sparkDistance = radius * (0.5 + progress);
              const sparkX = explosion.x + Math.cos(angle) * sparkDistance;
              const sparkY = explosion.y + Math.sin(angle) * sparkDistance;
              
              this.ctx.fillStyle = `rgba(255, 200, 0, ${alpha * 0.6})`;
              this.ctx.beginPath();
              this.ctx.arc(sparkX, sparkY, 2, 0, Math.PI * 2);
              this.ctx.fill();
            }
          });
        }
      }
    JAVASCRIPT
  end
  
  def game_network_script
    <<~JAVASCRIPT
      class NetworkManager {
        constructor(game) {
          this.game = game;
        }
        
        sendEvent(type, data) {
          const element = document.getElementById('cs2d-container');
          if (element && element.live) {
            // Use the live instance attached to the element
            element.live.forward({
              type: type,
              ...data
            });
          } else {
            console.warn('Live.js not properly initialized on element');
          }
        }
        
        sendMovement(dx, dy) {
          this.sendEvent('player_move', { dx, dy });
        }
        
        sendShoot(angle) {
          this.sendEvent('player_shoot', { angle });
        }
        
        sendReload() {
          this.sendEvent('player_reload', {});
        }
        
        sendBuyWeapon(weapon) {
          this.sendEvent('buy_weapon', { weapon });
        }
        
        sendPlantBomb() {
          this.sendEvent('plant_bomb', {});
        }
        
        sendDefuseBomb() {
          this.sendEvent('defuse_bomb', {});
        }
        
        sendChat(message) {
          this.sendEvent('chat_message', { message });
        }
        
        sendThrowGrenade(type, angle, power, cookTime) {
          this.sendEvent('throw_grenade', { 
            grenade_type: type,
            angle: angle,
            power: power,
            cook_time: cookTime || 0
          });
        }
      }
    JAVASCRIPT
  end
  
  def game_audio_script
    <<~JAVASCRIPT
      class AudioManager {
        constructor(game) {
          this.game = game;
          this.sounds = {};
          this.loadSounds();
        }
        
        loadSounds() {
          const soundNames = [
            'shoot', 'reload', 'buy', 'death', 'bomb_plant', 
            'bomb_defuse', 'bomb_beep', 'bomb_explode', 
            'grenade_throw', 'grenade_pin', 'grenade_bounce',
            'flashbang', 'flashbang_explode', 'hegrenade_explode', 
            'smokegrenade_explode', 'footstep',
            'hostage_rescue', 'hostage_follow', 'hostage_hurt', 'hostage_death',
            'rescue_zone'
          ];
          
          soundNames.forEach(name => {
            this.sounds[name] = new Audio(`/_static/sounds/${name}.mp3`);
            this.sounds[name].preload = 'auto';
          });
        }
        
        play(soundName) {
          if (this.sounds[soundName]) {
            const sound = this.sounds[soundName].cloneNode();
            sound.volume = 0.5;
            sound.play().catch(e => console.log('Audio play failed:', e));
          }
        }
        
        playFootstep() {
          // Play footstep with variation
          this.play('footstep');
        }
      }
    JAVASCRIPT
  end
  
  def game_input_script
    <<~JAVASCRIPT
      class InputManager {
        constructor(game) {
          this.game = game;
          this.keys = {};
          this.mouseX = 0;
          this.mouseY = 0;
          this.mouseDown = false;
          
          this.lastShootTime = 0;
          this.shootCooldown = 100;
          
          // Grenade cooking system
          this.cookingGrenade = null;
          this.grenadeKeys = { 'f': 'flashbang', 'h': 'hegrenade', 's': 'smokegrenade' };
          
          this.setupEventListeners();
        }
        
        setupEventListeners() {
          // Keyboard
          document.addEventListener('keydown', (e) => this.handleKeyDown(e));
          document.addEventListener('keyup', (e) => this.handleKeyUp(e));
          
          // Mouse
          this.game.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
          this.game.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
          this.game.canvas.addEventListener('mouseup', (e) => this.handleMouseUp(e));
          this.game.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
          
          // Focus canvas
          this.game.canvas.focus();
        }
        
        handleKeyDown(e) {
          const key = e.key.toLowerCase();
          this.keys[key] = true;
          
          // Prevent default for game keys
          if (['w','a','s','d','b','t','tab','g','e','f','arrowleft','arrowright',' '].includes(key)) {
            e.preventDefault();
          }
          
          // Handle spectator controls first
          if (this.game.spectatorMode) {
            switch(key) {
              case 'arrowleft':
                this.game.network.sendEvent('spectator_prev');
                break;
              case 'arrowright':
                this.game.network.sendEvent('spectator_next');
                break;
              case ' ': // Space bar
                this.game.network.sendEvent('spectator_free_cam', { 
                  x: this.game.camera.x, 
                  y: this.game.camera.y 
                });
                break;
              case 'f':
                // Switch back to follow mode
                if (this.game.freeCamera) {
                  this.game.network.sendEvent('spectator_next');
                }
                break;
              case 't':
                this.game.ui.openChat();
                break;
              case 'tab':
                this.game.ui.showScoreboard();
                break;
            }
            return; // Don't process other keys in spectator mode
          }
          
          // Handle specific keys (only if not spectating)
          switch(key) {
            case 'b':
              this.game.ui.toggleBuyMenu();
              break;
            case 't':
              this.game.ui.openChat();
              break;
            case 'tab':
              this.game.ui.showScoreboard();
              break;
            case 'r':
              this.game.network.sendReload();
              break;
            case 'g':
              this.game.network.sendEvent('drop_weapon', {});
              break;
            case 'e':
              this.tryPlantOrDefuse();
              break;
            case 'f':
            case 'h':
            case 's':
              this.startGrenadeThrow(this.grenadeKeys[key]);
              break;
            case '1':
            case '2':
            case '3':
              // Check if map voting is active first
              if (this.game.gameState.map_vote_active) {
                this.voteForMap(parseInt(key) - 1);
              } else {
                this.switchWeapon(parseInt(key) - 1);
              }
              break;
            case 'm':
              // Start map vote (admin or debug)
              this.game.network.sendEvent('start_map_vote', {});
              break;
          }
        }
        
        handleKeyUp(e) {
          const key = e.key.toLowerCase();
          this.keys[key] = false;
          
          // Handle grenade throw release
          if (['f', 'h', 's'].includes(key) && this.cookingGrenade && this.grenadeKeys[key] === this.cookingGrenade.type) {
            this.finishGrenadeThrow();
          }
          
          if (key === 'tab') {
            this.game.ui.hideScoreboard();
          }
        }
        
        handleMouseMove(e) {
          const rect = this.game.canvas.getBoundingClientRect();
          const scaleX = this.game.canvas.width / rect.width;
          const scaleY = this.game.canvas.height / rect.height;
          
          this.mouseX = (e.clientX - rect.left) * scaleX;
          this.mouseY = (e.clientY - rect.top) * scaleY;
          
          // Don't update player angle in spectator mode
          if (this.game.spectatorMode) {
            return;
          }
          
          // Update player angle
          const localPlayer = this.game.gameState.players[this.game.playerId];
          if (localPlayer && localPlayer.alive) {
            const dx = this.mouseX - localPlayer.x;
            const dy = this.mouseY - localPlayer.y;
            const angle = Math.atan2(dy, dx);
            
            this.game.network.sendEvent('player_angle', { angle });
          }
        }
        
        handleMouseDown(e) {
          // Don't handle mouse actions in spectator mode
          if (this.game.spectatorMode) {
            return;
          }
          
          if (e.button === 0) { // Left click
            this.mouseDown = true;
            this.shoot();
          } else if (e.button === 2) { // Right click
            // Cancel grenade cooking
            if (this.cookingGrenade) {
              this.cancelGrenadeThrow();
            }
          }
        }
        
        handleMouseUp(e) {
          if (e.button === 0) {
            this.mouseDown = false;
          }
        }
        
        processInput(dt) {
          const localPlayer = this.game.gameState.players[this.game.playerId];
          
          // Handle spectator free camera movement
          if (this.game.spectatorMode && this.game.freeCamera) {
            let dx = 0, dy = 0;
            const cameraSpeed = 500 * dt; // pixels per second for camera
            
            if (this.keys['w']) dy -= cameraSpeed;
            if (this.keys['s']) dy += cameraSpeed;
            if (this.keys['a']) dx -= cameraSpeed;
            if (this.keys['d']) dx += cameraSpeed;
            
            if (dx !== 0 || dy !== 0) {
              // Send camera move event
              this.game.network.sendEvent('spectator_camera_move', { dx, dy });
            }
            return;
          }
          
          // Normal player movement
          if (!localPlayer || !localPlayer.alive) return;
          
          // Movement
          let dx = 0, dy = 0;
          const speed = 300 * dt; // pixels per second
          
          if (this.keys['w']) dy -= speed;
          if (this.keys['s']) dy += speed;
          if (this.keys['a']) dx -= speed;
          if (this.keys['d']) dx += speed;
          
          if (dx !== 0 || dy !== 0) {
            // Normalize diagonal movement
            const length = Math.sqrt(dx * dx + dy * dy);
            if (length > 0) {
              dx = (dx / length) * speed;
              dy = (dy / length) * speed;
            }
            
            // Apply client prediction
            localPlayer.x += dx;
            localPlayer.y += dy;
            
            // Bounds checking
            localPlayer.x = Math.max(20, Math.min(1260, localPlayer.x));
            localPlayer.y = Math.max(20, Math.min(700, localPlayer.y));
            
            // Send to server
            this.game.network.sendMovement(dx, dy);
            
            // Play footstep sound
            if (Math.random() < 0.1) {
              this.game.audio.playFootstep();
            }
          }
          
          // Auto fire for certain weapons
          if (this.mouseDown) {
            const weapon = this.game.gameState.players[this.game.playerId].current_weapon;
            if (weapon && ['p90', 'mp5', 'ak47', 'm4a1'].includes(weapon)) {
              this.shoot();
            }
          }
        }
        
        shoot() {
          const now = Date.now();
          const localPlayer = this.game.gameState.players[this.game.playerId];
          
          if (!localPlayer || !localPlayer.alive) return;
          if (now - this.lastShootTime < this.shootCooldown) return;
          
          this.lastShootTime = now;
          
          const dx = this.mouseX - localPlayer.x;
          const dy = this.mouseY - localPlayer.y;
          const angle = Math.atan2(dy, dx);
          
          // Visual feedback
          this.game.renderer.addBulletTrail(
            localPlayer.x + Math.cos(angle) * 20,
            localPlayer.y + Math.sin(angle) * 20,
            localPlayer.x + Math.cos(angle) * 500,
            localPlayer.y + Math.sin(angle) * 500
          );
          
          this.game.network.sendShoot(angle);
        }
        
        tryPlantOrDefuse() {
          const localPlayer = this.game.gameState.players[this.game.playerId];
          if (!localPlayer || !localPlayer.alive) return;
          
          // Check for hostage rescue first (in hostage rescue mode)
          if (this.game.gameState.current_map_data && 
              this.game.gameState.current_map_data.game_mode === 'hostage_rescue' &&
              localPlayer.team === 'ct') {
            const nearbyHostage = this.findNearbyHostage(localPlayer);
            if (nearbyHostage) {
              this.game.network.sendEvent('rescue_hostage', { hostage_id: nearbyHostage.id });
              return;
            }
          }
          
          // Bomb defusal/plant logic
          if (localPlayer.team === 't' && localPlayer.has_bomb) {
            this.game.network.sendPlantBomb();
          } else if (localPlayer.team === 'ct' && this.game.gameState.bomb_planted) {
            this.game.network.sendDefuseBomb();
          }
        }
        
        findNearbyHostage(player) {
          if (!this.game.gameState.hostages) return null;
          
          for (const hostage of Object.values(this.game.gameState.hostages)) {
            if (hostage.rescued || hostage.health <= 0) continue;
            
            const distance = Math.sqrt(
              (player.x - hostage.x) ** 2 + (player.y - hostage.y) ** 2
            );
            
            if (distance < 80) {
              return hostage;
            }
          }
          
          return null;
        }
        
        startGrenadeThrow(grenadeType) {
          const localPlayer = this.game.gameState.players[this.game.playerId];
          if (!localPlayer || !localPlayer.alive) return;
          
          if (!localPlayer.grenades || !localPlayer.grenades.includes(grenadeType)) {
            return;
          }
          
          // Don't start cooking if already cooking a grenade
          if (this.cookingGrenade) return;
          
          // Start grenade cooking and trajectory preview
          this.cookingGrenade = {
            type: grenadeType,
            startTime: Date.now(),
            maxCookTime: grenadeType === 'hegrenade' ? 3.5 : 1.0 // HE grenades can be cooked longer
          };
          
          // Show trajectory preview
          this.game.showTrajectoryPreview = true;
          this.game.renderer.grenadePreview = {
            type: grenadeType,
            active: true
          };
          
          // Play pin sound
          this.game.audio.play('grenade_pin');
        }
        
        finishGrenadeThrow() {
          if (!this.cookingGrenade) return;
          
          const cookTime = Math.min(
            (Date.now() - this.cookingGrenade.startTime) / 1000,
            this.cookingGrenade.maxCookTime
          );
          
          // Calculate throw parameters
          const angle = this.getThrowAngle();
          const power = this.getThrowPower();
          
          // Send throw command
          this.game.network.sendThrowGrenade(
            this.cookingGrenade.type,
            angle,
            power,
            cookTime
          );
          
          // Clear cooking state
          this.cookingGrenade = null;
          this.game.showTrajectoryPreview = false;
          this.game.renderer.grenadePreview = null;
        }
        
        cancelGrenadeThrow() {
          if (!this.cookingGrenade) return;
          
          this.cookingGrenade = null;
          this.game.showTrajectoryPreview = false;
          this.game.renderer.grenadePreview = null;
        }
        
        getThrowAngle() {
          // Calculate angle based on mouse position
          const localPlayer = this.game.gameState.players[this.game.playerId];
          if (!localPlayer) return 0;
          
          return Math.atan2(this.mouseY - localPlayer.y, this.mouseX - localPlayer.x);
        }
        
        getThrowPower() {
          if (!this.cookingGrenade) return 1.0;
          
          // Power increases with cook time (up to 1.5x)
          const cookProgress = Math.min(
            (Date.now() - this.cookingGrenade.startTime) / 1000,
            this.cookingGrenade.maxCookTime
          ) / this.cookingGrenade.maxCookTime;
          
          return 0.7 + cookProgress * 0.8; // Range from 0.7 to 1.5
        }
        
        update() {
          // Handle grenade overcooking (auto-explode)
          if (this.cookingGrenade) {
            const cookTime = (Date.now() - this.cookingGrenade.startTime) / 1000;
            if (cookTime > this.cookingGrenade.maxCookTime) {
              // Force throw if cooked too long
              this.finishGrenadeThrow();
            }
          }
        }
        
        switchWeapon(index) {
          // Switch to weapon at index
        }
        
        voteForMap(index) {
          if (!this.game.gameState.map_vote_active || !this.game.gameState.map_vote_options) return;
          
          const mapOptions = this.game.gameState.map_vote_options;
          if (index >= 0 && index < mapOptions.length) {
            const selectedMap = mapOptions[index];
            this.game.network.sendEvent('vote_map', { map: selectedMap });
          }
        }
        
        updateMapVoteUI() {
          const voteOverlay = document.getElementById('map-vote-overlay');
          const voteOptions = document.getElementById('map-vote-options');
          const voteTimer = document.getElementById('vote-timer');
          const voteCounts = document.getElementById('vote-counts');
          
          if (!this.game.gameState.map_vote_active) {
            voteOverlay.style.display = 'none';
            return;
          }
          
          voteOverlay.style.display = 'block';
          
          // Update vote options
          if (this.game.gameState.map_vote_options) {
            voteOptions.innerHTML = '';
            this.game.gameState.map_vote_options.forEach((mapKey, index) => {
              const mapData = this.game.MAPS ? this.game.MAPS[mapKey] : { name: mapKey };
              const mapName = mapData.name || mapKey;
              const description = mapData.description || '';
              
              const optionDiv = document.createElement('div');
              optionDiv.style.cssText = `
                padding: 15px 20px; 
                border: 2px solid #666; 
                border-radius: 5px; 
                background: linear-gradient(135deg, rgba(255,255,255,0.05), rgba(255,255,255,0.1)); 
                cursor: pointer; 
                transition: all 0.2s; 
                display: flex; 
                justify-content: space-between; 
                align-items: center;
              `;
              
              optionDiv.onmouseover = () => {
                optionDiv.style.borderColor = '#ffd700';
                optionDiv.style.background = 'linear-gradient(135deg, rgba(255,215,0,0.1), rgba(255,215,0,0.2))';
              };
              optionDiv.onmouseout = () => {
                optionDiv.style.borderColor = '#666';
                optionDiv.style.background = 'linear-gradient(135deg, rgba(255,255,255,0.05), rgba(255,255,255,0.1))';
              };
              
              optionDiv.onclick = () => this.voteForMap(index);
              
              optionDiv.innerHTML = \`
                <div>
                  <div style="color: white; font-size: 18px; font-weight: bold;">\${index + 1}. \${mapName}</div>
                  <div style="color: #ccc; font-size: 14px; margin-top: 5px;">\${description}</div>
                </div>
                <div id="vote-count-\${index}" style="color: #ffd700; font-size: 16px; font-weight: bold;">0</div>
              \`;
              
              voteOptions.appendChild(optionDiv);
            });
          }
          
          // Update timer
          if (voteTimer && this.game.gameState.map_vote_timer) {
            voteTimer.textContent = \`Time remaining: \${this.game.gameState.map_vote_timer}s\`;
          }
          
          // Update vote counts
          if (this.game.gameState.map_votes) {
            const counts = {};
            Object.values(this.game.gameState.map_votes).forEach(vote => {
              counts[vote] = (counts[vote] || 0) + 1;
            });
            
            this.game.gameState.map_vote_options.forEach((mapKey, index) => {
              const countElement = document.getElementById(\`vote-count-\${index}\`);
              if (countElement) {
                countElement.textContent = counts[mapKey] || 0;
              }
            });
            
            // Update vote counts summary
            if (voteCounts) {
              const totalVotes = Object.keys(this.game.gameState.map_votes).length;
              voteCounts.textContent = \`Total votes: \${totalVotes}\`;
            }
          }
        }
        
        showMapChangeNotification(mapName) {
          const notification = document.getElementById('map-change-notification');
          const text = document.getElementById('map-change-text');
          
          if (notification && text) {
            text.textContent = \`Loading \${mapName}...\`;
            notification.style.display = 'block';
            
            setTimeout(() => {
              notification.style.display = 'none';
            }, 3000);
          }
        }
      }
    JAVASCRIPT
  end
  
  def game_ui_script
    <<~JAVASCRIPT
      class UIManager {
        constructor(game) {
          this.game = game;
          this.buyMenuOpen = false;
          this.scoreboardVisible = false;
          this.chatOpen = false;
        }
        
        update() {
          this.updateHUD();
          this.updateKillFeed();
          this.updateSpectatorList();
        }
        
        updateSpectatorUI(isSpectating, targetId) {
          const spectatorOverlay = document.getElementById('spectator-overlay');
          const spectatorList = document.getElementById('spectator-list');
          
          if (spectatorOverlay) {
            spectatorOverlay.style.display = isSpectating ? 'block' : 'none';
          }
          
          if (spectatorList && Object.keys(this.game.gameState.spectators || {}).length > 0) {
            spectatorList.style.display = 'block';
          } else if (spectatorList) {
            spectatorList.style.display = 'none';
          }
        }
        
        updateSpectatorList() {
          const spectatorCount = document.getElementById('spectator-count');
          const spectatorNames = document.getElementById('spectator-names');
          
          const spectators = Object.values(this.game.gameState.spectators || {});
          
          if (spectatorCount) {
            spectatorCount.textContent = `${spectators.length} watching`;
          }
          
          if (spectatorNames) {
            spectatorNames.innerHTML = '';
            spectators.forEach(spec => {
              const nameDiv = document.createElement('div');
              nameDiv.style.cssText = 'color: #ccc; font-size: 11px; padding: 1px 0;';
              nameDiv.textContent = spec.name;
              spectatorNames.appendChild(nameDiv);
            });
          }
        }
        
        updateHUD() {
          const localPlayer = this.game.gameState.players[this.game.playerId];
          if (!localPlayer) return;
          
          // Update health
          const healthBar = document.getElementById('health-bar');
          const healthText = document.getElementById('health-text');
          if (healthBar) healthBar.style.width = localPlayer.health + '%';
          if (healthText) healthText.textContent = localPlayer.health;
          
          // Update armor
          const armorBar = document.getElementById('armor-bar');
          const armorText = document.getElementById('armor-text');
          if (armorBar) armorBar.style.width = localPlayer.armor + '%';
          if (armorText) armorText.textContent = localPlayer.armor;
          
          // Update money
          const money = document.getElementById('money');
          if (money) money.textContent = '$' + localPlayer.money;
          
          // Update ammo
          const ammoDisplay = document.getElementById('ammo-display');
          if (ammoDisplay && localPlayer.ammo && localPlayer.current_weapon) {
            const current = localPlayer.ammo[localPlayer.current_weapon] || 0;
            const reserve = localPlayer.reserve_ammo ? localPlayer.reserve_ammo[localPlayer.current_weapon] || 0 : 0;
            ammoDisplay.textContent = current + ' / ' + reserve;
          }
          
          // Update weapon name
          const weaponName = document.getElementById('weapon-name');
          if (weaponName && localPlayer.current_weapon) {
            // Simple weapon name display
            const weaponNames = {
              'usp': 'USP',
              'glock': 'Glock-18',
              'deagle': 'Desert Eagle',
              'ak47': 'AK-47',
              'm4a1': 'M4A1',
              'awp': 'AWP',
              'mp5': 'MP5',
              'p90': 'P90'
            };
            weaponName.textContent = weaponNames[localPlayer.current_weapon] || localPlayer.current_weapon.toUpperCase();
          }
          
          // Update round timer
          const timer = document.getElementById('round-timer');
          if (timer) {
            const minutes = Math.floor(this.game.gameState.round_time / 60);
            const seconds = this.game.gameState.round_time % 60;
            timer.textContent = minutes + ':' + (seconds < 10 ? '0' : '') + seconds;
          }
          
          // Update scores
          const ctScore = document.getElementById('ct-score');
          const tScore = document.getElementById('t-score');
          if (ctScore) ctScore.textContent = 'CT: ' + this.game.gameState.ct_score;
          if (tScore) tScore.textContent = 'T: ' + this.game.gameState.t_score;
          
          // Update phase
          const phase = document.getElementById('game-phase');
          if (phase) {
            const phaseText = this.game.gameState.phase.replace('_', ' ');
            phase.textContent = phaseText.charAt(0).toUpperCase() + phaseText.slice(1);
          }
        }
        
        updateKillFeed() {
          const killFeed = document.getElementById('kill-feed');
          if (!killFeed) return;
          
          killFeed.innerHTML = '';
          this.game.gameState.kill_feed.forEach(entry => {
            const div = document.createElement('div');
            div.style.cssText = 'background: rgba(0,0,0,0.7); color: white; padding: 5px 10px; margin-bottom: 5px; font-size: 14px; animation: slideIn 0.3s;';
            div.textContent = entry.message;
            killFeed.appendChild(div);
          });
        }
        
        toggleBuyMenu() {
          const menu = document.getElementById('buy-menu');
          if (!menu) return;
          
          if (this.game.gameState.phase !== 'buy_time') {
            return;
          }
          
          this.buyMenuOpen = !this.buyMenuOpen;
          menu.style.display = this.buyMenuOpen ? 'block' : 'none';
        }
        
        showScoreboard() {
          const scoreboard = document.getElementById('scoreboard');
          if (!scoreboard) return;
          
          this.scoreboardVisible = true;
          scoreboard.style.display = 'block';
          
          // Update player lists
          this.updateScoreboard();
        }
        
        hideScoreboard() {
          const scoreboard = document.getElementById('scoreboard');
          if (scoreboard) {
            scoreboard.style.display = 'none';
          }
          this.scoreboardVisible = false;
        }
        
        updateScoreboard() {
          const ctPlayers = document.getElementById('ct-players');
          const tPlayers = document.getElementById('t-players');
          
          if (ctPlayers) {
            ctPlayers.innerHTML = '';
            Object.values(this.game.gameState.players)
              .filter(p => p.team === 'ct')
              .forEach(player => {
                const row = document.createElement('tr');
                row.innerHTML = `
                  <td>${player.name}</td>
                  <td style="text-align: center;">${player.kills}</td>
                  <td style="text-align: center;">${player.deaths}</td>
                  <td style="text-align: center;">${player.score}</td>
                `;
                ctPlayers.appendChild(row);
              });
          }
          
          if (tPlayers) {
            tPlayers.innerHTML = '';
            Object.values(this.game.gameState.players)
              .filter(p => p.team === 't')
              .forEach(player => {
                const row = document.createElement('tr');
                row.innerHTML = `
                  <td>${player.name}</td>
                  <td style="text-align: center;">${player.kills}</td>
                  <td style="text-align: center;">${player.deaths}</td>
                  <td style="text-align: center;">${player.score}</td>
                `;
                tPlayers.appendChild(row);
              });
          }
        }
        
        openChat() {
          const chatInput = document.getElementById('chat-input');
          const chatMessages = document.getElementById('chat-messages');
          
          if (chatInput && chatMessages) {
            this.chatOpen = true;
            chatInput.style.display = 'block';
            chatMessages.style.display = 'block';
            chatInput.focus();
            
            chatInput.onkeydown = (e) => {
              if (e.key === 'Enter') {
                const message = chatInput.value.trim();
                if (message) {
                  this.game.network.sendChat(message);
                  chatInput.value = '';
                }
                this.closeChat();
              } else if (e.key === 'Escape') {
                this.closeChat();
              }
            };
          }
        }
        
        closeChat() {
          const chatInput = document.getElementById('chat-input');
          const chatMessages = document.getElementById('chat-messages');
          
          if (chatInput) {
            chatInput.style.display = 'none';
            chatInput.value = '';
          }
          if (chatMessages) {
            setTimeout(() => {
              chatMessages.style.display = 'none';
            }, 5000);
          }
          this.chatOpen = false;
        }
        
        addChatMessage(message) {
          const chatMessages = document.getElementById('chat-messages');
          if (!chatMessages) return;
          
          chatMessages.style.display = 'block';
          
          const div = document.createElement('div');
          const teamColor = message.team === 'ct' ? '#5B9BD5' : '#FFA500';
          div.style.cssText = 'margin-bottom: 5px;';
          div.innerHTML = `<span style="color: ${teamColor};">${message.player}:</span> <span style="color: white;">${message.message}</span>`;
          
          chatMessages.appendChild(div);
          chatMessages.scrollTop = chatMessages.scrollHeight;
          
          // Auto hide after 10 seconds
          if (!this.chatOpen) {
            setTimeout(() => {
              if (!this.chatOpen) {
                chatMessages.style.display = 'none';
              }
            }, 10000);
          }
        }
      }
    JAVASCRIPT
  end
  
  def game_init_script
    <<~JAVASCRIPT
      // Initialize game when DOM is ready
      window.initCS2DGame = function(viewId, playerId) {
        console.log('Initializing CS2D with viewId:', viewId, 'playerId:', playerId);
        
        if (window.game) {
          window.game.running = false;
        }
        
        // Check if Live.js is available - but don't block initialization
        const element = document.getElementById('cs2d-container');
        if (!element) {
          console.error('cs2d-container not found!');
          return;
        }
        
        if (!element.live) {
          console.log('Live.js not ready yet, will initialize without Live.js for now...');
        }
        
        // Initialize the game regardless of Live.js status
        window.game = new CS2DGame(viewId, playerId);
        
        // Add MAPS data to the game object for map voting UI
        window.game.MAPS = #{MAPS.to_json};
        
        // Initialize Admin Panel
        window.adminPanel = {
          isOpen: false,
          currentTab: 'players',
          
          toggle: function() {
            const overlay = document.getElementById('admin-panel-overlay');
            if (overlay) {
              this.isOpen = !this.isOpen;
              overlay.style.display = this.isOpen ? 'block' : 'none';
              if (this.isOpen) {
                this.showTab('players'); // Default to players tab
              }
            }
          },
          
          close: function() {
            const overlay = document.getElementById('admin-panel-overlay');
            if (overlay) {
              overlay.style.display = 'none';
              this.isOpen = false;
            }
          },
          
          showTab: function(tabId) {
            // Hide all tabs
            const tabs = document.querySelectorAll('.admin-tab');
            tabs.forEach(tab => tab.style.display = 'none');
            
            // Hide welcome message
            const welcome = document.getElementById('admin-welcome');
            if (welcome) welcome.style.display = 'none';
            
            // Show selected tab
            const selectedTab = document.getElementById('admin-tab-' + tabId);
            if (selectedTab) {
              selectedTab.style.display = 'block';
              this.currentTab = tabId;
            }
            
            // Update navigation button styles
            const navButtons = document.querySelectorAll('.admin-nav-button');
            navButtons.forEach(btn => {
              btn.style.background = 'rgba(255,102,0,0.1)';
              btn.style.color = '#ff6600';
            });
            
            // Highlight current tab button
            const currentBtn = document.querySelector(`[onclick*="showTab('${tabId}')"]`);
            if (currentBtn) {
              currentBtn.style.background = 'rgba(255,102,0,0.3)';
              currentBtn.style.color = '#ffaa00';
            }
          },
          
          // Player management functions
          kickPlayer: function(playerName) {
            const reason = prompt(`Kick ${playerName}?\\nReason:`, 'Disruptive behavior');
            if (reason !== null && window.game && window.game.sendEvent) {
              window.game.sendEvent('chat_message', {
                message: `!kick ${playerName} ${reason}`
              });
            }
          },
          
          banPlayer: function(playerName) {
            const duration = prompt(`Ban ${playerName}?\\nEnter hours (leave empty for permanent):`, '24');
            if (duration !== null) {
              const reason = prompt('Ban reason:', 'Rule violation');
              if (reason !== null && window.game && window.game.sendEvent) {
                const command = duration.trim() === '' ? 
                  `!ban ${playerName} ${reason}` : 
                  `!ban ${playerName} ${duration} ${reason}`;
                window.game.sendEvent('chat_message', { message: command });
              }
            }
          },
          
          mutePlayer: function(playerName) {
            const minutes = prompt(`Mute ${playerName}?\\nEnter minutes:`, '60');
            if (minutes !== null && minutes.trim() !== '') {
              const reason = prompt('Mute reason:', 'Inappropriate chat');
              if (reason !== null && window.game && window.game.sendEvent) {
                window.game.sendEvent('chat_message', {
                  message: `!mute ${playerName} ${minutes} ${reason}`
                });
              }
            }
          },
          
          toggleGodMode: function(playerName) {
            if (confirm(`Toggle god mode for ${playerName}?`) && window.game && window.game.sendEvent) {
              window.game.sendEvent('chat_message', {
                message: `!god ${playerName}`
              });
            }
          },
          
          unbanPlayer: function(ipAddress) {
            if (confirm(`Unban IP address ${ipAddress}?`) && window.game && window.game.sendEvent) {
              window.game.sendEvent('chat_message', {
                message: `!unban ${ipAddress}`
              });
            }
          },
          
          // Report management functions
          handleReport: function(reportId, action) {
            const actionNames = {
              'kick': 'Kick Player',
              'ban_temp': 'Ban 24h',
              'ban_perm': 'Ban Permanently',
              'dismiss': 'Dismiss Report'
            };
            
            if (confirm(`${actionNames[action] || action}?`) && window.game && window.game.sendEvent) {
              window.game.sendEvent('chat_message', {
                message: `!handlereport ${reportId} ${action}`
              });
            }
          },
          
          // Server config functions
          updateConfig: function(setting, value) {
            if (window.game && window.game.sendEvent) {
              window.game.sendEvent('chat_message', {
                message: `!config ${setting} ${value}`
              });
            }
          },
          
          // Demo recording functions
          startDemo: function() {
            const filenameInput = document.getElementById('demo-filename');
            const filename = filenameInput ? filenameInput.value.trim() : '';
            
            if (window.game && window.game.sendEvent) {
              const command = filename ? `!record ${filename}` : '!record';
              window.game.sendEvent('chat_message', { message: command });
            }
          },
          
          stopDemo: function() {
            if (confirm('Stop demo recording?') && window.game && window.game.sendEvent) {
              window.game.sendEvent('chat_message', { message: '!stoprecord' });
            }
          },
          
          downloadDemo: function(filename) {
            // In a real implementation, this would trigger a download
            alert(`Download demo: ${filename}\\n(Download functionality would be implemented server-side)`);
          },
          
          // Anti-cheat functions
          toggleAutoAnticheat: function() {
            if (window.game && window.game.sendEvent) {
              // This would need to be implemented as a server config toggle
              window.game.sendEvent('chat_message', { 
                message: '!config auto_anticheat toggle' 
              });
            }
          }
        };
        
        // Admin Panel keyboard shortcuts
        document.addEventListener('keydown', function(e) {
          // F1 key to toggle admin panel (for admins only)
          if (e.key === 'F1' && window.adminPanel) {
            e.preventDefault();
            window.adminPanel.toggle();
          }
          
          // ESC key to close admin panel
          if (e.key === 'Escape' && window.adminPanel && window.adminPanel.isOpen) {
            e.preventDefault();
            window.adminPanel.close();
          }
        });
        
        // Remove debug indicator
        const debugDiv = document.querySelector('div[style*="background: yellow"]');
        if (debugDiv) debugDiv.remove();
        
        console.log('CS2D initialized successfully');
        
        // If Live.js becomes available later, we can set it up
        if (!element.live) {
          const checkLiveJS = () => {
            if (element.live) {
              console.log('Live.js now available, setting up event forwarding');
              // Set up Live.js event forwarding here if needed
            } else {
              setTimeout(checkLiveJS, 500);
            }
          };
          setTimeout(checkLiveJS, 500);
        }
      };
      
      // Handle page visibility
      document.addEventListener('visibilitychange', () => {
        if (window.game) {
          if (document.hidden) {
            window.game.running = false;
          } else {
            window.game.running = true;
            window.game.lastTime = Date.now();
            window.game.gameLoop();
          }
        }
      });
    JAVASCRIPT
  end
  
  def render_progression_assets(builder)
    # Include progression UI CSS
    builder.tag(:link, rel: "stylesheet", href: "_static/progression.css", type: "text/css")
    
    # Include progression UI JavaScript
    builder.tag(:script, type: "text/javascript", src: "_static/progression_ui.js")
    
    # Send initial progression data
    if @player_id && @progression_manager
      profile = @progression_manager.get_player_profile(@player_id)
      if profile
        player_data = @progression_manager.get_player_dashboard(@player_id)
        builder.tag(:script, type: "text/javascript") do
          builder.raw("
            document.addEventListener('DOMContentLoaded', function() {
              if (window.progressionUI) {
                window.progressionUI.updatePlayerData(#{player_data.to_json});
              }
            });
          ")
        end
      end
    end
  end
  
  # Progression system event handlers
  def handle_get_player_data(event)
    return unless @progression_manager && @player_id
    
    player_data = @progression_manager.get_player_dashboard(@player_id)
    send_progression_message('player_data', player_data)
  end
  
  def handle_get_leaderboard(event)
    return unless @progression_manager
    
    category = event[:category]&.to_sym || :rating
    leaderboard = @progression_manager.get_leaderboard(category, 100)
    send_progression_message('leaderboard_data', leaderboard)
  end
  
  def handle_get_achievements(event)
    return unless @progression_manager && @player_id
    
    profile = @progression_manager.get_player_profile(@player_id)
    return unless profile
    
    achievement_system = @progression_manager.instance_variable_get(:@achievement_systems)[@player_id]
    if achievement_system
      achievements = achievement_system.get_achievements_by_category
      send_progression_message('achievement_data', achievements)
    end
  end
  
  def handle_get_match_history(event)
    return unless @progression_manager && @player_id
    
    matches = @progression_manager.match_history.get_player_matches(@player_id, 20)
    send_progression_message('match_history', matches)
  end
  
  def handle_claim_daily_bonus(event)
    return unless @progression_manager && @player_id
    
    result = @progression_manager.claim_daily_bonus(@player_id)
    
    if result[:success]
      # Send XP notification
      send_progression_message('xp_gain', { 
        amount: result[:xp_awarded], 
        reason: 'Daily login bonus' 
      })
      
      # Check for level up
      if result[:level_info][:level_up]
        send_progression_message('level_up', {
          level: result[:level_info][:new_level],
          rewards: {}
        })
      end
    end
    
    send_progression_message('daily_bonus_result', result)
  end
  
  def send_progression_message(type, data)
    message = { type: type, data: data }
    self.script("
      if (window.progressionUI) {
        window.progressionUI.handleProgressionMessage(#{message.to_json});
      }
    ")
  end
  
  # Send progression notifications for game events
  def send_xp_notification(amount, reason)
    send_progression_message('xp_gain', { amount: amount, reason: reason })
  end
  
  def send_achievement_notification(achievement_id)
    # Would get achievement data and send notification
    achievement_data = { id: achievement_id, name: achievement_id.to_s.humanize }
    send_progression_message('achievement_unlock', achievement_data)
  end
  
  private
  
  # Match tracking methods for progression system
  def start_match_tracking
    return unless @progression_manager
    
    # Get all current players
    players_data = {}
    @game_state[:players].each do |player_id, player|
      players_data[player_id] = {
        name: player[:name],
        team: player[:team].to_sym
      }
    end
    
    # Start tracking the match
    @progression_manager.start_match(
      @game_state[:current_map] || 'dust2',
      'Classic',
      players_data
    )
  end
  
  def end_match_tracking
    return unless @progression_manager && @match_started
    
    # Determine winner based on scores
    ct_score = @game_state[:ct_score] || 0
    t_score = @game_state[:t_score] || 0
    final_score = [ct_score, t_score]
    
    winner_team = if ct_score > t_score
                    :ct
                  elsif t_score > ct_score
                    :t
                  else
                    nil # Draw
                  end
    
    # End match tracking
    @progression_manager.end_match(final_score, winner_team)
  end
  
  # Weapon Skins and Customization System
  def handle_weapon_skin_selection(event)
    player = @game_state[:players][@player_id]
    return unless player
    
    weapon_key = event[:weapon]
    skin_key = event[:skin]
    
    # Validate skin exists for weapon
    return unless WEAPON_SKINS[weapon_key] && WEAPON_SKINS[weapon_key][skin_key]
    
    # Initialize player's weapon skins if not exists
    player[:weapon_skins] ||= {}
    player[:weapon_skins][weapon_key] = skin_key
    
    # Update visual representation
    update_weapon_appearance(player, weapon_key, skin_key)
    broadcast_game_state
  end
  
  def update_weapon_appearance(player, weapon_key, skin_key)
    skin_data = WEAPON_SKINS[weapon_key][skin_key]
    
    # Store appearance data for client rendering
    player[:weapon_appearances] ||= {}
    player[:weapon_appearances][weapon_key] = {
      skin: skin_key,
      name: skin_data[:name],
      rarity: skin_data[:rarity],
      wear: skin_data[:wear]&.sample || 'factory_new' # Random wear if applicable
    }
  end
  
  def get_weapon_skin_info(weapon_key, skin_key)
    return nil unless WEAPON_SKINS[weapon_key] && WEAPON_SKINS[weapon_key][skin_key]
    
    skin_data = WEAPON_SKINS[weapon_key][skin_key].dup
    weapon_data = WEAPONS[weapon_key]
    
    # Calculate skin value based on rarity and wear
    base_value = case skin_data[:rarity]
    when 'stock' then 0
    when 'consumer' then 50
    when 'industrial' then 200
    when 'mil_spec' then 800
    when 'restricted' then 2000
    when 'classified' then 5000
    when 'covert' then 15000
    else 0
    end
    
    skin_data[:market_value] = base_value
    skin_data[:weapon_name] = weapon_data[:name]
    skin_data
  end
  
  # Weapon Attachment System
  def handle_attachment_toggle(event)
    player = @game_state[:players][@player_id]
    return unless player && player[:alive]
    
    weapon_key = player[:current_weapon]
    attachment_key = event[:attachment]
    
    weapon = WEAPONS[weapon_key]
    return unless weapon && weapon[:attachments]&.include?(attachment_key)
    
    # Initialize weapon state
    player[:weapon_state] ||= {}
    weapon_state = player[:weapon_state][weapon_key] ||= {
      shots_fired: 0,
      last_shot_time: 0,
      recoil_accumulation: 0.0,
      current_attachment: nil
    }
    
    # Toggle attachment
    if weapon_state[:current_attachment] == attachment_key
      weapon_state[:current_attachment] = nil
      play_sound('attachment_detach')
    else
      weapon_state[:current_attachment] = attachment_key
      play_sound('attachment_attach')
    end
    
    broadcast_game_state
  end
  
  def get_modified_weapon_stats(weapon_key, attachment_key = nil)
    base_weapon = WEAPONS[weapon_key].dup
    
    if attachment_key && ATTACHMENTS[attachment_key]
      attachment = ATTACHMENTS[attachment_key]
      
      # Apply stat modifications
      attachment[:stat_modifiers].each do |stat, modifier|
        case stat
        when :damage
          base_weapon[:damage] = (base_weapon[:damage] * (1 + modifier)).round
        when :accuracy
          base_weapon[:accuracy] = [base_weapon[:accuracy] + modifier, 1.0].min
        when :speed
          base_weapon[:speed] = [base_weapon[:speed] + modifier, 1.0].min
        end
      end
      
      # Add attachment-specific properties
      base_weapon[:attachment] = attachment_key
      base_weapon[:attachment_name] = attachment[:name]
    end
    
    base_weapon
  end
  
  # Enhanced Reload System
  def handle_player_reload(event)
    player = @game_state[:players][@player_id]
    return unless player && player[:alive]
    
    weapon_key = player[:current_weapon]
    weapon = WEAPONS[weapon_key]
    return unless weapon && weapon[:ammo]
    
    # Check if already reloading
    if player[:reloading]
      return
    end
    
    current_ammo = player[:ammo][weapon_key] || 0
    reserve = player[:reserve_ammo][weapon_key] || 0
    max_ammo = weapon[:ammo]
    
    # Check if reload is needed and possible
    return if current_ammo >= max_ammo || reserve <= 0
    
    # Start reload process
    player[:reloading] = {
      weapon: weapon_key,
      start_time: Time.now.to_f * 1000,
      duration: (weapon[:reload_time] || 3.0) * 1000, # Convert to milliseconds
      interrupted: false
    }
    
    play_sound('reload_start')
    
    # Schedule reload completion
    Async do
      sleep(weapon[:reload_time] || 3.0)
      complete_reload(player, weapon_key) unless player[:reloading][:interrupted]
    end
    
    broadcast_game_state
  end
  
  def complete_reload(player, weapon_key)
    return unless player[:reloading] && player[:reloading][:weapon] == weapon_key
    
    weapon = WEAPONS[weapon_key]
    current_ammo = player[:ammo][weapon_key] || 0
    reserve = player[:reserve_ammo][weapon_key] || 0
    max_ammo = weapon[:ammo]
    
    # Calculate reload amount
    needed = max_ammo - current_ammo
    reload_amount = [needed, reserve].min
    
    # Perform reload
    player[:ammo][weapon_key] = current_ammo + reload_amount
    player[:reserve_ammo][weapon_key] = reserve - reload_amount
    player[:reloading] = nil
    
    play_sound('reload_complete')
    broadcast_game_state
  end
  
  def interrupt_reload(player)
    if player[:reloading]
      player[:reloading][:interrupted] = true
      player[:reloading] = nil
      play_sound('reload_interrupt')
    end
  end
  
  # Weapon Switching System
  def handle_weapon_switch(event)
    player = @game_state[:players][@player_id]
    return unless player && player[:alive]
    
    target_weapon = event[:weapon]
    return unless player[:weapons].include?(target_weapon)
    return if player[:current_weapon] == target_weapon
    
    # Interrupt reload if switching weapons
    interrupt_reload(player)
    
    # Get switch times
    current_weapon = WEAPONS[player[:current_weapon]]
    new_weapon = WEAPONS[target_weapon]
    
    # Calculate switch time (holster + draw)
    holster_time = (current_weapon[:holster_time] || 0.5) * 1000
    draw_time = (new_weapon[:draw_time] || 0.8) * 1000
    total_switch_time = holster_time + draw_time
    
    # Start weapon switch
    player[:switching_weapon] = {
      from: player[:current_weapon],
      to: target_weapon,
      start_time: Time.now.to_f * 1000,
      duration: total_switch_time
    }
    
    play_sound('weapon_holster')
    
    # Complete switch after delay
    Async do
      sleep(holster_time / 1000.0)
      play_sound('weapon_draw')
      sleep(draw_time / 1000.0)
      
      if player[:switching_weapon] && player[:switching_weapon][:to] == target_weapon
        player[:current_weapon] = target_weapon
        player[:switching_weapon] = nil
        broadcast_game_state
      end
    end
  end
  
  def can_use_weapon?(player)
    return false unless player[:alive]
    return false if player[:reloading]
    return false if player[:switching_weapon]
    true
  end
end
end

Application = Lively::Application[CS2DView]