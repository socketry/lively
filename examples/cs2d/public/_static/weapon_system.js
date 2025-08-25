// Complete CS 1.6 Weapon System
class WeaponSystem {
    constructor(game) {
        this.game = game;
        this.weapons = this.initializeWeapons();
        this.currentBurstCount = 0;
        this.burstTarget = 0;
        this.burstInterval = null;
        this.autoFireInterval = null;
        this.isScoped = false;
        this.scopeLevel = 0; // 0 = no scope, 1 = 2x zoom, 2 = 4x zoom
    }

    initializeWeapons() {
        return {
            // Pistols
            "glock": {
                name: "Glock-18",
                type: "pistol",
                damage: 25,
                fireRate: 400, // ms between shots
                fireMode: "burst", // semi, burst, auto
                burstCount: 3,
                burstDelay: 50, // ms between burst shots
                magazine: 20,
                reserveAmmo: 120,
                reloadTime: 2200,
                accuracy: { standing: 0.85, moving: 0.65, crouching: 0.95 },
                hasScope: false
            },
            "usp": {
                name: "USP-S",
                type: "pistol", 
                damage: 34,
                fireRate: 350,
                fireMode: "semi",
                magazine: 12,
                reserveAmmo: 100,
                reloadTime: 2500,
                accuracy: { standing: 0.90, moving: 0.70, crouching: 0.98 },
                hasScope: false
            },
            "deagle": {
                name: "Desert Eagle",
                type: "pistol",
                damage: 54,
                fireRate: 267,
                fireMode: "semi",
                magazine: 7,
                reserveAmmo: 35,
                reloadTime: 2200,
                accuracy: { standing: 0.75, moving: 0.40, crouching: 0.85 },
                hasScope: false
            },
            "p228": {
                name: "P228",
                type: "pistol",
                damage: 32,
                fireRate: 300,
                fireMode: "semi",
                magazine: 13,
                reserveAmmo: 52,
                reloadTime: 2700,
                accuracy: { standing: 0.80, moving: 0.55, crouching: 0.90 },
                hasScope: false
            },
            "elite": {
                name: "Dual Berettas",
                type: "pistol",
                damage: 38,
                fireRate: 500,
                fireMode: "dual", // Special dual-wield mode
                magazine: 30, // 15 per gun
                reserveAmmo: 120,
                reloadTime: 4200,
                accuracy: { standing: 0.70, moving: 0.45, crouching: 0.80 },
                hasScope: false
            },
            "fiveseven": {
                name: "Five-SeveN",
                type: "pistol",
                damage: 25,
                fireRate: 300,
                fireMode: "semi",
                magazine: 20,
                reserveAmmo: 100,
                reloadTime: 2700,
                accuracy: { standing: 0.85, moving: 0.60, crouching: 0.95 },
                hasScope: false
            },

            // Shotguns
            "m3": {
                name: "M3 Super 90",
                type: "shotgun",
                damage: 20, // per pellet
                fireRate: 880,
                fireMode: "pump",
                pelletCount: 8,
                spread: 0.15,
                magazine: 8,
                reserveAmmo: 32,
                reloadTime: 500, // per shell
                accuracy: { standing: 0.60, moving: 0.40, crouching: 0.70 },
                hasScope: false
            },
            "xm1014": {
                name: "XM1014",
                type: "shotgun",
                damage: 22, // per pellet
                fireRate: 240,
                fireMode: "auto_shotgun",
                pelletCount: 6,
                spread: 0.18,
                magazine: 7,
                reserveAmmo: 32,
                reloadTime: 400, // per shell
                accuracy: { standing: 0.50, moving: 0.35, crouching: 0.65 },
                hasScope: false
            },

            // SMGs
            "mac10": {
                name: "MAC-10",
                type: "smg",
                damage: 27,
                fireRate: 60, // Very fast
                fireMode: "auto",
                magazine: 30,
                reserveAmmo: 100,
                reloadTime: 3100,
                accuracy: { standing: 0.60, moving: 0.75, crouching: 0.70 },
                hasScope: false
            },
            "tmp": {
                name: "TMP",
                type: "smg",
                damage: 20,
                fireRate: 70,
                fireMode: "auto",
                magazine: 30,
                reserveAmmo: 120,
                reloadTime: 2100,
                accuracy: { standing: 0.70, moving: 0.80, crouching: 0.80 },
                hasScope: false
            },
            "mp5": {
                name: "MP5-Navy",
                type: "smg",
                damage: 26,
                fireRate: 80,
                fireMode: "auto",
                magazine: 30,
                reserveAmmo: 120,
                reloadTime: 2600,
                accuracy: { standing: 0.70, moving: 0.85, crouching: 0.80 },
                hasScope: false
            },
            "ump45": {
                name: "UMP45",
                type: "smg",
                damage: 30,
                fireRate: 100,
                fireMode: "auto",
                magazine: 25,
                reserveAmmo: 100,
                reloadTime: 3500,
                accuracy: { standing: 0.75, moving: 0.70, crouching: 0.85 },
                hasScope: false
            },
            "p90": {
                name: "P90",
                type: "smg",
                damage: 21,
                fireRate: 70,
                fireMode: "auto",
                magazine: 50,
                reserveAmmo: 100,
                reloadTime: 3400,
                accuracy: { standing: 0.75, moving: 0.90, crouching: 0.85 },
                hasScope: false
            },

            // Rifles
            "galil": {
                name: "Galil",
                type: "rifle",
                damage: 30,
                fireRate: 90,
                fireMode: "auto",
                magazine: 35,
                reserveAmmo: 90,
                reloadTime: 2500,
                accuracy: { standing: 0.70, moving: 0.40, crouching: 0.80 },
                hasScope: false
            },
            "famas": {
                name: "FAMAS",
                type: "rifle",
                damage: 30,
                fireRate: 90,
                fireMode: "burst", // Can switch between burst and auto
                burstCount: 3,
                burstDelay: 55,
                magazine: 25,
                reserveAmmo: 90,
                reloadTime: 3300,
                accuracy: { standing: 0.75, moving: 0.45, crouching: 0.85 },
                hasScope: false
            },
            "ak47": {
                name: "AK-47",
                type: "rifle",
                damage: 36,
                fireRate: 100,
                fireMode: "auto",
                magazine: 30,
                reserveAmmo: 90,
                reloadTime: 2500,
                accuracy: { standing: 0.75, moving: 0.45, crouching: 0.85 },
                hasScope: false
            },
            "m4a1": {
                name: "M4A1",
                type: "rifle",
                damage: 33,
                fireRate: 90,
                fireMode: "auto",
                magazine: 30,
                reserveAmmo: 90,
                reloadTime: 3100,
                accuracy: { standing: 0.80, moving: 0.50, crouching: 0.90 },
                hasScope: false
            },
            "sg552": {
                name: "SG-552",
                type: "rifle",
                damage: 33,
                fireRate: 90,
                fireMode: "auto",
                magazine: 30,
                reserveAmmo: 90,
                reloadTime: 3000,
                accuracy: { standing: 0.80, moving: 0.50, crouching: 0.90 },
                hasScope: true,
                scopeZoom: [1.25, 3.0] // 1.25x and 3x zoom
            },
            "aug": {
                name: "AUG",
                type: "rifle",
                damage: 32,
                fireRate: 90,
                fireMode: "auto",
                magazine: 30,
                reserveAmmo: 90,
                reloadTime: 3800,
                accuracy: { standing: 0.80, moving: 0.50, crouching: 0.90 },
                hasScope: true,
                scopeZoom: [1.25, 3.0]
            },

            // Sniper Rifles
            "scout": {
                name: "Scout",
                type: "sniper",
                damage: 75,
                fireRate: 1250,
                fireMode: "bolt",
                magazine: 10,
                reserveAmmo: 90,
                reloadTime: 2000,
                accuracy: { standing: 0.95, moving: 0.15, crouching: 0.99 },
                hasScope: true,
                scopeZoom: [2.0, 4.0]
            },
            "awp": {
                name: "AWP",
                type: "sniper",
                damage: 115,
                fireRate: 1470,
                fireMode: "bolt",
                magazine: 10,
                reserveAmmo: 30,
                reloadTime: 3700,
                accuracy: { standing: 0.99, moving: 0.20, crouching: 0.99 },
                hasScope: true,
                scopeZoom: [2.0, 4.0]
            },
            "g3sg1": {
                name: "G3SG1",
                type: "sniper",
                damage: 80,
                fireRate: 240,
                fireMode: "auto",
                magazine: 20,
                reserveAmmo: 90,
                reloadTime: 4200,
                accuracy: { standing: 0.85, moving: 0.25, crouching: 0.95 },
                hasScope: true,
                scopeZoom: [2.0, 4.0]
            },
            "sg550": {
                name: "SG-550",
                type: "sniper",
                damage: 70,
                fireRate: 240,
                fireMode: "auto",
                magazine: 30,
                reserveAmmo: 90,
                reloadTime: 3500,
                accuracy: { standing: 0.85, moving: 0.25, crouching: 0.95 },
                hasScope: true,
                scopeZoom: [2.0, 4.0]
            },

            // Machine Gun
            "m249": {
                name: "M249",
                type: "machinegun",
                damage: 32,
                fireRate: 80,
                fireMode: "auto",
                magazine: 100,
                reserveAmmo: 200,
                reloadTime: 5700,
                accuracy: { standing: 0.65, moving: 0.35, crouching: 0.75 },
                hasScope: false
            },

            // Melee
            "knife": {
                name: "Knife",
                type: "melee",
                damage: 65, // slash, 180 for backstab
                fireRate: 1000,
                fireMode: "melee",
                magazine: 999,
                reserveAmmo: 0,
                reloadTime: 0,
                accuracy: { standing: 1.0, moving: 1.0, crouching: 1.0 },
                hasScope: false
            }
        };
    }

