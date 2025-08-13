const { chromium } = require('playwright');

(async () => {
  console.log('Starting FINAL TEST for room creator identification...\n');
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 500
  });
  
  const page = await browser.newPage();
  
  // Monitor console
  page.on('console', msg => {
    if (msg.text().includes('room') || msg.text().includes('player_id')) {
      console.log(`[Console] ${msg.text()}`);
    }
  });
  
  console.log('=== Step 1: Navigate to lobby ===');
  await page.goto('http://localhost:9292');
  await page.waitForLoadState('networkidle');
  
  // Get player ID
  const playerId = await page.locator('#current-player-id').textContent();
  console.log('Player ID:', playerId);
  
  console.log('\n=== Step 2: Create a room ===');
  await page.fill('#room_name', 'Final Test Room');
  await page.selectOption('#max_players', '6');
  await page.selectOption('#map', 'de_inferno');
  
  // Click the correct create button
  await page.click('#create-form button:has-text("創建房間")');
  
  // Wait for redirect to room page
  await page.waitForTimeout(2000);
  
  // Check if we're on the room page
  const currentUrl = page.url();
  console.log('Current URL after create:', currentUrl);
  
  if (currentUrl.includes('/room?')) {
    console.log('✅ Successfully redirected to room page');
    
    // Go back to lobby
    console.log('\n=== Step 3: Navigate back to lobby ===');
    await page.goto('http://localhost:9292');
    await page.waitForLoadState('networkidle');
    
    // Switch to join tab
    await page.click('button:has-text("加入房間")');
    await page.waitForTimeout(1000);
    
    // Check room list
    console.log('\n=== Step 4: Check room list ===');
    const rooms = await page.locator('div[style*="border: 1px solid #ccc"]').count();
    console.log('Number of rooms found:', rooms);
    
    if (rooms > 0) {
      // Look for our room
      const roomTexts = await page.locator('div[style*="border: 1px solid #ccc"]').allTextContents();
      const ourRoom = roomTexts.find(text => text.includes('Final Test Room'));
      
      if (ourRoom) {
        console.log('✅ Found our room in the list');
        
        // Check creator ID
        const creatorIdMatch = ourRoom.match(/房主 ID: ([^\s]+)/);
        if (creatorIdMatch) {
          const creatorId = creatorIdMatch[1];
          console.log('Room creator ID:', creatorId);
          
          if (creatorId === playerId) {
            console.log('✅✅✅ SUCCESS! Player is correctly identified as room creator!');
          } else {
            console.log('❌ FAILURE! Creator ID mismatch');
            console.log('  Expected:', playerId);
            console.log('  Got:', creatorId);
          }
        }
        
        // Check for start button
        const startButtons = await page.locator('button:has-text("🎮 開始遊戲（您是房主）")').count();
        if (startButtons > 0) {
          console.log('✅ "Start Game (You are creator)" button is visible');
        } else {
          console.log('❌ No creator-specific start button found');
        }
      }
    }
  }
  
  console.log('\n=== Test completed! ===');
  await page.screenshot({ path: 'final_test_result.png', fullPage: true });
  console.log('Screenshot saved: final_test_result.png');
  
  await page.waitForTimeout(10000);
  await browser.close();
})().catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
});