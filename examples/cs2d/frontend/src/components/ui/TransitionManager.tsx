import React, { useState, useEffect, ReactNode } from 'react';
import './TransitionManager.css';

interface TransitionConfig {
  type: 'fade' | 'slide' | 'scale' | 'blur';
  duration: number;
  easing: string;
  direction?: 'left' | 'right' | 'up' | 'down';
}

interface TransitionManagerProps {
  children: ReactNode;
  trigger: string | number; // Changes when transition should occur
  config?: Partial<TransitionConfig>;
  className?: string;
}

const defaultConfig: TransitionConfig = {
  type: 'fade',
  duration: 300,
  easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
  direction: 'right'
};

const TransitionManager: React.FC<TransitionManagerProps> = ({
  children,
  trigger,
  config = {},
  className = ''
}) => {
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [displayChildren, setDisplayChildren] = useState(children);
  const mergedConfig = { ...defaultConfig, ...config };

  useEffect(() => {
    setIsTransitioning(true);

    // After half the transition duration, update the content
    const contentUpdateTimer = setTimeout(() => {
      setDisplayChildren(children);
    }, mergedConfig.duration / 2);

    // After full transition duration, end the transition
    const transitionEndTimer = setTimeout(() => {
      setIsTransitioning(false);
    }, mergedConfig.duration);

    return () => {
      clearTimeout(contentUpdateTimer);
      clearTimeout(transitionEndTimer);
    };
  }, [trigger, children, mergedConfig.duration]);

  const getTransitionClass = () => {
    let baseClass = `transition-${mergedConfig.type}`;
    if (mergedConfig.direction && (mergedConfig.type === 'slide')) {
      baseClass += `-${mergedConfig.direction}`;
    }
    return baseClass;
  };

  const getTransitionStyle = () => ({
    '--transition-duration': `${mergedConfig.duration}ms`,
    '--transition-easing': mergedConfig.easing,
  } as React.CSSProperties);

  return (
    <div 
      className={`transition-manager ${getTransitionClass()} ${isTransitioning ? 'transitioning' : ''} ${className}`}
      style={getTransitionStyle()}
    >
      {displayChildren}
    </div>
  );
};

// Specialized transition components
export const FadeTransition: React.FC<Omit<TransitionManagerProps, 'config'> & { duration?: number }> = ({
  children,
  trigger,
  duration = 300,
  className
}) => (
  <TransitionManager
    trigger={trigger}
    config={{ type: 'fade', duration }}
    className={className}
  >
    {children}
  </TransitionManager>
);

export const SlideTransition: React.FC<Omit<TransitionManagerProps, 'config'> & { 
  duration?: number; 
  direction?: 'left' | 'right' | 'up' | 'down';
}> = ({
  children,
  trigger,
  duration = 300,
  direction = 'right',
  className
}) => (
  <TransitionManager
    trigger={trigger}
    config={{ type: 'slide', duration, direction }}
    className={className}
  >
    {children}
  </TransitionManager>
);

export const ScaleTransition: React.FC<Omit<TransitionManagerProps, 'config'> & { duration?: number }> = ({
  children,
  trigger,
  duration = 300,
  className
}) => (
  <TransitionManager
    trigger={trigger}
    config={{ type: 'scale', duration }}
    className={className}
  >
    {children}
  </TransitionManager>
);

// Page transition wrapper
interface PageTransitionProps {
  children: ReactNode;
  path: string;
  className?: string;
}

export const PageTransition: React.FC<PageTransitionProps> = ({
  children,
  path,
  className
}) => {
  return (
    <FadeTransition
      trigger={path}
      duration={250}
      className={`page-transition ${className || ''}`}
    >
      {children}
    </FadeTransition>
  );
};

// Loading state transition
interface LoadingTransitionProps {
  isLoading: boolean;
  children: ReactNode;
  loadingComponent?: ReactNode;
  className?: string;
}

export const LoadingTransition: React.FC<LoadingTransitionProps> = ({
  isLoading,
  children,
  loadingComponent = <div className="loading-placeholder">Loading...</div>,
  className
}) => {
  return (
    <FadeTransition
      trigger={isLoading ? 'loading' : 'loaded'}
      duration={200}
      className={`loading-transition ${className || ''}`}
    >
      {isLoading ? loadingComponent : children}
    </FadeTransition>
  );
};

// Modal transition wrapper
interface ModalTransitionProps {
  isOpen: boolean;
  children: ReactNode;
  onClose?: () => void;
  className?: string;
}

export const ModalTransition: React.FC<ModalTransitionProps> = ({
  isOpen,
  children,
  onClose,
  className
}) => {
  const [shouldRender, setShouldRender] = useState(isOpen);

  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
    } else {
      const timer = setTimeout(() => setShouldRender(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!shouldRender) return null;

  return (
    <div 
      className={`modal-transition ${isOpen ? 'modal-open' : 'modal-closing'} ${className || ''}`}
      onClick={(e) => {
        if (e.target === e.currentTarget && onClose) {
          onClose();
        }
      }}
    >
      <div className="modal-content">
        {children}
      </div>
    </div>
  );
};

// Staggered list animation
interface StaggeredListProps {
  children: ReactNode[];
  staggerDelay?: number;
  className?: string;
}

export const StaggeredList: React.FC<StaggeredListProps> = ({
  children,
  staggerDelay = 100,
  className
}) => {
  const [visibleItems, setVisibleItems] = useState<boolean[]>(new Array(children.length).fill(false));

  useEffect(() => {
    children.forEach((_, index) => {
      setTimeout(() => {
        setVisibleItems(prev => {
          const newVisible = [...prev];
          newVisible[index] = true;
          return newVisible;
        });
      }, index * staggerDelay);
    });
  }, [children.length, staggerDelay]);

  return (
    <div className={`staggered-list ${className || ''}`}>
      {children.map((child, index) => (
        <div
          key={index}
          className={`staggered-item ${visibleItems[index] ? 'visible' : ''}`}
          style={{ '--stagger-delay': `${index * staggerDelay}ms` } as React.CSSProperties}
        >
          {child}
        </div>
      ))}
    </div>
  );
};

export default TransitionManager;