    getWeapon(weaponName) {
        return this.weapons[weaponName] || this.weapons.knife;
    }

    shoot(weaponName, player, mouse) {
        if (!this.game || !this.game.bullets) {
            console.warn('WeaponSystem: Game instance not available');
            return false;
        }

        const weapon = this.getWeapon(weaponName);
        if (!weapon) {
            console.warn('WeaponSystem: Unknown weapon:', weaponName);
            return false;
        }
        
        // Check basic conditions
        if (!this.canShoot(player, weapon)) {
            return false;
        }

        // Handle different fire modes
        switch (weapon.fireMode) {
            case "semi":
                return this.shootSingle(weapon, player);
            
            case "burst":
                return this.shootBurst(weapon, player);
            
            case "auto":
                return this.shootAuto(weapon, player);
            
            case "dual":
                return this.shootDual(weapon, player);
            
            case "pump":
                return this.shootPump(weapon, player);
            
            case "auto_shotgun":
                return this.shootAutoShotgun(weapon, player);
            
            case "bolt":
                return this.shootBolt(weapon, player);
            
            case "melee":
                return this.shootMelee(weapon, player, mouse);
            
            default:
                return this.shootSingle(weapon, player);
        }
    }

    canShoot(player, weapon) {
        const now = Date.now();
        
        // Dead player can't shoot
        if (player.health <= 0 || !player.alive) {
            return false;
        }

        // Can't shoot while reloading
        if (player.isReloading) {
            return false;
        }

        // Check fire rate
        if (now - (player.lastShotTime || 0) < weapon.fireRate) {
            return false;
        }

        // Check ammo
        if (player.ammo <= 0) {
            this.game.addChatMessage('系統', '彈藥不足！按 R 重新裝彈', 'system');
            this.game.reload();
            return false;
        }

        return true;
    }

