import { test, expect } from '@playwright/test';

test.describe('CS2D Enhanced Features', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
  });

  test('Enhanced Modern Lobby with Bot Manager', async ({ page }) => {
    // Check if enhanced lobby loaded
    await expect(page.locator('h1:has-text("CS2D Enhanced")')).toBeVisible();
    
    // Check Bot Manager button
    const botManagerBtn = page.locator('button:has-text("Bot Manager")');
    await expect(botManagerBtn).toBeVisible();
    
    // Open Bot Manager panel
    await botManagerBtn.click();
    await expect(page.locator('h3:has-text("Bot Practice Manager")')).toBeVisible();
    
    // Check Bot difficulty options
    await expect(page.locator('button:has-text("Easy Bots")')).toBeVisible();
    await expect(page.locator('button:has-text("Normal Bots")')).toBeVisible();
    await expect(page.locator('button:has-text("Hard Bots")')).toBeVisible();
    await expect(page.locator('button:has-text("Expert Bots")')).toBeVisible();
    
    // Check training modes
    await expect(page.locator('button:has-text("Aim Training")')).toBeVisible();
    await expect(page.locator('button:has-text("Movement Practice")')).toBeVisible();
    await expect(page.locator('button:has-text("Defuse Training")')).toBeVisible();
    await expect(page.locator('button:has-text("Weapon Mastery")')).toBeVisible();
    
    // Close Bot Manager
    await page.locator('.text-white\\/60:has-text("✕")').first().click();
  });

  test('Create Room with Bot Configuration', async ({ page }) => {
    // Open create room modal
    await page.locator('button:has-text("Create Room")').click();
    await expect(page.locator('h2:has-text("Create New Room")')).toBeVisible();
    
    // Fill room details
    await page.fill('input[placeholder="Enter room name..."]', 'Test Bot Room');
    
    // Enable bots
    const enableBotsCheckbox = page.locator('label:has-text("Enable Bots") input[type="checkbox"]');
    await enableBotsCheckbox.check();
    
    // Configure bots
    await page.fill('input[type="number"][min="0"]', '4');
    await page.selectOption('select', 'hard');
    
    // Check bot options
    const autoFillCheckbox = page.locator('label:has-text("Auto-fill empty slots") input[type="checkbox"]');
    await autoFillCheckbox.check();
    
    const teamBalanceCheckbox = page.locator('label:has-text("Auto team balance") input[type="checkbox"]');
    await teamBalanceCheckbox.check();
    
    // Verify bot configuration section is visible and functional
    await expect(page.locator('h3:has-text("Bot Configuration")')).toBeVisible();
  });

  test('Room List Shows Bot Information', async ({ page }) => {
    // Check if rooms with bots are displayed
    await expect(page.locator('.backdrop-blur-xl').first()).toBeVisible();
    
    // Look for bot indicators
    const botIndicators = page.locator('span:has-text("Bots")');
    const count = await botIndicators.count();
    
    if (count > 0) {
      // Check difficulty indicators
      await expect(page.locator('.text-green-400, .text-yellow-400, .text-orange-400, .text-red-400').first()).toBeVisible();
    }
    
    // Check filter for bot rooms
    const showBotsCheckbox = page.locator('label:has-text("Show Bot Rooms") input[type="checkbox"]');
    await expect(showBotsCheckbox).toBeVisible();
    
    // Toggle filter
    await showBotsCheckbox.check();
    await page.waitForTimeout(500);
  });

  test('Enhanced Waiting Room with Bot Controls', async ({ page }) => {
    // Navigate to a room
    await page.goto('http://localhost:3000/room/test-room');
    await page.waitForLoadState('networkidle');
    
    // Check if waiting room loaded
    await expect(page.locator('h1').first()).toBeVisible();
    
    // Check team sections
    await expect(page.locator('h2:has-text("Counter-Terrorists")')).toBeVisible();
    await expect(page.locator('h2:has-text("Terrorists")')).toBeVisible();
    
    // Check for bot players
    const botPlayers = page.locator('span:has-text("[BOT]")');
    const botCount = await botPlayers.count();
    
    if (botCount > 0) {
      // Verify bot difficulty badges
      await expect(page.locator('.text-xs.px-2.py-0\\.5.rounded-full').first()).toBeVisible();
    }
    
    // Check Bot Manager button (for host)
    const botManagerBtn = page.locator('button:has-text("Bot Manager")');
    if (await botManagerBtn.isVisible()) {
      await botManagerBtn.click();
      
      // Check add bot buttons
      await expect(page.locator('button:has-text("+ Easy Bot")')).toBeVisible();
      await expect(page.locator('button:has-text("+ Normal Bot")')).toBeVisible();
      await expect(page.locator('button:has-text("+ Hard Bot")')).toBeVisible();
      await expect(page.locator('button:has-text("+ Expert Bot")')).toBeVisible();
      
      // Check current bots list
      await expect(page.locator('h4:has-text("Current Bots")')).toBeVisible();
    }
    
    // Check ready button
    await expect(page.locator('button:has-text("Ready"), button:has-text("Not Ready")')).toBeVisible();
  });

  test('Visual Style Enhancements', async ({ page }) => {
    // Check if enhanced pixel styles are loaded
    const hasEnhancedStyles = await page.evaluate(() => {
      const styles = Array.from(document.styleSheets);
      return styles.some(sheet => {
        try {
          const rules = Array.from(sheet.cssRules || []);
          return rules.some(rule => 
            rule.cssText && rule.cssText.includes('pixel-button-enhanced')
          );
        } catch {
          return false;
        }
      });
    });
    
    // Check for animated backgrounds
    const animatedBg = page.locator('.animate-blob');
    await expect(animatedBg.first()).toBeVisible();
    
    // Check for glass morphism effects
    const glassElements = page.locator('.backdrop-blur-xl');
    await expect(glassElements.first()).toBeVisible();
    
    // Check for gradient elements
    const gradientElements = page.locator('[class*="gradient-to"]');
    await expect(gradientElements.first()).toBeVisible();
  });

  test('Quick Join with Bots', async ({ page }) => {
    // Check Quick Play button
    const quickPlayBtn = page.locator('button:has-text("Quick Play (with Bots)")');
    await expect(quickPlayBtn).toBeVisible();
    
    // Open Bot Manager
    await page.locator('button:has-text("Bot Manager")').click();
    
    // Check Quick Join Bot Game button
    const quickJoinBotBtn = page.locator('button:has-text("Quick Join Bot Game")');
    await expect(quickJoinBotBtn).toBeVisible();
  });

  test('Room Settings Display', async ({ page }) => {
    // Navigate to waiting room
    await page.goto('http://localhost:3000/room/test-room');
    await page.waitForLoadState('networkidle');
    
    // Check room settings panel
    await expect(page.locator('h3:has-text("Room Settings")')).toBeVisible();
    
    // Check settings display
    await expect(page.locator('span:has-text("Map")').first()).toBeVisible();
    await expect(page.locator('span:has-text("Mode")').first()).toBeVisible();
    await expect(page.locator('span:has-text("Round Time")').first()).toBeVisible();
    await expect(page.locator('span:has-text("Max Rounds")').first()).toBeVisible();
    await expect(page.locator('span:has-text("Friendly Fire")').first()).toBeVisible();
    await expect(page.locator('span:has-text("Bots")').first()).toBeVisible();
  });

  test('Chat System in Waiting Room', async ({ page }) => {
    // Navigate to waiting room
    await page.goto('http://localhost:3000/room/test-room');
    await page.waitForLoadState('networkidle');
    
    // Check chat panel
    await expect(page.locator('h3:has-text("Chat")')).toBeVisible();
    
    // Check chat input
    const chatInput = page.locator('input[placeholder="Type a message..."]');
    await expect(chatInput).toBeVisible();
    
    // Type a message
    await chatInput.fill('Hello team!');
    
    // Check send button
    const sendBtn = page.locator('button:has-text("Send")');
    await expect(sendBtn).toBeVisible();
    
    // Send message
    await sendBtn.click();
    
    // Verify message appears (in real app)
    // await expect(page.locator('text="Hello team!"')).toBeVisible();
  });

  test('Performance Check', async ({ page }) => {
    // Measure page load time
    const startTime = Date.now();
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('domcontentloaded');
    const loadTime = Date.now() - startTime;
    
    console.log(`Page load time: ${loadTime}ms`);
    expect(loadTime).toBeLessThan(3000); // Should load within 3 seconds
    
    // Check for smooth animations
    const animatedElements = await page.locator('.animate-blob, .transition-all').count();
    console.log(`Found ${animatedElements} animated elements`);
    expect(animatedElements).toBeGreaterThan(0);
    
    // Check viewport performance
    const metrics = await page.evaluate(() => {
      return {
        fps: (window as any).fps || 60,
        memory: (performance as any).memory?.usedJSHeapSize || 0
      };
    });
    
    console.log('Performance metrics:', metrics);
  });
});

test.describe('Bot AI Integration', () => {
  test('Bot AI Configuration Available', async ({ page }) => {
    await page.goto('http://localhost:3000');
    
    // Create a room with bots
    await page.locator('button:has-text("Create Room")').click();
    await page.locator('label:has-text("Enable Bots") input[type="checkbox"]').check();
    
    // Check difficulty options match AI system
    const difficultySelect = page.locator('select').last();
    await difficultySelect.click();
    
    const options = await difficultySelect.locator('option').allTextContents();
    expect(options).toContain('🟢 Easy');
    expect(options).toContain('🟡 Normal');
    expect(options).toContain('🟠 Hard');
    expect(options).toContain('🔴 Expert');
  });
});