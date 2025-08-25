import { useState, useEffect, useCallback, useRef, useMemo } from 'react';

/**
 * Debounced state hook that prevents excessive re-renders from rapid state changes
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Throttled callback hook for limiting function calls
 */
export function useThrottle<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T {
  const lastRan = useRef(Date.now());
  
  return useCallback(
    ((...args: Parameters<T>) => {
      if (Date.now() - lastRan.current >= delay) {
        callback(...args);
        lastRan.current = Date.now();
      }
    }) as T,
    [callback, delay]
  );
}

/**
 * Batched state updates hook for performance optimization
 */
export function useBatchedState<T>(
  initialState: T,
  batchDelay: number = 16 // ~60fps
): [T, (newState: T | ((prevState: T) => T)) => void, () => void] {
  const [state, setState] = useState<T>(initialState);
  const pendingUpdate = useRef<T | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const flushUpdate = useCallback(() => {
    if (pendingUpdate.current !== null) {
      setState(pendingUpdate.current);
      pendingUpdate.current = null;
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const batchedSetState = useCallback((newState: T | ((prevState: T) => T)) => {
    const nextState = typeof newState === 'function' 
      ? (newState as (prevState: T) => T)(pendingUpdate.current ?? state)
      : newState;
    
    pendingUpdate.current = nextState;

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(flushUpdate, batchDelay);
  }, [state, batchDelay, flushUpdate]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return [pendingUpdate.current ?? state, batchedSetState, flushUpdate];
}

/**
 * Performance monitoring hook for component render tracking
 */
export function useRenderPerformance(componentName: string) {
  const renderCount = useRef(0);
  const renderTimes = useRef<number[]>([]);
  const lastRenderTime = useRef(Date.now());

  useEffect(() => {
    const now = Date.now();
    renderCount.current += 1;
    
    if (renderCount.current > 1) {
      const timeSinceLastRender = now - lastRenderTime.current;
      renderTimes.current.push(timeSinceLastRender);
      
      // Keep only last 100 render times
      if (renderTimes.current.length > 100) {
        renderTimes.current.shift();
      }
    }
    
    lastRenderTime.current = now;

    if (process.env.NODE_ENV === 'development' && renderCount.current % 50 === 0) {
      const avgRenderTime = renderTimes.current.reduce((sum, time) => sum + time, 0) / renderTimes.current.length;
      console.log(`[Performance] ${componentName}: ${renderCount.current} renders, avg time: ${avgRenderTime.toFixed(2)}ms`);
    }
  });

  const getMetrics = useCallback(() => ({
    renderCount: renderCount.current,
    averageRenderTime: renderTimes.current.reduce((sum, time) => sum + time, 0) / renderTimes.current.length || 0,
    lastRenderTime: lastRenderTime.current
  }), []);

  return { getMetrics };
}

/**
 * WebSocket state management with debouncing
 */
export function useDebounceWebSocketState<T>(
  initialState: T,
  delay: number = 100
) {
  const [immediateState, setImmediateState] = useState<T>(initialState);
  const [debouncedState, setDebouncedState] = useState<T>(initialState);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const updateState = useCallback((newState: T | ((prevState: T) => T)) => {
    const nextState = typeof newState === 'function' 
      ? (newState as (prevState: T) => T)(immediateState)
      : newState;
    
    setImmediateState(nextState);

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      setDebouncedState(nextState);
    }, delay);
  }, [immediateState, delay]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return [immediateState, debouncedState, updateState] as const;
}

/**
 * Optimized search hook with debouncing
 */
export function useOptimizedSearch<T>(
  items: T[],
  searchFunction: (items: T[], query: string) => T[],
  debounceDelay: number = 300
) {
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, debounceDelay);
  
  const filteredItems = useMemo(() => {
    if (!debouncedQuery.trim()) return items;
    return searchFunction(items, debouncedQuery);
  }, [items, debouncedQuery, searchFunction]);

  return {
    query,
    setQuery,
    filteredItems,
    isSearching: query !== debouncedQuery
  };
}

/**
 * Frame rate limiter for smooth animations
 */
export function useFrameLimiter(targetFPS: number = 60) {
  const frameTimeRef = useRef(1000 / targetFPS);
  const lastFrameTimeRef = useRef(0);

  const requestFrame = useCallback((callback: () => void) => {
    const now = performance.now();
    const elapsed = now - lastFrameTimeRef.current;

    if (elapsed >= frameTimeRef.current) {
      lastFrameTimeRef.current = now;
      requestAnimationFrame(callback);
    } else {
      setTimeout(() => requestFrame(callback), frameTimeRef.current - elapsed);
    }
  }, []);

  return requestFrame;
}