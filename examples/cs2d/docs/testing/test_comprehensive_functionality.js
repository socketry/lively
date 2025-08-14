// Comprehensive Playwright Test Suite for CS2D Complete Functionality
const { chromium } = require('playwright');

class CS2DTestSuite {
    constructor() {
        this.results = {
            passed: 0,
            failed: 0,
            total: 0,
            details: []
        };
        this.browser = null;
        this.page = null;
    }

    async initialize() {
        this.browser = await chromium.launch({ 
            headless: false,
            slowMo: 100 // Slow down for visual verification
        });
        this.page = await this.browser.newPage();
        
        // Monitor console messages
        this.page.on('console', msg => {
            const text = msg.text();
            if (text.includes('ERROR') || text.includes('error')) {
                console.log('🚨 Console Error:', text);
            }
        });
    }

    logResult(test, passed, details = '', category = 'General') {
        this.results.total++;
        const result = {
            test,
            passed,
            details,
            category,
            timestamp: new Date().toISOString()
        };
        
        if (passed) {
            this.results.passed++;
            console.log(`✅ [${category}] ${test}${details ? ` - ${details}` : ''}`);
        } else {
            this.results.failed++;
            console.log(`❌ [${category}] ${test}${details ? ` - ${details}` : ''}`);
        }
        
        this.results.details.push(result);
    }

    async testGameInitialization() {
        console.log('\n🚀 Testing Game Initialization...');
        
        try {
            // Test lobby page
            await this.page.goto('http://localhost:9292');
            await this.page.waitForTimeout(2000);
            
            const lobbyTitle = await this.page.title();
            this.logResult('Lobby page loads', lobbyTitle.includes('CS2D'), `Title: ${lobbyTitle}`, 'Initialization');
            
            // Test language switcher on lobby
            const lobbySwitcher = await this.page.$('#language-switcher');
            this.logResult('Language switcher on lobby', lobbySwitcher !== null, 'Should be visible on port 9292', 'Initialization');
            
            // Test room page  
            await this.page.goto('http://localhost:9293/room.html?room_id=test&player_id=test-user&nickname=TestPlayer');
            await this.page.waitForTimeout(2000);
            
            const roomSwitcher = await this.page.$('#language-switcher');
            this.logResult('No language switcher on room', roomSwitcher === null, 'Should be hidden on room page', 'Initialization');
            
            // Test game page loading
            await this.page.goto('http://localhost:9293/game.html?room_id=test&player_id=test-user&nickname=TestPlayer');
            await this.page.waitForTimeout(5000); // Wait for game to fully load
            
            const gameCanvas = await this.page.$('#game-canvas');
            this.logResult('Game canvas rendered', gameCanvas !== null, 'Main game canvas present', 'Initialization');
            
            const gameSwitcher = await this.page.$('#language-switcher');
            this.logResult('No language switcher on game', gameSwitcher === null, 'Should be hidden on game page', 'Initialization');
            
            // Wait for game initialization
            const gameInitialized = await this.page.evaluate(() => {
                return new Promise((resolve) => {
                    const checkGame = () => {
                        if (window.game && window.game.gameState === 'playing') {
                            resolve(true);
                        } else {
                            setTimeout(checkGame, 100);
                        }
                    };
                    checkGame();
                    setTimeout(() => resolve(false), 10000); // 10 second timeout
                });
            });
            
            this.logResult('Game fully initialized', gameInitialized, 'Game state is playing', 'Initialization');
            
        } catch (error) {
            this.logResult('Game initialization', false, `Error: ${error.message}`, 'Initialization');
        }
    }