    shootSingle(weapon, player) {
        this.consumeAmmo(player, 1);
        this.createBullet(weapon, player, 1, 0);
        this.createMuzzleFlash(player.x, player.y, player.angle, weapon.type);
        player.lastShotTime = Date.now();
        return true;
    }

    shootBurst(weapon, player) {
        if (this.currentBurstCount > 0) return false; // Already bursting
        
        this.currentBurstCount = 1;
        this.burstTarget = weapon.burstCount;
        
        // Fire first shot immediately
        this.consumeAmmo(player, 1);
        this.createBullet(weapon, player, 1, 0);
        this.createMuzzleFlash(player.x, player.y, player.angle, weapon.type);
        
        // Schedule remaining shots
        this.burstInterval = setInterval(() => {
            if (this.currentBurstCount < this.burstTarget && player.ammo > 0) {
                this.currentBurstCount++;
                this.consumeAmmo(player, 1);
                this.createBullet(weapon, player, 1, 0);
                this.createMuzzleFlash(player.x, player.y, player.angle, weapon.type);
            } else {
                clearInterval(this.burstInterval);
                this.currentBurstCount = 0;
                player.lastShotTime = Date.now();
            }
        }, weapon.burstDelay);
        
        return true;
    }

    shootAuto(weapon, player) {
        // Single shot for now - auto firing handled by continuous mouse hold
        return this.shootSingle(weapon, player);
    }

    shootDual(weapon, player) {
        // Dual berettas - alternating fire
        const shotsToFire = Math.min(2, player.ammo);
        this.consumeAmmo(player, shotsToFire);
        
        // Fire first shot immediately
        if (shotsToFire > 0) {
            this.createBullet(weapon, player, 1, -0.05); // Left hand
            this.createMuzzleFlash(player.x, player.y, player.angle - 0.05, weapon.type);
        }
        
        // Fire second shot with delay if we have ammo for it
        if (shotsToFire > 1) {
            setTimeout(() => {
                this.createBullet(weapon, player, 1, 0.05); // Right hand
                this.createMuzzleFlash(player.x, player.y, player.angle + 0.05, weapon.type);
            }, 50); // 50ms delay for second shot
        }
        
        player.lastShotTime = Date.now();
        return true;
    }

