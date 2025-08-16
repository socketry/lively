// @ts-check
const { chromium } = require('@playwright/test');

/**
 * Global teardown for Playwright tests
 * This runs once after all tests
 */
async function globalTeardown(config) {
  console.log('🧹 Cleaning up test environment...');
  
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  try {
    // Clean up test data in Redis
    console.log('🗄️ Cleaning up test data in Redis...');
    
    // Try to delete test room
    await page.request.delete('http://localhost:9294/api/rooms/test-room-e2e').catch(() => {
      console.log('⚠️ Could not delete test room via API (may not be implemented yet)');
    });
    
    console.log('✅ Test environment cleanup complete');
    
  } catch (error) {
    console.log('⚠️ Cleanup warning:', error.message);
    // Don't fail on cleanup errors
  } finally {
    await browser.close();
  }
}

module.exports = globalTeardown;