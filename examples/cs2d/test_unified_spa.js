const { chromium } = require('playwright');

(async () => {
  console.log('🔍 Testing Unified SPA');
  
  const browser = await chromium.launch({ 
    headless: false,
    devtools: true
  });
  
  const page = await browser.newPage();
  
  // Capture all console messages
  page.on('console', msg => {
    console.log(`[${msg.type()}] ${msg.text()}`);
  });
  
  page.on('pageerror', error => {
    console.error('[PAGE ERROR]', error.message);
  });
  
  page.on('error', error => {
    console.error('[ERROR]', error.message);
  });
  
  await page.goto('http://localhost:9292');
  console.log('✅ Page loaded');
  
  // Wait for any initialization
  await page.waitForTimeout(3000);
  
  // Check page content
  const bodyText = await page.locator('body').textContent();
  console.log('Page content preview:', bodyText.substring(0, 500));
  
  // Check for specific elements
  const hasLobby = await page.locator('#lobby').count() > 0;
  const hasModal = await page.locator('.modal').count() > 0;
  const hasPlayerIdDisplay = await page.locator('#player-id-display').count() > 0;
  
  console.log('Element check:');
  console.log('  - Lobby:', hasLobby ? '✅' : '❌');
  console.log('  - Modal:', hasModal ? '✅' : '❌');
  console.log('  - Player ID Display:', hasPlayerIdDisplay ? '✅' : '❌');
  
  // Try to close modal if visible
  const modalVisible = await page.locator('.modal').isVisible().catch(() => false);
  if (modalVisible) {
    console.log('Modal is visible, trying to close...');
    const cancelButton = page.locator('button:has-text("Cancel")').first();
    if (await cancelButton.count() > 0) {
      await cancelButton.click();
      console.log('Clicked cancel button');
    }
  }
  
  // Take screenshot
  await page.screenshot({ path: 'unified_spa_test.png', fullPage: true });
  console.log('📸 Screenshot saved: unified_spa_test.png');
  
  // Keep open for inspection
  console.log('\n⏸️ Browser will stay open for 20 seconds...');
  await page.waitForTimeout(20000);
  
  await browser.close();
})();