    shootPump(weapon, player) {
        // Shotgun - multiple pellets
        this.consumeAmmo(player, 1);
        this.createBullet(weapon, player, weapon.pelletCount, 0, weapon.spread);
        this.createMuzzleFlash(player.x, player.y, player.angle, 'shotgun');
        player.lastShotTime = Date.now();
        return true;
    }

    shootAutoShotgun(weapon, player) {
        // Auto shotgun - like pump but faster
        return this.shootPump(weapon, player);
    }

    shootBolt(weapon, player) {
        // Sniper rifle - single powerful shot
        this.consumeAmmo(player, 1);
        this.createBullet(weapon, player, 1, 0);
        this.createMuzzleFlash(player.x, player.y, player.angle, 'sniper');
        player.lastShotTime = Date.now();
        
        // Add zoom out effect for scoped weapons
        if (weapon.hasScope && this.isScoped) {
            setTimeout(() => {
                this.toggleScope(false);
            }, 100);
        }
        
        return true;
    }

    shootMelee(weapon, player, mouse) {
        // Knife attack
        const meleeRange = 50;
        const targetX = player.x + Math.cos(player.angle) * meleeRange;
        const targetY = player.y + Math.sin(player.angle) * meleeRange;
        
        // Check for hits within melee range
        this.game.players.forEach(target => {
            if (target.id !== player.id && target.alive) {
                const distance = Math.sqrt(
                    Math.pow(target.x - targetX, 2) + 
                    Math.pow(target.y - targetY, 2)
                );
                
                if (distance < 30) {
                    // Check if it's a backstab
                    const angle = Math.atan2(target.y - player.y, target.x - player.x);
                    const angleDiff = Math.abs(angle - target.angle);
                    const isBackstab = angleDiff < Math.PI / 4 || angleDiff > 7 * Math.PI / 4;
                    
                    const damage = isBackstab ? 180 : weapon.damage;
                    this.applyDamage(target, damage, player.id);
                    
                    if (isBackstab) {
                        this.game.addChatMessage('系統', '背刺！', 'critical');
                    }
                }
            }
        });
        
        // Melee swing effect
        this.createMeleeEffect(player.x, player.y, player.angle);
        player.lastShotTime = Date.now();
        return true;
    }

    consumeAmmo(player, amount) {
        player.ammo = Math.max(0, player.ammo - amount);
    }

    createBullet(weapon, player, count = 1, angleOffset = 0, spread = 0) {
        for (let i = 0; i < count; i++) {
            let bulletAngle = player.angle + angleOffset;
            
            // Add spread for multi-pellet weapons
            if (spread > 0) {
                bulletAngle += (Math.random() - 0.5) * spread;
            }
            
            const bulletSpeed = this.getBulletSpeed(weapon.type);
            const speedVariation = spread > 0 ? 0.8 + Math.random() * 0.4 : 1.0;
            
            const bullet = {
                x: player.x,
                y: player.y,
                vx: Math.cos(bulletAngle) * bulletSpeed * speedVariation,
                vy: Math.sin(bulletAngle) * bulletSpeed * speedVariation,
                angle: bulletAngle,
                damage: weapon.damage,
                owner: player.id || this.game.playerId,
                lifetime: this.getBulletLifetime(weapon.type),
                penetration: this.getPenetrationPower(weapon.type)
            };
            
            this.game.bullets.push(bullet);
        }
    }

    getBulletSpeed(weaponType) {
        const speeds = {
            pistol: 15,
            shotgun: 12,
            smg: 16,
            rifle: 20,
            sniper: 25,
            machinegun: 18,
            melee: 0
        };
        return speeds[weaponType] || 15;
    }

    getBulletLifetime(weaponType) {
        const lifetimes = {
            pistol: 60,
            shotgun: 40,
            smg: 50,
            rifle: 70,
            sniper: 90,
            machinegun: 65,
            melee: 0
        };
        return lifetimes[weaponType] || 60;
    }

    getPenetrationPower(weaponType) {
        const penetration = {
            pistol: 1,
            shotgun: 0,
            smg: 1,
            rifle: 2,
            sniper: 3,
            machinegun: 2,
            melee: 0
        };
        return penetration[weaponType] || 1;
    }

