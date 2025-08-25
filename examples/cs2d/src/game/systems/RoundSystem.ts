import { Player, GameState } from '../GameCore';
import { CS16AudioManager } from '../audio/CS16AudioManager';
import { Vector2D } from '../physics/PhysicsEngine';

export type RoundPhase = 'warmup' | 'freeze' | 'live' | 'post_round' | 'halftime' | 'match_end';
export type RoundEndReason = 'elimination' | 'bomb_exploded' | 'bomb_defused' | 'time' | 'surrender';
export type WinningTeam = 'ct' | 't' | 'draw';

export interface RoundStats {
  roundNumber: number;
  phase: RoundPhase;
  timeLeft: number;
  freezeTimeLeft: number;
  bombPlanted: boolean;
  bombDefused: boolean;
  bombTimeLeft: number;
  ctAlive: number;
  tAlive: number;
  ctScore: number;
  tScore: number;
  maxRounds: number;
  winningTeam?: WinningTeam;
  endReason?: RoundEndReason;
  mvpPlayer?: string;
}

export interface EconomySettings {
  startMoney: number;
  maxMoney: number;
  loseBonus: number[];
  winBonus: number;
  bombPlantBonus: number;
  bombDefuseBonus: number;
  killReward: number;
}

export class RoundSystem {
  private audioManager: CS16AudioManager | null = null;
  private gameState: GameState;
  private players: Map<string, Player>;
  private roundStats: RoundStats;
  private economySettings: EconomySettings;
  private bombPosition: Vector2D | null = null;
  private bombPlanterId: string | null = null;
  private defuserId: string | null = null;
  private roundStartTime: number = 0;
  private consecutiveLosses: { ct: number; t: number } = { ct: 0, t: 0 };
  private eventCallbacks: Map<string, Function[]> = new Map();
  
  constructor(
    gameState: GameState, 
    players: Map<string, Player>, 
    audioManager?: CS16AudioManager
  ) {
    this.gameState = gameState;
    this.players = players;
    this.audioManager = audioManager || null;
    
    this.roundStats = {
      roundNumber: 1,
      phase: 'freeze',
      timeLeft: 115,
      freezeTimeLeft: 15,
      bombPlanted: false,
      bombDefused: false,
      bombTimeLeft: 45,
      ctAlive: 0,
      tAlive: 0,
      ctScore: 0,
      tScore: 0,
      maxRounds: 30
    };
    
    this.economySettings = {
      startMoney: 800,
      maxMoney: 16000,
      loseBonus: [1400, 1900, 2400, 2900, 3400], // CS 1.6 loss bonus progression
      winBonus: 3250,
      bombPlantBonus: 800,
      bombDefuseBonus: 3500,
      killReward: 300
    };
    
    this.initializeRound();
  }
  
  /**
   * Initialize a new round
   */
  private initializeRound(): void {
    this.roundStats.phase = 'freeze';
    this.roundStats.timeLeft = 115; // 1:55 round time
    this.roundStats.freezeTimeLeft = 15;
    this.roundStats.bombPlanted = false;
    this.roundStats.bombDefused = false;
    this.roundStats.bombTimeLeft = 45; // C4 timer
    this.bombPosition = null;
    this.bombPlanterId = null;
    this.defuserId = null;
    this.roundStartTime = Date.now();
    
    // Update game state
    this.gameState.roundNumber = this.roundStats.roundNumber;
    this.gameState.roundTime = this.roundStats.timeLeft;
    this.gameState.freezeTime = this.roundStats.freezeTimeLeft;
    this.gameState.bombPlanted = false;
    this.gameState.bombTimer = this.roundStats.bombTimeLeft;
    
    // Reset players for new round
    this.respawnAllPlayers();
    this.updateAliveCount();
    
    console.log('🔄 Round initialized:', this.roundStats.roundNumber);
  }
  
  /**
   * Update round system each frame
   */
  update(deltaTime: number): void {
    switch (this.roundStats.phase) {
      case 'freeze':
        this.updateFreezeTime(deltaTime);
        break;
        
      case 'live':
        this.updateLiveRound(deltaTime);
        break;
        
      case 'post_round':
        // Post-round analysis phase
        break;
        
      case 'halftime':
        // Halftime break
        break;
        
      case 'match_end':
        // Match completed
        break;
    }
    
    // Update alive counts
    this.updateAliveCount();
    
    // Check for round end conditions
    if (this.roundStats.phase === 'live' || this.roundStats.phase === 'freeze') {
      this.checkRoundEndConditions();
    }
  }
  