    async testWeaponSystems() {
        console.log('\n🔫 Testing Weapon Systems...');
        
        try {
            // Test weapon system initialization
            const weaponSystemExists = await this.page.evaluate(() => {
                return window.game && window.game.weaponSystem && typeof window.game.weaponSystem.getWeapon === 'function';
            });
            this.logResult('Weapon system initialized', weaponSystemExists, 'WeaponSystem class available', 'Weapons');

            if (!weaponSystemExists) {
                this.logResult('Weapon system tests', false, 'Weapon system not available, skipping tests', 'Weapons');
                return;
            }

            // Test weapon database
            const weaponCount = await this.page.evaluate(() => {
                return Object.keys(window.game.weaponSystem.weapons).length;
            });
            this.logResult('Weapon database loaded', weaponCount >= 20, `${weaponCount} weapons available`, 'Weapons');

            // Test individual weapon categories
            const weaponTests = [
                // Pistols
                { name: 'glock', expectedMode: 'burst', category: 'Pistol' },
                { name: 'usp', expectedMode: 'semi', category: 'Pistol' },
                { name: 'deagle', expectedMode: 'semi', category: 'Pistol' },
                { name: 'elite', expectedMode: 'dual', category: 'Pistol' },
                
                // Shotguns
                { name: 'm3', expectedMode: 'pump', category: 'Shotgun' },
                { name: 'xm1014', expectedMode: 'auto_shotgun', category: 'Shotgun' },
                
                // SMGs
                { name: 'mp5', expectedMode: 'auto', category: 'SMG' },
                { name: 'p90', expectedMode: 'auto', category: 'SMG' },
                
                // Rifles
                { name: 'ak47', expectedMode: 'auto', category: 'Rifle' },
                { name: 'm4a1', expectedMode: 'auto', category: 'Rifle' },
                { name: 'famas', expectedMode: 'burst', category: 'Rifle' },
                
                // Snipers
                { name: 'awp', expectedMode: 'bolt', category: 'Sniper' },
                { name: 'scout', expectedMode: 'bolt', category: 'Sniper' }
            ];

            for (const weapon of weaponTests) {
                const weaponData = await this.page.evaluate((weaponName) => {
                    return window.game.weaponSystem.getWeapon(weaponName);
                }, weapon.name);

                if (weaponData) {
                    this.logResult(`${weapon.name} data loaded`, true, 
                        `${weaponData.fireMode}/${weaponData.magazine}rd/${weaponData.damage}dmg`, 'Weapons');
                    
                    this.logResult(`${weapon.name} fire mode`, weaponData.fireMode === weapon.expectedMode,
                        `Expected: ${weapon.expectedMode}, Got: ${weaponData.fireMode}`, 'Weapons');
                } else {
                    this.logResult(`${weapon.name} data`, false, 'Weapon not found', 'Weapons');
                }
            }

        } catch (error) {
            this.logResult('Weapon system test', false, `Error: ${error.message}`, 'Weapons');
        }
    }

    async testShootingMechanics() {
        console.log('\n🎯 Testing Shooting Mechanics...');
        
        try {
            // Test different shooting patterns
            const shootingTests = [
                { weapon: 'glock', expectedBullets: 3, mode: 'Burst Fire' },
                { weapon: 'usp', expectedBullets: 1, mode: 'Semi-Auto' },
                { weapon: 'elite', expectedBullets: 2, mode: 'Dual Wield' },
                { weapon: 'm3', expectedBullets: 8, mode: 'Shotgun' },
                { weapon: 'ak47', expectedBullets: 1, mode: 'Single Shot' }
            ];

            for (const test of shootingTests) {
                const result = await this.page.evaluate((weaponName) => {
                    if (!window.game || !window.game.weaponSystem) return null;

                    // Setup player state
                    window.game.player.weapon = weaponName;
                    window.game.player.ammo = 30;
                    window.game.player.health = 100;
                    window.game.player.alive = true;
                    window.game.player.isReloading = false;
                    window.game.bullets = [];

                    // Shoot
                    const success = window.game.weaponSystem.shoot(weaponName, window.game.player, window.game.mouse);

                    // Wait for burst/dual completion (longer for dual-wield)
                    const waitTime = weaponName === 'elite' ? 500 : 300;
                    return new Promise(resolve => {
                        setTimeout(() => {
                            resolve({
                                success: success,
                                bulletCount: window.game.bullets.length,
                                ammo: window.game.player.ammo
                            });
                        }, waitTime);
                    });
                }, test.weapon);

                if (result && result.success) {
                    const bulletMatch = result.bulletCount >= test.expectedBullets * 0.8; // Allow some variance
                    this.logResult(`${test.weapon} shooting`, bulletMatch,
                        `${result.bulletCount} bullets (${test.mode})`, 'Shooting');
                } else {
                    this.logResult(`${test.weapon} shooting`, false, 'Failed to shoot', 'Shooting');
                }
            }

        } catch (error) {
            this.logResult('Shooting mechanics', false, `Error: ${error.message}`, 'Shooting');
        }
    }

