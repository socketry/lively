import { test, expect } from '@playwright/test';

test('check React app mounting', async ({ page }) => {
  // Capture console messages
  const consoleMessages: string[] = [];
  page.on('console', msg => {
    consoleMessages.push(`${msg.type()}: ${msg.text()}`);
  });
  
  // Capture page errors
  const pageErrors: string[] = [];
  page.on('pageerror', err => {
    pageErrors.push(err.message);
  });
  
  await page.goto('http://localhost:5174/');
  
  // Wait longer for React to mount
  await page.waitForTimeout(5000);
  
  // Check if React mounted
  const hasReactRoot = await page.evaluate(() => {
    return document.getElementById('root') !== null;
  });
  
  console.log('Has React root element:', hasReactRoot);
  
  // Check if React components rendered
  const reactRendered = await page.evaluate(() => {
    const root = document.getElementById('root');
    return root ? root.children.length > 0 : false;
  });
  
  console.log('React rendered content:', reactRendered);
  
  // Log all console messages
  console.log('\nConsole messages:');
  consoleMessages.forEach(msg => console.log(msg));
  
  // Log any page errors
  if (pageErrors.length > 0) {
    console.log('\nPage errors:');
    pageErrors.forEach(err => console.log(err));
  }
  
  // Check for specific elements
  const elements = [
    'div[data-testid="app-container"]',
    'div.min-h-screen',
    'h1',
    'button',
    '.room-list',
    '[data-testid="room-list"]'
  ];
  
  console.log('\nElement checks:');
  for (const selector of elements) {
    const exists = await page.locator(selector).count() > 0;
    console.log(`  ${selector}: ${exists}`);
  }
  
  // Get the actual HTML content of root
  const rootHtml = await page.evaluate(() => {
    const root = document.getElementById('root');
    return root ? root.innerHTML.substring(0, 500) : 'No root element';
  });
  
  console.log('\nRoot element HTML:');
  console.log(rootHtml);
});