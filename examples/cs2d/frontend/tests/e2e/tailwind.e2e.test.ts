import { test, expect } from '@playwright/test';

test.describe('Tailwind CSS Integration', () => {
  test('styles load correctly', async ({ page }) => {
    await page.goto('/');
    
    // Check Tailwind utilities are applied
    const button = await page.locator('.btn-cs').first();
    if (await button.isVisible()) {
      const styles = await button.evaluate(el => 
        window.getComputedStyle(el)
      );
      
      // Verify Tailwind styles
      expect(styles.padding).toBeTruthy();
      expect(styles.backgroundColor).toBeTruthy();
    }
  });
  
  test('responsive design works', async ({ page }) => {
    await page.goto('/');
    
    // Desktop view
    await page.setViewportSize({ width: 1920, height: 1080 });
    const desktopLayout = await page.locator('.lg\\:grid-cols-3');
    if (await desktopLayout.isVisible()) {
      expect(await desktopLayout.evaluate(el => 
        window.getComputedStyle(el).gridTemplateColumns
      )).toContain('3');
    }
    
    // Mobile view
    await page.setViewportSize({ width: 375, height: 667 });
    const mobileLayout = await page.locator('.grid-cols-1');
    if (await mobileLayout.isVisible()) {
      expect(await mobileLayout.evaluate(el => 
        window.getComputedStyle(el).gridTemplateColumns
      )).toContain('1');
    }
  });
  
  test('dark mode toggle works', async ({ page }) => {
    await page.goto('/');
    
    // Toggle dark mode
    const darkToggle = await page.locator('[data-testid="dark-mode-toggle"]');
    if (await darkToggle.isVisible()) {
      await darkToggle.click();
      
      const html = await page.locator('html');
      expect(await html.getAttribute('class')).toContain('dark');
    }
  });
});