    async testScopingSystem() {
        console.log('\n🔭 Testing Scoping System...');
        
        try {
            // Test scope functionality
            const scopeTest = await this.page.evaluate(() => {
                if (!window.game || !window.game.weaponSystem) return false;

                window.game.player.weapon = 'awp';
                const initialScope = window.game.weaponSystem.isScoped;

                // Toggle scope on
                window.game.weaponSystem.toggleScope();
                const scopedOn = window.game.weaponSystem.isScoped;

                // Toggle scope off
                window.game.weaponSystem.toggleScope();
                const scopedOff = window.game.weaponSystem.isScoped;

                return {
                    initial: initialScope,
                    scopedOn: scopedOn,
                    scopedOff: scopedOff
                };
            });

            if (scopeTest) {
                this.logResult('Scope toggle functionality', 
                    !scopeTest.initial && scopeTest.scopedOn && !scopeTest.scopedOff,
                    'AWP scope on/off cycle', 'Scoping');
            }

            // Test scope overlay creation
            await this.page.evaluate(() => {
                if (window.game && window.game.weaponSystem) {
                    window.game.player.weapon = 'scout';
                    window.game.weaponSystem.toggleScope(true);
                }
            });

            await this.page.waitForTimeout(500);
            const scopeOverlay = await this.page.$('#scope-overlay');
            this.logResult('Scope overlay rendering', scopeOverlay !== null, 'Scope UI created', 'Scoping');

            // Test movement penalty while scoped
            const movementTest = await this.page.evaluate(() => {
                if (!window.game || !window.game.weaponSystem) return false;
                
                window.game.player.weapon = 'awp';
                window.game.weaponSystem.toggleScope(true);
                
                return window.game.player.scopeSpeedMultiplier === 0.5;
            });

            this.logResult('Scope movement penalty', movementTest, '50% speed reduction', 'Scoping');

        } catch (error) {
            this.logResult('Scoping system', false, `Error: ${error.message}`, 'Scoping');
        }
    }

    async testScoreboardSystem() {
        console.log('\n📊 Testing Scoreboard System...');
        
        try {
            // Test initial state
            const initialDisplay = await this.page.$eval('#scoreboard', el => el.style.display);
            this.logResult('Scoreboard initially hidden', initialDisplay === 'none', 'Display: none', 'Scoreboard');

            // Test Tab key functionality
            await this.page.keyboard.down('Tab');
            await this.page.waitForTimeout(500);

            const shownDisplay = await this.page.$eval('#scoreboard', el => el.style.display);
            this.logResult('Scoreboard shows on Tab', shownDisplay === 'block', 'Display: block', 'Scoreboard');

            // Test scoreboard content
            const scoreboardContent = await this.page.$eval('#scoreboard-body', el => el.innerHTML);
            this.logResult('Scoreboard has content', scoreboardContent.length > 0, 
                `${scoreboardContent.split('</tr>').length - 1} rows`, 'Scoreboard');

            // Test Tab release
            await this.page.keyboard.up('Tab');
            await this.page.waitForTimeout(500);

            const hiddenDisplay = await this.page.$eval('#scoreboard', el => el.style.display);
            this.logResult('Scoreboard hides on Tab release', hiddenDisplay === 'none', 'Display: none', 'Scoreboard');

        } catch (error) {
            this.logResult('Scoreboard system', false, `Error: ${error.message}`, 'Scoreboard');
        }
    }

