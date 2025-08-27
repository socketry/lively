/**
 * Performance monitoring utilities for CS2D game
 * Tracks render times, memory usage, and connection quality
 */

interface PerformanceMetrics {
  renderTime: number;
  memoryUsage: number;
  fps: number;
  connectionLatency: number;
  timestamp: number;
}

interface ConnectionQuality {
  status: 'excellent' | 'good' | 'fair' | 'poor' | 'disconnected';
  latency: number;
  packetLoss: number;
  jitter: number;
  stability: number; // 0-100 score
}

class PerformanceMonitor {
  private metrics: PerformanceMetrics[] = [];
  private fpsCounter = 0;
  private lastFpsTime = performance.now();
  private frameRequestId: number | null = null;
  private observers: ((metrics: PerformanceMetrics) => void)[] = [];
  private readonly maxMetricsHistory = 100;

  constructor() {
    this.startFPSMonitoring();
    this.setupMemoryMonitoring();
  }

  /**
   * Start FPS monitoring using requestAnimationFrame
   */
  private startFPSMonitoring() {
    const measureFPS = () => {
      this.fpsCounter++;
      const now = performance.now();
      
      if (now - this.lastFpsTime >= 1000) {
        const fps = Math.round((this.fpsCounter * 1000) / (now - this.lastFpsTime));
        this.recordMetric('fps', fps);
        this.fpsCounter = 0;
        this.lastFpsTime = now;
      }
      
      this.frameRequestId = requestAnimationFrame(measureFPS);
    };
    
    measureFPS();
  }

  /**
   * Setup memory monitoring
   */
  private setupMemoryMonitoring() {
    if ('memory' in performance) {
      setInterval(() => {
        const memory = (performance as any).memory;
        const memoryUsage = memory.usedJSHeapSize / (1024 * 1024); // MB
        this.recordMetric('memory', memoryUsage);
      }, 5000); // Every 5 seconds
    }
  }

  /**
   * Record a performance metric
   */
  private recordMetric(type: string, value: number) {
    const metric: PerformanceMetrics = {
      renderTime: type === 'render' ? value : this.getLastMetric()?.renderTime || 0,
      memoryUsage: type === 'memory' ? value : this.getLastMetric()?.memoryUsage || 0,
      fps: type === 'fps' ? value : this.getLastMetric()?.fps || 60,
      connectionLatency: type === 'latency' ? value : this.getLastMetric()?.connectionLatency || 0,
      timestamp: Date.now()
    };

    this.metrics.push(metric);
    
    // Keep only recent metrics
    if (this.metrics.length > this.maxMetricsHistory) {
      this.metrics.shift();
    }

    // Notify observers
    this.observers.forEach(observer => observer(metric));
  }

  /**
   * Measure render performance of a component
   */
  measureRender<T>(componentName: string, renderFn: () => T): T {
    const startTime = performance.now();
    const result = renderFn();
    const endTime = performance.now();
    const renderTime = endTime - startTime;

    this.recordMetric('render', renderTime);

    // Log slow renders in development
    if (process.env.NODE_ENV === 'development' && renderTime > 16) {
      console.warn(`[Performance] Slow render detected: ${componentName} took ${renderTime.toFixed(2)}ms`);
    }

    return result;
  }

  /**
   * Test connection latency to server
   */
  async measureConnectionLatency(url: string): Promise<number> {
    const startTime = performance.now();
    
    try {
      await fetch(url, { 
        method: 'HEAD',
        cache: 'no-cache',
        signal: AbortSignal.timeout(5000)
      });
      const latency = performance.now() - startTime;
      this.recordMetric('latency', latency);
      return latency;
    } catch (error) {
      console.warn('[Performance] Connection latency test failed:', error);
      return -1;
    }
  }

  /**
   * Assess overall connection quality
   */
  assessConnectionQuality(latency: number, packetLoss: number = 0, jitter: number = 0): ConnectionQuality {
    let status: ConnectionQuality['status'] = 'disconnected';
    let stability = 0;

    if (latency < 0) {
      status = 'disconnected';
      stability = 0;
    } else if (latency < 50 && packetLoss < 1 && jitter < 10) {
      status = 'excellent';
      stability = 100;
    } else if (latency < 100 && packetLoss < 3 && jitter < 20) {
      status = 'good';
      stability = 80;
    } else if (latency < 200 && packetLoss < 5 && jitter < 40) {
      status = 'fair';
      stability = 60;
    } else {
      status = 'poor';
      stability = 30;
    }

    return {
      status,
      latency,
      packetLoss,
      jitter,
      stability
    };
  }

