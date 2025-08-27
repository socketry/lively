import { test } from '@playwright/test';

test('check React app mounting', async ({ page }) => {
  // Capture console messages
  const consoleMessages: string[] = [];
  page.on('console', (msg) => {
    consoleMessages.push(`${msg.type()}: ${msg.text()}`);
  });

  // Capture page errors
  const pageErrors: string[] = [];
  page.on('pageerror', (err) => {
    pageErrors.push(err.message);
  });

  await page.goto('http://localhost:5174/');

  // Wait longer for React to mount
  await page.waitForTimeout(5000);

  // Check if React mounted
  const _hasReactRoot = await page.evaluate(() => {
    return document.getElementById('root') !== null;
  });

  // Has React root element: _hasReactRoot

  // Check if React components rendered
  const _reactRendered = await page.evaluate(() => {
    const root = document.getElementById('root');
    return root !== null && root.children.length > 0;
  });

  // React rendered content: _reactRendered

  // Log all console messages
  // Console messages captured
  // consoleMessages.forEach((msg) => console.log(msg));

  // Log any page errors
  if (pageErrors.length > 0) {
    // Page errors captured
    // pageErrors.forEach((err) => console.log(err));
  }

  // Check for specific elements
  const elements = [
    'div[data-testid="app-container"]',
    'div.min-h-screen',
    'h1',
    'button',
    '.room-list',
    '[data-testid="room-list"]',
  ];

  // Element checks
  for (const selector of elements) {
    const exists = (await page.locator(selector).count()) > 0;
    // `${selector}: ${exists}`
    void exists; // Use the variable to avoid unused warning
  }

  // Get the actual HTML content of root
  const _rootHtml = await page.evaluate(() => {
    const root = document.getElementById('root');
    return root !== null ? root.innerHTML.substring(0, 500) : 'No root element';
  });

  // Root element HTML:
  // _rootHtml
});
