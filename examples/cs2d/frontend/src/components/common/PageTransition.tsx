import React, { useState, useEffect, useRef } from 'react';
import { cn } from '@/utils/tailwind';
import { RoomJoinProgress } from './ProgressIndicator';
import LoadingOverlay from './LoadingOverlay';
import { useRoomJoinState } from '@/hooks/useLoadingState';

interface PageTransitionProps {
  isTransitioning: boolean;
  fromPage: 'lobby' | 'room' | 'game';
  toPage: 'lobby' | 'room' | 'game';
  transitionType?: 'slide' | 'fade' | 'zoom' | 'room-join';
  duration?: number;
  roomId?: string;
  onComplete?: () => void;
  children?: React.ReactNode;
}

export const PageTransition: React.FC<PageTransitionProps> = ({
  isTransitioning,
  fromPage,
  toPage,
  transitionType = 'slide',
  duration = 500,
  roomId,
  onComplete,
  children
}) => {
  const [stage, setStage] = useState<'idle' | 'leaving' | 'loading' | 'entering' | 'complete'>('idle');
  const [currentStep, setCurrentStep] = useState<'connecting' | 'authenticating' | 'joining' | 'loading' | 'complete' | 'error'>('connecting');
  const timeoutRef = useRef<NodeJS.Timeout>();
  
  const roomJoinState = useRoomJoinState();

  useEffect(() => {
    if (isTransitioning) {
      setStage('leaving');
      
      // Simulate room joining process for room transitions
      if (transitionType === 'room-join' && toPage === 'room') {
        setTimeout(() => setStage('loading'), duration / 2);
        
        // Simulate joining steps
        const steps = [
          { step: 'connecting' as const, delay: 0 },
          { step: 'authenticating' as const, delay: 1000 },
          { step: 'joining' as const, delay: 2000 },
          { step: 'loading' as const, delay: 3000 },
          { step: 'complete' as const, delay: 4000 }
        ];
        
        steps.forEach(({ step, delay }) => {
          setTimeout(() => {
            setCurrentStep(step);
            if (step === 'complete') {
              setStage('entering');
              setTimeout(() => {
                setStage('complete');
                onComplete?.();
              }, 500);
            }
          }, delay);
        });
      } else {
        // Standard transition
        setTimeout(() => {
          setStage('entering');
          setTimeout(() => {
            setStage('complete');
            onComplete?.();
          }, duration / 2);
        }, duration / 2);
      }
    } else {
      setStage('idle');
      setCurrentStep('connecting');
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [isTransitioning, transitionType, toPage, duration, onComplete]);

  if (!isTransitioning || stage === 'idle') return null;

  // Room joining transition with progress
  if (transitionType === 'room-join' && stage === 'loading') {
    return (
      <RoomJoinProgress
        isJoining={true}
        currentStep={currentStep}
        onCancel={() => {
          setStage('complete');
          onComplete?.();
        }}
      />
    );
  }

  // Standard transitions
  return (
    <div className={cn(
      'fixed inset-0 z-50',
      getTransitionClasses(transitionType, stage, fromPage, toPage)
    )}>
      {/* Background overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-indigo-900 to-purple-900">
        {/* Animated background elements */}
        <div className="absolute inset-0">
          <div className="absolute top-0 -left-4 w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob" />
          <div className="absolute top-0 -right-4 w-96 h-96 bg-cyan-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000" />
          <div className="absolute -bottom-8 left-20 w-96 h-96 bg-pink-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000" />
        </div>
      </div>

      {/* Transition content */}
      <div className="relative z-10 flex items-center justify-center h-full">
        <div className={cn(
          'text-center transition-all duration-500',
          stage === 'leaving' ? 'opacity-100 scale-100' :
          stage === 'entering' ? 'opacity-100 scale-100' :
          'opacity-50 scale-95'
        )}>
          <TransitionContent 
            fromPage={fromPage} 
            toPage={toPage} 
            stage={stage}
            transitionType={transitionType}
          />
        </div>
      </div>

      {/* Custom children overlay */}
      {children && (
        <div className="absolute inset-0 z-20">
          {children}
        </div>
      )}
    </div>
  );
};

interface TransitionContentProps {
  fromPage: PageTransitionProps['fromPage'];
  toPage: PageTransitionProps['toPage'];
  stage: string;
  transitionType: PageTransitionProps['transitionType'];
}

const TransitionContent: React.FC<TransitionContentProps> = ({
  fromPage,
  toPage,
  stage,
  transitionType
}) => {
  const getTransitionMessage = () => {
    if (stage === 'leaving') {
      switch (fromPage) {
        case 'lobby':
          return 'Leaving lobby...';
        case 'room':
          return 'Leaving room...';
        case 'game':
          return 'Ending game...';
        default:
          return 'Preparing...';
      }
    } else if (stage === 'entering') {
      switch (toPage) {
        case 'lobby':
          return 'Entering lobby...';
        case 'room':
          return 'Joining room...';
        case 'game':
          return 'Starting game...';
        default:
          return 'Loading...';
      }
    }
    return 'Transitioning...';
  };

  const getTransitionIcon = () => {
    switch (toPage) {
      case 'lobby':
        return '🏠';
      case 'room':
        return '🚪';
      case 'game':
        return '🎮';
      default:
        return '⏳';
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-8xl animate-bounce">
        {getTransitionIcon()}
      </div>
      
      <div>
        <h1 className="text-4xl font-black bg-gradient-to-r from-orange-400 via-pink-500 to-purple-600 bg-clip-text text-transparent mb-2">
          CS2D Enhanced
        </h1>
        <p className="text-xl text-white/80 animate-pulse">
          {getTransitionMessage()}
        </p>
      </div>

      {/* Loading animation */}
      <div className="flex justify-center space-x-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="w-3 h-3 bg-orange-500 rounded-full animate-bounce"
            style={{ animationDelay: `${i * 0.2}s` }}
          />
        ))}
      </div>

      {/* Progress bar for longer transitions */}
      {transitionType === 'room-join' && (
        <div className="w-64 bg-white/20 rounded-full h-2 overflow-hidden">
          <div className="h-full bg-gradient-to-r from-orange-500 to-pink-500 rounded-full animate-pulse" />
        </div>
      )}
    </div>
  );
};

