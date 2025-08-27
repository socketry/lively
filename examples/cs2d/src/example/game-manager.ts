/**
 * Example TypeScript module demonstrating strict typing without any
 */

// Define strict interfaces
interface Player {
  readonly id: string;
  readonly name: string;
  readonly team: 'ct' | 't' | 'spectator';
  readonly score: number;
  readonly health: number;
  readonly position: Position;
  readonly inventory: Inventory;
}

interface Position {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

interface Inventory {
  readonly primary: Weapon | null;
  readonly secondary: Weapon | null;
  readonly grenades: readonly Grenade[];
  readonly money: number;
}

interface Weapon {
  readonly type: WeaponType;
  readonly ammo: number;
  readonly maxAmmo: number;
  readonly damage: number;
  readonly fireRate: number;
}

interface Grenade {
  readonly type: 'flashbang' | 'smoke' | 'he' | 'molotov';
  readonly count: number;
}

type WeaponType = 'ak47' | 'm4a1' | 'awp' | 'deagle' | 'glock' | 'usp';

interface GameState {
  readonly round: number;
  readonly timeLeft: number;
  readonly ctScore: number;
  readonly tScore: number;
  readonly bombPlanted: boolean;
  readonly bombDefused: boolean;
  readonly players: ReadonlyMap<string, Player>;
}

// Game Manager class with strict typing
export class GameManager {
  private gameState: GameState;
  private readonly roundTime: number = 120;

  constructor(initialState?: Partial<GameState>) {
    this.gameState = {
      round: initialState?.round ?? 1,
      timeLeft: initialState?.timeLeft ?? this.roundTime,
      ctScore: initialState?.ctScore ?? 0,
      tScore: initialState?.tScore ?? 0,
      bombPlanted: initialState?.bombPlanted ?? false,
      bombDefused: initialState?.bombDefused ?? false,
      players: initialState?.players ?? new Map(),
    };
  }

  public addPlayer(player: Player): void {
    const newPlayers = new Map(this.gameState.players);
    newPlayers.set(player.id, player);

    this.gameState = {
      ...this.gameState,
      players: newPlayers,
    };
  }

  public removePlayer(playerId: string): boolean {
    if (!this.gameState.players.has(playerId)) {
      return false;
    }

    const newPlayers = new Map(this.gameState.players);
    newPlayers.delete(playerId);

    this.gameState = {
      ...this.gameState,
      players: newPlayers,
    };

    return true;
  }

  public updatePlayerHealth(playerId: string, health: number): void {
    const player = this.gameState.players.get(playerId);
    if (player === undefined) {
      throw new Error(`Player with ID ${playerId} not found`);
    }

    const updatedPlayer: Player = {
      ...player,
      health: Math.max(0, Math.min(100, health)),
    };

    const newPlayers = new Map(this.gameState.players);
    newPlayers.set(playerId, updatedPlayer);

    this.gameState = {
      ...this.gameState,
      players: newPlayers,
    };
  }

  public plantBomb(): void {
    if (this.gameState.bombPlanted) {
      throw new Error('Bomb is already planted');
    }

    this.gameState = {
      ...this.gameState,
      bombPlanted: true,
      timeLeft: 45, // Bomb timer
    };
  }

  public defuseBomb(): void {
    if (!this.gameState.bombPlanted) {
      throw new Error('No bomb to defuse');
    }

    if (this.gameState.bombDefused) {
      throw new Error('Bomb already defused');
    }

    this.gameState = {
      ...this.gameState,
      bombDefused: true,
    };

    this.endRound('ct');
  }

  private endRound(winner: 'ct' | 't'): void {
    const newCtScore = winner === 'ct' ? this.gameState.ctScore + 1 : this.gameState.ctScore;
    const newTScore = winner === 't' ? this.gameState.tScore + 1 : this.gameState.tScore;

    this.gameState = {
      ...this.gameState,
      round: this.gameState.round + 1,
      ctScore: newCtScore,
      tScore: newTScore,
      timeLeft: this.roundTime,
      bombPlanted: false,
      bombDefused: false,
    };

    if (newCtScore >= 16 || newTScore >= 16) {
      this.endGame();
    }
  }

  private endGame(): void {
    const winner = this.gameState.ctScore > this.gameState.tScore ? 'ct' : 't';
    console.warn(`Game ended! Winner: ${winner.toUpperCase()}`);
  }

  public getState(): Readonly<GameState> {
    return this.gameState;
  }

  public getPlayerCount(): number {
    return this.gameState.players.size;
  }

  public getTeamPlayers(team: 'ct' | 't'): readonly Player[] {
    return Array.from(this.gameState.players.values()).filter((player) => player.team === team);
  }

  public calculateTeamHealth(team: 'ct' | 't'): number {
    return this.getTeamPlayers(team).reduce((total, player) => total + player.health, 0);
  }

  public isGameOver(): boolean {
    return this.gameState.ctScore >= 16 || this.gameState.tScore >= 16;
  }

  public getRoundWinner(): 'ct' | 't' | null {
    const ctAlive = this.getTeamPlayers('ct').some((p) => p.health > 0);
    const tAlive = this.getTeamPlayers('t').some((p) => p.health > 0);

    if (!ctAlive && tAlive) return 't';
    if (ctAlive && !tAlive) return 'ct';
    if (this.gameState.bombDefused) return 'ct';
    if (this.gameState.timeLeft <= 0 && this.gameState.bombPlanted) return 't';
    if (this.gameState.timeLeft <= 0 && !this.gameState.bombPlanted) return 'ct';

    return null;
  }
}
