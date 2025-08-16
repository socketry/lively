import { test, expect } from '@playwright/test';

test.describe('Tailwind Performance', () => {
  test('CSS bundle size is optimized', async ({ page }) => {
    const response = await page.goto('http://localhost:3000');
    const resources = await page.evaluate(() => 
      performance.getEntriesByType('resource')
    );
    
    const cssFiles = resources.filter(r => r.name.includes('.css'));
    cssFiles.forEach(css => {
      // Tailwind purged CSS should be under 50kb
      expect(css.transferSize).toBeLessThan(50000);
    });
  });
  
  test('no render blocking', async ({ page }) => {
    const metrics = await page.evaluate(() => {
      const paintMetrics = performance.getEntriesByType('paint');
      return {
        fcp: paintMetrics.find(m => m.name === 'first-contentful-paint')?.startTime,
        lcp: performance.getEntriesByType('largest-contentful-paint')[0]?.startTime
      };
    });
    
    // First Contentful Paint under 1.5s
    expect(metrics.fcp).toBeLessThan(1500);
    
    // Largest Contentful Paint under 2.5s
    if (metrics.lcp) {
      expect(metrics.lcp).toBeLessThan(2500);
    }
  });
});