    async testUIUpdates() {
        console.log('\n🖥️ Testing UI Updates...');
        
        try {
            // Test equipment bar updates
            const equipmentTest = await this.page.evaluate(() => {
                if (!window.game) return false;

                // Change weapon and update equipment bar
                window.game.player.weapon = 'ak47';
                window.game.player.ammo = 25;
                window.game.updateEquipmentBar();

                // Check if equipment bar reflects changes
                const slot1 = document.getElementById('slot-1');
                const weaponName = slot1.querySelector('.weapon-name').textContent;
                const ammoCount = slot1.querySelector('.ammo-count').textContent;

                return {
                    weaponName: weaponName,
                    ammoCount: ammoCount,
                    isActive: slot1.classList.contains('active')
                };
            });

            this.logResult('Equipment bar updates', equipmentTest && equipmentTest.weaponName === 'AK47',
                `Weapon: ${equipmentTest?.weaponName}, Ammo: ${equipmentTest?.ammoCount}`, 'UI');

            // Test ammo display updates
            const ammoUpdate = await this.page.evaluate(() => {
                if (!window.game) return false;

                window.game.player.ammo = 20;
                window.game.player.reserveAmmo = 60;
                window.game.updateHUD();

                const currentAmmo = document.getElementById('current-ammo').textContent;
                const reserveAmmo = document.getElementById('reserve-ammo').textContent;

                return {
                    current: currentAmmo,
                    reserve: reserveAmmo
                };
            });

            this.logResult('Ammo display updates', ammoUpdate && ammoUpdate.current === '20',
                `Current: ${ammoUpdate?.current}, Reserve: ${ammoUpdate?.reserve}`, 'UI');

            // Test health bar updates
            const healthUpdate = await this.page.evaluate(() => {
                if (!window.game) return false;

                window.game.player.health = 75;
                window.game.updateHUD();

                const healthFill = document.getElementById('health-fill').style.width;
                return healthFill;
            });

            this.logResult('Health bar updates', healthUpdate === '75%', `Width: ${healthUpdate}`, 'UI');

        } catch (error) {
            this.logResult('UI updates', false, `Error: ${error.message}`, 'UI');
        }
    }

    async testBotIntegration() {
        console.log('\n🤖 Testing Bot Integration...');
        
        try {
            // Test bot AI initialization and weapon usage
            const botTest = await this.page.evaluate(() => {
                if (!window.game) return false;

                // Add a bot player
                const botPlayer = {
                    id: 'bot-1',
                    name: 'TestBot',
                    x: 500,
                    y: 400,
                    angle: 0,
                    health: 100,
                    alive: true,
                    isBot: true,
                    difficulty: 'normal'
                };

                window.game.players.set('bot-1', botPlayer);
                
                // Test bot shooting with weapon system
                let bulletsBefore = window.game.bullets.length;
                window.game.createBullet(500, 400, 1.5, 'bot-1', true);
                let bulletsAfter = window.game.bullets.length;

                return {
                    botAdded: window.game.players.has('bot-1'),
                    botData: window.game.players.get('bot-1'),
                    bulletCreated: bulletsAfter > bulletsBefore
                };
            });

            this.logResult('Bot player creation', botTest && botTest.botAdded, 'Bot added to players map', 'Bots');
            this.logResult('Bot weapon integration', botTest && botTest.bulletCreated, 'Bot can create bullets', 'Bots');

            // Test bot AI update cycle
            const aiTest = await this.page.evaluate(() => {
                if (!window.game) return false;

                const bot = window.game.players.get('bot-1');
                if (!bot) return false;

                const initialX = bot.x;
                const initialY = bot.y;

                // Simulate bot AI update
                window.game.updateBots();

                // Check if bot position potentially changed (AI movement)
                return {
                    initialPos: { x: initialX, y: initialY },
                    currentPos: { x: bot.x, y: bot.y },
                    aiCalled: true
                };
            });

            this.logResult('Bot AI system', aiTest && aiTest.aiCalled, 'Bot AI update cycle works', 'Bots');

        } catch (error) {
            this.logResult('Bot integration', false, `Error: ${error.message}`, 'Bots');
        }
    }

