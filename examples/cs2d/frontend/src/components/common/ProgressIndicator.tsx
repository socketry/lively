import { cn } from '@/utils/tailwind';
import React, { useEffect, useState } from 'react';

interface ProgressStep {
  id: string;
  label: string;
  description?: string;
  isCompleted: boolean;
  isActive: boolean;
  hasError?: boolean;
}

interface ProgressIndicatorProps {
  steps: ProgressStep[];
  className?: string;
  variant?: 'horizontal' | 'vertical' | 'circular';
  showLabels?: boolean;
  animated?: boolean;
}

export const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({
  steps,
  className,
  variant = 'horizontal',
  showLabels = true,
  animated = true
}) => {
  if (variant === 'circular') {
    return <CircularProgress steps={steps} className={className} animated={animated} />;
  }

  const isVertical = variant === 'vertical';

  return (
    <div className={cn(
      'progress-indicator',
      isVertical ? 'flex flex-col space-y-4' : 'flex items-center space-x-4',
      className
    )}>
      {steps.map((step, index) => (
        <React.Fragment key={step.id}>
          <div className={cn(
            'flex items-center',
            isVertical ? 'flex-row space-x-3' : 'flex-col space-y-2'
          )}>
            <div className={cn(
              'relative w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-300',
              step.hasError ? 'bg-red-500 text-white' :
              step.isCompleted ? 'bg-green-500 text-white' :
              step.isActive ? 'bg-blue-500 text-white animate-pulse' :
              'bg-gray-300 text-gray-600'
            )}>
              {step.hasError ? (
                <span className="text-xs">❌</span>
              ) : step.isCompleted ? (
                <span className="text-xs">✓</span>
              ) : step.isActive ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <span>{index + 1}</span>
              )}
            </div>
            
            {showLabels && (
              <div className={cn(
                'text-center',
                isVertical ? 'text-left' : 'text-center'
              )}>
                <div className={cn(
                  'text-sm font-medium transition-colors duration-300',
                  step.hasError ? 'text-red-400' :
                  step.isCompleted ? 'text-green-400' :
                  step.isActive ? 'text-blue-400' :
                  'text-gray-400'
                )}>
                  {step.label}
                </div>
                {step.description && (
                  <div className="text-xs text-gray-500 mt-1">
                    {step.description}
                  </div>
                )}
              </div>
            )}
          </div>
          
          {index < steps.length - 1 && (
            <div className={cn(
              'transition-colors duration-300',
              isVertical ? 'w-0.5 h-8 ml-4' : 'w-12 h-0.5',
              step.isCompleted ? 'bg-green-500' : 'bg-gray-300'
            )} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
};

interface CircularProgressProps {
  steps: ProgressStep[];
  className?: string;
  animated?: boolean;
}

const CircularProgress: React.FC<CircularProgressProps> = ({ steps, className, animated }) => {
  const completedSteps = steps.filter(step => step.isCompleted).length;
  const totalSteps = steps.length;
  const progress = (completedSteps / totalSteps) * 100;
  const [animatedProgress, setAnimatedProgress] = useState(0);

  useEffect(() => {
    if (animated) {
      const timer = setTimeout(() => setAnimatedProgress(progress), 100);
      return () => clearTimeout(timer);
    } else {
      setAnimatedProgress(progress);
    }
  }, [progress, animated]);

  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (animatedProgress / 100) * circumference;

  const activeStep = steps.find(step => step.isActive);
  const hasError = steps.some(step => step.hasError);

  return (
    <div className={cn('relative w-32 h-32', className)}>
      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
        {/* Background circle */}
        <circle
          cx="50"
          cy="50"
          r={radius}
          stroke="rgba(255, 255, 255, 0.1)"
          strokeWidth="8"
          fill="none"
        />
        {/* Progress circle */}
        <circle
          cx="50"
          cy="50"
          r={radius}
          stroke={hasError ? '#ef4444' : '#10b981'}
          strokeWidth="8"
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className={animated ? 'transition-all duration-500 ease-out' : ''}
        />
      </svg>
      
      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="text-2xl font-bold text-white">
          {Math.round(animatedProgress)}%
        </div>
        {activeStep && (
          <div className="text-xs text-gray-400 text-center mt-1 max-w-20">
            {activeStep.label}
          </div>
        )}
      </div>
    </div>
  );
};

// Room joining specific progress component
interface RoomJoinProgressProps {
  isJoining: boolean;
  currentStep?: 'connecting' | 'authenticating' | 'joining' | 'loading' | 'complete' | 'error';
  error?: string;
  timeout?: number;
  onCancel?: () => void;
}

export const RoomJoinProgress: React.FC<RoomJoinProgressProps> = ({
  isJoining,
  currentStep = 'connecting',
  error,
  timeout = 30000,
  onCancel
}) => {
  const [timeLeft, setTimeLeft] = useState(Math.floor(timeout / 1000));

  useEffect(() => {
    if (!isJoining) return;
    
    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isJoining, timeout]);

  const steps: ProgressStep[] = [
    {
      id: 'connecting',
      label: 'Connecting',
      description: 'Establishing connection...',
      isCompleted: ['authenticating', 'joining', 'loading', 'complete'].includes(currentStep),
      isActive: currentStep === 'connecting',
      hasError: currentStep === 'error'
    },
    {
      id: 'authenticating',
      label: 'Authenticating',
      description: 'Verifying credentials...',
      isCompleted: ['joining', 'loading', 'complete'].includes(currentStep),
      isActive: currentStep === 'authenticating',
      hasError: false
    },
    {
      id: 'joining',
      label: 'Joining Room',
      description: 'Entering game room...',
      isCompleted: ['loading', 'complete'].includes(currentStep),
      isActive: currentStep === 'joining',
      hasError: false
    },
    {
      id: 'loading',
      label: 'Loading Game',
      description: 'Preparing experience...',
      isCompleted: currentStep === 'complete',
      isActive: currentStep === 'loading',
      hasError: false
    }
  ];

  if (!isJoining && currentStep !== 'error') return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-white mb-2">
            {currentStep === 'error' ? 'Connection Failed' : 'Joining Room...'}
          </h2>
          {currentStep === 'error' && error && (
            <p className="text-red-400 text-sm mb-4">{error}</p>
          )}
        </div>

        {currentStep !== 'error' ? (
          <div className="space-y-6">
            <ProgressIndicator
              steps={steps}
              variant="vertical"
              showLabels={true}
              animated={true}
            />
            
            <div className="flex items-center justify-between text-sm text-gray-400">
              <span>Time remaining: {timeLeft}s</span>
              {onCancel && (
                <button
                  onClick={onCancel}
                  className="text-red-400 hover:text-red-300 transition-colors"
                >
                  Cancel
                </button>
              )}
            </div>
            
            <div className="w-full bg-white/10 rounded-full h-1">
              <div
                className="bg-blue-500 h-1 rounded-full transition-all duration-1000"
                style={{ 
                  width: `${((timeout / 1000 - timeLeft) / (timeout / 1000)) * 100}%` 
                }}
              />
            </div>
          </div>
        ) : (
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto">
              <span className="text-2xl text-red-400">❌</span>
            </div>
            <div className="space-y-2">
              <button
                onClick={onCancel}
                className="w-full py-2 px-4 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-all"
              >
                Try Again
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProgressIndicator;