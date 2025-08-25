import React, { useMemo, useCallback, useState, useEffect, useRef } from 'react';

interface VirtualScrollListProps<T> {
  items: T[];
  itemHeight: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  containerHeight: number;
  className?: string;
  overscan?: number;
  keyExtractor: (item: T, index: number) => string;
}

/**
 * Virtual scrolling component optimized for large lists.
 * Only renders visible items plus overscan buffer to maintain 60fps.
 */
export function VirtualScrollList<T>({
  items,
  itemHeight,
  renderItem,
  containerHeight,
  className = '',
  overscan = 5,
  keyExtractor
}: VirtualScrollListProps<T>) {
  const [scrollTop, setScrollTop] = useState(0);
  const scrollElementRef = useRef<HTMLDivElement>(null);
  
  // Calculate visible range with overscan buffer
  const visibleRange = useMemo(() => {
    const start = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const visibleCount = Math.ceil(containerHeight / itemHeight);
    const end = Math.min(items.length, start + visibleCount + overscan * 2);
    
    return { start, end };
  }, [scrollTop, itemHeight, containerHeight, items.length, overscan]);

  // Get visible items slice
  const visibleItems = useMemo(() => {
    return items.slice(visibleRange.start, visibleRange.end);
  }, [items, visibleRange]);

  // Calculate total height and offset
  const totalHeight = items.length * itemHeight;
  const offsetY = visibleRange.start * itemHeight;

  // Optimized scroll handler with RAF
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    requestAnimationFrame(() => {
      setScrollTop(e.currentTarget.scrollTop);
    });
  }, []);

  // Auto scroll to bottom when new items are added (for chat)
  const shouldAutoScroll = useRef(false);
  const prevItemsLength = useRef(items.length);

  useEffect(() => {
    if (items.length > prevItemsLength.current && shouldAutoScroll.current) {
      const scrollElement = scrollElementRef.current;
      if (scrollElement) {
        requestAnimationFrame(() => {
          scrollElement.scrollTop = scrollElement.scrollHeight;
        });
      }
    }
    prevItemsLength.current = items.length;
  }, [items.length]);

  // Check if we're at bottom
  useEffect(() => {
    const scrollElement = scrollElementRef.current;
    if (scrollElement) {
      const { scrollTop, scrollHeight, clientHeight } = scrollElement;
      shouldAutoScroll.current = scrollTop + clientHeight >= scrollHeight - 50;
    }
  }, [scrollTop]);

  if (items.length === 0) {
    return (
      <div 
        className={`${className} flex items-center justify-center text-gray-400`}
        style={{ height: containerHeight }}
      >
        No items to display
      </div>
    );
  }

  return (
    <div
      ref={scrollElementRef}
      className={`${className} overflow-auto`}
      style={{ height: containerHeight }}
      onScroll={handleScroll}
    >
      {/* Total height container to maintain scroll position */}
      <div style={{ height: totalHeight, position: 'relative' }}>
        {/* Visible items container */}
        <div style={{ transform: `translateY(${offsetY}px)` }}>
          {visibleItems.map((item, index) => (
            <div
              key={keyExtractor(item, visibleRange.start + index)}
              style={{ height: itemHeight }}
              className="flex-shrink-0"
            >
              {renderItem(item, visibleRange.start + index)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Hook for managing virtual scroll performance metrics
 */
export function useVirtualScrollPerformance() {
  const [metrics, setMetrics] = useState({
    renderCount: 0,
    averageRenderTime: 0,
    lastRenderTime: Date.now()
  });

  const recordRender = useCallback(() => {
    const now = Date.now();
    setMetrics(prev => ({
      renderCount: prev.renderCount + 1,
      averageRenderTime: (prev.averageRenderTime + (now - prev.lastRenderTime)) / 2,
      lastRenderTime: now
    }));
  }, []);

  return { metrics, recordRender };
}