  /**
   * Get current performance summary
   */
  getSummary(): {
    avgFPS: number;
    avgRenderTime: number;
    avgMemoryUsage: number;
    avgLatency: number;
    performanceScore: number;
  } {
    if (this.metrics.length === 0) {
      return {
        avgFPS: 60,
        avgRenderTime: 0,
        avgMemoryUsage: 0,
        avgLatency: 0,
        performanceScore: 100
      };
    }

    const recent = this.metrics.slice(-20); // Last 20 measurements
    
    const avgFPS = recent.reduce((sum, m) => sum + m.fps, 0) / recent.length;
    const avgRenderTime = recent.reduce((sum, m) => sum + m.renderTime, 0) / recent.length;
    const avgMemoryUsage = recent.reduce((sum, m) => sum + m.memoryUsage, 0) / recent.length;
    const avgLatency = recent.reduce((sum, m) => sum + m.connectionLatency, 0) / recent.length;

    // Calculate performance score (0-100)
    let performanceScore = 100;
    
    // Penalize low FPS
    if (avgFPS < 30) performanceScore -= 30;
    else if (avgFPS < 45) performanceScore -= 15;
    else if (avgFPS < 55) performanceScore -= 5;

    // Penalize slow renders
    if (avgRenderTime > 16) performanceScore -= 20;
    else if (avgRenderTime > 8) performanceScore -= 10;

    // Penalize high latency
    if (avgLatency > 200) performanceScore -= 25;
    else if (avgLatency > 100) performanceScore -= 15;
    else if (avgLatency > 50) performanceScore -= 5;

    return {
      avgFPS: Math.round(avgFPS),
      avgRenderTime: Math.round(avgRenderTime * 100) / 100,
      avgMemoryUsage: Math.round(avgMemoryUsage * 100) / 100,
      avgLatency: Math.round(avgLatency),
      performanceScore: Math.max(0, performanceScore)
    };
  }

  /**
   * Subscribe to performance updates
   */
  subscribe(observer: (metrics: PerformanceMetrics) => void): () => void {
    this.observers.push(observer);
    return () => {
      const index = this.observers.indexOf(observer);
      if (index > -1) {
        this.observers.splice(index, 1);
      }
    };
  }

  /**
   * Get the most recent metric
   */
  private getLastMetric(): PerformanceMetrics | undefined {
    return this.metrics[this.metrics.length - 1];
  }

  /**
   * Clean up monitoring
   */
  dispose() {
    if (this.frameRequestId) {
      cancelAnimationFrame(this.frameRequestId);
      this.frameRequestId = null;
    }
    this.observers = [];
    this.metrics = [];
  }

  /**
   * Check if performance is degraded
   */
  isPerformanceDegraded(): boolean {
    const summary = this.getSummary();
    return summary.performanceScore < 70 || summary.avgFPS < 30;
  }

  /**
   * Get performance recommendations
   */
  getRecommendations(): string[] {
    const summary = this.getSummary();
    const recommendations: string[] = [];

    if (summary.avgFPS < 30) {
      recommendations.push('Consider reducing graphics quality or closing other applications');
    }

    if (summary.avgRenderTime > 16) {
      recommendations.push('Some components are rendering slowly. Check for unnecessary re-renders');
    }

    if (summary.avgLatency > 150) {
      recommendations.push('High network latency detected. Check your internet connection');
    }

    if (summary.avgMemoryUsage > 100) {
      recommendations.push('High memory usage detected. Consider refreshing the page');
    }

    return recommendations;
  }
}

// Singleton instance
let performanceMonitor: PerformanceMonitor | null = null;

export function getPerformanceMonitor(): PerformanceMonitor {
  if (!performanceMonitor) {
    performanceMonitor = new PerformanceMonitor();
  }
  return performanceMonitor;
}

export function usePerformanceMonitor() {
  return getPerformanceMonitor();
}

export type { PerformanceMetrics, ConnectionQuality };