    createMuzzleFlash(x, y, angle, weaponType) {
        if (!this.game.ctx) return;
        
        this.game.ctx.save();
        this.game.ctx.translate(x, y);
        this.game.ctx.rotate(angle);
        
        if (weaponType === 'shotgun') {
            this.game.createShotgunMuzzleFlash(0, 0, 0);
        } else if (weaponType === 'sniper') {
            // Larger muzzle flash for snipers
            this.game.ctx.fillStyle = 'rgba(255, 255, 150, 0.9)';
            this.game.ctx.beginPath();
            this.game.ctx.arc(25, 0, 15, 0, Math.PI * 2);
            this.game.ctx.fill();
        } else {
            // Standard muzzle flash
            this.game.ctx.fillStyle = 'rgba(255, 255, 100, 0.8)';
            this.game.ctx.beginPath();
            this.game.ctx.arc(20, 0, 10, 0, Math.PI * 2);
            this.game.ctx.fill();
        }
        
        this.game.ctx.restore();
    }

    createMeleeEffect(x, y, angle) {
        if (!this.game.ctx) return;
        
        this.game.ctx.save();
        this.game.ctx.translate(x, y);
        this.game.ctx.rotate(angle);
        
        // Knife slash effect
        this.game.ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
        this.game.ctx.lineWidth = 3;
        this.game.ctx.beginPath();
        this.game.ctx.arc(0, 0, 40, -0.3, 0.3);
        this.game.ctx.stroke();
        
        this.game.ctx.restore();
    }

    applyDamage(target, damage, attackerId) {
        target.health -= damage;
        
        if (target.health <= 0) {
            target.health = 0;
            target.alive = false;
            target.deaths++;
            target.deathTime = Date.now();
            
            if (target.isCurrentPlayer) {
                this.game.handlePlayerDeath();
            } else if (attackerId === this.game.playerId) {
                this.game.player.kills++;
                this.game.player.score += 100;
            }
            
            setTimeout(() => this.game.respawnPlayer(target), 5000);
        }
        
        this.game.updateScoreboard();
    }

    toggleScope(force = null) {
        const weapon = this.getWeapon(this.game.player.weapon);
        
        if (!weapon.hasScope) return false;
        
        if (force !== null) {
            this.isScoped = force;
        } else {
            this.isScoped = !this.isScoped;
        }
        
        if (this.isScoped) {
            this.scopeLevel = (this.scopeLevel + 1) % weapon.scopeZoom.length;
            this.applyScopeEffect(weapon.scopeZoom[this.scopeLevel]);
        } else {
            this.scopeLevel = 0;
            this.removeScopeEffect();
        }
        
        return true;
    }

    applyScopeEffect(zoomLevel) {
        // Add scope overlay
        const scopeOverlay = document.getElementById('scope-overlay') || this.createScopeOverlay();
        scopeOverlay.style.display = 'block';
        
        // Reduce movement speed while scoped
        this.game.player.scopeSpeedMultiplier = 0.5;
        
        this.game.addChatMessage('系統', `瞄準鏡 ${zoomLevel.toFixed(1)}x`, 'info');
    }

    removeScopeEffect() {
        const scopeOverlay = document.getElementById('scope-overlay');
        if (scopeOverlay) {
            scopeOverlay.style.display = 'none';
        }
        
        // Restore movement speed
        this.game.player.scopeSpeedMultiplier = 1.0;
    }

    createScopeOverlay() {
        const overlay = document.createElement('div');
        overlay.id = 'scope-overlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: 75;
            background: radial-gradient(circle at center, transparent 150px, rgba(0,0,0,0.9) 155px);
        `;
        
        // Add crosshair lines
        const lines = document.createElement('div');
        lines.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 300px;
            height: 300px;
        `;
        lines.innerHTML = `
            <div style="position: absolute; top: 50%; left: 0; right: 0; height: 2px; background: rgba(255,0,0,0.8);"></div>
            <div style="position: absolute; left: 50%; top: 0; bottom: 0; width: 2px; background: rgba(255,0,0,0.8);"></div>
        `;
        
        overlay.appendChild(lines);
        document.body.appendChild(overlay);
        return overlay;
    }

    cleanup() {
        // Clear any active intervals
        if (this.burstInterval) {
            clearInterval(this.burstInterval);
        }
        if (this.autoFireInterval) {
            clearInterval(this.autoFireInterval);
        }
        
        // Remove scope overlay
        const scopeOverlay = document.getElementById('scope-overlay');
        if (scopeOverlay) {
            scopeOverlay.remove();
        }
    }
}