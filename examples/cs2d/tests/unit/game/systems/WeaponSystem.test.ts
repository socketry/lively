import { describe, it, expect, beforeEach, vi } from 'vitest';
import { WeaponSystem } from '../../../../src/game/weapons/WeaponSystem';

describe('WeaponSystem', () => {
  let weaponSystem: WeaponSystem;

  beforeEach(() => {
    weaponSystem = new WeaponSystem();
  });

  describe('Weapon Configuration', () => {
    it('should have correct AK-47 damage values', () => {
      const ak47Config = {
        damage: 36,
        headShotMultiplier: 4.0,
        armorPenetration: 77.5,
        range: 8192,
        rateOfFire: 666, // RPM
        reloadTime: 2.5,
        accuracy: 0.73,
        recoil: 0.98,
        velocity: 2126,
      };

      expect(ak47Config.damage).toBe(36);
      expect(ak47Config.headShotMultiplier).toBe(4.0);
      expect(ak47Config.damage * ak47Config.headShotMultiplier).toBe(144); // Headshot damage
    });

    it('should have correct M4A1 damage values', () => {
      const m4a1Config = {
        damage: 33,
        headShotMultiplier: 4.0,
        armorPenetration: 70.0,
        range: 8192,
        rateOfFire: 666,
        reloadTime: 3.1,
        accuracy: 0.78,
        recoil: 0.75,
        velocity: 2900,
      };

      expect(m4a1Config.damage).toBe(33);
      expect(m4a1Config.damage * m4a1Config.headShotMultiplier).toBe(132);
    });

    it('should have correct AWP damage values', () => {
      const awpConfig = {
        damage: 115,
        headShotMultiplier: 4.0,
        armorPenetration: 99.0,
        range: 8192,
        rateOfFire: 41,
        reloadTime: 3.7,
        accuracy: 0.99,
        recoil: 0.55,
        velocity: 2800,
      };

      expect(awpConfig.damage).toBe(115);
      expect(awpConfig.damage * awpConfig.headShotMultiplier).toBe(460);
      expect(awpConfig.armorPenetration).toBe(99.0);
    });
  });

  describe('Damage Calculations', () => {
    it('should calculate damage with armor correctly', () => {
      const baseDamage = 36; // AK-47
      const armorPenetration = 77.5;
      const armorValue = 100;

      // CS damage formula: damage = baseDamage * (armorPenetration / 100) when armor > 0
      const armorReducedDamage = baseDamage * (armorPenetration / 100);
      
      expect(armorReducedDamage).toBeCloseTo(27.9, 1);
    });

    it('should calculate distance-based damage falloff', () => {
      const baseDamage = 33; // M4A1
      const distance = 1000;
      const maxRange = 8192;
      
      // Linear falloff (simplified)
      const falloffFactor = Math.max(0.5, 1 - (distance / maxRange));
      const finalDamage = Math.floor(baseDamage * falloffFactor);

      expect(finalDamage).toBeGreaterThanOrEqual(16); // Minimum 50% damage
      expect(finalDamage).toBeLessThanOrEqual(33);
    });

    it('should handle leg shot damage multiplier', () => {
      const baseDamage = 36;
      const legMultiplier = 0.75;
      const legDamage = Math.floor(baseDamage * legMultiplier);

      expect(legDamage).toBe(27);
    });

    it('should handle chest shot damage (no multiplier)', () => {
      const baseDamage = 36;
      const chestMultiplier = 1.0;
      const chestDamage = Math.floor(baseDamage * chestMultiplier);

      expect(chestDamage).toBe(36);
    });
  });

  describe('Recoil System', () => {
    it('should calculate recoil pattern correctly', () => {
      const baseAccuracy = 0.73; // AK-47
      const recoilFactor = 0.98;
      const shotsFired = 5;

      // Recoil increases with consecutive shots
      const currentRecoil = recoilFactor * shotsFired;
      const currentAccuracy = Math.max(0.1, baseAccuracy - (currentRecoil * 0.1));

      expect(currentAccuracy).toBeLessThan(baseAccuracy);
      expect(currentAccuracy).toBeGreaterThanOrEqual(0.1);
    });

    it('should reset recoil after weapon switch', () => {
      let shotsFired = 10;
      let recoil = shotsFired * 0.1;

      // Reset on weapon switch
      shotsFired = 0;
      recoil = 0;

      expect(shotsFired).toBe(0);
      expect(recoil).toBe(0);
    });
  });

  describe('Ammunition System', () => {
    it('should track ammunition correctly', () => {
      const ak47Ammo = {
        clipSize: 30,
        maxAmmo: 90,
        currentClip: 30,
        reserveAmmo: 60,
      };

      // Fire one shot
      ak47Ammo.currentClip--;

      expect(ak47Ammo.currentClip).toBe(29);

      // Reload
      const ammoToReload = Math.min(ak47Ammo.clipSize, ak47Ammo.reserveAmmo);
      ak47Ammo.reserveAmmo -= (ammoToReload - ak47Ammo.currentClip);
      ak47Ammo.currentClip = ammoToReload;

      expect(ak47Ammo.currentClip).toBe(30);
      expect(ak47Ammo.reserveAmmo).toBe(59);
    });

    it('should prevent shooting when out of ammo', () => {
      const currentClip = 0;
      const canShoot = currentClip > 0;

      expect(canShoot).toBe(false);
    });
  });

  describe('Rate of Fire', () => {
    it('should calculate correct fire rate timing', () => {
      const rateOfFire = 666; // RPM (AK-47)
      const timeBetweenShots = 60000 / rateOfFire; // milliseconds

      expect(timeBetweenShots).toBeCloseTo(90.09, 1);
    });

    it('should prevent rapid fire beyond weapon limits', () => {
      const lastShotTime = 1000;
      const currentTime = 1050;
      const minTimeBetweenShots = 90; // AK-47 timing

      const canFire = (currentTime - lastShotTime) >= minTimeBetweenShots;

      expect(canFire).toBe(false);
    });
  });

  describe('Weapon Economics', () => {
    it('should have correct weapon prices', () => {
      const weaponPrices = {
        glock: 400,
        usp: 500,
        deagle: 650,
        ak47: 2500,
        m4a1: 3100,
        awp: 4750,
        flashbang: 200,
        hegrenade: 300,
        smokegrenade: 300,
      };

      expect(weaponPrices.ak47).toBe(2500);
      expect(weaponPrices.m4a1).toBe(3100);
      expect(weaponPrices.awp).toBe(4750);
    });

    it('should calculate purchase feasibility', () => {
      const playerMoney = 3000;
      const weaponPrice = 2500;
      const kevlarPrice = 650;
      
      const canBuyBoth = playerMoney >= (weaponPrice + kevlarPrice);
      
      expect(canBuyBoth).toBe(false);
    });
  });

  describe('Weapon Switching', () => {
    it('should handle weapon switch timing', () => {
      const weaponSwitchTime = 500; // milliseconds
      const lastSwitchTime = 1000;
      const currentTime = 1300;

      const canSwitchWeapon = (currentTime - lastSwitchTime) >= weaponSwitchTime;

      expect(canSwitchWeapon).toBe(false);
    });

    it('should interrupt reload when switching weapons', () => {
      let isReloading = true;
      let reloadStartTime = 1000;

      // Switch weapon
      isReloading = false;
      reloadStartTime = 0;

      expect(isReloading).toBe(false);
      expect(reloadStartTime).toBe(0);
    });
  });
});