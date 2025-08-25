import { describe, it, expect, beforeEach } from 'vitest';

interface EconomySystem {
  calculateKillReward(weapon: string, headshot: boolean): number;
  calculateRoundReward(team: string, winCondition: string, consecutiveLosses: number): number;
  calculateBombReward(action: 'plant' | 'defuse'): number;
  canAffordPurchase(playerMoney: number, itemCost: number): boolean;
  applyMoneyLimit(money: number): number;
}

describe('EconomySystem', () => {
  let economySystem: EconomySystem;

  beforeEach(() => {
    economySystem = {
      calculateKillReward: (weapon: string, headshot: boolean) => {
        const baseReward = 300;
        const headshotBonus = headshot ? 100 : 0;
        const weaponMultiplier = weapon === 'knife' ? 3 : 1;
        return (baseReward + headshotBonus) * weaponMultiplier;
      },
      calculateRoundReward: (team: string, winCondition: string, consecutiveLosses: number) => {
        const baseWinReward = 3250;
        const bombPlantReward = 800;
        const lossReward = Math.min(1400 + (consecutiveLosses * 500), 3400);
        
        if (winCondition === 'bomb_exploded' || winCondition === 'bomb_defused') {
          return baseWinReward + (winCondition === 'bomb_exploded' ? bombPlantReward : 0);
        }
        if (winCondition === 'elimination') {
          return baseWinReward;
        }
        return lossReward; // Loss bonus
      },
      calculateBombReward: (action: 'plant' | 'defuse') => {
        return action === 'plant' ? 800 : 2500;
      },
      canAffordPurchase: (playerMoney: number, itemCost: number) => {
        return playerMoney >= itemCost;
      },
      applyMoneyLimit: (money: number) => {
        return Math.min(money, 16000);
      },
    };
  });

  describe('Kill Rewards', () => {
    it('should calculate standard kill reward correctly', () => {
      const reward = economySystem.calculateKillReward('ak47', false);
      expect(reward).toBe(300);
    });

    it('should apply headshot bonus', () => {
      const reward = economySystem.calculateKillReward('ak47', true);
      expect(reward).toBe(400); // 300 base + 100 headshot
    });

    it('should apply knife kill multiplier', () => {
      const reward = economySystem.calculateKillReward('knife', false);
      expect(reward).toBe(900); // 300 * 3
    });

    it('should apply knife headshot bonus correctly', () => {
      const reward = economySystem.calculateKillReward('knife', true);
      expect(reward).toBe(1200); // (300 + 100) * 3
    });

    it('should handle different weapon types', () => {
      const weapons = ['ak47', 'm4a1', 'awp', 'deagle', 'glock'];
      
      weapons.forEach(weapon => {
        const reward = economySystem.calculateKillReward(weapon, false);
        if (weapon === 'knife') {
          expect(reward).toBe(900);
        } else {
          expect(reward).toBe(300);
        }
      });
    });
  });

  describe('Round Rewards', () => {
    it('should calculate elimination win reward', () => {
      const reward = economySystem.calculateRoundReward('ct', 'elimination', 0);
      expect(reward).toBe(3250);
    });

    it('should calculate bomb explosion reward', () => {
      const reward = economySystem.calculateRoundReward('t', 'bomb_exploded', 0);
      expect(reward).toBe(4050); // 3250 + 800
    });

    it('should calculate bomb defuse reward', () => {
      const reward = economySystem.calculateRoundReward('ct', 'bomb_defused', 0);
      expect(reward).toBe(3250);
    });

    it('should calculate loss bonus progression', () => {
      const loss1 = economySystem.calculateRoundReward('ct', 'loss', 1);
      const loss2 = economySystem.calculateRoundReward('ct', 'loss', 2);
      const loss3 = economySystem.calculateRoundReward('ct', 'loss', 3);
      const loss4 = economySystem.calculateRoundReward('ct', 'loss', 4);
      const loss5 = economySystem.calculateRoundReward('ct', 'loss', 5);

      expect(loss1).toBe(1900); // 1400 + 500
      expect(loss2).toBe(2400); // 1400 + 1000
      expect(loss3).toBe(2900); // 1400 + 1500
      expect(loss4).toBe(3400); // Capped at maximum
      expect(loss5).toBe(3400); // Still capped
    });

    it('should cap loss bonus at maximum', () => {
      const reward = economySystem.calculateRoundReward('ct', 'loss', 10);
      expect(reward).toBe(3400); // Should not exceed maximum
    });
  });

  describe('Bomb Action Rewards', () => {
    it('should reward bomb plant correctly', () => {
      const reward = economySystem.calculateBombReward('plant');
      expect(reward).toBe(800);
    });

    it('should reward bomb defuse correctly', () => {
      const reward = economySystem.calculateBombReward('defuse');
      expect(reward).toBe(2500);
    });
  });

  describe('Purchase Validation', () => {
    it('should allow purchase when player has enough money', () => {
      const canAfford = economySystem.canAffordPurchase(2700, 2500);
      expect(canAfford).toBe(true);
    });

    it('should deny purchase when player lacks money', () => {
      const canAfford = economySystem.canAffordPurchase(2400, 2500);
      expect(canAfford).toBe(false);
    });

    it('should handle exact amount purchases', () => {
      const canAfford = economySystem.canAffordPurchase(2500, 2500);
      expect(canAfford).toBe(true);
    });

    it('should validate multiple item purchases', () => {
      const playerMoney = 5000;
      const ak47Cost = 2500;
      const kevlarCost = 650;
      const flashbangCost = 200;
      
      const totalCost = ak47Cost + kevlarCost + flashbangCost;
      const canAfford = economySystem.canAffordPurchase(playerMoney, totalCost);
      
      expect(totalCost).toBe(3350);
      expect(canAfford).toBe(true);
    });
  });

  describe('Money Limit System', () => {
    it('should cap money at maximum limit', () => {
      const cappedMoney = economySystem.applyMoneyLimit(18000);
      expect(cappedMoney).toBe(16000);
    });

    it('should not modify money below limit', () => {
      const money = economySystem.applyMoneyLimit(15000);
      expect(money).toBe(15000);
    });

    it('should handle exact limit', () => {
      const money = economySystem.applyMoneyLimit(16000);
      expect(money).toBe(16000);
    });
  });

  describe('Economy Balance', () => {
    it('should simulate eco round scenarios', () => {
      const ecoPlayerMoney = 1000;
      const pistolCost = 500;
      const kevlarCost = 650;
      
      const canBuyPistol = economySystem.canAffordPurchase(ecoPlayerMoney, pistolCost);
      const canBuyKevlar = economySystem.canAffordPurchase(ecoPlayerMoney, kevlarCost);
      const canBuyBoth = economySystem.canAffordPurchase(ecoPlayerMoney, pistolCost + kevlarCost);
      
      expect(canBuyPistol).toBe(true);
      expect(canBuyKevlar).toBe(true);
      expect(canBuyBoth).toBe(false); // Forced choice in eco rounds
    });

    it('should simulate force buy scenarios', () => {
      const forceBuyMoney = 2000;
      const ak47Cost = 2500;
      const fmasCost = 2250;
      
      const canBuyAK = economySystem.canAffordPurchase(forceBuyMoney, ak47Cost);
      const canBuyFmas = economySystem.canAffordPurchase(forceBuyMoney, fmasCost);
      
      expect(canBuyAK).toBe(false);
      expect(canBuyFmas).toBe(false); // Must save or use cheaper weapons
    });

    it('should simulate full buy scenarios', () => {
      const fullBuyMoney = 8000;
      const ak47Cost = 2500;
      const kevlarHelmetCost = 1000;
      const flashbangCost = 200;
      const hegrenadeCost = 300;
      const smokeCost = 300;
      
      const totalCost = ak47Cost + kevlarHelmetCost + flashbangCost + hegrenadeCost + smokeCost;
      const canFullBuy = economySystem.canAffordPurchase(fullBuyMoney, totalCost);
      
      expect(totalCost).toBe(4300);
      expect(canFullBuy).toBe(true);
      expect(fullBuyMoney - totalCost).toBe(3700); // Leftover money
    });
  });

  describe('Team Economy Scenarios', () => {
    it('should handle team money distribution', () => {
      const teamMoney = [800, 1200, 2400, 4000, 16000]; // 5 players
      const averageMoney = teamMoney.reduce((sum, money) => sum + money, 0) / teamMoney.length;
      
      expect(averageMoney).toBe(4880);
      
      // Count players who can full buy (>4000)
      const fullBuyPlayers = teamMoney.filter(money => money >= 4000).length;
      expect(fullBuyPlayers).toBe(2);
    });

    it('should simulate team save round', () => {
      const teamMoney = [800, 900, 1100, 1200, 1400];
      const pistolCost = 500;
      
      const playersWhoCanBuy = teamMoney.filter(money => money >= pistolCost).length;
      expect(playersWhoCanBuy).toBe(5); // All can buy pistols
    });
  });

  describe('Match Economy Progression', () => {
    it('should simulate pistol round economy', () => {
      const startMoney = 800;
      const glockCost = 400;
      const kevlarCost = 650;
      
      // Most players save money in pistol round
      const afterPistolSave = startMoney;
      expect(afterPistolSave).toBe(800);
    });

    it('should simulate second round win economy', () => {
      const startMoney = 800;
      const winReward = 3250;
      const killReward = 300; // Assume 1 kill
      
      const secondRoundMoney = economySystem.applyMoneyLimit(startMoney + winReward + killReward);
      expect(secondRoundMoney).toBe(4350);
    });

    it('should simulate anti-eco round', () => {
      const richPlayerMoney = 8000;
      const poorPlayerMoney = 1400; // Lost pistol, got loss bonus
      
      const smgCost = 1250; // MP5 for anti-eco
      const riflePrice = 2500;
      
      const richCanBuyRifle = economySystem.canAffordPurchase(richPlayerMoney, riflePrice);
      const richCanBuySMG = economySystem.canAffordPurchase(richPlayerMoney, smgCost);
      const poorCanBuyAnything = economySystem.canAffordPurchase(poorPlayerMoney, smgCost);
      
      expect(richCanBuyRifle).toBe(true);
      expect(richCanBuySMG).toBe(true);
      expect(poorCanBuyAnything).toBe(true);
    });
  });
});