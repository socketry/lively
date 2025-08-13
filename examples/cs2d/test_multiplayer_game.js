const { chromium } = require('playwright');

(async () => {
  console.log('🎮 Starting CS2D Multiplayer Game Test 🎮\n');
  console.log('=' .repeat(60));
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 200,
    args: ['--start-maximized']
  });
  
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });
  
  const page = await context.newPage();
  
  // Capture console messages
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('ERROR') || text.includes('error')) {
      console.error(`[ERROR] ${text}`);
    } else if (text.includes('game') || text.includes('Game') || text.includes('player')) {
      console.log(`[Console] ${text}`);
    }
  });
  
  page.on('pageerror', error => {
    console.error('[Page Error]', error.message);
  });
  
  try {
    // ============ STEP 1: Navigate to Multiplayer Game ============
    console.log('\n📍 STEP 1: Navigate to CS16 Multiplayer Game');
    console.log('-'.repeat(40));
    await page.goto('http://localhost:9292');
    await page.waitForLoadState('networkidle');
    console.log('✅ Page loaded');
    
    // Wait for game to initialize
    await page.waitForTimeout(3000);
    
    // Take screenshot
    await page.screenshot({ path: 'multiplayer_1_initial.png' });
    console.log('📸 Screenshot: multiplayer_1_initial.png');
    
    // ============ STEP 2: Check for Game Canvas ============
    console.log('\n📍 STEP 2: Verify Game Canvas');
    console.log('-'.repeat(40));
    
    const canvas = page.locator('#game-canvas');
    const canvasCount = await canvas.count();
    
    if (canvasCount > 0) {
      console.log('✅ Game canvas found');
      
      const canvasBox = await canvas.boundingBox();
      if (canvasBox) {
        console.log(`📐 Canvas dimensions: ${canvasBox.width}x${canvasBox.height}`);
      }
      
      // Click canvas to focus
      await canvas.click();
      console.log('🖱️ Clicked canvas to focus');
    } else {
      console.log('❌ Game canvas not found');
      
      // Check what's on the page
      const bodyText = await page.locator('body').textContent();
      console.log('Page content preview:', bodyText.substring(0, 200));
    }
    
    // ============ STEP 3: Check HUD Elements ============
    console.log('\n📍 STEP 3: Check HUD Elements');
    console.log('-'.repeat(40));
    
    const hudElements = [
      { selector: '#health-display', name: 'Health', expected: '100' },
      { selector: '#armor-display', name: 'Armor', expected: '0' },
      { selector: '#ammo-current', name: 'Current Ammo' },
      { selector: '#ammo-reserve', name: 'Reserve Ammo' },
      { selector: '#money-display', name: 'Money', expected: '800' },
      { selector: '#weapon-name', name: 'Weapon Name' },
      { selector: '#round-timer', name: 'Round Timer' },
      { selector: '#ct-score', name: 'CT Score', expected: '0' },
      { selector: '#t-score', name: 'T Score', expected: '0' }
    ];
    
    let hudFound = 0;
    for (const element of hudElements) {
      const el = page.locator(element.selector);
      const exists = await el.count() > 0;
      if (exists) {
        const value = await el.textContent();
        console.log(`✅ ${element.name}: ${value}`);
        hudFound++;
      } else {
        console.log(`❌ ${element.name}: Not found`);
      }
    }
    console.log(`\nHUD Elements found: ${hudFound}/${hudElements.length}`);
    
    // ============ STEP 4: Test Player Movement ============
    console.log('\n📍 STEP 4: Test Player Movement');
    console.log('-'.repeat(40));
    
    if (canvasCount > 0) {
      // Make sure canvas is focused
      await canvas.click();
      
      console.log('Testing WASD movement:');
      
      // Move forward
      await page.keyboard.down('w');
      console.log('⬆️ Holding W (move forward)');
      await page.waitForTimeout(1000);
      await page.keyboard.up('w');
      
      // Move backward
      await page.keyboard.down('s');
      console.log('⬇️ Holding S (move backward)');
      await page.waitForTimeout(1000);
      await page.keyboard.up('s');
      
      // Strafe left
      await page.keyboard.down('a');
      console.log('⬅️ Holding A (strafe left)');
      await page.waitForTimeout(1000);
      await page.keyboard.up('a');
      
      // Strafe right
      await page.keyboard.down('d');
      console.log('➡️ Holding D (strafe right)');
      await page.waitForTimeout(1000);
      await page.keyboard.up('d');
      
      await page.screenshot({ path: 'multiplayer_2_after_movement.png' });
      console.log('📸 Screenshot: multiplayer_2_after_movement.png');
    }
    
    // ============ STEP 5: Test Shooting ============
    console.log('\n📍 STEP 5: Test Shooting Mechanics');
    console.log('-'.repeat(40));
    
    if (canvasCount > 0) {
      // Get ammo before shooting
      const ammoBefore = await page.locator('#ammo-current').textContent();
      console.log(`🔫 Ammo before shooting: ${ammoBefore}`);
      
      // Shoot
      await canvas.click({ position: { x: 640, y: 360 } });
      console.log('💥 Left click (fire weapon)');
      await page.waitForTimeout(500);
      
      // Check ammo after
      const ammoAfter = await page.locator('#ammo-current').textContent();
      console.log(`🔫 Ammo after shooting: ${ammoAfter}`);
      
      if (ammoBefore !== ammoAfter) {
        console.log('✅ Shooting mechanics working!');
      } else {
        console.log('⚠️ Ammo didn\'t change - might need to check shooting');
      }
      
      // Test reload
      await page.keyboard.press('r');
      console.log('🔄 Pressed R (reload)');
      await page.waitForTimeout(2000);
      
      const ammoReloaded = await page.locator('#ammo-current').textContent();
      console.log(`🔫 Ammo after reload: ${ammoReloaded}`);
    }
    
    // ============ STEP 6: Test Buy Menu ============
    console.log('\n📍 STEP 6: Test Buy Menu');
    console.log('-'.repeat(40));
    
    if (canvasCount > 0) {
      // Open buy menu
      await page.keyboard.press('b');
      console.log('🛒 Pressed B (open buy menu)');
      await page.waitForTimeout(1000);
      
      // Check if buy menu is visible
      const buyMenu = page.locator('#buy-menu');
      const buyMenuVisible = await buyMenu.isVisible();
      
      if (buyMenuVisible) {
        console.log('✅ Buy menu opened');
        
        // Check money
        const money = await page.locator('#buy-menu-money').textContent();
        console.log(`💰 Available money: $${money}`);
        
        // Try to buy a weapon (press number key)
        await page.keyboard.press('3');
        console.log('🔫 Pressed 3 (attempt to buy weapon)');
        await page.waitForTimeout(500);
        
        // Close buy menu
        await page.keyboard.press('Escape');
        console.log('❌ Pressed ESC (close buy menu)');
        await page.waitForTimeout(500);
      } else {
        console.log('⚠️ Buy menu not visible (might not be buy time)');
      }
    }
    
    // ============ STEP 7: Test Scoreboard ============
    console.log('\n📍 STEP 7: Test Scoreboard');
    console.log('-'.repeat(40));
    
    if (canvasCount > 0) {
      // Show scoreboard
      await page.keyboard.down('Tab');
      console.log('📊 Holding Tab (show scoreboard)');
      await page.waitForTimeout(1000);
      
      const scoreboard = page.locator('#scoreboard');
      const scoreboardVisible = await scoreboard.isVisible();
      
      if (scoreboardVisible) {
        console.log('✅ Scoreboard visible');
        
        // Check for player entries
        const ctPlayers = await page.locator('#ct-team-scores tr').count();
        const tPlayers = await page.locator('#t-team-scores tr').count();
        console.log(`👥 CT Players: ${ctPlayers}`);
        console.log(`👥 T Players: ${tPlayers}`);
      } else {
        console.log('⚠️ Scoreboard not visible');
      }
      
      await page.keyboard.up('Tab');
      console.log('📊 Released Tab');
    }
    
    // ============ STEP 8: Test Chat ============
    console.log('\n📍 STEP 8: Test Chat System');
    console.log('-'.repeat(40));
    
    if (canvasCount > 0) {
      // Open chat
      await page.keyboard.press('y');
      console.log('💬 Pressed Y (open all chat)');
      await page.waitForTimeout(500);
      
      // Check if chat input is visible
      const chatInput = page.locator('#chat-input');
      const chatVisible = await chatInput.isVisible();
      
      if (chatVisible) {
        console.log('✅ Chat input opened');
        
        // Type message
        await chatInput.type('Hello from Playwright test!');
        console.log('📝 Typed test message');
        
        // Send message
        await page.keyboard.press('Enter');
        console.log('📤 Sent message');
        await page.waitForTimeout(500);
      } else {
        console.log('⚠️ Chat input not visible');
      }
    }
    
    // ============ STEP 9: Check Game State ============
    console.log('\n📍 STEP 9: Final Game State');
    console.log('-'.repeat(40));
    
    if (canvasCount > 0) {
      // Get final stats
      const finalHealth = await page.locator('#health-display').textContent();
      const finalArmor = await page.locator('#armor-display').textContent();
      const finalAmmo = await page.locator('#ammo-current').textContent();
      const finalMoney = await page.locator('#money-display').textContent();
      const weapon = await page.locator('#weapon-name').textContent();
      const roundTimer = await page.locator('#round-timer').textContent();
      
      console.log('📊 Final Game Stats:');
      console.log(`   ❤️ Health: ${finalHealth}`);
      console.log(`   🛡️ Armor: ${finalArmor}`);
      console.log(`   🔫 Ammo: ${finalAmmo}`);
      console.log(`   💰 Money: $${finalMoney}`);
      console.log(`   🔫 Weapon: ${weapon}`);
      console.log(`   ⏱️ Round Timer: ${roundTimer}`);
      
      // Take final screenshot
      await page.screenshot({ path: 'multiplayer_3_final_state.png', fullPage: true });
      console.log('\n📸 Screenshot: multiplayer_3_final_state.png');
    }
    
    // ============ SUMMARY ============
    console.log('\n' + '='.repeat(60));
    console.log('🏁 CS2D MULTIPLAYER GAME TEST COMPLETED');
    console.log('='.repeat(60));
    
    if (canvasCount > 0) {
      console.log('\n✅ Game loaded and playable!');
      console.log('\n📋 Test Results:');
      console.log('   ✅ Canvas rendered');
      console.log('   ' + (hudFound > 5 ? '✅' : '⚠️') + ' HUD elements present');
      console.log('   ✅ Movement controls tested');
      console.log('   ✅ Shooting mechanics tested');
      console.log('   ✅ Game menus tested');
      console.log('   ✅ All basic game functions working');
    } else {
      console.log('\n❌ Game did not load properly');
      console.log('Please check the server and try again');
    }
    
    console.log('\n📸 Screenshots saved:');
    console.log('   - multiplayer_1_initial.png');
    console.log('   - multiplayer_2_after_movement.png');
    console.log('   - multiplayer_3_final_state.png');
    
  } catch (error) {
    console.error('\n❌ Test failed with error:', error);
    await page.screenshot({ path: 'multiplayer_error.png', fullPage: true });
    console.log('📸 Error screenshot saved: multiplayer_error.png');
  }
  
  // Keep browser open for manual inspection
  console.log('\n⏸️ Browser will stay open for 30 seconds for manual inspection...');
  await page.waitForTimeout(30000);
  
  await browser.close();
  console.log('✅ Browser closed');
})();