  /**
   * Update freeze time phase
   */
  private updateFreezeTime(deltaTime: number): void {
    this.roundStats.freezeTimeLeft -= deltaTime;
    this.gameState.freezeTime = this.roundStats.freezeTimeLeft;
    
    if (this.roundStats.freezeTimeLeft <= 0) {
      this.startLiveRound();
    }
  }
  
  /**
   * Start the live round phase
   */
  private startLiveRound(): void {
    this.roundStats.phase = 'live';
    this.roundStats.freezeTimeLeft = 0;
    this.gameState.freezeTime = 0;
    
    // Play round start sound
    if (this.audioManager) {
      this.audioManager.play('radio/letsgo.wav');
    }
    
    this.emitEvent('round_start', { roundNumber: this.roundStats.roundNumber });
    console.log('🚀 Round started:', this.roundStats.roundNumber);
  }
  
  /**
   * Update live round phase
   */
  private updateLiveRound(deltaTime: number): void {
    this.roundStats.timeLeft -= deltaTime;
    this.gameState.roundTime = this.roundStats.timeLeft;
    
    // Update bomb timer if planted
    if (this.roundStats.bombPlanted) {
      this.roundStats.bombTimeLeft -= deltaTime;
      this.gameState.bombTimer = this.roundStats.bombTimeLeft;
      
      if (this.roundStats.bombTimeLeft <= 0) {
        this.explodeBomb();
      }
    }
    
    // Check for time expiration
    if (this.roundStats.timeLeft <= 0) {
      this.endRound('time', 'ct');
    }
  }
  
  /**
   * Check conditions that can end the round
   */
  private checkRoundEndConditions(): void {
    const ctAlive = this.roundStats.ctAlive;
    const tAlive = this.roundStats.tAlive;
    
    if (ctAlive === 0 && tAlive === 0) {
      this.endRound('elimination', 'draw');
    } else if (ctAlive === 0) {
      if (this.roundStats.bombPlanted) {
        // Terrorists win by elimination with bomb planted
        this.endRound('elimination', 't');
      } else {
        // Terrorists win by elimination
        this.endRound('elimination', 't');
      }
    } else if (tAlive === 0) {
      if (this.roundStats.bombPlanted) {
        // CTs must defuse the bomb to win
        return;
      } else {
        // CTs win by elimination
        this.endRound('elimination', 'ct');
      }
    }
  }
  
  /**
   * Plant the bomb
   */
  plantBomb(playerId: string, position: Vector2D): boolean {
    const player = this.players.get(playerId);
    if (!player || player.team !== 't' || !player.isAlive) return false;
    
    if (this.roundStats.bombPlanted || this.roundStats.phase !== 'live') return false;
    
    this.roundStats.bombPlanted = true;
    this.bombPosition = { ...position };
    this.bombPlanterId = playerId;
    this.gameState.bombPlanted = true;
    this.gameState.bombPosition = this.bombPosition;
    
    // Award plant bonus
    player.money += this.economySettings.bombPlantBonus;
    
    // Play bomb plant sound
    if (this.audioManager) {
      this.audioManager.play('radio/bombpl.wav');
    }
    
    this.emitEvent('bomb_planted', { 
      playerId, 
      position, 
      timeLeft: this.roundStats.bombTimeLeft 
    });
    
    console.log('💣 Bomb planted by:', playerId, 'at:', position);
    return true;
  }
  
  /**
   * Start defusing the bomb
   */
  startDefuse(playerId: string): boolean {
    const player = this.players.get(playerId);
    if (!player || player.team !== 'ct' || !player.isAlive) return false;
    
    if (!this.roundStats.bombPlanted || this.roundStats.bombDefused) return false;
    
    if (!this.bombPosition) return false;
    
    // Check if player is close to bomb
    const distance = Math.sqrt(
      (player.position.x - this.bombPosition.x) ** 2 +
      (player.position.y - this.bombPosition.y) ** 2
    );
    
    if (distance > 100) return false; // Must be within 100 units
    
    this.defuserId = playerId;
    
    // Defuse time: 10 seconds with kit, 5 seconds without
    const hasDefuseKit = player.weapons.includes('defuse_kit');
    const defuseTime = hasDefuseKit ? 5 : 10;
    
    // Start defuse process
    setTimeout(() => {
      if (this.defuserId === playerId && this.roundStats.bombPlanted && !this.roundStats.bombDefused) {
        this.defuseBomb(playerId);
      }
    }, defuseTime * 1000);
    
    this.emitEvent('defuse_started', { 
      playerId, 
      defuseTime, 
      hasKit: hasDefuseKit 
    });
    
    console.log('🛠️ Defuse started by:', playerId, 'time:', defuseTime);
    return true;
  }
  
