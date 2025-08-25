/**
 * Advanced Performance Monitoring System
 * Tracks frame times, memory usage, and performance bottlenecks
 */

export interface PerformanceMetrics {
  fps: {
    current: number;
    average: number;
    min: number;
    max: number;
  };
  frameTime: {
    current: number;
    average: number;
    min: number;
    max: number;
    p95: number;
    p99: number;
    jitter: number;
  };
  memory: {
    used: number;
    limit: number;
    percent: number;
  };
  timing: {
    update: number;
    render: number;
    physics: number;
    collision: number;
    network: number;
    audio: number;
  };
  counts: {
    drawCalls: number;
    sprites: number;
    particles: number;
    bullets: number;
    collisionChecks: number;
  };
}

export class PerformanceMonitor {
  private metrics: PerformanceMetrics;
  private frameTimings: number[] = [];
  private timingHistory: Map<string, number[]> = new Map();
  private frameStart: number = 0;
  private lastFrameTime: number = 0;
  private frameCount: number = 0;
  private sampleWindow: number = 100; // Sample last 100 frames
  private updateInterval: number = 1000; // Update metrics every second
  private lastUpdateTime: number = 0;
  
  // Performance marks for detailed profiling
  private marks: Map<string, number> = new Map();
  
  constructor() {
    this.metrics = this.createEmptyMetrics();
    this.initializeTimingHistory();
  }
  
  private createEmptyMetrics(): PerformanceMetrics {
    return {
      fps: { current: 0, average: 0, min: Infinity, max: 0 },
      frameTime: { 
        current: 0, 
        average: 0, 
        min: Infinity, 
        max: 0, 
        p95: 0, 
        p99: 0,
        jitter: 0
      },
      memory: { used: 0, limit: 0, percent: 0 },
      timing: {
        update: 0,
        render: 0,
        physics: 0,
        collision: 0,
        network: 0,
        audio: 0
      },
      counts: {
        drawCalls: 0,
        sprites: 0,
        particles: 0,
        bullets: 0,
        collisionChecks: 0
      }
    };
  }
  
  private initializeTimingHistory(): void {
    ['update', 'render', 'physics', 'collision', 'network', 'audio'].forEach(key => {
      this.timingHistory.set(key, []);
    });
  }
  
  /**
   * Mark the start of a frame
   */
  startFrame(): void {
    this.frameStart = performance.now();
    
    if (this.lastFrameTime > 0) {
      const frameTime = this.frameStart - this.lastFrameTime;
      this.frameTimings.push(frameTime);
      
      // Keep only last N frames
      if (this.frameTimings.length > this.sampleWindow) {
        this.frameTimings.shift();
      }
      
      this.metrics.frameTime.current = frameTime;
    }
    
    this.lastFrameTime = this.frameStart;
    this.frameCount++;
  }
  
  /**
   * Mark the end of a frame and update metrics
   */
  endFrame(): void {
    const now = performance.now();
    
    // Update FPS counter
    if (now - this.lastUpdateTime >= this.updateInterval) {
      this.updateMetrics();
      this.lastUpdateTime = now;
    }
  }
  
  /**
   * Mark the start of a specific operation
   */
  markStart(operation: string): void {
    this.marks.set(operation, performance.now());
  }
  
  /**
   * Mark the end of a specific operation and record timing
   */
  markEnd(operation: string): void {
    const startTime = this.marks.get(operation);
    if (startTime) {
      const duration = performance.now() - startTime;
      
      // Add to history
      let history = this.timingHistory.get(operation);
      if (!history) {
        history = [];
        this.timingHistory.set(operation, history);
      }
      
      history.push(duration);
      if (history.length > this.sampleWindow) {
        history.shift();
      }
      
      // Update current timing
      if (operation in this.metrics.timing) {
        (this.metrics.timing as any)[operation] = duration;
      }
      
      this.marks.delete(operation);
    }
  }
  
