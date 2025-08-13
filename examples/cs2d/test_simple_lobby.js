const { chromium } = require('playwright');

(async () => {
  console.log('🔍 Testing Simple Lobby Load');
  
  const browser = await chromium.launch({ 
    headless: false
  });
  
  const page = await browser.newPage();
  
  // Just check console for first 5 seconds
  let bindCount = 0;
  page.on('console', msg => {
    if (msg.text().includes('bind')) {
      bindCount++;
      if (bindCount === 1 || bindCount % 100 === 0) {
        console.log(`Bind count: ${bindCount}`);
      }
    }
  });
  
  await page.goto('http://localhost:9292');
  console.log('✅ Page loaded');
  
  // Wait and observe
  await page.waitForTimeout(5000);
  
  console.log(`\nTotal bind calls: ${bindCount}`);
  
  // Check if lobby is visible
  const lobbyVisible = await page.locator('#lobby').isVisible().catch(() => false);
  console.log('Lobby visible:', lobbyVisible ? '✅' : '❌');
  
  // Check if modal is visible (it shouldn't be)
  const modalVisible = await page.locator('#player-id-modal').isVisible().catch(() => false);
  console.log('Modal visible:', modalVisible ? '❌ (should be hidden)' : '✅');
  
  // Check the inline style of modal
  const modalStyle = await page.locator('#player-id-modal').getAttribute('style').catch(() => 'not found');
  console.log('Modal style:', modalStyle);
  
  // Try to manually close modal if visible
  if (modalVisible) {
    console.log('Attempting to close modal...');
    await page.evaluate(() => {
      const modal = document.getElementById('player-id-modal');
      if (modal) {
        modal.style.display = 'none';
      }
    });
    
    // Check again
    const stillVisible = await page.locator('#player-id-modal').isVisible().catch(() => false);
    console.log('Modal after close attempt:', stillVisible ? '❌ still visible' : '✅ closed');
  }
  
  // Take screenshot
  await page.screenshot({ path: 'simple_lobby_test.png' });
  console.log('📸 Screenshot saved: simple_lobby_test.png');
  
  await page.waitForTimeout(5000);
  await browser.close();
})();