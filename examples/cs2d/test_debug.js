const { chromium } = require('playwright');

(async () => {
  console.log('Starting debug test...');
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 500
  });
  
  const page = await browser.newPage();
  
  // Capture ALL console messages
  page.on('console', msg => {
    console.log(`[${msg.type()}] ${msg.text()}`);
  });
  
  console.log('\n=== Navigating to lobby ===');
  await page.goto('http://localhost:9292');
  await page.waitForLoadState('networkidle');
  
  // Get player ID from page header
  const headerPlayerId = await page.locator('#current-player-id').textContent();
  console.log('\n=== Player ID from header:', headerPlayerId);
  
  // Check the hidden field value
  const hiddenFieldValue = await page.locator('#player_id').inputValue();
  console.log('=== Hidden field value:', hiddenFieldValue);
  
  // Fill form
  await page.fill('#room_name', 'Debug Test Room');
  await page.selectOption('#max_players', '4');
  await page.selectOption('#map', 'de_dust2');
  
  // Click create and wait
  console.log('\n=== Clicking create button ===');
  await page.click('#create-form button:has-text("創建房間")');
  
  // Wait a bit for server processing
  await page.waitForTimeout(3000);
  
  // Take screenshot
  await page.screenshot({ path: 'debug_after_create.png' });
  
  // Check room list
  await page.click('button:has-text("加入房間")');
  await page.waitForTimeout(2000);
  
  // Check if room was created
  const rooms = await page.locator('div[style*="border: 1px solid #ccc"]').count();
  console.log('\n=== Number of rooms found:', rooms);
  
  if (rooms > 0) {
    const creatorIdText = await page.locator('span:has-text("房主 ID:")').first().textContent();
    console.log('=== Room creator ID shown:', creatorIdText);
  }
  
  console.log('\n=== Test completed ===');
  await page.waitForTimeout(5000);
  
  await browser.close();
})().catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
});