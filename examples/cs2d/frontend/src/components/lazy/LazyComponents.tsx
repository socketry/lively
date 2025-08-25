import React, { lazy, Suspense, memo } from 'react';

/**
 * Loading fallback component
 */
const LoadingFallback = memo<{ height?: string; message?: string }>(({ 
  height = 'h-32', 
  message = 'Loading...' 
}) => (
  <div className={`${height} flex items-center justify-center`}>
    <div className="flex items-center space-x-2 text-white/60">
      <div className="w-4 h-4 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
      <span>{message}</span>
    </div>
  </div>
));

LoadingFallback.displayName = 'LoadingFallback';

/**
 * Lazy-loaded components for better performance
 */

// Bot Manager Panel - Only loads when needed
export const LazyBotManagerPanel = lazy(() => 
  import('./BotManagerPanel').then(module => ({ default: module.BotManagerPanel }))
);

// Map Vote Modal - Only loads when voting
export const LazyMapVoteModal = lazy(() => 
  import('./MapVoteModal').then(module => ({ default: module.MapVoteModal }))
);

// Settings Panel - Only loads when opened
export const LazySettingsPanel = lazy(() => 
  import('./SettingsPanel').then(module => ({ default: module.SettingsPanel }))
);

// Player Statistics - Only loads when viewing stats
export const LazyPlayerStatistics = lazy(() => 
  import('./PlayerStatistics').then(module => ({ default: module.PlayerStatistics }))
);

// Leaderboard - Only loads when requested
export const LazyLeaderboard = lazy(() => 
  import('./Leaderboard').then(module => ({ default: module.Leaderboard }))
);

/**
 * Higher-order component for lazy loading with error boundaries
 */
interface LazyWrapperProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  errorFallback?: React.ReactNode;
  height?: string;
}

export const LazyWrapper = memo<LazyWrapperProps>(({ 
  children, 
  fallback,
  errorFallback,
  height = 'h-32'
}) => {
  const defaultFallback = fallback || <LoadingFallback height={height} />;
  const defaultErrorFallback = errorFallback || (
    <div className={`${height} flex items-center justify-center text-red-400`}>
      <span>Failed to load component</span>
    </div>
  );

  return (
    <Suspense fallback={defaultFallback}>
      <ErrorBoundary fallback={defaultErrorFallback}>
        {children}
      </ErrorBoundary>
    </Suspense>
  );
});

LazyWrapper.displayName = 'LazyWrapper';

/**
 * Error boundary for lazy-loaded components
 */
interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode; fallback: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Lazy component error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }

    return this.props.children;
  }
}

/**
 * Hook for lazy loading components with intersection observer
 */
export function useLazyLoad(threshold: number = 0.1) {
  const [isVisible, setIsVisible] = React.useState(false);
  const [isLoaded, setIsLoaded] = React.useState(false);
  const elementRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !isLoaded) {
          setIsVisible(true);
          setIsLoaded(true);
          observer.disconnect();
        }
      },
      { threshold }
    );

    if (elementRef.current) {
      observer.observe(elementRef.current);
    }

    return () => observer.disconnect();
  }, [threshold, isLoaded]);

  return { elementRef, isVisible, isLoaded };
}

/**
 * Conditional lazy loading component
 */
interface ConditionalLazyProps {
  condition: boolean;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  height?: string;
}

export const ConditionalLazy = memo<ConditionalLazyProps>(({
  condition,
  children,
  fallback,
  height = 'h-0'
}) => {
  if (!condition) {
    return fallback ? <>{fallback}</> : <div className={height} />;
  }

  return (
    <LazyWrapper height={height}>
      {children}
    </LazyWrapper>
  );
});

ConditionalLazy.displayName = 'ConditionalLazy';

/**
 * Intersection-based lazy loader
 */
interface IntersectionLazyProps {
  children: React.ReactNode;
  height?: string;
  threshold?: number;
  rootMargin?: string;
}

export const IntersectionLazy = memo<IntersectionLazyProps>(({
  children,
  height = 'h-32',
  threshold = 0.1,
  rootMargin = '100px'
}) => {
  const { elementRef, isVisible } = useLazyLoad(threshold);

  return (
    <div ref={elementRef} className={height}>
      {isVisible ? (
        <LazyWrapper height={height}>
          {children}
        </LazyWrapper>
      ) : (
        <LoadingFallback height={height} message="Scroll to load..." />
      )}
    </div>
  );
});

IntersectionLazy.displayName = 'IntersectionLazy';