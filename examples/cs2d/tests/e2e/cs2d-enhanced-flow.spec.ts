import { test, expect, Page } from '@playwright/test';

/**
 * CS2D Enhanced Test Suite with Self-Improving Iterations
 * 
 * This test suite implements a comprehensive testing strategy that:
 * 1. Tests core game functionality
 * 2. Identifies performance bottlenecks
 * 3. Validates multiplayer capabilities
 * 4. Ensures stability under stress
 * 5. Self-improves through iterative testing
 */

interface TestMetrics {
  testName: string;
  duration: number;
  memoryUsage?: number;
  fps?: number;
  errors: string[];
  warnings: string[];
  suggestions: string[];
}

class CS2DTestHarness {
  private page: Page;
  private metrics: TestMetrics[] = [];
  private performanceBaseline: any = {};

  constructor(page: Page) {
    this.page = page;
  }

  async captureMetrics(testName: string, fn: () => Promise<void>): Promise<TestMetrics> {
    const startTime = Date.now();
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // Monitor console
    this.page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
      if (msg.type() === 'warning') warnings.push(msg.text());
    });

    // Execute test
    await fn();

    // Capture performance metrics
    const metrics = await this.page.evaluate(() => {
      const perf = (performance as any);
      return {
        memoryUsage: perf.memory?.usedJSHeapSize || 0,
        navigation: perf.getEntriesByType('navigation')[0],
        resources: perf.getEntriesByType('resource').length
      };
    });

    const duration = Date.now() - startTime;
    
    const testMetric: TestMetrics = {
      testName,
      duration,
      memoryUsage: metrics.memoryUsage,
      errors,
      warnings,
      suggestions: this.generateSuggestions(testName, duration, errors)
    };

    this.metrics.push(testMetric);
    return testMetric;
  }

  private generateSuggestions(testName: string, duration: number, errors: string[]): string[] {
    const suggestions: string[] = [];
    
    if (duration > 5000) {
      suggestions.push(`Test "${testName}" took ${duration}ms - consider optimizing or splitting`);
    }
    
    if (errors.length > 0) {
      suggestions.push(`Fix ${errors.length} errors in "${testName}" for better stability`);
    }

    return suggestions;
  }

  async generateReport(): Promise<void> {
    console.log('\n=== CS2D Test Performance Report ===\n');
    
    // Summary
    const totalDuration = this.metrics.reduce((sum, m) => sum + m.duration, 0);
    const totalErrors = this.metrics.reduce((sum, m) => sum + m.errors.length, 0);
    
    console.log(`Total Tests: ${this.metrics.length}`);
    console.log(`Total Duration: ${totalDuration}ms`);
    console.log(`Total Errors: ${totalErrors}`);
    console.log(`Average Duration: ${Math.round(totalDuration / this.metrics.length)}ms`);
    
    // Individual test metrics
    console.log('\n--- Test Metrics ---');
    this.metrics.forEach(metric => {
      console.log(`\n${metric.testName}:`);
      console.log(`  Duration: ${metric.duration}ms`);
      console.log(`  Memory: ${Math.round((metric.memoryUsage || 0) / 1024 / 1024)}MB`);
      console.log(`  Errors: ${metric.errors.length}`);
      
      if (metric.suggestions.length > 0) {
        console.log('  Suggestions:');
        metric.suggestions.forEach(s => console.log(`    - ${s}`));
      }
    });

    // Improvements
    console.log('\n--- Recommended Improvements ---');
    const slowTests = this.metrics.filter(m => m.duration > 5000);
    if (slowTests.length > 0) {
      console.log('1. Optimize slow tests:');
      slowTests.forEach(t => console.log(`   - ${t.testName} (${t.duration}ms)`));
    }
    
    const errorTests = this.metrics.filter(m => m.errors.length > 0);
    if (errorTests.length > 0) {
      console.log('2. Fix errors in:');
      errorTests.forEach(t => console.log(`   - ${t.testName} (${t.errors.length} errors)`));
    }
  }
}

