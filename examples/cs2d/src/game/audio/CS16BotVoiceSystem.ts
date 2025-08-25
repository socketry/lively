/**
 * CS 1.6 Bot Voice Lines and Radio Commands System
 * Manages authentic CS 1.6 bot communications and tactical callouts
 */

import { Vector2D } from '../physics/PhysicsEngine';
import { CS16AudioManager } from './CS16AudioManager';

export interface BotVoiceLine {
  id: string;
  category: 'tactical' | 'status' | 'combat' | 'response' | 'location' | 'emergency';
  context: string[];
  cooldown: number;
  priority: 'low' | 'medium' | 'high' | 'critical';
}

export interface RadioCommand {
  id: string;
  command: string;
  description: string;
  soundFile: string;
  category: 'movement' | 'status' | 'combat' | 'tactical';
  teamSpecific?: boolean;
}

export interface BotPersonality {
  aggressiveness: number; // 0-1
  chattiness: number; // 0-1
  helpfulness: number; // 0-1
  responseFrequency: number; // 0-1
}

export class CS16BotVoiceSystem {
  private audioManager: CS16AudioManager;
  private lastVoiceTime: Map<string, number> = new Map(); // botId -> timestamp
  private voiceCooldowns: Map<string, number> = new Map(); // voiceId -> cooldown
  private radioQueue: Array<{ playerId: string; command: string; timestamp: number }> = [];
  
