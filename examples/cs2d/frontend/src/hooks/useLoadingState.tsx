import { useState, useCallback, useRef, useEffect } from 'react';
import { useGameNotifications } from '@/components/common/NotificationContainer';

export type LoadingState = 'idle' | 'loading' | 'success' | 'error';

interface LoadingConfig {
  timeout?: number;
  showNotifications?: boolean;
  retryAttempts?: number;
  retryDelay?: number;
}

interface UseLoadingStateOptions {
  key: string;
  config?: LoadingConfig;
}

interface LoadingStateReturn {
  state: LoadingState;
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
  isIdle: boolean;
  error: string | null;
  progress: number;
  timeElapsed: number;
  attempt: number;
  execute: <T>(
    asyncFn: () => Promise<T>,
    options?: {
      successMessage?: string;
      errorMessage?: string;
      loadingMessage?: string;
    }
  ) => Promise<T | null>;
  reset: () => void;
  cancel: () => void;
  retry: () => void;
}

const defaultConfig: LoadingConfig = {
  timeout: 30000,
  showNotifications: true,
  retryAttempts: 3,
  retryDelay: 1000
};

export const useLoadingState = ({ 
  key, 
  config = {} 
}: UseLoadingStateOptions): LoadingStateReturn => {
  const finalConfig = { ...defaultConfig, ...config };
  const { notifyGameAction, notifyConnectionStatus } = useGameNotifications();
  
  const [state, setState] = useState<LoadingState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [attempt, setAttempt] = useState(0);
  
  const timeoutRef = useRef<NodeJS.Timeout>();
  const intervalRef = useRef<NodeJS.Timeout>();
  const cancelRef = useRef<boolean>(false);
  const lastAsyncFnRef = useRef<(() => Promise<any>) | null>(null);
  const lastOptionsRef = useRef<any>(null);

  const reset = useCallback(() => {
    setState('idle');
    setError(null);
    setProgress(0);
    setTimeElapsed(0);
    setAttempt(0);
    cancelRef.current = false;
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
  }, []);

  const cancel = useCallback(() => {
    cancelRef.current = true;
    reset();
  }, [reset]);

  const retry = useCallback(async () => {
    if (lastAsyncFnRef.current) {
      return execute(lastAsyncFnRef.current, lastOptionsRef.current);
    }
  }, []);

  const execute = useCallback(async <T,>(
    asyncFn: () => Promise<T>,
    options: {
      successMessage?: string;
      errorMessage?: string;
      loadingMessage?: string;
    } = {}
  ): Promise<T | null> => {
    // Store for retry functionality
    lastAsyncFnRef.current = asyncFn;
    lastOptionsRef.current = options;
    
    const currentAttempt = attempt + 1;
    setAttempt(currentAttempt);
    setState('loading');
    setError(null);
    setProgress(0);
    setTimeElapsed(0);
    cancelRef.current = false;

    // Show loading notification
    if (finalConfig.showNotifications && options.loadingMessage) {
      notifyGameAction(`loading-${key}`, options.loadingMessage, 'info');
    }

    // Start progress simulation
    const startTime = Date.now();
    intervalRef.current = setInterval(() => {
      if (cancelRef.current) return;
      
      const elapsed = Date.now() - startTime;
      setTimeElapsed(elapsed);
      
      // Simulate progress (this could be replaced with actual progress reporting)
      const progressValue = Math.min((elapsed / (finalConfig.timeout || 30000)) * 100, 95);
      setProgress(progressValue);
    }, 100);

    // Set timeout
    if (finalConfig.timeout) {
      timeoutRef.current = setTimeout(() => {
        if (!cancelRef.current) {
          cancelRef.current = true;
          setState('error');
          setError('Operation timed out');
          
          if (finalConfig.showNotifications) {
            notifyGameAction(`timeout-${key}`, 'Operation timed out', 'error');
          }
        }
      }, finalConfig.timeout);
    }

    try {
      const result = await asyncFn();
      
      if (cancelRef.current) {
        return null;
      }

      setState('success');
      setProgress(100);
      
      if (finalConfig.showNotifications && options.successMessage) {
        notifyGameAction(`success-${key}`, options.successMessage, 'success');
      }
      
      return result;
    } catch (err) {
      if (cancelRef.current) {
        return null;
      }

      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      setState('error');
      
      // Handle retry logic
      if (currentAttempt < (finalConfig.retryAttempts || 0)) {
        if (finalConfig.showNotifications) {
          notifyGameAction(
            `retry-${key}`, 
            `Attempt ${currentAttempt} failed, retrying in ${finalConfig.retryDelay}ms...`,
            'warning'
          );
        }
        
        setTimeout(() => {
          if (!cancelRef.current) {
            execute(asyncFn, options);
          }
        }, finalConfig.retryDelay);
        
        return null;
      }

      if (finalConfig.showNotifications) {
        const finalErrorMessage = options.errorMessage || errorMessage;
        notifyGameAction(`error-${key}`, finalErrorMessage, 'error');
      }
      
      return null;
    } finally {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }
  }, [key, finalConfig, attempt, notifyGameAction]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  return {
    state,
    isLoading: state === 'loading',
    isSuccess: state === 'success',
    isError: state === 'error',
    isIdle: state === 'idle',
    error,
    progress,
    timeElapsed,
    attempt,
    execute,
    reset,
    cancel,
    retry
  };
};

// Predefined loading states for common operations
export const useRoomJoinState = () => {
  return useLoadingState({
    key: 'room-join',
    config: {
      timeout: 15000,
      showNotifications: true,
      retryAttempts: 2,
      retryDelay: 2000
    }
  });
};

export const useRoomCreateState = () => {
  return useLoadingState({
    key: 'room-create',
    config: {
      timeout: 10000,
      showNotifications: true,
      retryAttempts: 1,
      retryDelay: 1500
    }
  });
};

export const useConnectionState = () => {
  return useLoadingState({
    key: 'connection',
    config: {
      timeout: 8000,
      showNotifications: true,
      retryAttempts: 5,
      retryDelay: 2000
    }
  });
};

export const useBotManagementState = () => {
  return useLoadingState({
    key: 'bot-management',
    config: {
      timeout: 5000,
      showNotifications: false, // Handle notifications manually for better UX
      retryAttempts: 1,
      retryDelay: 1000
    }
  });
};

// Hook for managing multiple loading states
export const useMultipleLoadingStates = (keys: string[], config?: LoadingConfig) => {
  const states = keys.reduce((acc, key) => {
    acc[key] = useLoadingState({ key, config });
    return acc;
  }, {} as Record<string, LoadingStateReturn>);

  const isAnyLoading = Object.values(states).some(s => s.isLoading);
  const hasErrors = Object.values(states).filter(s => s.isError);
  const allSuccess = Object.values(states).every(s => s.isSuccess || s.isIdle);

  const resetAll = useCallback(() => {
    Object.values(states).forEach(s => s.reset());
  }, [states]);

  const cancelAll = useCallback(() => {
    Object.values(states).forEach(s => s.cancel());
  }, [states]);

  return {
    states,
    isAnyLoading,
    hasErrors,
    allSuccess,
    resetAll,
    cancelAll
  };
};

export default useLoadingState;