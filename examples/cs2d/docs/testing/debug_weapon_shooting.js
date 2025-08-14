// Debug script to diagnose why USP, Elite, M3 aren't shooting
const { chromium } = require('playwright');

async function debugWeaponShooting() {
    const browser = await chromium.launch({ headless: false });
    const page = await browser.newPage();
    
    console.log('🔍 Debugging Weapon Shooting Issues...\n');
    
    try {
        // Navigate to game
        await page.goto('http://localhost:9293/game.html?room_id=test&player_id=test&nickname=DebugTester');
        await page.waitForTimeout(5000);
        
        // Wait for game to load
        await page.waitForSelector('#game-canvas', { timeout: 10000 });
        
        // Test problematic weapons with detailed debugging
        const problematicWeapons = ['usp', 'elite', 'm3'];
        
        for (const weapon of problematicWeapons) {
            console.log(`\n🔫 Testing ${weapon.toUpperCase()}:`);
            
            const debugResult = await page.evaluate((weaponName) => {
                if (!window.game || !window.game.weaponSystem) {
                    return { error: 'Game or weapon system not available' };
                }
                
                // Get weapon data
                const weaponData = window.game.weaponSystem.getWeapon(weaponName);
                
                // Setup player state
                window.game.player.weapon = weaponName;
                window.game.player.ammo = 30;
                window.game.player.health = 100;
                window.game.player.alive = true;
                window.game.player.isReloading = false;
                window.game.player.lastShotTime = 0; // Reset fire rate
                window.game.bullets = [];
                
                console.log(`Weapon data for ${weaponName}:`, weaponData);
                console.log(`Player state:`, {
                    weapon: window.game.player.weapon,
                    ammo: window.game.player.ammo,
                    health: window.game.player.health,
                    alive: window.game.player.alive,
                    isReloading: window.game.player.isReloading,
                    lastShotTime: window.game.player.lastShotTime
                });
                
                // Test canShoot
                const canShootResult = window.game.weaponSystem.canShoot(window.game.player, weaponData);
                console.log(`canShoot result:`, canShootResult);
                
                if (!canShootResult) {
                    // Debug why canShoot failed
                    const now = Date.now();
                    const checks = {
                        healthCheck: window.game.player.health > 0 && window.game.player.alive,
                        reloadCheck: !window.game.player.isReloading,
                        fireRateCheck: now - (window.game.player.lastShotTime || 0) >= weaponData.fireRate,
                        ammoCheck: window.game.player.ammo > 0
                    };
                    console.log('canShoot checks:', checks);
                    return { 
                        success: false, 
                        reason: 'canShoot failed',
                        checks: checks,
                        weaponData: weaponData
                    };
                }
                
                // Try shooting
                try {
                    const shootResult = window.game.weaponSystem.shoot(weaponName, window.game.player, window.game.mouse);
                    console.log(`Shoot result:`, shootResult);
                    
                    return {
                        success: shootResult,
                        bulletCount: window.game.bullets.length,
                        weaponData: weaponData,
                        playerAmmo: window.game.player.ammo,
                        fireMode: weaponData.fireMode
                    };
                } catch (error) {
                    console.error('Shooting error:', error);
                    return {
                        success: false,
                        error: error.message,
                        weaponData: weaponData
                    };
                }
            }, weapon);
            
            console.log('  Debug result:', debugResult);
            
            // Wait between tests
            await page.waitForTimeout(500);
        }
        
        // Test working weapons for comparison
        console.log('\n✅ Testing working weapons for comparison:');
        const workingWeapons = ['glock', 'ak47'];
        
        for (const weapon of workingWeapons) {
            const result = await page.evaluate((weaponName) => {
                if (!window.game || !window.game.weaponSystem) return null;
                
                window.game.player.weapon = weaponName;
                window.game.player.ammo = 30;
                window.game.player.lastShotTime = 0;
                window.game.bullets = [];
                
                const weaponData = window.game.weaponSystem.getWeapon(weaponName);
                const shootResult = window.game.weaponSystem.shoot(weaponName, window.game.player, window.game.mouse);
                
                return {
                    weapon: weaponName,
                    fireMode: weaponData.fireMode,
                    shootSuccess: shootResult,
                    bulletCount: window.game.bullets.length
                };
            }, weapon);
            
            console.log(`  ${weapon}: ${result ? result.shootSuccess : 'failed'} - ${result ? result.bulletCount : 0} bullets`);
        }
        
    } catch (error) {
        console.error('Debug error:', error);
    } finally {
        await page.waitForTimeout(3000);
        await browser.close();
    }
}

debugWeaponShooting().catch(console.error);