// Test script to verify the three fixes
const { chromium } = require('playwright');

async function testFixes() {
    const browser = await chromium.launch({ headless: false });
    const page = await browser.newPage();
    
    // Monitor console messages
    page.on('console', msg => {
        const text = msg.text();
        if (text.includes('Shot fired!')) {
            console.log('✅ Shooting detected:', text);
        }
    });
    
    console.log('Testing CS2D fixes...\n');
    
    try {
        // Test 1: Check language switcher only appears in lobby
        console.log('Test 1: Language switcher visibility');
        
        // Check lobby page (should have language switcher)
        await page.goto('http://localhost:9292');
        await page.waitForTimeout(2000);
        const lobbySwitcher = await page.$('#language-switcher');
        console.log('  Lobby page has language switcher:', lobbySwitcher !== null ? '✅ YES' : '❌ NO');
        
        // Check room page (should NOT have language switcher)
        await page.goto('http://localhost:9293/room.html?room_id=test&player_id=test');
        await page.waitForTimeout(2000);
        const roomSwitcher = await page.$('#language-switcher');
        console.log('  Room page has language switcher:', roomSwitcher !== null ? '❌ YES' : '✅ NO');
        
        // Check game page (should NOT have language switcher)
        await page.goto('http://localhost:9293/game.html?room_id=test&player_id=test&nickname=TestPlayer');
        await page.waitForTimeout(3000);
        const gameSwitcher = await page.$('#language-switcher');
        console.log('  Game page has language switcher:', gameSwitcher !== null ? '❌ YES' : '✅ NO');
        
        // Test 2: Check scoreboard display with Tab key
        console.log('\nTest 2: Scoreboard Tab display');
        
        // Wait for game to load
        await page.waitForSelector('#game-canvas', { timeout: 5000 });
        
        // Check scoreboard is initially hidden
        const scoreboardInitial = await page.$eval('#scoreboard', el => el.style.display);
        console.log('  Scoreboard initially hidden:', scoreboardInitial === 'none' ? '✅ YES' : '❌ NO');
        
        // Press Tab to show scoreboard
        await page.keyboard.down('Tab');
        await page.waitForTimeout(500);
        const scoreboardShown = await page.$eval('#scoreboard', el => el.style.display);
        console.log('  Scoreboard shows on Tab press:', scoreboardShown === 'block' ? '✅ YES' : '❌ NO');
        
        // Check if scoreboard has content
        const scoreboardContent = await page.$eval('#scoreboard-body', el => el.innerHTML);
        console.log('  Scoreboard has content:', scoreboardContent.length > 0 ? '✅ YES' : '❌ NO');
        
        // Release Tab to hide scoreboard
        await page.keyboard.up('Tab');
        await page.waitForTimeout(500);
        const scoreboardHidden = await page.$eval('#scoreboard', el => el.style.display);
        console.log('  Scoreboard hides on Tab release:', scoreboardHidden === 'none' ? '✅ YES' : '❌ NO');
        
        // Test 3: Shotgun shooting pattern
        console.log('\nTest 3: Shotgun shooting mechanics');
        
        // Simulate buying a shotgun by setting weapon directly
        await page.evaluate(() => {
            if (window.game) {
                // Save original values
                window.game.originalWeapon = window.game.player.weapon;
                window.game.originalAmmo = window.game.player.ammo;
                
                // Set shotgun
                window.game.player.weapon = 'm3';
                window.game.player.ammo = 8;
                window.game.player.reserveAmmo = 32;
                window.game.fireRate = 880; // M3 pump-action fire rate
                
                // Clear existing bullets
                window.game.bullets = [];
            }
        });
        
        // Get initial bullet count
        const bulletsBefore = await page.evaluate(() => window.game ? window.game.bullets.length : 0);
        console.log('  Bullets before shooting:', bulletsBefore);
        
        // Simulate shooting
        await page.evaluate(() => {
            if (window.game) {
                window.game.shoot();
            }
        });
        
        // Check bullet count after shooting
        await page.waitForTimeout(100);
        const bulletsAfter = await page.evaluate(() => window.game ? window.game.bullets.length : 0);
        const bulletsFired = bulletsAfter - bulletsBefore;
        console.log('  Bullets after shotgun shot:', bulletsAfter);
        console.log('  Shotgun fires multiple pellets:', bulletsFired > 1 ? `✅ YES (${bulletsFired} pellets)` : '❌ NO');
        
        // Test regular weapon for comparison
        await page.evaluate(() => {
            if (window.game) {
                // Set AK-47
                window.game.player.weapon = 'ak47';
                window.game.player.ammo = 30;
                window.game.fireRate = 100;
                window.game.bullets = [];
            }
        });
        
        // Shoot with AK-47
        await page.evaluate(() => {
            if (window.game) {
                window.game.shoot();
            }
        });
        
        await page.waitForTimeout(100);
        const ak47Bullets = await page.evaluate(() => window.game ? window.game.bullets.length : 0);
        console.log('  AK-47 fires single bullet:', ak47Bullets === 1 ? '✅ YES' : '❌ NO');
        
        console.log('\n✅ All tests completed!');
        
    } catch (error) {
        console.error('Test error:', error);
    } finally {
        await page.waitForTimeout(2000);
        await browser.close();
    }
}

testFixes().catch(console.error);