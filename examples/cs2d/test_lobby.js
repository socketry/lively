const { chromium } = require('playwright');

(async () => {
  console.log('Starting Playwright test...');
  
  // Launch browser
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 500 // Slow down actions for visibility
  });
  
  const page = await browser.newPage();
  
  // Navigate to lobby
  console.log('Navigating to http://localhost:9292...');
  await page.goto('http://localhost:9292');
  
  // Wait for page to load
  await page.waitForLoadState('networkidle');
  console.log('Page loaded!');
  
  // Get player ID
  const playerIdElement = await page.locator('#current-player-id');
  const playerId = await playerIdElement.textContent();
  console.log('Current Player ID:', playerId);
  
  // Test 1: Create a room
  console.log('\n=== TEST 1: Creating a room ===');
  
  // Fill in room creation form
  await page.fill('#room_name', 'Playwright 測試房間');
  await page.selectOption('#max_players', '4');
  await page.selectOption('#map', 'de_dust2');
  
  // Take screenshot before creating
  await page.screenshot({ path: 'before_create_room.png' });
  console.log('Screenshot saved: before_create_room.png');
  
  // Click create room button (use specific selector to avoid tab button)
  await page.click('#create-form button:has-text("創建房間")');
  
  // Wait for alert/notification
  await page.waitForTimeout(2000);
  
  // Take screenshot after creating
  await page.screenshot({ path: 'after_create_room.png' });
  console.log('Screenshot saved: after_create_room.png');
  
  // Switch to join tab to see room list
  await page.click('button:has-text("加入房間")');
  await page.waitForTimeout(1000);
  
  // Take screenshot of room list
  await page.screenshot({ path: 'room_list.png', fullPage: true });
  console.log('Screenshot saved: room_list.png');
  
  // Check if our room appears and if we're identified as creator
  const roomsWithCreatorButton = await page.locator('button:has-text("🎮 開始遊戲（您是房主）")').count();
  console.log(`\nFound ${roomsWithCreatorButton} room(s) where you are the creator`);
  
  // Check for room creator ID display
  const creatorIdElements = await page.locator('span:has-text("房主 ID:")').all();
  for (const element of creatorIdElements) {
    const text = await element.textContent();
    console.log('Room creator info:', text);
    if (text.includes(playerId)) {
      console.log('✅ You are correctly identified as room creator!');
    }
  }
  
  // Test 2: Try to start the game
  if (roomsWithCreatorButton > 0) {
    console.log('\n=== TEST 2: Starting the game ===');
    const startButton = page.locator('button:has-text("🎮 開始遊戲（您是房主）")').first();
    await startButton.click();
    
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'after_start_game.png' });
    console.log('Screenshot saved: after_start_game.png');
  }
  
  // Check console for errors
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.error('Browser console error:', msg.text());
    }
  });
  
  console.log('\n=== Test completed! ===');
  console.log('Check the screenshot files for visual verification.');
  
  // Keep browser open for manual inspection
  console.log('\nBrowser will stay open for 30 seconds for manual inspection...');
  await page.waitForTimeout(30000);
  
  await browser.close();
})().catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
});