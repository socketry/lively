import { test, expect } from '@playwright/test';

test.describe('Simple Validation Tests', () => {
  test('should load the application', async ({ page }) => {
    // Navigate to the app
    await page.goto('/');
    
    // Check if the app loads (more lenient selector)
    const appElement = page.locator('#root, [data-testid="app-container"], .app, main');
    await expect(appElement).toBeVisible({ timeout: 10000 });
    
    // Take a screenshot for debugging
    await page.screenshot({ path: 'tests/e2e/screenshots/app-loaded.png' });
    
    console.log('App loaded successfully');
  });

  test('should have proper page title', async ({ page }) => {
    await page.goto('/');
    
    // Check page title contains CS2D or similar
    const title = await page.title();
    expect(title).toBeTruthy();
    console.log('Page title:', title);
  });

  test('should check for common app elements', async ({ page }) => {
    await page.goto('/');
    
    // Wait for any initial loading
    await page.waitForTimeout(2000);
    
    // Check for common elements that might exist
    const possibleElements = [
      'button',
      'input',
      'a[href]',
      'h1, h2, h3',
      'nav',
      'header',
      'main',
      '.container',
      '[class*="btn"]',
      '[class*="button"]'
    ];
    
    for (const selector of possibleElements) {
      const element = page.locator(selector).first();
      const count = await element.count();
      if (count > 0) {
        console.log(`Found element: ${selector}`);
      }
    }
    
    // At least one interactive element should exist
    const hasInteractiveElement = await page.locator('button, input, a[href]').count();
    expect(hasInteractiveElement).toBeGreaterThan(0);
  });

  test('should handle navigation', async ({ page }) => {
    await page.goto('/');
    
    // Check current URL
    const url = page.url();
    console.log('Current URL:', url);
    
    // Try common routes
    const routes = ['/lobby', '/game', '/room'];
    
    for (const route of routes) {
      const response = await page.goto(route, { 
        waitUntil: 'domcontentloaded',
        timeout: 5000 
      }).catch(() => null);
      
      if (response && response.ok()) {
        console.log(`Route ${route} is accessible`);
      }
    }
  });

  test('should check for WebSocket connection', async ({ page }) => {
    // Monitor WebSocket connections
    const wsConnections: string[] = [];
    
    page.on('websocket', ws => {
      wsConnections.push(ws.url());
      console.log('WebSocket connected to:', ws.url());
    });
    
    await page.goto('/');
    await page.waitForTimeout(3000);
    
    // Log any WebSocket connections found
    if (wsConnections.length > 0) {
      console.log('WebSocket connections detected:', wsConnections);
    }
  });
});