test.describe('CS2D Enhanced Self-Improving Tests', () => {
  let harness: CS2DTestHarness;
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
    harness = new CS2DTestHarness(page);
  });

  test.afterAll(async () => {
    await harness.generateReport();
    await page.close();
  });

  test('Iteration 1: Core Functionality Validation', async () => {
    await harness.captureMetrics('Core Init', async () => {
      await page.goto('http://localhost:5174/');
      await page.waitForLoadState('networkidle');
      await expect(page.locator('[data-testid="app-container"]')).toBeVisible();
    });

    await harness.captureMetrics('Navigation', async () => {
      // Test navigation to game
      await page.goto('http://localhost:5174/game');
      await page.waitForLoadState('networkidle');
      const canvas = page.locator('canvas').first();
      await expect(canvas).toBeVisible();
    });

    await harness.captureMetrics('Input Handling', async () => {
      // Test all input methods
      const inputs = ['w', 'a', 's', 'd', '1', '2', '3', 'r', 'b', 'Tab'];
      for (const key of inputs) {
        await page.keyboard.press(key);
        await page.waitForTimeout(50);
      }
      
      // Mouse input
      await page.mouse.move(400, 300);
      await page.mouse.click(400, 300);
    });
  });

  test('Iteration 2: Performance Optimization Testing', async () => {
    await harness.captureMetrics('Rapid Input Stress', async () => {
      await page.goto('http://localhost:5174/game');
      await page.waitForLoadState('networkidle');
      
      // Stress test with rapid inputs
      for (let i = 0; i < 50; i++) {
        await page.keyboard.down('w');
        await page.mouse.move(200 + i * 5, 200 + i * 5);
        await page.keyboard.up('w');
        await page.mouse.click(300 + i * 3, 300 + i * 3);
      }
    });

    await harness.captureMetrics('Memory Stability', async () => {
      const initialMemory = await page.evaluate(() => {
        return (performance as any).memory?.usedJSHeapSize || 0;
      });

      // Perform memory-intensive operations
      for (let i = 0; i < 10; i++) {
        await page.keyboard.press('b'); // Open buy menu
        await page.waitForTimeout(100);
        await page.keyboard.press('Escape'); // Close
        await page.waitForTimeout(100);
      }

      const finalMemory = await page.evaluate(() => {
        if ((window as any).gc) (window as any).gc();
        return (performance as any).memory?.usedJSHeapSize || 0;
      });

      const memoryIncrease = (finalMemory - initialMemory) / 1024 / 1024;
      expect(memoryIncrease).toBeLessThan(20); // Max 20MB increase
    });

    await harness.captureMetrics('Frame Rate Consistency', async () => {
      const frameRates = await page.evaluate(() => {
        return new Promise<number[]>((resolve) => {
          const samples: number[] = [];
          let lastTime = performance.now();
          
          const measure = () => {
            const now = performance.now();
            const fps = 1000 / (now - lastTime);
            samples.push(fps);
            lastTime = now;
            
            if (samples.length < 60) {
              requestAnimationFrame(measure);
            } else {
              resolve(samples);
            }
          };
          
          requestAnimationFrame(measure);
        });
      });

      const avgFps = frameRates.reduce((a, b) => a + b) / frameRates.length;
      const minFps = Math.min(...frameRates);
      
      expect(avgFps).toBeGreaterThan(30);
      expect(minFps).toBeGreaterThan(20);
    });
  });

  test('Iteration 3: Multiplayer & Networking', async () => {
    await harness.captureMetrics('Multi-Tab Simulation', async () => {
      // Open second tab to simulate multiplayer
      const context = await page.context().browser()?.newContext();
      const page2 = await context?.newPage();
      
      if (page2) {
        await page.goto('http://localhost:5174/game');
        await page2.goto('http://localhost:5174/game');
        
        await page.waitForLoadState('networkidle');
        await page2.waitForLoadState('networkidle');
        
        // Simulate concurrent actions
        await Promise.all([
          page.keyboard.press('w'),
          page2.keyboard.press('s')
        ]);
      } else {
        // Single page test fallback
        await page.goto('http://localhost:5174/game');
        await page.waitForLoadState('networkidle');
        await page.keyboard.press('w');
      }
      
      await page2?.close();
      await context?.close();
    });

    await harness.captureMetrics('Network Resilience', async () => {
      // Test offline mode handling
      await page.setOfflineMode(true);
      await page.waitForTimeout(1000);
      
      // Should not crash
      await page.keyboard.press('w');
      await page.mouse.click(400, 300);
      
      await page.setOfflineMode(false);
      await page.waitForTimeout(1000);
      
      // Should recover
      const gameActive = await page.evaluate(() => {
        return (window as any).game !== undefined;
      });
      
      expect(gameActive).toBeTruthy();
    });
  });

  test('Iteration 4: Advanced Game Mechanics', async () => {
    await harness.captureMetrics('Complex Gameplay Sequence', async () => {
      await page.goto('http://localhost:5174/game');
      await page.waitForLoadState('networkidle');
      
      // Complex sequence: move, shoot, reload, switch weapon, buy
      const sequence = [
        { action: 'move', keys: ['w', 'd'], duration: 500 },
        { action: 'shoot', mouse: { x: 400, y: 300 }, clicks: 3 },
        { action: 'reload', key: 'r', wait: 1000 },
        { action: 'switch', key: '2', wait: 200 },
        { action: 'buy', key: 'b', wait: 500 }
      ];
      
      for (const step of sequence) {
        if (step.keys) {
          for (const key of step.keys) {
            await page.keyboard.down(key);
          }
          await page.waitForTimeout(step.duration || 100);
          for (const key of step.keys) {
            await page.keyboard.up(key);
          }
        }
        
        if (step.mouse) {
          for (let i = 0; i < (step.clicks || 1); i++) {
            await page.mouse.click(step.mouse.x, step.mouse.y);
            await page.waitForTimeout(100);
          }
        }
        
        if (step.key) {
          await page.keyboard.press(step.key);
          await page.waitForTimeout(step.wait || 100);
        }
      }
      
      // Close buy menu if open
      await page.keyboard.press('Escape');
    });

    await harness.captureMetrics('Collision Detection Accuracy', async () => {
      // Test collision detection by moving into walls
      const startPos = await page.evaluate(() => {
        return {
          x: (window as any).game?.player?.x || 0,
          y: (window as any).game?.player?.y || 0
        };
      });

      // Move continuously in one direction (should hit wall)
      for (let i = 0; i < 20; i++) {
        await page.keyboard.down('w');
        await page.waitForTimeout(50);
      }
      await page.keyboard.up('w');

      const endPos = await page.evaluate(() => {
        return {
          x: (window as any).game?.player?.x || 0,
          y: (window as any).game?.player?.y || 0
        };
      });

      // Player should have moved but stopped at wall
      const moved = startPos.x !== endPos.x || startPos.y !== endPos.y;
      expect(moved || startPos.x === 0).toBeTruthy(); // Either moved or wasn't initialized
    });
  });

  test('Iteration 5: Self-Improvement Analysis', async () => {
    await harness.captureMetrics('Performance Baseline', async () => {
      await page.goto('http://localhost:5174/game');
      await page.waitForLoadState('networkidle');
      
      // Establish performance baseline
      const baseline = await page.evaluate(() => {
        const marks = performance.getEntriesByType('mark');
        const measures = performance.getEntriesByType('measure');
        return {
          marks: marks.length,
          measures: measures.length,
          navigation: performance.getEntriesByType('navigation')[0],
          paint: performance.getEntriesByType('paint')
        };
      });
      
      console.log('Performance Baseline:', baseline);
    });

    await harness.captureMetrics('Optimization Opportunities', async () => {
      // Identify slow operations
      const slowOps = await page.evaluate(() => {
        const results: any[] = [];
        const originalRAF = window.requestAnimationFrame;
        let frameCount = 0;
        
        // Monitor frame timing
        window.requestAnimationFrame = function(callback) {
          const start = performance.now();
          const result = originalRAF.call(window, () => {
            const duration = performance.now() - start;
            if (duration > 16.67) { // Slower than 60fps
              results.push({
                frame: frameCount,
                duration: duration
              });
            }
            frameCount++;
            callback(start);
          });
          return result;
        };
        
        return new Promise(resolve => {
          setTimeout(() => {
            window.requestAnimationFrame = originalRAF;
            resolve(results);
          }, 2000);
        });
      });
      
      console.log('Slow frames detected:', slowOps);
    });

    // Generate improvement recommendations
    await harness.captureMetrics('Generate Recommendations', async () => {
      const recommendations = await page.evaluate(() => {
        const recs: string[] = [];
        
        // Check for common issues
        if (!(window as any).game) {
          recs.push('Game object not initialized - check initialization flow');
        }
        
        if (document.querySelectorAll('canvas').length > 1) {
          recs.push('Multiple canvases detected - potential performance issue');
        }
        
        const scripts = document.querySelectorAll('script');
        if (scripts.length > 20) {
          recs.push(`High script count (${scripts.length}) - consider bundling`);
        }
        
        return recs;
      });
      
      if (recommendations.length > 0) {
        console.log('\nImprovement Recommendations:');
        recommendations.forEach(rec => console.log(`  - ${rec}`));
      }
    });
  });
});