const getTransitionClasses = (
  type: PageTransitionProps['transitionType'],
  stage: string,
  fromPage: string,
  toPage: string
) => {
  const baseClasses = 'transition-all duration-500 ease-in-out';
  
  switch (type) {
    case 'slide':
      return cn(
        baseClasses,
        stage === 'leaving' && 'translate-x-0',
        stage === 'entering' && 'translate-x-0',
        stage === 'complete' && 'translate-x-full'
      );
      
    case 'fade':
      return cn(
        baseClasses,
        stage === 'leaving' && 'opacity-100',
        stage === 'entering' && 'opacity-100',
        stage === 'complete' && 'opacity-0'
      );
      
    case 'zoom':
      return cn(
        baseClasses,
        stage === 'leaving' && 'scale-100',
        stage === 'entering' && 'scale-100',
        stage === 'complete' && 'scale-0'
      );
      
    default:
      return cn(
        baseClasses,
        'opacity-100'
      );
  }
};

// Hook for managing page transitions
export const usePageTransition = () => {
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [transitionState, setTransitionState] = useState({
    fromPage: 'lobby' as const,
    toPage: 'lobby' as const,
    type: 'slide' as const
  });

  const startTransition = (
    fromPage: PageTransitionProps['fromPage'],
    toPage: PageTransitionProps['toPage'],
    type: PageTransitionProps['transitionType'] = 'slide'
  ) => {
    setTransitionState({ fromPage, toPage, type });
    setIsTransitioning(true);
  };

  const endTransition = () => {
    setIsTransitioning(false);
  };

  const navigateToRoom = (roomId: string) => {
    startTransition('lobby', 'room', 'room-join');
    
    // Simulate navigation after transition
    setTimeout(() => {
      window.location.href = `/room/${roomId}`;
      endTransition();
    }, 5000);
  };

  const navigateToLobby = () => {
    startTransition('room', 'lobby', 'slide');
    
    setTimeout(() => {
      window.location.href = '/lobby';
      endTransition();
    }, 1000);
  };

  const navigateToGame = (roomId: string) => {
    startTransition('room', 'game', 'zoom');
    
    setTimeout(() => {
      window.location.href = `/game/${roomId}`;
      endTransition();
    }, 1500);
  };

  return {
    isTransitioning,
    transitionState,
    startTransition,
    endTransition,
    navigateToRoom,
    navigateToLobby,
    navigateToGame
  };
};

export default PageTransition;