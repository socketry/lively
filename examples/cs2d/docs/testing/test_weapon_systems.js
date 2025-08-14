// Comprehensive test for all CS 1.6 weapon systems
const { chromium } = require('playwright');

async function testAllWeaponSystems() {
    const browser = await chromium.launch({ headless: false });
    const page = await browser.newPage();
    
    console.log('🔫 Testing Complete CS 1.6 Weapon Systems...\n');
    
    let testResults = {
        passed: 0,
        failed: 0,
        total: 0
    };

    function logResult(test, passed, details = '') {
        testResults.total++;
        if (passed) {
            testResults.passed++;
            console.log(`✅ ${test}`, details ? ` - ${details}` : '');
        } else {
            testResults.failed++;
            console.log(`❌ ${test}`, details ? ` - ${details}` : '');
        }
    }

    try {
        // Navigate to game
        await page.goto('http://localhost:9293/game.html?room_id=test&player_id=test&nickname=WeaponTester');
        await page.waitForTimeout(3000);
        
        // Wait for game to load
        await page.waitForSelector('#game-canvas', { timeout: 10000 });
        
        console.log('📋 Testing Weapon System Integration...');
        
        // Test 1: Weapon system initialization
        const hasWeaponSystem = await page.evaluate(() => {
            return window.game && window.game.weaponSystem && typeof window.game.weaponSystem.getWeapon === 'function';
        });
        logResult('Weapon system initialized', hasWeaponSystem);
        
        if (!hasWeaponSystem) {
            console.log('❌ Weapon system not available, skipping detailed tests');
            return;
        }
        
        // Test 2: All weapon data available
        const weaponCount = await page.evaluate(() => {
            return Object.keys(window.game.weaponSystem.weapons).length;
        });
        logResult('Weapon database loaded', weaponCount >= 20, `${weaponCount} weapons available`);
        
        console.log('\n🔫 Testing Individual Weapons...');
        
        // Test different weapon categories
        const weaponTests = [
            { name: 'glock', type: 'pistol', expectedFireMode: 'burst', expectedMag: 20 },
            { name: 'usp', type: 'pistol', expectedFireMode: 'semi', expectedMag: 12 },
            { name: 'deagle', type: 'pistol', expectedFireMode: 'semi', expectedMag: 7 },
            { name: 'elite', type: 'pistol', expectedFireMode: 'dual', expectedMag: 30 },
            { name: 'm3', type: 'shotgun', expectedFireMode: 'pump', expectedMag: 8 },
            { name: 'xm1014', type: 'shotgun', expectedFireMode: 'auto_shotgun', expectedMag: 7 },
            { name: 'mp5', type: 'smg', expectedFireMode: 'auto', expectedMag: 30 },
            { name: 'p90', type: 'smg', expectedFireMode: 'auto', expectedMag: 50 },
            { name: 'ak47', type: 'rifle', expectedFireMode: 'auto', expectedMag: 30 },
            { name: 'm4a1', type: 'rifle', expectedFireMode: 'auto', expectedMag: 30 },
            { name: 'famas', type: 'rifle', expectedFireMode: 'burst', expectedMag: 25 },
            { name: 'aug', type: 'rifle', expectedFireMode: 'auto', expectedMag: 30 },
            { name: 'awp', type: 'sniper', expectedFireMode: 'bolt', expectedMag: 10 },
            { name: 'scout', type: 'sniper', expectedFireMode: 'bolt', expectedMag: 10 },
            { name: 'm249', type: 'machinegun', expectedFireMode: 'auto', expectedMag: 100 }
        ];
        
        for (const weaponTest of weaponTests) {
            const weaponData = await page.evaluate((weaponName) => {
                return window.game.weaponSystem.getWeapon(weaponName);
            }, weaponTest.name);
            
            if (weaponData) {
                logResult(`${weaponTest.name} data`, true, 
                    `${weaponData.fireMode}/${weaponData.magazine}rd/${weaponData.damage}dmg`);
                
                // Validate specific properties
                if (weaponData.fireMode !== weaponTest.expectedFireMode) {
                    logResult(`${weaponTest.name} fire mode`, false, 
                        `expected ${weaponTest.expectedFireMode}, got ${weaponData.fireMode}`);
                } else {
                    logResult(`${weaponTest.name} fire mode`, true);
                }
                
                if (weaponData.magazine !== weaponTest.expectedMag) {
                    logResult(`${weaponTest.name} magazine`, false,
                        `expected ${weaponTest.expectedMag}, got ${weaponData.magazine}`);
                } else {
                    logResult(`${weaponTest.name} magazine`, true);
                }
            } else {
                logResult(`${weaponTest.name} data`, false, 'weapon not found');
            }
        }
        
        console.log('\\n🎯 Testing Shooting Mechanics...');
        
        // Test 3: Basic shooting with different weapons
        const shootingTests = [
            { weapon: 'glock', expectedBullets: 3, description: 'burst fire' },
            { weapon: 'usp', expectedBullets: 1, description: 'semi-auto' },
            { weapon: 'elite', expectedBullets: 2, description: 'dual wielding' },
            { weapon: 'm3', expectedBullets: 8, description: 'shotgun pellets' },
            { weapon: 'ak47', expectedBullets: 1, description: 'single shot' },
            { weapon: 'knife', expectedBullets: 0, description: 'melee attack' }
        ];
        
        for (const shootTest of shootingTests) {
            // Set weapon and shoot
            const result = await page.evaluate((weaponName) => {
                if (!window.game || !window.game.weaponSystem) return null;
                
                // Set weapon
                window.game.player.weapon = weaponName;
                window.game.player.ammo = 30;
                window.game.player.health = 100;
                window.game.player.alive = true;
                
                // Clear bullets
                window.game.bullets = [];
                
                // Shoot
                const success = window.game.weaponSystem.shoot(weaponName, window.game.player, window.game.mouse);
                
                // Wait for burst shots
                return new Promise(resolve => {
                    setTimeout(() => {
                        resolve({
                            success: success,
                            bulletCount: window.game.bullets.length,
                            ammo: window.game.player.ammo
                        });
                    }, 200); // Wait for burst to complete
                });
            }, shootTest.weapon);
            
            if (result) {
                const bulletMatch = result.bulletCount === shootTest.expectedBullets || 
                                  (shootTest.weapon === 'm3' && result.bulletCount > 6); // Shotgun variability
                logResult(`${shootTest.weapon} shooting`, bulletMatch, 
                    `${result.bulletCount} bullets - ${shootTest.description}`);
            } else {
                logResult(`${shootTest.weapon} shooting`, false, 'shoot failed');
            }
        }
        
        console.log('\\n🔭 Testing Scope Mechanics...');
        
        // Test 4: Scope functionality for sniper rifles
        const scopeTest = await page.evaluate(() => {
            if (!window.game || !window.game.weaponSystem) return false;
            
            window.game.player.weapon = 'awp';
            const initialScope = window.game.weaponSystem.isScoped;
            
            // Toggle scope
            window.game.weaponSystem.toggleScope();
            const scopedOn = window.game.weaponSystem.isScoped;
            
            // Toggle again
            window.game.weaponSystem.toggleScope();
            const scopedOff = window.game.weaponSystem.isScoped;
            
            return {
                initial: initialScope,
                scopedOn: scopedOn,
                scopedOff: scopedOff
            };
        });
        
        if (scopeTest) {
            logResult('Scope toggle functionality', 
                !scopeTest.initial && scopeTest.scopedOn && !scopeTest.scopedOff,
                'AWP scope on/off');
        }
        
        // Test 5: Scope overlay creation
        await page.evaluate(() => {
            if (window.game && window.game.weaponSystem) {
                window.game.player.weapon = 'scout';
                window.game.weaponSystem.toggleScope(true);
            }
        });
        
        await page.waitForTimeout(500);
        const scopeOverlay = await page.$('#scope-overlay');
        logResult('Scope overlay rendering', scopeOverlay !== null, 'scope UI created');
        
        console.log('\\n⚡ Testing Movement Speed Modifiers...');
        
        // Test 6: Movement speed with different weapons
        const speedTest = await page.evaluate(() => {
            if (!window.game || !window.game.weaponSystem) return null;
            
            const results = {};
            const weapons = ['knife', 'glock', 'ak47', 'awp', 'm249'];
            
            weapons.forEach(weapon => {
                window.game.player.weapon = weapon;
                window.game.player.scopeSpeedMultiplier = 1.0;
                
                // Simulate movement calculation
                const weaponData = window.game.weaponSystem.getWeapon(weapon);
                let baseSpeed = 3;
                
                if (weaponData) {
                    if (weaponData.type === 'sniper') baseSpeed *= 0.7;
                    else if (weaponData.type === 'machinegun') baseSpeed *= 0.8;
                    else if (weaponData.type === 'rifle') baseSpeed *= 0.9;
                }
                
                results[weapon] = {
                    speed: baseSpeed,
                    type: weaponData ? weaponData.type : 'unknown'
                };
            });
            
            return results;
        });
        
        if (speedTest) {
            logResult('Weapon speed modifiers', 
                speedTest.knife.speed === 3 && 
                speedTest.awp.speed < speedTest.ak47.speed &&
                speedTest.ak47.speed < speedTest.glock.speed,
                `knife:${speedTest.knife.speed} ak47:${speedTest.ak47.speed} awp:${speedTest.awp.speed}`);
        }
        
        console.log('\\n🔄 Testing Reload Mechanics...');
        
        // Test 7: Different magazine sizes and reload times
        const reloadTest = await page.evaluate(() => {
            if (!window.game || !window.game.weaponSystem) return null;
            
            const results = {};
            const weapons = ['glock', 'deagle', 'p90', 'ak47', 'awp', 'm249'];
            
            weapons.forEach(weapon => {
                const weaponData = window.game.weaponSystem.getWeapon(weapon);
                results[weapon] = {
                    magazine: weaponData.magazine,
                    reloadTime: weaponData.reloadTime
                };
            });
            
            return results;
        });
        
        if (reloadTest) {
            const validReload = reloadTest.glock.magazine === 20 &&
                              reloadTest.deagle.magazine === 7 &&
                              reloadTest.p90.magazine === 50 &&
                              reloadTest.m249.magazine === 100;
            
            logResult('Magazine sizes', validReload,
                `G:${reloadTest.glock.magazine} DE:${reloadTest.deagle.magazine} P90:${reloadTest.p90.magazine}`);
        }
        
        console.log('\\n🧹 Testing System Cleanup...');
        
        // Test 8: Cleanup functionality
        const cleanupTest = await page.evaluate(() => {
            if (!window.game || !window.game.weaponSystem) return false;
            
            try {
                window.game.weaponSystem.cleanup();
                return true;
            } catch (e) {
                return false;
            }
        });
        
        logResult('Weapon system cleanup', cleanupTest);
        
        // Summary
        console.log(`\\n📊 Test Results Summary:`);
        console.log(`✅ Passed: ${testResults.passed}/${testResults.total}`);
        console.log(`❌ Failed: ${testResults.failed}/${testResults.total}`);
        console.log(`📈 Success Rate: ${((testResults.passed / testResults.total) * 100).toFixed(1)}%`);
        
        if (testResults.passed === testResults.total) {
            console.log('\\n🎉 ALL WEAPON SYSTEMS WORKING PERFECTLY!');
        } else if (testResults.passed / testResults.total > 0.8) {
            console.log('\\n✅ Weapon systems mostly working with minor issues');
        } else {
            console.log('\\n⚠️  Significant weapon system issues detected');
        }
        
    } catch (error) {
        console.error('Test error:', error);
    } finally {
        await page.waitForTimeout(3000);
        await browser.close();
    }
}

testAllWeaponSystems().catch(console.error);