  /**
   * Comprehensive CS 1.6 bot voice lines mapping
   */
  private static readonly BOT_VOICE_LINES: Record<string, BotVoiceLine[]> = {
    // Combat situations
    combat: [
      { id: 'enemy_spotted', category: 'combat', context: ['enemy_visible'], cooldown: 3000, priority: 'high' },
      { id: 'taking_fire_need_assistance', category: 'emergency', context: ['under_attack'], cooldown: 5000, priority: 'critical' },
      { id: 'enemy_down', category: 'combat', context: ['killed_enemy'], cooldown: 2000, priority: 'medium' },
      { id: 'got_him', category: 'combat', context: ['killed_enemy'], cooldown: 2000, priority: 'medium' },
      { id: 'neutralized', category: 'combat', context: ['killed_enemy'], cooldown: 2000, priority: 'medium' },
      { id: 'target_acquired', category: 'combat', context: ['enemy_visible'], cooldown: 4000, priority: 'high' },
      { id: 'engaging_enemies', category: 'combat', context: ['shooting'], cooldown: 5000, priority: 'medium' },
      { id: 'in_combat', category: 'combat', context: ['fighting'], cooldown: 8000, priority: 'medium' },
      { id: 'sniper', category: 'combat', context: ['enemy_sniper'], cooldown: 6000, priority: 'high' },
      { id: 'got_the_sniper', category: 'combat', context: ['killed_sniper'], cooldown: 3000, priority: 'medium' }
    ],
    
    // Tactical communications
    tactical: [
      { id: 'cover_me', category: 'tactical', context: ['need_cover'], cooldown: 10000, priority: 'high' },
      { id: 'follow_me', category: 'tactical', context: ['leading'], cooldown: 8000, priority: 'medium' },
      { id: 'hold_your_fire', category: 'tactical', context: ['friendly_fire'], cooldown: 5000, priority: 'critical' },
      { id: 'all_clear', category: 'tactical', context: ['area_secure'], cooldown: 10000, priority: 'low' },
      { id: 'area_secure', category: 'tactical', context: ['area_secure'], cooldown: 10000, priority: 'medium' },
      { id: 'nothing_here', category: 'tactical', context: ['no_enemies'], cooldown: 8000, priority: 'low' },
      { id: 'watch_it_theres_a_sniper', category: 'tactical', context: ['sniper_warning'], cooldown: 15000, priority: 'critical' },
      { id: 'im_going_to_guard_the_hostages', category: 'tactical', context: ['guarding_hostages'], cooldown: 20000, priority: 'medium' },
      { id: 'im_going_to_plant_the_bomb', category: 'tactical', context: ['planting_bomb'], cooldown: 30000, priority: 'high' }
    ],
    
    // Status updates
    status: [
      { id: 'roger', category: 'response', context: ['acknowledge'], cooldown: 2000, priority: 'low' },
      { id: 'affirmative', category: 'response', context: ['acknowledge'], cooldown: 2000, priority: 'low' },
      { id: 'negative', category: 'response', context: ['decline'], cooldown: 2000, priority: 'low' },
      { id: 'on_my_way', category: 'status', context: ['moving'], cooldown: 5000, priority: 'medium' },
      { id: 'im_with_you', category: 'status', context: ['following'], cooldown: 8000, priority: 'low' },
      { id: 'need_help', category: 'emergency', context: ['need_assistance'], cooldown: 10000, priority: 'high' },
      { id: 'i_got_your_back', category: 'status', context: ['supporting'], cooldown: 12000, priority: 'low' },
      { id: 'reporting_in', category: 'status', context: ['status_report'], cooldown: 15000, priority: 'low' }
    ],
    
    // Location callouts
    location: [
      { id: 'heading_to_a', category: 'location', context: ['moving_to_a'], cooldown: 15000, priority: 'medium' },
      { id: 'heading_to_b', category: 'location', context: ['moving_to_b'], cooldown: 15000, priority: 'medium' },
      { id: 'guarding_a', category: 'location', context: ['at_bombsite_a'], cooldown: 20000, priority: 'medium' },
      { id: 'guarding_b', category: 'location', context: ['at_bombsite_b'], cooldown: 20000, priority: 'medium' },
      { id: 'ct_spawn', category: 'location', context: ['at_ct_spawn'], cooldown: 20000, priority: 'low' },
      { id: 't_spawn', category: 'location', context: ['at_t_spawn'], cooldown: 20000, priority: 'low' }
    ],
    
    // Bomb-related
    bomb: [
      { id: 'planting_the_bomb', category: 'tactical', context: ['planting'], cooldown: 60000, priority: 'critical' },
      { id: 'defusing_the_bomb', category: 'tactical', context: ['defusing'], cooldown: 60000, priority: 'critical' },
      { id: 'the_bomb_is_down', category: 'tactical', context: ['bomb_dropped'], cooldown: 30000, priority: 'high' },
      { id: 'theres_the_bomb', category: 'tactical', context: ['bomb_spotted'], cooldown: 20000, priority: 'high' },
      { id: 'they_got_the_bomb', category: 'tactical', context: ['enemy_has_bomb'], cooldown: 30000, priority: 'high' }
    ],
    
    // Hostage-related
    hostages: [
      { id: 'rescuing_hostages', category: 'tactical', context: ['rescuing'], cooldown: 30000, priority: 'high' },
      { id: 'hostages_secure', category: 'tactical', context: ['hostages_safe'], cooldown: 60000, priority: 'high' },
      { id: 'the_hostages_are_with_me', category: 'tactical', context: ['escorting_hostages'], cooldown: 20000, priority: 'medium' },
      { id: 'taking_the_hostages_to_safety', category: 'tactical', context: ['moving_hostages'], cooldown: 30000, priority: 'medium' }
    ]
  };
  
