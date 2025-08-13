const { chromium } = require('playwright');

(async () => {
  console.log('Starting hidden field test...');
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 500
  });
  
  const page = await browser.newPage();
  
  // Monitor console messages
  page.on('console', msg => {
    console.log('Browser console:', msg.text());
  });
  
  console.log('Navigating to http://localhost:9292...');
  await page.goto('http://localhost:9292');
  await page.waitForLoadState('networkidle');
  
  // Get player ID from page header
  const headerPlayerId = await page.locator('#current-player-id').textContent();
  console.log('\nPlayer ID from header:', headerPlayerId);
  
  // Check the hidden field value
  const hiddenFieldValue = await page.locator('#player_id').inputValue();
  console.log('Hidden field value:', hiddenFieldValue);
  console.log('Hidden field type:', await page.locator('#player_id').getAttribute('type'));
  
  // Fill form
  await page.fill('#room_name', 'Test Room');
  
  // Click create and monitor console
  console.log('\nClicking create button...');
  await page.click('button:has-text("創建房間")');
  
  await page.waitForTimeout(3000);
  
  // Check room list
  await page.click('button:has-text("加入房間")');
  await page.waitForTimeout(1000);
  
  // Check creator ID
  const creatorIdText = await page.locator('span:has-text("房主 ID:")').first().textContent();
  console.log('\nRoom creator ID shown:', creatorIdText);
  
  console.log('\n=== Test completed ===');
  await page.waitForTimeout(5000);
  
  await browser.close();
})().catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
});