  /**
   * Measure a function's execution time
   */
  measure<T>(name: string, fn: () => T): T {
    this.markStart(name);
    const result = fn();
    this.markEnd(name);
    return result;
  }
  
  /**
   * Measure an async function's execution time
   */
  async measureAsync<T>(name: string, fn: () => Promise<T>): Promise<T> {
    this.markStart(name);
    const result = await fn();
    this.markEnd(name);
    return result;
  }
  
  /**
   * Update count metrics
   */
  updateCount(counter: keyof PerformanceMetrics['counts'], value: number): void {
    this.metrics.counts[counter] = value;
  }
  
  /**
   * Increment count metrics
   */
  incrementCount(counter: keyof PerformanceMetrics['counts'], delta: number = 1): void {
    this.metrics.counts[counter] += delta;
  }
  
  /**
   * Calculate and update all metrics
   */
  private updateMetrics(): void {
    // Calculate FPS
    this.metrics.fps.current = this.frameCount;
    this.frameCount = 0;
    
    if (this.frameTimings.length > 0) {
      // Frame time statistics
      const sorted = [...this.frameTimings].sort((a, b) => a - b);
      const sum = sorted.reduce((a, b) => a + b, 0);
      
      this.metrics.frameTime.average = sum / sorted.length;
      this.metrics.frameTime.min = sorted[0];
      this.metrics.frameTime.max = sorted[sorted.length - 1];
      this.metrics.frameTime.p95 = sorted[Math.floor(sorted.length * 0.95)];
      this.metrics.frameTime.p99 = sorted[Math.floor(sorted.length * 0.99)];
      
      // Calculate jitter (frame time variance)
      const variance = this.frameTimings.reduce((acc, time) => {
        const diff = time - this.metrics.frameTime.average;
        return acc + diff * diff;
      }, 0) / this.frameTimings.length;
      this.metrics.frameTime.jitter = Math.sqrt(variance);
      
      // FPS statistics
      this.metrics.fps.average = 1000 / this.metrics.frameTime.average;
      this.metrics.fps.min = 1000 / this.metrics.frameTime.max;
      this.metrics.fps.max = 1000 / this.metrics.frameTime.min;
    }
    
    // Calculate average timings
    this.timingHistory.forEach((history, operation) => {
      if (history.length > 0 && operation in this.metrics.timing) {
        const avg = history.reduce((a, b) => a + b, 0) / history.length;
        (this.metrics.timing as any)[operation] = avg;
      }
    });
    
    // Update memory metrics
    this.updateMemoryMetrics();
  }
  
  /**
   * Update memory usage metrics
   */
  private updateMemoryMetrics(): void {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      this.metrics.memory.used = memory.usedJSHeapSize / 1024 / 1024; // Convert to MB
      this.metrics.memory.limit = memory.jsHeapSizeLimit / 1024 / 1024;
      this.metrics.memory.percent = (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100;
    }
  }
  
  /**
   * Get current metrics
   */
  getMetrics(): Readonly<PerformanceMetrics> {
    return { ...this.metrics };
  }
  
  /**
   * Get performance score (0-100)
   */
  getPerformanceScore(): number {
    const targetFPS = 60;
    const targetFrameTime = 16.67; // ms
    
    // Calculate component scores
    const fpsScore = Math.min(100, (this.metrics.fps.average / targetFPS) * 100);
    const frameTimeScore = Math.min(100, (targetFrameTime / this.metrics.frameTime.average) * 100);
    const jitterScore = Math.max(0, 100 - this.metrics.frameTime.jitter * 10);
    const memoryScore = Math.max(0, 100 - this.metrics.memory.percent);
    
    // Weighted average
    const score = (
      fpsScore * 0.3 +
      frameTimeScore * 0.3 +
      jitterScore * 0.2 +
      memoryScore * 0.2
    );
    
    return Math.round(Math.max(0, Math.min(100, score)));
  }
  