  /**
   * Complete bomb defuse
   */
  private defuseBomb(playerId: string): void {
    const player = this.players.get(playerId);
    if (!player) return;
    
    this.roundStats.bombDefused = true;
    this.defuserId = null;
    
    // Award defuse bonus
    player.money += this.economySettings.bombDefuseBonus;
    
    // Play defuse sound
    if (this.audioManager) {
      this.audioManager.play('radio/bombdef.wav');
    }
    
    this.endRound('bomb_defused', 'ct', playerId);
  }
  
  /**
   * Explode the bomb
   */
  private explodeBomb(): void {
    this.roundStats.bombTimeLeft = 0;
    this.gameState.bombTimer = 0;
    
    // Play explosion sound
    if (this.audioManager) {
      this.audioManager.play('weapons/c4_explode1.wav', this.bombPosition);
    }
    
    // Kill nearby players
    if (this.bombPosition) {
      this.players.forEach(player => {
        const distance = Math.sqrt(
          (player.position.x - this.bombPosition!.x) ** 2 +
          (player.position.y - this.bombPosition!.y) ** 2
        );
        
        if (distance < 500 && player.isAlive) {
          const damage = Math.max(0, 500 * (1 - distance / 500));
          player.health -= damage;
          if (player.health <= 0) {
            player.isAlive = false;
            player.deaths++;
          }
        }
      });
    }
    
    this.emitEvent('bomb_exploded', { 
      position: this.bombPosition,
      planter: this.bombPlanterId 
    });
    
    this.endRound('bomb_exploded', 't', this.bombPlanterId);
  }
  
  /**
   * End the current round
   */
  private endRound(reason: RoundEndReason, winner: WinningTeam, mvpPlayer?: string): void {
    this.roundStats.phase = 'post_round';
    this.roundStats.endReason = reason;
    this.roundStats.winningTeam = winner;
    this.roundStats.mvpPlayer = mvpPlayer;
    
    // Update scores
    if (winner === 'ct') {
      this.roundStats.ctScore++;
      this.consecutiveLosses.ct = 0;
      this.consecutiveLosses.t++;
    } else if (winner === 't') {
      this.roundStats.tScore++;
      this.consecutiveLosses.t = 0;
      this.consecutiveLosses.ct++;
    }
    
    // Update game state scores
    this.gameState.ctScore = this.roundStats.ctScore;
    this.gameState.tScore = this.roundStats.tScore;
    
    // Award money based on round outcome
    this.awardRoundMoney(winner, reason);
    
    // Play appropriate end round sound
    this.playEndRoundSound(winner);
    
    this.emitEvent('round_end', {
      reason,
      winner,
      mvpPlayer,
      scores: { ct: this.roundStats.ctScore, t: this.roundStats.tScore }
    });
    
    console.log('🏁 Round ended:', {
      reason,
      winner,
      scores: `CT ${this.roundStats.ctScore} - ${this.roundStats.tScore} T`
    });
    
    // Check for match end
    if (this.isMatchComplete()) {
      this.endMatch();
    } else {
      // Schedule next round
      setTimeout(() => this.startNextRound(), 5000);
    }
  }
  
  /**
   * Award money at end of round
   */
  private awardRoundMoney(winner: WinningTeam, reason: RoundEndReason): void {
    this.players.forEach(player => {
      let bonus = 0;
      
      if (player.team === winner) {
        // Winning team gets win bonus
        bonus = this.economySettings.winBonus;
        
        // Additional bonuses for specific actions
        if (reason === 'bomb_defused' && player.id === this.roundStats.mvpPlayer) {
          bonus += this.economySettings.bombDefuseBonus;
        }
      } else {
        // Losing team gets loss bonus based on consecutive losses
        const consecutiveLosses = player.team === 'ct' ? 
          this.consecutiveLosses.ct : this.consecutiveLosses.t;
        const lossIndex = Math.min(consecutiveLosses, this.economySettings.loseBonus.length - 1);
        bonus = this.economySettings.loseBonus[lossIndex];
      }
      
      player.money = Math.min(this.economySettings.maxMoney, player.money + bonus);
      
      console.log(`💰 Money awarded to ${player.id}: +$${bonus} (total: $${player.money})`);
    });
  }
  
