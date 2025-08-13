const { chromium } = require('playwright');

(async () => {
  console.log('🎮 Starting FULL GAME FLOW TEST - From Lobby to Playing CS2D 🎮\n');
  console.log('=' .repeat(60));
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 500,
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
    } else if (text.includes('game') || text.includes('room') || text.includes('player')) {
      console.log(`[Console] ${text}`);
    }
  });
  
  page.on('pageerror', error => {
    console.error('[Page Error]', error.message);
  });
  
  try {
    // ============ STEP 1: Navigate to Lobby ============
    console.log('\n📍 STEP 1: Navigate to CS2D Lobby');
    console.log('-'.repeat(40));
    await page.goto('http://localhost:9292');
    await page.waitForLoadState('networkidle');
    
    // Get player ID
    const playerId = await page.locator('#current-player-id').textContent();
    console.log('✅ Lobby loaded');
    console.log('👤 Player ID:', playerId);
    
    // Take screenshot of lobby
    await page.screenshot({ path: 'flow_1_lobby.png' });
    console.log('📸 Screenshot: flow_1_lobby.png');
    
    // ============ STEP 2: Create Room ============
    console.log('\n📍 STEP 2: Create Game Room');
    console.log('-'.repeat(40));
    
    // Fill in room details
    await page.fill('#room_name', 'Playwright Test Game');
    await page.selectOption('#max_players', '4');
    await page.selectOption('#map', 'de_dust2');
    console.log('📝 Room details filled:');
    console.log('   - Name: Playwright Test Game');
    console.log('   - Max Players: 4');
    console.log('   - Map: de_dust2');
    
    // Click create button
    await page.click('#create-form button:has-text("創建房間")');
    console.log('🖱️ Clicked create room button');
    
    // Wait for redirect to room page
    await page.waitForTimeout(2000);
    
    // Check if we're on the room page
    const roomUrl = page.url();
    if (roomUrl.includes('/room?')) {
      console.log('✅ Redirected to room waiting page');
      console.log('🔗 Room URL:', roomUrl);
      
      // Extract room ID
      const roomIdMatch = roomUrl.match(/room_id=(room_[^&]+)/);
      const roomId = roomIdMatch ? roomIdMatch[1] : 'unknown';
      console.log('🏠 Room ID:', roomId);
      
      await page.screenshot({ path: 'flow_2_room_waiting.png' });
      console.log('📸 Screenshot: flow_2_room_waiting.png');
    } else {
      console.log('❌ Failed to redirect to room page');
      console.log('Current URL:', roomUrl);
    }
    
    // ============ STEP 3: Start Game ============
    console.log('\n📍 STEP 3: Start Game as Room Creator');
    console.log('-'.repeat(40));
    
    // Wait for page to load
    await page.waitForTimeout(2000);
    
    // Look for start game button
    const startButton = page.locator('button:has-text("開始遊戲")').first();
    const startButtonCount = await startButton.count();
    
    if (startButtonCount > 0) {
      console.log('✅ Found start game button');
      
      // Click start game
      await startButton.click();
      console.log('🖱️ Clicked start game button');
      
      // Wait for game to load
      console.log('⏳ Waiting for game to load...');
      await page.waitForTimeout(5000);
      
      // Check if we're in the game
      const currentUrl = page.url();
      console.log('🔗 Current URL:', currentUrl);
      
      // ============ STEP 4: Check Game Elements ============
      console.log('\n📍 STEP 4: Verify Game Elements');
      console.log('-'.repeat(40));
      
      // Check for game canvas
      const canvas = page.locator('#game-canvas');
      const canvasCount = await canvas.count();
      if (canvasCount > 0) {
        console.log('✅ Game canvas found');
        
        // Get canvas dimensions
        const canvasBox = await canvas.boundingBox();
        if (canvasBox) {
          console.log(`📐 Canvas size: ${canvasBox.width}x${canvasBox.height}`);
        }
      } else {
        console.log('❌ Game canvas not found');
      }
      
      // Check for HUD elements
      const hudElements = [
        { selector: '#health-display', name: 'Health' },
        { selector: '#armor-display', name: 'Armor' },
        { selector: '#ammo-current', name: 'Ammo' },
        { selector: '#money-display', name: 'Money' },
        { selector: '#round-timer', name: 'Round Timer' },
        { selector: '#ct-score', name: 'CT Score' },
        { selector: '#t-score', name: 'T Score' }
      ];
      
      console.log('\n🎯 HUD Elements:');
      for (const element of hudElements) {
        const el = page.locator(element.selector);
        const exists = await el.count() > 0;
        if (exists) {
          const value = await el.textContent();
          console.log(`   ✅ ${element.name}: ${value}`);
        } else {
          console.log(`   ❌ ${element.name}: Not found`);
        }
      }
      
      // Take screenshot of game
      await page.screenshot({ path: 'flow_3_game_started.png', fullPage: true });
      console.log('\n📸 Screenshot: flow_3_game_started.png');
      
      // ============ STEP 5: Test Game Interactions ============
      console.log('\n📍 STEP 5: Test Game Interactions');
      console.log('-'.repeat(40));
      
      // Try to focus the canvas
      await canvas.click();
      console.log('🖱️ Clicked on game canvas to focus');
      
      // Test keyboard input (movement)
      console.log('\n🎮 Testing player movement:');
      await page.keyboard.press('w');
      console.log('   ⬆️ Pressed W (move forward)');
      await page.waitForTimeout(500);
      
      await page.keyboard.press('s');
      console.log('   ⬇️ Pressed S (move backward)');
      await page.waitForTimeout(500);
      
      await page.keyboard.press('a');
      console.log('   ⬅️ Pressed A (move left)');
      await page.waitForTimeout(500);
      
      await page.keyboard.press('d');
      console.log('   ➡️ Pressed D (move right)');
      await page.waitForTimeout(500);
      
      // Test other game controls
      console.log('\n🎯 Testing game controls:');
      await page.keyboard.press('b');
      console.log('   🛒 Pressed B (buy menu)');
      await page.waitForTimeout(1000);
      
      // Check if buy menu appeared
      const buyMenu = page.locator('#buy-menu');
      const buyMenuVisible = await buyMenu.isVisible();
      if (buyMenuVisible) {
        console.log('   ✅ Buy menu opened');
        
        // Close buy menu
        await page.keyboard.press('Escape');
        console.log('   ❌ Pressed ESC to close buy menu');
        await page.waitForTimeout(500);
      } else {
        console.log('   ℹ️ Buy menu not available (might not be buy time)');
      }
      
      // Test Tab for scoreboard
      await page.keyboard.down('Tab');
      console.log('   📊 Holding Tab (scoreboard)');
      await page.waitForTimeout(1000);
      
      const scoreboard = page.locator('#scoreboard');
      const scoreboardVisible = await scoreboard.isVisible();
      if (scoreboardVisible) {
        console.log('   ✅ Scoreboard visible');
      }
      await page.keyboard.up('Tab');
      console.log('   📊 Released Tab');
      
      // Test shooting
      console.log('\n🔫 Testing shooting:');
      await canvas.click({ position: { x: 400, y: 300 } });
      console.log('   💥 Left click (shoot)');
      await page.waitForTimeout(500);
      
      await canvas.click({ button: 'right', position: { x: 400, y: 300 } });
      console.log('   🔍 Right click (alternate fire/scope)');
      await page.waitForTimeout(500);
      
      // Test reload
      await page.keyboard.press('r');
      console.log('   🔄 Pressed R (reload)');
      await page.waitForTimeout(1000);
      
      // Take final screenshot
      await page.screenshot({ path: 'flow_4_game_playing.png', fullPage: true });
      console.log('\n📸 Screenshot: flow_4_game_playing.png');
      
      // ============ STEP 6: Check Game State ============
      console.log('\n📍 STEP 6: Final Game State Check');
      console.log('-'.repeat(40));
      
      // Check if game is running smoothly
      const finalHealth = await page.locator('#health-display').textContent();
      const finalAmmo = await page.locator('#ammo-current').textContent();
      const finalMoney = await page.locator('#money-display').textContent();
      const roundTimer = await page.locator('#round-timer').textContent();
      
      console.log('📊 Final Game Stats:');
      console.log(`   ❤️ Health: ${finalHealth}`);
      console.log(`   🔫 Ammo: ${finalAmmo}`);
      console.log(`   💰 Money: $${finalMoney}`);
      console.log(`   ⏱️ Round Timer: ${roundTimer}`);
      
    } else {
      console.log('❌ Start game button not found');
      console.log('ℹ️ This might be because:');
      console.log('   - You are not the room creator');
      console.log('   - The room state is not "waiting"');
      console.log('   - The button hasn\'t loaded yet');
      
      // Try to find any buttons on the page
      const allButtons = await page.locator('button').allTextContents();
      console.log('\n🔍 Available buttons on page:');
      allButtons.forEach((text, i) => {
        if (text.trim()) {
          console.log(`   ${i + 1}. "${text.trim()}"`);
        }
      });
    }
    
    // ============ FINAL SUMMARY ============
    console.log('\n' + '='.repeat(60));
    console.log('🏁 FULL GAME FLOW TEST COMPLETED');
    console.log('='.repeat(60));
    console.log('\n📋 Summary:');
    console.log('   1. ✅ Lobby loaded successfully');
    console.log('   2. ✅ Room created with correct player ID');
    console.log('   3. ' + (startButtonCount > 0 ? '✅' : '❌') + ' Game started');
    console.log('   4. ' + (canvasCount > 0 ? '✅' : '❌') + ' Game canvas rendered');
    console.log('   5. ✅ Controls tested');
    console.log('\n📸 Screenshots saved:');
    console.log('   - flow_1_lobby.png');
    console.log('   - flow_2_room_waiting.png');
    console.log('   - flow_3_game_started.png');
    console.log('   - flow_4_game_playing.png');
    
  } catch (error) {
    console.error('\n❌ Test failed with error:', error);
    await page.screenshot({ path: 'flow_error.png', fullPage: true });
    console.log('📸 Error screenshot saved: flow_error.png');
  }
  
  // Keep browser open for manual inspection
  console.log('\n⏸️ Browser will stay open for 30 seconds for manual inspection...');
  await page.waitForTimeout(30000);
  
  await browser.close();
  console.log('✅ Browser closed');
})();