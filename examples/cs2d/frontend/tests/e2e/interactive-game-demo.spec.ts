import { test, expect } from '@playwright/test';

test.describe('🎮 Interactive CS2D Game Demo', () => {
  test('🚀 Create and play a game room', async ({ page }) => {
    console.log('\n' + '🎮'.repeat(25));
    console.log('CS2D INTERACTIVE GAME DEMONSTRATION');
    console.log('🎮'.repeat(25) + '\n');
    
    // Go to the game
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    console.log('📍 Current page: ' + page.url());
    
    // Look for the Create Room button
    const createRoomBtn = page.locator('button').filter({ hasText: /create/i }).first();
    if (await createRoomBtn.count() > 0) {
      console.log('✅ Found "Create Room" button!');
      
      // Screenshot before creating room
      await page.screenshot({ 
        path: 'tests/e2e/screenshots/demo-1-lobby.png',
        fullPage: true 
      });
      
      // Click Create Room
      console.log('🖱️ Clicking "Create Room"...');
      await createRoomBtn.click();
      await page.waitForTimeout(1000);
      
      // Look for any form fields to fill
      const roomNameInput = page.locator('input[placeholder*="room" i], input[name*="room" i]').first();
      if (await roomNameInput.count() > 0) {
        console.log('📝 Entering room name...');
        await roomNameInput.fill('Demo Game Room ' + Date.now());
      }
      
      // Look for game mode selector
      const gameModeSelect = page.locator('select').first();
      if (await gameModeSelect.count() > 0) {
        console.log('🎯 Selecting game mode...');
        await gameModeSelect.selectOption({ index: 0 });
      }
      
      // Look for confirm/create button
      const confirmBtn = page.locator('button').filter({ hasText: /confirm|create|start|ok/i }).first();
      if (await confirmBtn.count() > 0) {
        console.log('✅ Confirming room creation...');
        await confirmBtn.click();
        await page.waitForTimeout(2000);
      }
      
      await page.screenshot({ 
        path: 'tests/e2e/screenshots/demo-2-room-created.png',
        fullPage: true 
      });
      
      // Check if we're in a room
      const currentUrl = page.url();
      if (currentUrl.includes('room') || currentUrl.includes('game')) {
        console.log('🎮 Successfully entered game room!');
        console.log('📍 Room URL: ' + currentUrl);
      }
    }
    
    // Look for game canvas or game area
    console.log('\n🎮 LOOKING FOR GAME ELEMENTS...');
    
    const gameElements = {
      canvas: await page.locator('canvas').count(),
      gameContainer: await page.locator('[class*="game"], [id*="game"]').count(),
      playerList: await page.locator('[class*="player"], [id*="player"]').count(),
      chatBox: await page.locator('[class*="chat"], [id*="chat"]').count(),
      readyButton: await page.locator('button').filter({ hasText: /ready/i }).count(),
      startButton: await page.locator('button').filter({ hasText: /start/i }).count(),
    };
    
    console.log('📊 Game Elements Found:');
    Object.entries(gameElements).forEach(([element, count]) => {
      const icon = count > 0 ? '✅' : '❌';
      console.log(`  ${icon} ${element}: ${count}`);
    });
    
    // Try to mark as ready
    if (gameElements.readyButton > 0) {
      console.log('\n🎯 Clicking Ready button...');
      await page.locator('button').filter({ hasText: /ready/i }).first().click();
      await page.waitForTimeout(1000);
    }
    
    // Try to start the game
    if (gameElements.startButton > 0) {
      console.log('🚀 Clicking Start button...');
      await page.locator('button').filter({ hasText: /start/i }).first().click();
      await page.waitForTimeout(2000);
    }
    
    // Screenshot the game state
    await page.screenshot({ 
      path: 'tests/e2e/screenshots/demo-3-game-state.png',
      fullPage: true 
    });
    
    // Simulate gameplay
    console.log('\n🎮 SIMULATING GAMEPLAY...');
    console.log('⌨️ Sending game controls:');
    
    // Movement
    console.log('  📍 Moving forward (W)...');
    await page.keyboard.down('w');
    await page.waitForTimeout(500);
    await page.keyboard.up('w');
    
    console.log('  📍 Moving left (A)...');
    await page.keyboard.down('a');
    await page.waitForTimeout(500);
    await page.keyboard.up('a');
    
    console.log('  📍 Moving backward (S)...');
    await page.keyboard.down('s');
    await page.waitForTimeout(500);
    await page.keyboard.up('s');
    
    console.log('  📍 Moving right (D)...');
    await page.keyboard.down('d');
    await page.waitForTimeout(500);
    await page.keyboard.up('d');
    
    // Combat
    console.log('  🔫 Shooting (Mouse clicks)...');
    await page.mouse.click(960, 540);
    await page.waitForTimeout(100);
    await page.mouse.click(1000, 540);
    await page.waitForTimeout(100);
    await page.mouse.click(920, 540);
    
    console.log('  🔄 Reloading (R)...');
    await page.keyboard.press('r');
    
    console.log('  🔢 Switching weapons (1-5)...');
    for (let i = 1; i <= 5; i++) {
      await page.keyboard.press(String(i));
      await page.waitForTimeout(200);
    }
    
    // Special actions
    console.log('  🏃 Sprinting (Shift + W)...');
    await page.keyboard.down('Shift');
    await page.keyboard.down('w');
    await page.waitForTimeout(1000);
    await page.keyboard.up('w');
    await page.keyboard.up('Shift');
    
    console.log('  🧎 Crouching (Ctrl)...');
    await page.keyboard.down('Control');
    await page.waitForTimeout(500);
    await page.keyboard.up('Control');
    
    console.log('  💬 Opening chat (T)...');
    await page.keyboard.press('t');
    await page.waitForTimeout(500);
    
    // Type a message if chat is open
    const chatInput = page.locator('input[type="text"]').first();
    if (await chatInput.count() > 0 && await chatInput.isVisible()) {
      console.log('  💬 Typing chat message...');
      await chatInput.type('Hello from Playwright test! 🎮');
      await page.keyboard.press('Enter');
    } else {
      await page.keyboard.press('Escape');
    }
    
    console.log('  📊 Opening scoreboard (Tab)...');
    await page.keyboard.down('Tab');
    await page.waitForTimeout(1000);
    await page.keyboard.up('Tab');
    
    // Final screenshot
    await page.screenshot({ 
      path: 'tests/e2e/screenshots/demo-4-gameplay.png',
      fullPage: true 
    });
    
    // Check for any visible game stats
    console.log('\n📊 CHECKING GAME STATS...');
    
    const stats = {
      health: await page.locator('[class*="health"], [data-testid*="health"]').first().textContent(),
      ammo: await page.locator('[class*="ammo"], [data-testid*="ammo"]').first().textContent(),
      score: await page.locator('[class*="score"], [data-testid*="score"]').first().textContent(),
      timer: await page.locator('[class*="timer"], [data-testid*="timer"]').first().textContent(),
    };
    
    Object.entries(stats).forEach(([stat, value]) => {
      if (value) {
        console.log(`  📈 ${stat}: ${value}`);
      }
    });
    
    // Summary
    console.log('\n' + '='.repeat(50));
    console.log('🎮 GAME DEMO COMPLETE!');
    console.log('='.repeat(50));
    console.log('📸 Screenshots saved:');
    console.log('  1. demo-1-lobby.png - Initial lobby');
    console.log('  2. demo-2-room-created.png - Room creation');
    console.log('  3. demo-3-game-state.png - Game started');
    console.log('  4. demo-4-gameplay.png - After gameplay');
    console.log('\n✅ Check the screenshots to see the game in action!');
  });

  test('🌐 Test multiplayer with two players', async ({ browser }) => {
    console.log('\n🎮 MULTIPLAYER DEMO - TWO PLAYERS');
    console.log('='.repeat(50));
    
    // Create two browser contexts (two players)
    const context1 = await browser.newContext({ viewport: { width: 960, height: 1080 } });
    const context2 = await browser.newContext({ viewport: { width: 960, height: 1080 } });
    
    const player1 = await context1.newPage();
    const player2 = await context2.newPage();
    
    console.log('👤 Player 1 joining...');
    await player1.goto('/');
    await player1.waitForLoadState('networkidle');
    
    console.log('👤 Player 2 joining...');
    await player2.goto('/');
    await player2.waitForLoadState('networkidle');
    
    // Player 1 creates a room
    const createBtn = player1.locator('button').filter({ hasText: /create/i }).first();
    if (await createBtn.count() > 0) {
      console.log('🎮 Player 1 creating room...');
      await createBtn.click();
      await player1.waitForTimeout(2000);
      
      // Get room code or ID if visible
      const roomCode = await player1.locator('[class*="code"], [class*="room-id"]').first().textContent();
      if (roomCode) {
        console.log(`📍 Room Code: ${roomCode}`);
      }
    }
    
    // Both players on same screen
    await player1.screenshot({ 
      path: 'tests/e2e/screenshots/multiplayer-player1.png',
      fullPage: true 
    });
    
    await player2.screenshot({ 
      path: 'tests/e2e/screenshots/multiplayer-player2.png',
      fullPage: true 
    });
    
    // Check if both players see each other
    const player1List = await player1.locator('[class*="player"]').count();
    const player2List = await player2.locator('[class*="player"]').count();
    
    console.log(`👥 Player 1 sees ${player1List} player(s)`);
    console.log(`👥 Player 2 sees ${player2List} player(s)`);
    
    // Simulate some actions
    console.log('\n🎮 Players performing actions...');
    
    console.log('  Player 1: Moving forward');
    await player1.keyboard.press('w');
    
    console.log('  Player 2: Moving backward');
    await player2.keyboard.press('s');
    
    console.log('  Player 1: Shooting');
    await player1.mouse.click(500, 500);
    
    console.log('  Player 2: Jumping');
    await player2.keyboard.press(' ');
    
    // Final screenshots
    await player1.screenshot({ 
      path: 'tests/e2e/screenshots/multiplayer-final-p1.png',
      fullPage: true 
    });
    
    await player2.screenshot({ 
      path: 'tests/e2e/screenshots/multiplayer-final-p2.png',
      fullPage: true 
    });
    
    console.log('\n✅ Multiplayer demo complete!');
    console.log('📸 Check multiplayer screenshots');
    
    // Cleanup
    await context1.close();
    await context2.close();
  });
});
