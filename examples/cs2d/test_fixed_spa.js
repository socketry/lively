const { chromium } = require('playwright');

(async () => {
  console.log('🔍 Testing Fixed Unified SPA');
  console.log('=' .repeat(60));
  
  const browser = await chromium.launch({ 
    headless: false
  });
  
  const page = await browser.newPage();
  
  // Track bind calls
  let bindCount = 0;
  let lastBindTime = Date.now();
  
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('bind')) {
      bindCount++;
      const now = Date.now();
      const timeSinceLastBind = now - lastBindTime;
      
      if (bindCount <= 5 || bindCount % 10 === 0) {
        console.log(`[${bindCount}] Bind call (${timeSinceLastBind}ms since last)`);
      }
      lastBindTime = now;
    }
    
    if (text.includes('ERROR') || text.includes('error')) {
      console.error(`[ERROR] ${text}`);
    }
  });
  
  console.log('\n📍 Loading page...');
  await page.goto('http://localhost:9292');
  await page.waitForLoadState('networkidle');
  console.log('✅ Page loaded');
  
  // Wait for initialization
  await page.waitForTimeout(2000);
  
  // Check elements
  console.log('\n📋 Element Check:');
  
  const lobbyVisible = await page.locator('#lobby').isVisible().catch(() => false);
  console.log('  - Lobby visible:', lobbyVisible ? '✅' : '❌');
  
  const modalVisible = await page.locator('#player-id-modal').isVisible().catch(() => false);
  console.log('  - Modal visible:', modalVisible ? '❌ (should be hidden)' : '✅ (correctly hidden)');
  
  const playerIdDisplay = await page.locator('#player-id-display').textContent().catch(() => 'not found');
  console.log('  - Player ID:', playerIdDisplay);
  
  // Check bind count after 5 seconds
  console.log('\n⏱️ Monitoring for 5 seconds...');
  await page.waitForTimeout(5000);
  
  console.log(`\n📊 Results:`);
  console.log(`  - Total bind calls: ${bindCount}`);
  console.log(`  - Status: ${bindCount < 10 ? '✅ Fixed (minimal binds)' : '❌ Still looping'}`);
  
  // Test modal open/close
  console.log('\n🔧 Testing modal functionality...');
  
  // Click edit button
  const editButton = page.locator('button:has-text("Edit")').first();
  if (await editButton.count() > 0) {
    await editButton.click();
    console.log('  - Clicked Edit button');
    
    await page.waitForTimeout(500);
    const modalAfterClick = await page.locator('#player-id-modal').isVisible().catch(() => false);
    console.log(`  - Modal after click: ${modalAfterClick ? '✅ Visible' : '❌ Not visible'}`);
    
    // Close modal
    if (modalAfterClick) {
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);
      const modalAfterEsc = await page.locator('#player-id-modal').isVisible().catch(() => false);
      console.log(`  - Modal after ESC: ${modalAfterEsc ? '❌ Still visible' : '✅ Closed'}`);
    }
  }
  
  // Take screenshot
  await page.screenshot({ path: 'fixed_spa_test.png' });
  console.log('\n📸 Screenshot saved: fixed_spa_test.png');
  
  // Final summary
  console.log('\n' + '=' .repeat(60));
  if (bindCount < 10 && lobbyVisible && !modalVisible) {
    console.log('✅ UNIFIED SPA IS FIXED! All issues resolved.');
  } else {
    console.log('⚠️ Some issues may remain:');
    if (bindCount >= 10) console.log('  - Excessive bind calls');
    if (!lobbyVisible) console.log('  - Lobby not visible');
    if (modalVisible) console.log('  - Modal incorrectly visible');
  }
  
  await page.waitForTimeout(10000);
  await browser.close();
})();