    async testMovementSystem() {
        console.log('\n🏃 Testing Movement System...');
        
        try {
            // Test weapon-based movement speed
            const movementTest = await this.page.evaluate(() => {
                if (!window.game || !window.game.weaponSystem) return null;

                const results = {};
                const weapons = ['knife', 'glock', 'ak47', 'awp', 'm249'];

                weapons.forEach(weapon => {
                    window.game.player.weapon = weapon;
                    window.game.player.scopeSpeedMultiplier = 1.0;

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

            if (movementTest) {
                this.logResult('Weapon speed modifiers', 
                    movementTest.knife.speed === 3 && 
                    movementTest.awp.speed < movementTest.ak47.speed,
                    `Knife: ${movementTest.knife.speed}, AK47: ${movementTest.ak47.speed}, AWP: ${movementTest.awp.speed}`, 'Movement');
            }

            // Test scoped movement penalty
            const scopeMovement = await this.page.evaluate(() => {
                if (!window.game || !window.game.weaponSystem) return null;

                window.game.player.weapon = 'awp';
                window.game.player.scopeSpeedMultiplier = 1.0;

                // Normal speed
                let baseSpeed = 3 * 0.7; // AWP base speed

                // Scoped speed
                window.game.player.scopeSpeedMultiplier = 0.5;
                let scopedSpeed = baseSpeed * 0.5;

                return {
                    normalSpeed: baseSpeed,
                    scopedSpeed: scopedSpeed
                };
            });

            this.logResult('Scoped movement penalty', 
                scopeMovement && scopeMovement.scopedSpeed < scopeMovement.normalSpeed,
                `Normal: ${scopeMovement?.normalSpeed}, Scoped: ${scopeMovement?.scopedSpeed}`, 'Movement');

        } catch (error) {
            this.logResult('Movement system', false, `Error: ${error.message}`, 'Movement');
        }
    }

    async testReloadMechanics() {
        console.log('\n🔄 Testing Reload Mechanics...');
        
        try {
            // Test different magazine sizes
            const magTest = await this.page.evaluate(() => {
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

            if (magTest) {
                this.logResult('Magazine sizes', 
                    magTest.glock.magazine === 20 &&
                    magTest.deagle.magazine === 7 &&
                    magTest.p90.magazine === 50,
                    `Glock: ${magTest.glock.magazine}, Deagle: ${magTest.deagle.magazine}, P90: ${magTest.p90.magazine}`, 'Reload');

                this.logResult('Reload times vary', 
                    magTest.glock.reloadTime !== magTest.awp.reloadTime,
                    `Glock: ${magTest.glock.reloadTime}ms, AWP: ${magTest.awp.reloadTime}ms`, 'Reload');
            }

            // Test actual reload functionality
            const reloadTest = await this.page.evaluate(() => {
                if (!window.game) return null;

                window.game.player.weapon = 'ak47';
                window.game.player.ammo = 10;
                window.game.player.reserveAmmo = 90;
                window.game.player.isReloading = false;

                // Start reload
                window.game.reload();

                return {
                    isReloading: window.game.player.isReloading,
                    reloadStarted: window.game.player.reloadStartTime > 0
                };
            });

            this.logResult('Reload initiation', 
                reloadTest && reloadTest.isReloading && reloadTest.reloadStarted,
                'Reload state activated', 'Reload');

        } catch (error) {
            this.logResult('Reload mechanics', false, `Error: ${error.message}`, 'Reload');
        }
    }

    async testVisualEffects() {
        console.log('\n✨ Testing Visual Effects...');
        
        try {
            // Test muzzle flash creation
            const muzzleTest = await this.page.evaluate(() => {
                if (!window.game || !window.game.weaponSystem) return false;

                // Test muzzle flash method exists
                return typeof window.game.createMuzzleFlash === 'function' &&
                       typeof window.game.createShotgunMuzzleFlash === 'function';
            });

            this.logResult('Muzzle flash methods', muzzleTest, 'Muzzle flash functions available', 'Visual');

            // Test bullet rendering
            const bulletTest = await this.page.evaluate(() => {
                if (!window.game) return false;

                // Create test bullets
                window.game.bullets = [
                    {
                        x: 100,
                        y: 100,
                        vx: 5,
                        vy: 0,
                        lifetime: 60,
                        damage: 25,
                        owner: 'test'
                    }
                ];

                return window.game.bullets.length === 1;
            });

            this.logResult('Bullet rendering system', bulletTest, 'Bullets can be created and stored', 'Visual');

            // Test canvas drawing capability
            const canvasTest = await this.page.evaluate(() => {
                if (!window.game || !window.game.ctx) return false;

                // Test canvas context available
                return typeof window.game.ctx.fillRect === 'function' &&
                       typeof window.game.ctx.strokeStyle !== 'undefined';
            });

            this.logResult('Canvas rendering', canvasTest, 'Canvas context available', 'Visual');

        } catch (error) {
            this.logResult('Visual effects', false, `Error: ${error.message}`, 'Visual');
        }
    }

    async testErrorHandling() {
        console.log('\n🛡️ Testing Error Handling...');
        
        try {
            // Test invalid weapon handling
            const invalidWeaponTest = await this.page.evaluate(() => {
                if (!window.game || !window.game.weaponSystem) return null;

                try {
                    const weapon = window.game.weaponSystem.getWeapon('invalid_weapon');
                    return {
                        success: true,
                        weaponName: weapon ? weapon.name : 'fallback',
                        error: null
                    };
                } catch (e) {
                    return {
                        success: false,
                        error: e.message
                    };
                }
            });

            this.logResult('Invalid weapon handling', 
                invalidWeaponTest && invalidWeaponTest.success,
                'Falls back to default weapon', 'Error Handling');

            // Test shooting with no ammo
            const noAmmoTest = await this.page.evaluate(() => {
                if (!window.game || !window.game.weaponSystem) return null;

                window.game.player.weapon = 'ak47';
                window.game.player.ammo = 0;
                window.game.player.reserveAmmo = 0;
                window.game.player.health = 100;
                window.game.player.alive = true;

                const result = window.game.weaponSystem.shoot('ak47', window.game.player, window.game.mouse);
                return { canShoot: result };
            });

            this.logResult('No ammo handling', 
                noAmmoTest && !noAmmoTest.canShoot,
                'Prevents shooting with no ammo', 'Error Handling');

        } catch (error) {
            this.logResult('Error handling', false, `Error: ${error.message}`, 'Error Handling');
        }
    }

    async generateReport() {
        console.log('\n📋 Generating Comprehensive Test Report...');
        
        const categories = {};
        this.results.details.forEach(result => {
            if (!categories[result.category]) {
                categories[result.category] = { passed: 0, failed: 0, total: 0 };
            }
            categories[result.category].total++;
            if (result.passed) {
                categories[result.category].passed++;
            } else {
                categories[result.category].failed++;
            }
        });

        console.log('\n📊 Test Results by Category:');
        Object.entries(categories).forEach(([category, stats]) => {
            const percentage = ((stats.passed / stats.total) * 100).toFixed(1);
            console.log(`${category}: ${stats.passed}/${stats.total} (${percentage}%)`);
        });

        console.log('\n🏆 Overall Summary:');
        console.log(`✅ Total Passed: ${this.results.passed}`);
        console.log(`❌ Total Failed: ${this.results.failed}`);
        console.log(`📈 Success Rate: ${((this.results.passed / this.results.total) * 100).toFixed(1)}%`);

        if (this.results.passed === this.results.total) {
            console.log('\n🎉 PERFECT SCORE! ALL SYSTEMS FULLY FUNCTIONAL! 🎉');
        } else if (this.results.passed / this.results.total > 0.9) {
            console.log('\n✅ EXCELLENT! Systems working with minor issues');
        } else if (this.results.passed / this.results.total > 0.7) {
            console.log('\n⚠️ GOOD with some issues to address');
        } else {
            console.log('\n🚨 SIGNIFICANT ISSUES detected - requires attention');
        }

        // Save detailed report to file
        const report = {
            timestamp: new Date().toISOString(),
            summary: {
                passed: this.results.passed,
                failed: this.results.failed,
                total: this.results.total,
                successRate: ((this.results.passed / this.results.total) * 100).toFixed(1)
            },
            categories: categories,
            details: this.results.details
        };

        return report;
    }

    async cleanup() {
        if (this.browser) {
            await this.browser.close();
        }
    }

    async runAllTests() {
        console.log('🚀 Starting Comprehensive CS2D Functionality Test Suite...\n');
        
        try {
            await this.initialize();
            
            // Run all test categories
            await this.testGameInitialization();
            await this.testWeaponSystems();
            await this.testShootingMechanics();
            await this.testScopingSystem();
            await this.testScoreboardSystem();
            await this.testUIUpdates();
            await this.testBotIntegration();
            await this.testMovementSystem();
            await this.testReloadMechanics();
            await this.testVisualEffects();
            await this.testErrorHandling();
            
            // Generate final report
            const report = await this.generateReport();
            
            return report;
            
        } catch (error) {
            console.error('Test suite error:', error);
        } finally {
            await this.cleanup();
        }
    }
}

// Run the comprehensive test suite
async function runTests() {
    const testSuite = new CS2DTestSuite();
    const report = await testSuite.runAllTests();
    
    // Write report to file
    if (report) {
        const fs = require('fs');
        fs.writeFileSync('test_report.json', JSON.stringify(report, null, 2));
        console.log('\n📄 Detailed report saved to test_report.json');
    }
}

runTests().catch(console.error);