  /**
   * Get performance warnings
   */
  getWarnings(): string[] {
    const warnings: string[] = [];
    
    if (this.metrics.fps.average < 30) {
      warnings.push(`⚠️ Low FPS: ${this.metrics.fps.average.toFixed(1)}`);
    }
    
    if (this.metrics.frameTime.max > 33.33) {
      warnings.push(`⚠️ Frame drops detected: ${this.metrics.frameTime.max.toFixed(1)}ms`);
    }
    
    if (this.metrics.frameTime.jitter > 5) {
      warnings.push(`⚠️ High frame time variance: ${this.metrics.frameTime.jitter.toFixed(1)}ms`);
    }
    
    if (this.metrics.memory.percent > 80) {
      warnings.push(`⚠️ High memory usage: ${this.metrics.memory.percent.toFixed(1)}%`);
    }
    
    if (this.metrics.timing.collision > 5) {
      warnings.push(`⚠️ Slow collision detection: ${this.metrics.timing.collision.toFixed(1)}ms`);
    }
    
    if (this.metrics.timing.render > 10) {
      warnings.push(`⚠️ Slow rendering: ${this.metrics.timing.render.toFixed(1)}ms`);
    }
    
    return warnings;
  }
  
  /**
   * Export metrics for analysis
   */
  exportMetrics(): string {
    return JSON.stringify({
      timestamp: Date.now(),
      metrics: this.metrics,
      score: this.getPerformanceScore(),
      warnings: this.getWarnings()
    }, null, 2);
  }
  
  /**
   * Reset all metrics
   */
  reset(): void {
    this.metrics = this.createEmptyMetrics();
    this.frameTimings = [];
    this.timingHistory.clear();
    this.initializeTimingHistory();
    this.marks.clear();
    this.frameCount = 0;
    this.lastFrameTime = 0;
    this.lastUpdateTime = 0;
  }
  
  /**
   * Create a performance report
   */
  generateReport(): string {
    const score = this.getPerformanceScore();
    const warnings = this.getWarnings();
    
    let report = `🎮 Performance Report\n`;
    report += `═══════════════════════════════\n\n`;
    
    report += `📊 Overall Score: ${score}/100 ${this.getScoreEmoji(score)}\n\n`;
    
    report += `📈 FPS Metrics:\n`;
    report += `  Current: ${this.metrics.fps.current}\n`;
    report += `  Average: ${this.metrics.fps.average.toFixed(1)}\n`;
    report += `  Min/Max: ${this.metrics.fps.min.toFixed(1)}/${this.metrics.fps.max.toFixed(1)}\n\n`;
    
    report += `⏱️ Frame Time:\n`;
    report += `  Average: ${this.metrics.frameTime.average.toFixed(2)}ms\n`;
    report += `  P95: ${this.metrics.frameTime.p95.toFixed(2)}ms\n`;
    report += `  P99: ${this.metrics.frameTime.p99.toFixed(2)}ms\n`;
    report += `  Jitter: ${this.metrics.frameTime.jitter.toFixed(2)}ms\n\n`;
    
    report += `💾 Memory Usage:\n`;
    report += `  Used: ${this.metrics.memory.used.toFixed(1)}MB\n`;
    report += `  Limit: ${this.metrics.memory.limit.toFixed(1)}MB\n`;
    report += `  Percent: ${this.metrics.memory.percent.toFixed(1)}%\n\n`;
    
    report += `⚙️ System Timing:\n`;
    Object.entries(this.metrics.timing).forEach(([key, value]) => {
      if (value > 0) {
        report += `  ${key}: ${value.toFixed(2)}ms\n`;
      }
    });
    
    if (warnings.length > 0) {
      report += `\n⚠️ Warnings:\n`;
      warnings.forEach(warning => {
        report += `  ${warning}\n`;
      });
    }
    
    return report;
  }
  
  private getScoreEmoji(score: number): string {
    if (score >= 90) return '🏆';
    if (score >= 70) return '✅';
    if (score >= 50) return '⚠️';
    return '❌';
  }
}

// Singleton instance for global access
export const performanceMonitor = new PerformanceMonitor();