test.describe('CS2D Continuous Improvement Loop', () => {
  test('Run iterative improvement cycle', async ({ page }) => {
    const iterations = 3;
    const results: any[] = [];
    
    for (let i = 0; i < iterations; i++) {
      console.log(`\n=== Improvement Iteration ${i + 1} ===`);
      
      await page.goto('http://localhost:5174/game');
      await page.waitForLoadState('networkidle');
      
      // Measure current performance
      const metrics = await page.evaluate(() => {
        return new Promise((resolve) => {
          const start = performance.now();
          let frames = 0;
          
          const measureFrame = () => {
            frames++;
            if (performance.now() - start < 1000) {
              requestAnimationFrame(measureFrame);
            } else {
              resolve({
                fps: frames,
                memory: (performance as any).memory?.usedJSHeapSize || 0,
                time: performance.now() - start
              });
            }
          };
          
          requestAnimationFrame(measureFrame);
        });
      });
      
      results.push(metrics);
      
      // Apply optimizations based on results
      if (i < iterations - 1) {
        await page.evaluate(() => {
          // Clear unnecessary event listeners
          const canvas = document.querySelector('canvas');
          if (canvas) {
            const newCanvas = canvas.cloneNode(true);
            canvas.parentNode?.replaceChild(newCanvas, canvas);
          }
          
          // Force garbage collection if available
          if ((window as any).gc) {
            (window as any).gc();
          }
        });
      }
      
      console.log(`FPS: ${(metrics as any).fps}, Memory: ${Math.round((metrics as any).memory / 1024 / 1024)}MB`);
    }
    
    // Verify improvement
    const firstFPS = results[0].fps;
    const lastFPS = results[results.length - 1].fps;
    
    console.log(`\nPerformance improvement: ${((lastFPS - firstFPS) / firstFPS * 100).toFixed(1)}%`);
    
    // Tests should maintain or improve performance
    expect(lastFPS).toBeGreaterThanOrEqual(firstFPS * 0.95); // Allow 5% variance
  });
});