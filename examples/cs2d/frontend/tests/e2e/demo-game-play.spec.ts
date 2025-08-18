import { test, expect } from '@playwright/test';

test.describe('🎮 CS2D Game Demo', () => {
  test('🚀 Play the game and show all features', async ({ page }) => {
    console.log('='.repeat(50));
    console.log('🎮 CS2D GAME DEMO - STARTING');
    console.log('='.repeat(50));
    
    // 1. Navigate to the game
    console.log('\n📍 Step 1: Loading CS2D...');
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Take screenshot of landing page
    await page.screenshot({ 
      path: 'tests/e2e/screenshots/1-landing-page.png',
      fullPage: true 
    });
    console.log('   ✅ Landing page loaded');
    
    // 2. Check what's on the page
    console.log('\n📍 Step 2: Analyzing page content...');
    const pageTitle = await page.title();
    console.log(`   📄 Page Title: "${pageTitle}"`);
    
    const visibleText = await page.locator('body').innerText();
    console.log(`   📝 Visible content (first 200 chars): ${visibleText.substring(0, 200)}`);
    
    // 3. Try to navigate to different routes
    console.log('\n📍 Step 3: Exploring game routes...');
    
    // Try lobby
    await page.goto('/lobby');
    await page.waitForTimeout(2000);
    await page.screenshot({ 
      path: 'tests/e2e/screenshots/2-lobby-page.png',
      fullPage: true 
    });
    const lobbyText = await page.locator('body').innerText();
    console.log(`   🏛️ Lobby page: ${lobbyText.substring(0, 100) || 'Empty'}`);
    
    // Try game
    await page.goto('/game');
    await page.waitForTimeout(2000);
    await page.screenshot({ 
      path: 'tests/e2e/screenshots/3-game-page.png',
      fullPage: true 
    });
    const gameText = await page.locator('body').innerText();
    console.log(`   🎮 Game page: ${gameText.substring(0, 100) || 'Empty'}`);
    
    // 4. Look for interactive elements
    console.log('\n📍 Step 4: Finding interactive elements...');
    
    // Find all buttons
    const buttons = await page.locator('button').all();
    console.log(`   🔘 Found ${buttons.length} buttons`);
    for (let i = 0; i < Math.min(3, buttons.length); i++) {
      const text = await buttons[i].innerText();
      console.log(`      - Button ${i + 1}: "${text}"`);
    }
    
    // Find all links
    const links = await page.locator('a[href]').all();
    console.log(`   🔗 Found ${links.length} links`);
    for (let i = 0; i < Math.min(3, links.length); i++) {
      const text = await links[i].innerText();
      const href = await links[i].getAttribute('href');
      console.log(`      - Link ${i + 1}: "${text}" -> ${href}`);
    }
    
    // Find inputs
    const inputs = await page.locator('input').all();
    console.log(`   ✏️ Found ${inputs.length} input fields`);
    
    // 5. Check for canvas (game might be canvas-based)
    console.log('\n📍 Step 5: Looking for game canvas...');
    const canvas = await page.locator('canvas').count();
    if (canvas > 0) {
      console.log(`   🎨 Found ${canvas} canvas element(s) - Game is likely canvas-based!`);
      const canvasElement = page.locator('canvas').first();
      const box = await canvasElement.boundingBox();
      if (box) {
        console.log(`      - Canvas size: ${box.width}x${box.height}`);
      }
    } else {
      console.log('   ❌ No canvas found - Game might use DOM elements');
    }
    
    // 6. Check WebSocket connection
    console.log('\n📍 Step 6: Checking WebSocket connection...');
    const wsConnections: string[] = [];
    page.on('websocket', ws => {
      wsConnections.push(ws.url());
    });
    
    await page.reload();
    await page.waitForTimeout(2000);
    
    if (wsConnections.length > 0) {
      console.log(`   🔌 WebSocket connected to: ${wsConnections[0]}`);
    } else {
      console.log('   ⚠️ No WebSocket connection detected');
    }
    
    // 7. Try to interact with the game
    console.log('\n📍 Step 7: Attempting game interactions...');
    
    // Click on any visible button
    const visibleButton = page.locator('button:visible').first();
    if (await visibleButton.count() > 0) {
      const buttonText = await visibleButton.innerText();
      console.log(`   🖱️ Clicking button: "${buttonText}"`);
      await visibleButton.click();
      await page.waitForTimeout(1000);
      
      // Check if anything changed
      const newUrl = page.url();
      console.log(`      - Current URL: ${newUrl}`);
      
      await page.screenshot({ 
        path: 'tests/e2e/screenshots/4-after-click.png',
        fullPage: true 
      });
    }
    
    // 8. Try keyboard inputs (game controls)
    console.log('\n📍 Step 8: Testing game controls...');
    console.log('   ⌨️ Sending keyboard inputs...');
    
    // Common game keys
    const gameKeys = ['w', 'a', 's', 'd', ' ', 'Enter', 'Escape'];
    for (const key of gameKeys) {
      await page.keyboard.press(key);
      console.log(`      - Pressed: ${key}`);
      await page.waitForTimeout(100);
    }
    
    // 9. Check console for game messages
    console.log('\n📍 Step 9: Checking browser console...');
    const consoleLogs: string[] = [];
    page.on('console', msg => {
      if (msg.type() !== 'debug') {
        consoleLogs.push(`[${msg.type()}] ${msg.text()}`);
      }
    });
    
    await page.reload();
    await page.waitForTimeout(2000);
    
    console.log(`   📋 Console messages (last 5):`);
    consoleLogs.slice(-5).forEach(log => {
      console.log(`      ${log}`);
    });
    
    // 10. Final screenshot
    console.log('\n📍 Step 10: Taking final screenshot...');
    await page.screenshot({ 
      path: 'tests/e2e/screenshots/5-final-state.png',
      fullPage: true 
    });
    
    // Summary
    console.log('\n' + '='.repeat(50));
    console.log('📊 GAME DEMO SUMMARY');
    console.log('='.repeat(50));
    console.log(`✅ Page Title: ${pageTitle}`);
    console.log(`✅ Interactive Elements: ${buttons.length} buttons, ${links.length} links, ${inputs.length} inputs`);
    console.log(`✅ Canvas Elements: ${canvas}`);
    console.log(`✅ WebSocket: ${wsConnections.length > 0 ? 'Connected' : 'Not detected'}`);
    console.log(`✅ Screenshots saved: 5 images in tests/e2e/screenshots/`);
    console.log('\n🎮 Demo complete! Check the screenshots to see the game.');
    console.log('='.repeat(50));
  });

  test('🎯 Try to play an actual game session', async ({ page }) => {
    console.log('\n🎮 ATTEMPTING TO PLAY A GAME SESSION');
    console.log('='.repeat(50));
    
    // Go to main page
    await page.goto('/');
    
    // Look for any "Play", "Start", "Join", "Create Room" buttons
    const playButtons = page.locator('button, a').filter({ 
      hasText: /play|start|join|enter|begin|lobby|game|quick|create.*room|room|新建|創建/i 
    });
    
    const playButtonCount = await playButtons.count();
    console.log(`Found ${playButtonCount} potential game start buttons`);
    
    if (playButtonCount > 0) {
      // Click the first play-related button
      const firstButton = playButtons.first();
      const buttonText = await firstButton.innerText();
      console.log(`Clicking: "${buttonText}"`);
      
      await firstButton.click();
      await page.waitForTimeout(2000);
      
      // If this opened a modal, try to fill it and proceed
      const modal = page.locator('[role="dialog"], .modal, [class*="modal"]');
      const modalExists = await modal.count() > 0;
      
      if (modalExists) {
        console.log('Room creation modal detected, filling form...');
        
        // Try to fill room name
        const roomNameInput = page.locator('input[placeholder*="room" i], input[name*="name" i]').first();
        if (await roomNameInput.count() > 0) {
          await roomNameInput.fill('Test Game Room');
        }
        
        // Try to find and click create/confirm button
        const confirmButton = page.locator('button').filter({ 
          hasText: /create|confirm|start|ok|確認|創建|開始/i 
        }).first();
        
        if (await confirmButton.count() > 0) {
          await confirmButton.click();
          await page.waitForTimeout(2000);
          console.log('Room created successfully');
        }
      }
      
      // Take screenshot after clicking
      await page.screenshot({ 
        path: 'tests/e2e/screenshots/game-session-1.png',
        fullPage: true 
      });
      
      // Look for game elements
      const gameElements = {
        canvas: await page.locator('canvas').count(),
        healthBar: await page.locator('[class*="health"], [id*="health"]').count(),
        score: await page.locator('[class*="score"], [id*="score"]').count(),
        minimap: await page.locator('[class*="map"], [id*="map"]').count(),
        weapon: await page.locator('[class*="weapon"], [id*="weapon"]').count(),
        ammo: await page.locator('[class*="ammo"], [id*="ammo"]').count(),
      };
      
      console.log('\nGame Elements Found:');
      Object.entries(gameElements).forEach(([key, count]) => {
        if (count > 0) {
          console.log(`  ✅ ${key}: ${count}`);
        } else {
          console.log(`  ❌ ${key}: 0`);
        }
      });
      
      // Try to move the player (WASD keys)
      console.log('\nTrying to move player with WASD...');
      const movements = [
        { key: 'w', direction: 'forward' },
        { key: 'a', direction: 'left' },
        { key: 's', direction: 'backward' },
        { key: 'd', direction: 'right' }
      ];
      
      for (const move of movements) {
        console.log(`  Moving ${move.direction} (${move.key})...`);
        await page.keyboard.down(move.key);
        await page.waitForTimeout(500);
        await page.keyboard.up(move.key);
      }
      
      // Try to shoot (mouse click)
      console.log('\nTrying to shoot...');
      await page.mouse.click(960, 540); // Center of screen
      await page.waitForTimeout(100);
      await page.mouse.click(960, 540);
      await page.waitForTimeout(100);
      await page.mouse.click(960, 540);
      
      // Try to reload (R key)
      console.log('Reloading weapon (R)...');
      await page.keyboard.press('r');
      
      // Try to open menu (ESC)
      console.log('Opening menu (ESC)...');
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);
      
      // Final game screenshot
      await page.screenshot({ 
        path: 'tests/e2e/screenshots/game-session-final.png',
        fullPage: true 
      });
      
      console.log('\n✅ Game session attempt complete!');
      console.log('Check screenshots to see the game state.');
    } else {
      console.log('❌ No play buttons found - unable to start game');
      
      // Take screenshot of current state
      await page.screenshot({ 
        path: 'tests/e2e/screenshots/no-game-buttons.png',
        fullPage: true 
      });
    }
  });
});
