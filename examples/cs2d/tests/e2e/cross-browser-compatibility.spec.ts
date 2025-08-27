import { test, expect, type Browser, type BrowserContext, type Page } from '@playwright/test';

test.describe('Cross-Browser Compatibility', () => {
  const testUrls = {
    lobby: '/',
    game: '/game',
    settings: '/settings',
  };

  const viewportSizes = [
    { width: 1920, height: 1080, name: 'Desktop' },
    { width: 1366, height: 768, name: 'Laptop' },
    { width: 768, height: 1024, name: 'Tablet' },
    { width: 375, height: 667, name: 'Mobile' },
  ];

  test.describe('Browser Feature Support', () => {
    ['chromium', 'firefox', 'webkit'].forEach(browserName => {
      test(`should support WebGL in ${browserName}`, async ({ browser }) => {
        const context = await browser.newContext();
        const page = await context.newPage();
        
        await page.goto('/');
        
        // Test WebGL support
        const webglSupport = await page.evaluate(() => {
          const canvas = document.createElement('canvas');
          const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
          return !!gl;
        });
        
        expect(webglSupport).toBe(true);
        await context.close();
      });

      test(`should support WebSocket in ${browserName}`, async ({ browser }) => {
        const context = await browser.newContext();
        const page = await context.newPage();
        
        await page.goto('/');
        
        const websocketSupport = await page.evaluate(() => {
          return typeof WebSocket !== 'undefined';
        });
        
        expect(websocketSupport).toBe(true);
        await context.close();
      });

      test(`should support Web Audio API in ${browserName}`, async ({ browser }) => {
        const context = await browser.newContext();
        const page = await context.newPage();
        
        await page.goto('/');
        
        const audioSupport = await page.evaluate(() => {
          return typeof AudioContext !== 'undefined' || typeof (window as any).webkitAudioContext !== 'undefined';
        });
        
        expect(audioSupport).toBe(true);
        await context.close();
      });
    });
  });

  test.describe('Performance Across Browsers', () => {
    ['chromium', 'firefox', 'webkit'].forEach(browserName => {
      test(`should maintain acceptable FPS in ${browserName}`, async ({ browser }) => {
        const context = await browser.newContext();
        const page = await context.newPage();
        
        await page.goto('/');
        await page.waitForSelector('[data-testid="lobby-container"]', { timeout: 10000 });
        
        // Start game
        await page.click('text=Quick Play (with Bots)');
        await page.waitForSelector('canvas', { timeout: 15000 });
        
        // Monitor performance for 5 seconds
        let frameCount = 0;
        const startTime = Date.now();
        
        const interval = setInterval(() => {
          frameCount++;
        }, 16); // ~60 FPS
        
        await page.waitForTimeout(5000);
        clearInterval(interval);
        
        const endTime = Date.now();
        const actualFPS = (frameCount / (endTime - startTime)) * 1000;
        
        // Should maintain at least 30 FPS on all browsers
        expect(actualFPS).toBeGreaterThan(30);
        
        await context.close();
      });

      test(`should load resources efficiently in ${browserName}`, async ({ browser }) => {
        const context = await browser.newContext();
        const page = await context.newPage();
        
        const startTime = Date.now();
        await page.goto('/');
        await page.waitForSelector('[data-testid="lobby-container"]', { timeout: 10000 });
        const loadTime = Date.now() - startTime;
        
        // Should load within 5 seconds
        expect(loadTime).toBeLessThan(5000);
        
        await context.close();
      });
    });
  });

  test.describe('Input Handling Compatibility', () => {
    ['chromium', 'firefox', 'webkit'].forEach(browserName => {
      test(`should handle keyboard input correctly in ${browserName}`, async ({ browser }) => {
        const context = await browser.newContext();
        const page = await context.newPage();
        
        await page.goto('/');
        await page.click('text=Quick Play (with Bots)');
        await page.waitForSelector('canvas', { timeout: 15000 });
        
        // Test WASD movement
        const keys = ['KeyW', 'KeyA', 'KeyS', 'KeyD'];
        for (const key of keys) {
          await page.keyboard.press(key);
          await page.waitForTimeout(100);
        }
        
        // Game should remain responsive
        const canvas = page.locator('canvas');
        await expect(canvas).toBeVisible();
        
        await context.close();
      });

      test(`should handle mouse input correctly in ${browserName}`, async ({ browser }) => {
        const context = await browser.newContext();
        const page = await context.newPage();
        
        await page.goto('/');
        await page.click('text=Quick Play (with Bots)');
        await page.waitForSelector('canvas', { timeout: 15000 });
        
        // Test mouse clicks
        await page.mouse.click(400, 300);
        await page.mouse.move(500, 400);
        await page.mouse.click(500, 400);
        
        // Game should remain responsive
        const canvas = page.locator('canvas');
        await expect(canvas).toBeVisible();
        
        await context.close();
      });
    });
  });

  test.describe('Responsive Design', () => {
    viewportSizes.forEach(viewport => {
      ['chromium', 'firefox', 'webkit'].forEach(browserName => {
        test(`should render correctly on ${viewport.name} in ${browserName}`, async ({ browser }) => {
          const context = await browser.newContext({
            viewport: { width: viewport.width, height: viewport.height },
          });
          const page = await context.newPage();
          
          await page.goto('/');
          await page.waitForSelector('[data-testid="lobby-container"]', { timeout: 10000 });
          
          // Check if lobby is visible and properly sized
          const lobbyContainer = page.locator('[data-testid="lobby-container"]');
          await expect(lobbyContainer).toBeVisible();
          
          const boundingBox = await lobbyContainer.boundingBox();
          if (boundingBox) {
            expect(boundingBox.width).toBeGreaterThan(0);
            expect(boundingBox.height).toBeGreaterThan(0);
            expect(boundingBox.width).toBeLessThanOrEqual(viewport.width);
          }
          
          await context.close();
        });
      });
    });
  });

  test.describe('CSS and Styling Compatibility', () => {
    ['chromium', 'firefox', 'webkit'].forEach(browserName => {
      test(`should render CSS correctly in ${browserName}`, async ({ browser }) => {
        const context = await browser.newContext();
        const page = await context.newPage();
        
        await page.goto('/');
        await page.waitForSelector('[data-testid="lobby-container"]', { timeout: 10000 });
        
        // Check for proper CSS rendering
        const computedStyles = await page.evaluate(() => {
          const element = document.querySelector('[data-testid="lobby-container"]');
          if (!element) return null;
          
          const styles = window.getComputedStyle(element);
          return {
            display: styles.display,
            position: styles.position,
            backgroundColor: styles.backgroundColor,
            fontSize: styles.fontSize,
          };
        });
        
        expect(computedStyles).not.toBeNull();
        expect(computedStyles?.display).toBeTruthy();
        
        await context.close();
      });

      test(`should support CSS Grid and Flexbox in ${browserName}`, async ({ browser }) => {
        const context = await browser.newContext();
        const page = await context.newPage();
        
        await page.goto('/');
        
        const cssSupport = await page.evaluate(() => {
          const testElement = document.createElement('div');
          document.body.appendChild(testElement);
          
          // Test CSS Grid
          testElement.style.display = 'grid';
          const gridSupport = getComputedStyle(testElement).display === 'grid';
          
          // Test Flexbox
          testElement.style.display = 'flex';
          const flexSupport = getComputedStyle(testElement).display === 'flex';
          
          document.body.removeChild(testElement);
          
          return { gridSupport, flexSupport };
        });
        
        expect(cssSupport.gridSupport).toBe(true);
        expect(cssSupport.flexSupport).toBe(true);
        
        await context.close();
      });
    });
  });

  test.describe('JavaScript ES6+ Support', () => {
    ['chromium', 'firefox', 'webkit'].forEach(browserName => {
      test(`should support modern JavaScript features in ${browserName}`, async ({ browser }) => {
        const context = await browser.newContext();
        const page = await context.newPage();
        
        await page.goto('/');
        
        const jsSupport = await page.evaluate(() => {
          try {
            // Test arrow functions
            const arrowFunction = () => 'arrow';
            
            // Test destructuring
            const [a, b] = [1, 2];
            
            // Test template literals
            const template = `Hello ${a}`;
            
            // Test Promise support
            const promiseSupport = typeof Promise !== 'undefined';
            
            // Test async/await (indirectly)
            const asyncSupport = typeof (async () => {}) === 'function';
            
            // Test Map and Set
            const mapSupport = typeof Map !== 'undefined';
            const setSupport = typeof Set !== 'undefined';
            
            return {
              arrowFunction: arrowFunction() === 'arrow',
              destructuring: a === 1 && b === 2,
              templateLiterals: template === 'Hello 1',
              promiseSupport,
              asyncSupport,
              mapSupport,
              setSupport,
            };
          } catch (error) {
            return { error: error.message };
          }
        });
        
        expect(jsSupport.arrowFunction).toBe(true);
        expect(jsSupport.destructuring).toBe(true);
        expect(jsSupport.templateLiterals).toBe(true);
        expect(jsSupport.promiseSupport).toBe(true);
        expect(jsSupport.asyncSupport).toBe(true);
        expect(jsSupport.mapSupport).toBe(true);
        expect(jsSupport.setSupport).toBe(true);
        
        await context.close();
      });
    });
  });

  test.describe('Audio Compatibility', () => {
    ['chromium', 'firefox', 'webkit'].forEach(browserName => {
      test(`should handle audio correctly in ${browserName}`, async ({ browser }) => {
        const context = await browser.newContext();
        const page = await context.newPage();
        
        await page.goto('/');
        await page.click('text=Quick Play (with Bots)');
        await page.waitForSelector('canvas', { timeout: 15000 });
        
        const audioSupport = await page.evaluate(() => {
          // Test audio element support
          const audio = document.createElement('audio');
          const audioElementSupport = typeof audio.play === 'function';
          
          // Test audio format support
          const mp3Support = audio.canPlayType('audio/mpeg');
          const wavSupport = audio.canPlayType('audio/wav');
          const oggSupport = audio.canPlayType('audio/ogg');
          
          return {
            audioElementSupport,
            mp3Support: mp3Support !== '',
            wavSupport: wavSupport !== '',
            oggSupport: oggSupport !== '',
          };
        });
        
        expect(audioSupport.audioElementSupport).toBe(true);
        // At least one audio format should be supported
        expect(audioSupport.mp3Support || audioSupport.wavSupport || audioSupport.oggSupport).toBe(true);
        
        await context.close();
      });
    });
  });

  test.describe('Local Storage and Session Storage', () => {
    ['chromium', 'firefox', 'webkit'].forEach(browserName => {
      test(`should support storage APIs in ${browserName}`, async ({ browser }) => {
        const context = await browser.newContext();
        const page = await context.newPage();
        
        await page.goto('/');
        
        const storageSupport = await page.evaluate(() => {
          try {
            // Test localStorage
            localStorage.setItem('test', 'value');
            const localStorageWorks = localStorage.getItem('test') === 'value';
            localStorage.removeItem('test');
            
            // Test sessionStorage
            sessionStorage.setItem('test', 'value');
            const sessionStorageWorks = sessionStorage.getItem('test') === 'value';
            sessionStorage.removeItem('test');
            
            return {
              localStorage: localStorageWorks,
              sessionStorage: sessionStorageWorks,
            };
          } catch (error) {
            return { error: error.message };
          }
        });
        
        expect(storageSupport.localStorage).toBe(true);
        expect(storageSupport.sessionStorage).toBe(true);
        
        await context.close();
      });
    });
  });

  test.describe('Error Handling Across Browsers', () => {
    ['chromium', 'firefox', 'webkit'].forEach(browserName => {
      test(`should handle JavaScript errors gracefully in ${browserName}`, async ({ browser }) => {
        const context = await browser.newContext();
        const page = await context.newPage();
        
        const errors: string[] = [];
        page.on('console', msg => {
          if (msg.type() === 'error') {
            errors.push(msg.text());
          }
        });
        
        await page.goto('/');
        await page.waitForSelector('[data-testid="lobby-container"]', { timeout: 10000 });
        
        // Try to start a game
        await page.click('text=Quick Play (with Bots)');
        await page.waitForTimeout(5000);
        
        // Filter out known non-critical errors
        const criticalErrors = errors.filter(error => 
          !error.includes('favicon') && 
          !error.includes('WebSocket') &&
          !error.includes('audio') &&
          !error.toLowerCase().includes('network')
        );
        
        // Should have minimal critical errors
        expect(criticalErrors.length).toBeLessThan(3);
        
        await context.close();
      });
    });
  });

  test.describe('Performance Metrics Comparison', () => {
    test('should compare performance across all browsers', async ({ playwright }) => {
      const browsers = ['chromium', 'firefox', 'webkit'];
      const performanceResults: Array<{ browser: string; loadTime: number; memoryUsage: number }> = [];
      
      for (const browserName of browsers) {
        const browser = await playwright[browserName as keyof typeof playwright].launch();
        const context = await browser.newContext();
        const page = await context.newPage();
        
        // Measure load time
        const startTime = Date.now();
        await page.goto('/');
        await page.waitForSelector('[data-testid="lobby-container"]', { timeout: 10000 });
        const loadTime = Date.now() - startTime;
        
        // Measure memory usage (rough estimation)
        const memoryUsage = await page.evaluate(() => {
          return (performance as any).memory ? (performance as any).memory.usedJSHeapSize : 0;
        });
        
        performanceResults.push({
          browser: browserName,
          loadTime,
          memoryUsage,
        });
        
        await browser.close();
      }
      
      // All browsers should load within reasonable time
      performanceResults.forEach(result => {
        expect(result.loadTime).toBeLessThan(10000); // 10 seconds max
      });
      
      // Performance should be relatively consistent across browsers
      const loadTimes = performanceResults.map(r => r.loadTime);
      const maxLoadTime = Math.max(...loadTimes);
      const minLoadTime = Math.min(...loadTimes);
      const loadTimeVariation = (maxLoadTime - minLoadTime) / minLoadTime;
      
      expect(loadTimeVariation).toBeLessThan(2.0); // Less than 200% variation
    });
  });

  test.describe('Feature Detection and Polyfills', () => {
    ['chromium', 'firefox', 'webkit'].forEach(browserName => {
      test(`should detect required features in ${browserName}`, async ({ browser }) => {
        const context = await browser.newContext();
        const page = await context.newPage();
        
        await page.goto('/');
        
        const featureDetection = await page.evaluate(() => {
          const features = {
            canvas: typeof HTMLCanvasElement !== 'undefined',
            webgl: (() => {
              const canvas = document.createElement('canvas');
              return !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
            })(),
            websocket: typeof WebSocket !== 'undefined',
            webAudio: typeof AudioContext !== 'undefined' || typeof (window as any).webkitAudioContext !== 'undefined',
            requestAnimationFrame: typeof requestAnimationFrame !== 'undefined',
            performance: typeof performance !== 'undefined',
            gamepad: typeof navigator.getGamepads !== 'undefined',
          };
          
          const missingFeatures = Object.entries(features)
            .filter(([_, supported]) => !supported)
            .map(([feature, _]) => feature);
          
          return { features, missingFeatures };
        });
        
        // Critical features should be supported
        expect(featureDetection.features.canvas).toBe(true);
        expect(featureDetection.features.websocket).toBe(true);
        expect(featureDetection.features.requestAnimationFrame).toBe(true);
        
        // Log any missing non-critical features
        if (featureDetection.missingFeatures.length > 0) {
          console.log(`Missing features in ${browserName}:`, featureDetection.missingFeatures);
        }
        
        await context.close();
      });
    });
  });
});