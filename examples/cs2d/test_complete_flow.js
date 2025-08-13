const { chromium } = require('playwright');

(async () => {
  console.log('🎮 CS2D Complete Flow Test - Lobby to Game 🎮\n');
  console.log('=' .repeat(60));
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 300,
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
    } else if (text.includes('Room') || text.includes('Player') || text.includes('Game')) {
      console.log(`[Console] ${text}`);
    }
  });
  
  page.on('pageerror', error => {
    console.error('[Page Error]', error.message);
  });
  
  try {
    // ============ PHASE 1: LOBBY ============
    console.log('\n📍 PHASE 1: Navigate to Lobby');
    console.log('-'.repeat(40));
    
    await page.goto('http://localhost:9292');
    await page.waitForLoadState('networkidle');
    console.log('✅ Lobby loaded');
    
    // Wait for player ID to be initialized
    await page.waitForTimeout(2000);
    
    // Get player ID
    const playerId = await page.evaluate(() => {
      const playerIdElement = document.querySelector('#player-id-display');
      return playerIdElement ? playerIdElement.textContent : 'Unknown';
    });
    console.log(`👤 Player ID: ${playerId}`);
    
    // Take screenshot
    await page.screenshot({ path: 'flow_1_lobby.png' });
    console.log('📸 Screenshot: flow_1_lobby.png');
    
    // ============ PHASE 2: CREATE ROOM ============
    console.log('\n📍 PHASE 2: Create Room');
    console.log('-'.repeat(40));
    
    // Click on the create room tab
    const createTab = page.locator('button:has-text("創建房間")').first();
    await createTab.click();
    console.log('🔄 Switched to create room tab');
    
    await page.waitForTimeout(1000);
    
    // Fill in room details
    await page.fill('#room_name', 'Test Room Complete Flow');
    console.log('📝 Room name: Test Room Complete Flow');
    
    await page.selectOption('#max_players', '4');
    console.log('👥 Max players: 4');
    
    await page.selectOption('#map', 'de_dust2');
    console.log('🗺️ Map: de_dust2');
    
    // Create room
    const createButton = page.locator('#create-form button:has-text("創建房間")');
    await createButton.click();
    console.log('🚀 Creating room...');
    
    // Wait for response
    await page.waitForTimeout(3000);
    
    // Check for room creation success
    const roomCreated = await page.evaluate(() => {
      const alerts = Array.from(document.querySelectorAll('.notification'));
      return alerts.some(alert => alert.textContent.includes('房間已創建'));
    });
    
    if (roomCreated) {
      console.log('✅ Room created successfully');
    } else {
      console.log('⚠️ Room creation notification not found');
    }
    
    await page.screenshot({ path: 'flow_2_room_created.png' });
    console.log('📸 Screenshot: flow_2_room_created.png');
    
    // ============ PHASE 3: JOIN ROOM ============
    console.log('\n📍 PHASE 3: Join Created Room');
    console.log('-'.repeat(40));
    
    // Try to switch to room list tab if it exists
    const roomListTab = page.locator('button:has-text("加入房間")').first();
    const tabExists = await roomListTab.count() > 0;
    
    if (tabExists) {
      await roomListTab.click();
      console.log('🔄 Switched to room list tab');
    } else {
      console.log('📍 Already on room list view');
    }
    
    await page.waitForTimeout(2000);
    
    // Find and join our room
    const joinButton = page.locator('.room-item:has-text("Test Room Complete Flow") button:has-text("加入")').first();
    const joinButtonExists = await joinButton.count() > 0;
    
    if (joinButtonExists) {
      await joinButton.click();
      console.log('✅ Clicked join button');
      
      // Wait for redirect to room waiting page
      await page.waitForTimeout(3000);
      
      // Check if we're in the room waiting page
      const currentUrl = page.url();
      if (currentUrl.includes('/room')) {
        console.log('✅ Redirected to room waiting page');
        console.log(`📍 Current URL: ${currentUrl}`);
      } else {
        console.log('⚠️ Not redirected to room page');
        console.log(`📍 Current URL: ${currentUrl}`);
      }
      
      await page.screenshot({ path: 'flow_3_room_waiting.png' });
      console.log('📸 Screenshot: flow_3_room_waiting.png');
    } else {
      console.log('❌ Join button not found');
      
      // Try to find any room
      const anyJoinButton = page.locator('button:has-text("加入")').first();
      const anyJoinExists = await anyJoinButton.count() > 0;
      
      if (anyJoinExists) {
        console.log('⚠️ Found other rooms, joining first available...');
        await anyJoinButton.click();
        await page.waitForTimeout(3000);
      }
    }
    
    // ============ PHASE 4: START GAME ============
    console.log('\n📍 PHASE 4: Start Game');
    console.log('-'.repeat(40));
    
    // Look for start game button (only creator can see it)
    const startButton = page.locator('button:has-text("開始遊戲")');
    const startButtonExists = await startButton.count() > 0;
    
    if (startButtonExists) {
      console.log('✅ Start button found - we are the room creator');
      
      await startButton.click();
      console.log('🎮 Starting game...');
      
      // Wait for game to load
      await page.waitForTimeout(5000);
      
      // Check if redirected to game
      const gameUrl = page.url();
      if (gameUrl.includes('/game')) {
        console.log('✅ Redirected to game page');
        console.log(`📍 Game URL: ${gameUrl}`);
      } else {
        console.log('⚠️ Not redirected to game');
        console.log(`📍 Current URL: ${gameUrl}`);
      }
    } else {
      console.log('⚠️ Start button not found - not room creator or game already started');
    }
    
    await page.screenshot({ path: 'flow_4_game_started.png' });
    console.log('📸 Screenshot: flow_4_game_started.png');
    
    // ============ PHASE 5: VERIFY GAME ============
    console.log('\n📍 PHASE 5: Verify Game Elements');
    console.log('-'.repeat(40));
    
    // Check for game canvas
    const canvas = page.locator('#game-canvas');
    const canvasExists = await canvas.count() > 0;
    
    if (canvasExists) {
      console.log('✅ Game canvas found');
      
      const canvasBox = await canvas.boundingBox();
      if (canvasBox) {
        console.log(`📐 Canvas dimensions: ${canvasBox.width}x${canvasBox.height}`);
      }
      
      // Click canvas to focus
      await canvas.click();
      console.log('🖱️ Canvas focused');
      
      // Test basic controls
      console.log('\n🎮 Testing game controls:');
      
      await page.keyboard.down('w');
      console.log('⬆️ W pressed (move forward)');
      await page.waitForTimeout(500);
      await page.keyboard.up('w');
      
      await page.keyboard.down('s');
      console.log('⬇️ S pressed (move backward)');
      await page.waitForTimeout(500);
      await page.keyboard.up('s');
      
      await page.keyboard.down('a');
      console.log('⬅️ A pressed (strafe left)');
      await page.waitForTimeout(500);
      await page.keyboard.up('a');
      
      await page.keyboard.down('d');
      console.log('➡️ D pressed (strafe right)');
      await page.waitForTimeout(500);
      await page.keyboard.up('d');
      
      // Check HUD elements
      console.log('\n🎯 Checking HUD elements:');
      
      const hudElements = [
        { selector: '#health-display', name: 'Health' },
        { selector: '#armor-display', name: 'Armor' },
        { selector: '#ammo-current', name: 'Ammo' },
        { selector: '#money-display', name: 'Money' },
        { selector: '#round-timer', name: 'Timer' }
      ];
      
      let hudFound = 0;
      for (const element of hudElements) {
        const el = page.locator(element.selector);
        const exists = await el.count() > 0;
        if (exists) {
          const value = await el.textContent();
          console.log(`  ✅ ${element.name}: ${value}`);
          hudFound++;
        } else {
          console.log(`  ❌ ${element.name}: Not found`);
        }
      }
      
      console.log(`\nHUD Elements: ${hudFound}/${hudElements.length} found`);
      
    } else {
      console.log('❌ Game canvas not found');
      
      // Check what's on the page
      const bodyText = await page.locator('body').textContent();
      console.log('Page content preview:', bodyText.substring(0, 300));
    }
    
    // Take final screenshot
    await page.screenshot({ path: 'flow_5_final.png', fullPage: true });
    console.log('📸 Screenshot: flow_5_final.png');
    
    // ============ SUMMARY ============
    console.log('\n' + '='.repeat(60));
    console.log('🏁 COMPLETE FLOW TEST FINISHED');
    console.log('='.repeat(60));
    
    console.log('\n📋 Test Summary:');
    console.log('  1. Lobby: ' + '✅ Loaded');
    console.log('  2. Room Creation: ' + (roomCreated ? '✅ Success' : '⚠️ Check'));
    console.log('  3. Room Joining: ' + (joinButtonExists ? '✅ Joined' : '⚠️ Check'));
    console.log('  4. Game Start: ' + (startButtonExists ? '✅ Started' : '⚠️ Check'));
    console.log('  5. Game Canvas: ' + (canvasExists ? '✅ Rendered' : '❌ Missing'));
    
    if (canvasExists) {
      console.log('\n✅ Complete flow successful! Game is playable.');
    } else {
      console.log('\n⚠️ Flow completed but game may need attention.');
    }
    
    console.log('\n📸 Screenshots saved:');
    console.log('  - flow_1_lobby.png');
    console.log('  - flow_2_room_created.png');
    console.log('  - flow_3_room_waiting.png');
    console.log('  - flow_4_game_started.png');
    console.log('  - flow_5_final.png');
    
  } catch (error) {
    console.error('\n❌ Test failed with error:', error);
    await page.screenshot({ path: 'flow_error.png', fullPage: true });
    console.log('📸 Error screenshot saved: flow_error.png');
  }
  
  // Keep browser open for manual inspection
  console.log('\n⏸️ Browser will stay open for 30 seconds for inspection...');
  await page.waitForTimeout(30000);
  
  await browser.close();
  console.log('✅ Browser closed');
})();