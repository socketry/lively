// @ts-check
const { chromium } = require('@playwright/test');

/**
 * Global setup for Playwright tests
 * This runs once before all tests
 */
async function globalSetup(config) {
  console.log('🚀 Starting CS2D test environment setup...');
  
  // Wait for services to be ready
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  try {
    // Check lobby service
    console.log('⏳ Waiting for lobby service (port 9292)...');
    await page.goto('http://localhost:9292', { timeout: 60000 });
    await page.waitForLoadState('networkidle', { timeout: 30000 });
    console.log('✅ Lobby service ready');
    
    // Check static server
    console.log('⏳ Waiting for static server (port 9293)...');
    await page.goto('http://localhost:9293/game.html', { timeout: 30000 });
    await page.waitForLoadState('networkidle', { timeout: 30000 });
    console.log('✅ Static server ready');
    
    // Check API bridge
    console.log('⏳ Waiting for API bridge (port 9294)...');
    const response = await page.goto('http://localhost:9294/api/maps', { timeout: 30000 });
    if (response.status() === 200) {
      console.log('✅ API bridge ready');
    } else {
      console.log(`⚠️ API bridge responded with status ${response.status()}`);
    }
    
    // Setup test data in Redis
    console.log('🗄️ Setting up test data in Redis...');
    
    // Create test room
    const testRoomData = {
      id: 'test-room-e2e',
      name: 'E2E Test Room',
      created_at: Date.now() / 1000,
      max_players: 10,
      player_count: 0,
      status: 'waiting',
      game_mode: 'classic',
      map_name: 'de_dust2_simple'
    };
    
    // Post test room data
    await page.request.post('http://localhost:9294/api/rooms', {
      data: testRoomData,
      headers: { 'Content-Type': 'application/json' }
    }).catch(() => {
      console.log('⚠️ Could not create test room via API (may not be implemented yet)');
    });
    
    console.log('✅ Test environment setup complete');
    
  } catch (error) {
    console.error('❌ Test environment setup failed:', error.message);
    throw error;
  } finally {
    await browser.close();
  }
}

module.exports = globalSetup;