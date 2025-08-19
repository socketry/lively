import { test, expect } from '@playwright/test';

test('debug page content', async ({ page }) => {
  await page.goto('http://localhost:5174/');
  await page.waitForLoadState('networkidle');
  
  // Take screenshot
  await page.screenshot({ path: 'test-results/homepage.png' });
  
  // Get page HTML
  const html = await page.content();
  console.log('Page HTML (first 1000 chars):');
  console.log(html.substring(0, 1000));
  
  // Check for any visible text
  const bodyText = await page.locator('body').textContent();
  console.log('Body text:', bodyText);
  
  // Check console errors
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('Console error:', msg.text());
    }
  });
  
  await page.waitForTimeout(2000);
});