  /**
   * Play end round sound
   */
  private playEndRoundSound(winner: WinningTeam): void {
    if (!this.audioManager) return;
    
    switch (winner) {
      case 'ct':
        this.audioManager.play('radio/ctwin.wav');
        break;
      case 't':
        this.audioManager.play('radio/terwin.wav');
        break;
      case 'draw':
        this.audioManager.play('radio/rounddraw.wav');
        break;
    }
  }
  
  /**
   * Check if match is complete
   */
  private isMatchComplete(): boolean {
    const maxRounds = this.roundStats.maxRounds;
    const roundsToWin = Math.floor(maxRounds / 2) + 1;
    
    return this.roundStats.ctScore >= roundsToWin || 
           this.roundStats.tScore >= roundsToWin ||
           (this.roundStats.ctScore + this.roundStats.tScore) >= maxRounds;
  }
  
  /**
   * End the match
   */
  private endMatch(): void {
    this.roundStats.phase = 'match_end';
    
    const ctWins = this.roundStats.ctScore;
    const tWins = this.roundStats.tScore;
    
    let matchWinner: WinningTeam = 'draw';
    if (ctWins > tWins) matchWinner = 'ct';
    else if (tWins > ctWins) matchWinner = 't';
    
    this.emitEvent('match_end', {
      winner: matchWinner,
      finalScore: { ct: ctWins, t: tWins }
    });
    
    console.log('🏆 Match ended:', {
      winner: matchWinner,
      finalScore: `CT ${ctWins} - ${tWins} T`
    });
  }
  
  /**
   * Start the next round
   */
  private startNextRound(): void {
    this.roundStats.roundNumber++;
    
    // Check for side switch at halftime
    if (this.roundStats.roundNumber === Math.floor(this.roundStats.maxRounds / 2) + 1) {
      this.switchSides();
    }
    
    this.initializeRound();
  }
  
  /**
   * Switch player teams at halftime
   */
  private switchSides(): void {
    this.roundStats.phase = 'halftime';
    
    this.players.forEach(player => {
      player.team = player.team === 'ct' ? 't' : 'ct';
    });
    
    // Swap scores
    const tempScore = this.roundStats.ctScore;
    this.roundStats.ctScore = this.roundStats.tScore;
    this.roundStats.tScore = tempScore;
    
    this.emitEvent('halftime', {
      roundNumber: this.roundStats.roundNumber
    });
    
    console.log('🔄 Halftime - sides switched');
    
    // Continue after halftime break
    setTimeout(() => {
      this.roundStats.phase = 'freeze';
    }, 3000);
  }
  
  /**
   * Respawn all players for new round
   */
  private respawnAllPlayers(): void {
    this.players.forEach(player => {
      player.isAlive = true;
      player.health = 100;
      // Armor and equipment persist between rounds
      
      // Reset position to spawn point
      // This would need actual spawn point logic
      if (player.team === 'ct') {
        player.position = { x: 100, y: 100 }; // CT spawn
      } else {
        player.position = { x: 900, y: 700 }; // T spawn
      }
      
      player.velocity = { x: 0, y: 0 };
      player.isDucking = false;
      player.isWalking = false;
      player.isScoped = false;
      player.isInPain = false;
    });
  }
  
  /**
   * Update alive player counts
   */
  private updateAliveCount(): void {
    let ctAlive = 0;
    let tAlive = 0;
    
    this.players.forEach(player => {
      if (player.isAlive) {
        if (player.team === 'ct') {
          ctAlive++;
        } else {
          tAlive++;
        }
      }
    });
    
    this.roundStats.ctAlive = ctAlive;
    this.roundStats.tAlive = tAlive;
  }
  
  /**
   * Register event callback
   */
  onEvent(event: string, callback: Function): void {
    if (!this.eventCallbacks.has(event)) {
      this.eventCallbacks.set(event, []);
    }
    this.eventCallbacks.get(event)!.push(callback);
  }
  
  /**
   * Emit event to registered callbacks
   */
  private emitEvent(event: string, data: any): void {
    const callbacks = this.eventCallbacks.get(event);
    if (callbacks) {
      callbacks.forEach(callback => callback(data));
    }
  }
  
  /**
   * Get current round statistics
   */
  getRoundStats(): RoundStats {
    return { ...this.roundStats };
  }
  
  /**
   * Force start new round (admin command)
   */
  forceNewRound(): void {
    if (this.roundStats.phase === 'live' || this.roundStats.phase === 'freeze') {
      this.endRound('elimination', 'draw');
    }
  }
  
  /**
   * Set audio manager
   */
  setAudioManager(audioManager: CS16AudioManager): void {
    this.audioManager = audioManager;
  }
}