  /**
   * CS 1.6 Radio Commands
   */
  private static readonly RADIO_COMMANDS: Record<string, RadioCommand[]> = {
    standard: [
      { id: 'roger', command: 'roger', description: 'Roger that', soundFile: 'radio/roger.wav', category: 'status' },
      { id: 'negative', command: 'negative', description: 'Negative', soundFile: 'radio/negative.wav', category: 'status' },
      { id: 'enemy_spotted', command: 'enemyspotted', description: 'Enemy spotted', soundFile: 'radio/ct_enemys.wav', category: 'combat' },
      { id: 'need_backup', command: 'needbackup', description: 'Need backup', soundFile: 'radio/ct_backup.wav', category: 'tactical' },
      { id: 'sector_clear', command: 'sectorclear', description: 'Sector clear', soundFile: 'radio/clear.wav', category: 'status' },
      { id: 'cover_me', command: 'coverme', description: 'Cover me', soundFile: 'radio/ct_coverme.wav', category: 'tactical' },
      { id: 'hold_position', command: 'holdpos', description: 'Hold this position', soundFile: 'radio/com_getinpos.wav', category: 'movement' },
      { id: 'follow_me', command: 'followme', description: 'Follow me', soundFile: 'radio/followme.wav', category: 'movement' },
      { id: 'fire_in_hole', command: 'fireinhole', description: 'Fire in the hole!', soundFile: 'radio/ct_fireinhole.wav', category: 'combat' }
    ],
    
    tactical: [
      { id: 'go_go_go', command: 'go', description: 'Go go go!', soundFile: 'radio/com_go.wav', category: 'movement' },
      { id: 'fall_back', command: 'fallback', description: 'Fall back!', soundFile: 'radio/fallback.wav', category: 'movement' },
      { id: 'stick_together', command: 'sticktog', description: 'Stick together team', soundFile: 'radio/sticktog.wav', category: 'tactical' },
      { id: 'get_in_position', command: 'getinpos', description: 'Get in position', soundFile: 'radio/com_getinpos.wav', category: 'movement' },
      { id: 'storm_the_front', command: 'stormfront', description: 'Storm the front', soundFile: 'radio/stormfront.wav', category: 'tactical' },
      { id: 'report_in', command: 'reportin', description: 'Report in', soundFile: 'radio/com_reportin.wav', category: 'status' },
      { id: 'take_point', command: 'takepoint', description: 'Take the point', soundFile: 'radio/takepoint.wav', category: 'tactical' },
      { id: 'regroup', command: 'regroup', description: 'Regroup team', soundFile: 'radio/regroup.wav', category: 'movement' }
    ]
  };
  
  constructor(audioManager: CS16AudioManager) {
    this.audioManager = audioManager;
  }
  
  /**
   * Trigger bot voice line based on game context
   */
  playBotVoice(
    botId: string,
    context: string,
    position: Vector2D,
    personality: BotPersonality = { aggressiveness: 0.5, chattiness: 0.5, helpfulness: 0.5, responseFrequency: 0.5 }
  ): boolean {
    const now = Date.now();
    const lastVoice = this.lastVoiceTime.get(botId) || 0;
    
    // Check if bot is ready to speak based on personality
    const timeSinceLastVoice = now - lastVoice;
    const minInterval = 3000 / personality.responseFrequency; // More responsive bots speak more often
    
    if (timeSinceLastVoice < minInterval) {
      return false;
    }
    
    // Find appropriate voice lines for context
    const availableLines: BotVoiceLine[] = [];
    
    Object.values(CS16BotVoiceSystem.BOT_VOICE_LINES).forEach(category => {
      category.forEach(line => {
        if (line.context.includes(context)) {
          const cooldownKey = `${botId}_${line.id}`;
          const lastUsed = this.voiceCooldowns.get(cooldownKey) || 0;
          
          if (now - lastUsed > line.cooldown) {
            availableLines.push(line);
          }
        }
      });
    });
    
    if (availableLines.length === 0) {
      return false;
    }
    
    // Choose line based on priority and personality
    let selectedLine: BotVoiceLine;
    
    if (Math.random() < personality.aggressiveness) {
      // Aggressive bots prefer combat/tactical lines
      const aggressiveLines = availableLines.filter(line => 
        line.category === 'combat' || line.category === 'tactical' || line.priority === 'critical'
      );
      selectedLine = aggressiveLines.length > 0 ? 
        aggressiveLines[Math.floor(Math.random() * aggressiveLines.length)] :
        availableLines[Math.floor(Math.random() * availableLines.length)];
    } else {
      // Select based on priority
      const criticalLines = availableLines.filter(line => line.priority === 'critical');
      const highLines = availableLines.filter(line => line.priority === 'high');
      
      if (criticalLines.length > 0) {
        selectedLine = criticalLines[Math.floor(Math.random() * criticalLines.length)];
      } else if (highLines.length > 0 && Math.random() < 0.7) {
        selectedLine = highLines[Math.floor(Math.random() * highLines.length)];
      } else {
        selectedLine = availableLines[Math.floor(Math.random() * availableLines.length)];
      }
    }
    
    // Play the voice line
    const soundPlayed = this.audioManager.play(selectedLine.id, position, {
      category: 'bot',
      volume: 0.8
    });
    
    if (soundPlayed) {
      this.lastVoiceTime.set(botId, now);
      this.voiceCooldowns.set(`${botId}_${selectedLine.id}`, now);
      return true;
    }
    
    return false;
  }
  
