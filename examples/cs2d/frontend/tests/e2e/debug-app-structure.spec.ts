import { test, expect } from '@playwright/test';

test.describe('Debug App Structure', () => {
  test('should analyze page structure', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(2000);
    
    // Get the full HTML structure
    const html = await page.content();
    console.log('HTML length:', html.length);
    
    // Check for body content
    const bodyHTML = await page.locator('body').innerHTML();
    console.log('Body HTML (first 500 chars):', bodyHTML.substring(0, 500));
    
    // Look for any divs with IDs
    const divsWithIds = await page.locator('div[id]').all();
    console.log('Divs with IDs:', divsWithIds.length);
    for (const div of divsWithIds.slice(0, 5)) {
      const id = await div.getAttribute('id');
      console.log('  - Div ID:', id);
    }
    
    // Look for any elements with data-testid
    const testIdElements = await page.locator('[data-testid]').all();
    console.log('Elements with data-testid:', testIdElements.length);
    for (const el of testIdElements.slice(0, 5)) {
      const testId = await el.getAttribute('data-testid');
      console.log('  - data-testid:', testId);
    }
    
    // Check for canvas (game might be canvas-based)
    const canvas = await page.locator('canvas').count();
    console.log('Canvas elements:', canvas);
    
    // Check for iframes
    const iframes = await page.locator('iframe').count();
    console.log('Iframe elements:', iframes);
    
    // Get all visible text
    const visibleText = await page.locator('body').innerText();
    console.log('Visible text (first 300 chars):', visibleText.substring(0, 300));
    
    // Check for React/Vue root
    const reactRoot = await page.locator('#root, #app, .app-container').count();
    console.log('React/Vue root elements:', reactRoot);
    
    // Take screenshot
    await page.screenshot({ path: 'tests/e2e/screenshots/debug-structure.png', fullPage: true });
  });
  
  test('should check JavaScript console', async ({ page }) => {
    // Listen for console messages
    const consoleMessages: string[] = [];
    page.on('console', msg => {
      consoleMessages.push(`${msg.type()}: ${msg.text()}`);
    });
    
    // Listen for page errors
    const pageErrors: string[] = [];
    page.on('pageerror', error => {
      pageErrors.push(error.message);
    });
    
    await page.goto('/');
    await page.waitForTimeout(3000);
    
    console.log('Console messages:', consoleMessages.slice(0, 10));
    console.log('Page errors:', pageErrors.slice(0, 5));
    
    // Try to get game state from window
    const gameState = await page.evaluate(() => {
      return {
        hasWindow: typeof window !== 'undefined',
        hasGameAPI: !!(window as any).__gameAPI,
        hasGameState: !!(window as any).__gameState,
        windowKeys: Object.keys(window).filter(k => k.startsWith('__')).slice(0, 10)
      };
    });
    console.log('Game state:', gameState);
  });
});