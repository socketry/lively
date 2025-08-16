import { cn } from '@/utils/tailwind';
import React from 'react';

interface LoadingOverlayProps {
  isLoading?: boolean;
  message?: string;
  className?: string;
}

const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ 
  isLoading = false, 
  message = 'Loading...', 
  className 
}) => {
  if (!isLoading) return null;

  return (
    <div className={cn('loading-overlay', className)}>
      <div className="loading-content">
        <div className="loading-spinner" />
        <p className="loading-message">{message}</p>
      </div>
    </div>
  );
};

export default LoadingOverlay;