  /**
   * Play radio command
   */
  playRadioCommand(
    playerId: string,
    command: string,
    position: Vector2D,
    team: 'ct' | 't' = 'ct'
  ): boolean {
    const now = Date.now();
    
    // Check radio queue limit (max 3 commands in 10 seconds)
    this.radioQueue = this.radioQueue.filter(entry => now - entry.timestamp < 10000);
    if (this.radioQueue.length >= 3) {
      return false;
    }
    
    // Find radio command
    let radioCommand: RadioCommand | undefined;
    
    Object.values(CS16BotVoiceSystem.RADIO_COMMANDS).forEach(category => {
      const found = category.find(cmd => cmd.command === command);
      if (found) radioCommand = found;
    });
    
    if (!radioCommand) {
      return false;
    }
    
    // Add to queue
    this.radioQueue.push({ playerId, command, timestamp: now });
    
    // Play radio sound
    const soundPlayed = this.audioManager.play(radioCommand.soundFile, position, {
      category: 'radio',
      volume: 1.0
    });
    
    return soundPlayed !== null;
  }
  
  /**
   * Get available radio commands for UI
   */
  getRadioCommands(): { category: string; commands: RadioCommand[] }[] {
    return Object.entries(CS16BotVoiceSystem.RADIO_COMMANDS).map(([category, commands]) => ({
      category,
      commands
    }));
  }
  
  /**
   * Trigger contextual bot responses to events
   */
  onGameEvent(
    eventType: 'enemy_spotted' | 'player_killed' | 'bomb_planted' | 'bomb_defused' | 'round_start' | 'taking_damage',
    botId: string,
    position: Vector2D,
    data?: any
  ): void {
    let context: string;
    
    switch (eventType) {
      case 'enemy_spotted':
        context = 'enemy_visible';
        break;
      case 'player_killed':
        context = data?.isBot ? 'killed_enemy' : 'enemy_down';
        break;
      case 'bomb_planted':
        context = 'bomb_planted';
        break;
      case 'bomb_defused':
        context = 'bomb_defused';
        break;
      case 'round_start':
        context = 'round_start';
        break;
      case 'taking_damage':
        context = 'under_attack';
        break;
      default:
        return;
    }
    
    // Generate random personality for variety
    const personality: BotPersonality = {
      aggressiveness: 0.3 + Math.random() * 0.4,
      chattiness: 0.4 + Math.random() * 0.3,
      helpfulness: 0.5 + Math.random() * 0.3,
      responseFrequency: 0.6 + Math.random() * 0.4
    };
    
    this.playBotVoice(botId, context, position, personality);
  }
  
  /**
   * Clear voice cooldowns for a bot (e.g., on respawn)
   */
  clearBotCooldowns(botId: string): void {
    this.lastVoiceTime.delete(botId);
    
    // Clear all cooldowns for this bot
    for (const [key] of this.voiceCooldowns) {
      if (key.startsWith(`${botId}_`)) {
        this.voiceCooldowns.delete(key);
      }
    }
  }
  
  /**
   * Get bot voice system statistics
   */
  getStats(): {
    activeBots: number;
    totalVoiceLines: number;
    radioCommandsPlayed: number;
  } {
    return {
      activeBots: this.lastVoiceTime.size,
      totalVoiceLines: Object.values(CS16BotVoiceSystem.BOT_VOICE_LINES)
        .reduce((total, category) => total + category.length, 0),
      radioCommandsPlayed: this.radioQueue.length
    };
  }
}