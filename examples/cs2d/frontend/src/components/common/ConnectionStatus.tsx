import { cn } from '@/utils/tailwind';
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useWebSocket } from '@/contexts/WebSocketContext';

interface ConnectionStatusProps {
  className?: string;
  showReconnectButton?: boolean;
  autoReconnect?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
}

export const ConnectionStatus: React.FC<ConnectionStatusProps> = ({ 
  className,
  showReconnectButton = true,
  autoReconnect = true,
  reconnectInterval = 5000,
  maxReconnectAttempts = 5
}) => {
  const { connectionStatus, latency, reconnectAttempts, connect } = useWebSocket();
  const [isMinimized, setIsMinimized] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [nextReconnectIn, setNextReconnectIn] = useState(0);

  const statusText = useMemo(() => {
    switch (connectionStatus) {
      case 'connected':
        return 'Connected';
      case 'connecting':
        return 'Connecting...';
      case 'disconnected':
        return 'Disconnected';
      case 'error':
        return 'Connection Error';
      case 'offline':
        return 'Offline';
      default:
        return 'Unknown';
    }
  }, [connectionStatus]);

  const statusColor = useMemo(() => {
    switch (connectionStatus) {
      case 'connected':
        return 'text-green-400 border-green-500/30 bg-green-500/20';
      case 'connecting':
        return 'text-yellow-400 border-yellow-500/30 bg-yellow-500/20';
      case 'disconnected':
        return 'text-red-400 border-red-500/30 bg-red-500/20';
      case 'error':
        return 'text-red-400 border-red-500/30 bg-red-500/20';
      case 'offline':
        return 'text-gray-400 border-gray-500/30 bg-gray-500/20';
      default:
        return 'text-gray-400 border-gray-500/30 bg-gray-500/20';
    }
  }, [connectionStatus]);

  const statusIcon = useMemo(() => {
    switch (connectionStatus) {
      case 'connected':
        return '🟢';
      case 'connecting':
        return '🟡';
      case 'disconnected':
        return '🔴';
      case 'error':
        return '❌';
      case 'offline':
        return '⚫';
      default:
        return '⚪';
    }
  }, [connectionStatus]);

  const shouldShowReconnect = useMemo(() => {
    return showReconnectButton && 
           (connectionStatus === 'disconnected' || connectionStatus === 'error') &&
           reconnectAttempts < maxReconnectAttempts;
  }, [connectionStatus, reconnectAttempts, maxReconnectAttempts, showReconnectButton]);

  // Auto-reconnect logic
  const attemptReconnect = useCallback(async () => {
    if (isReconnecting || reconnectAttempts >= maxReconnectAttempts) return;
    
    setIsReconnecting(true);
    try {
      await connect();
    } finally {
      setIsReconnecting(false);
    }
  }, [connect, isReconnecting, reconnectAttempts, maxReconnectAttempts]);

  // Countdown timer for next reconnect attempt
  useEffect(() => {
    let countdownInterval: NodeJS.Timeout;
    let reconnectTimeout: NodeJS.Timeout;

    if (autoReconnect && 
        (connectionStatus === 'disconnected' || connectionStatus === 'error') &&
        reconnectAttempts < maxReconnectAttempts &&
        !isReconnecting) {
      
      // Start countdown
      let countdown = Math.floor(reconnectInterval / 1000);
      setNextReconnectIn(countdown);
      
      countdownInterval = setInterval(() => {
        countdown -= 1;
        setNextReconnectIn(countdown);
        
        if (countdown <= 0) {
          clearInterval(countdownInterval);
        }
      }, 1000);

      // Schedule reconnect
      reconnectTimeout = setTimeout(() => {
        attemptReconnect();
      }, reconnectInterval);
    }

    return () => {
      if (countdownInterval) clearInterval(countdownInterval);
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      setNextReconnectIn(0);
    };
  }, [connectionStatus, reconnectAttempts, autoReconnect, reconnectInterval, maxReconnectAttempts, isReconnecting, attemptReconnect]);

  const toggleMinimized = () => {
    setIsMinimized(!isMinimized);
    if (isMinimized) {
      setShowDetails(false);
    }
  };

  const toggleDetails = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowDetails(!showDetails);
  };

  const handleManualReconnect = (e: React.MouseEvent) => {
    e.stopPropagation();
    attemptReconnect();
  };

  return (
    <div 
      className={cn(
        'backdrop-blur-md border rounded-lg px-3 py-2 transition-all duration-300 cursor-pointer',
        statusColor,
        isMinimized ? 'w-12 h-12' : 'min-w-48',
        className
      )} 
      onClick={toggleMinimized}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          toggleMinimized();
        }
      }}
      role="button"
      tabIndex={0}
      aria-label={`Connection status: ${statusText}. Click to ${isMinimized ? 'expand' : 'collapse'} details.`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <span className="text-lg animate-pulse">{statusIcon}</span>
          {!isMinimized && (
            <div className="flex flex-col">
              <span className="text-sm font-semibold">{statusText}</span>
              {latency !== undefined && (
                <span className="text-xs opacity-80">{latency}ms</span>
              )}
              {nextReconnectIn > 0 && autoReconnect && (
                <span className="text-xs opacity-60">
                  Reconnecting in {nextReconnectIn}s
                </span>
              )}
            </div>
          )}
        </div>
        
        {!isMinimized && (
          <button 
            className="text-sm opacity-60 hover:opacity-100 transition-opacity"
            onClick={toggleDetails}
            aria-label={showDetails ? 'Hide details' : 'Show details'}
          >
            {showDetails ? '▼' : '▶'}
          </button>
        )}
      </div>
      
      {!isMinimized && showDetails && (
        <div className="mt-2 pt-2 border-t border-white/20 space-y-1">
          <div className="flex justify-between text-xs">
            <span className="opacity-60">Reconnect attempts:</span>
            <span>{reconnectAttempts}/{maxReconnectAttempts}</span>
          </div>
          {connectionStatus === 'connected' && latency && (
            <div className="flex justify-between text-xs">
              <span className="opacity-60">Latency:</span>
              <span className={cn(
                latency < 50 ? 'text-green-400' :
                latency < 100 ? 'text-yellow-400' : 'text-red-400'
              )}>
                {latency}ms
              </span>
            </div>
          )}
        </div>
      )}
      
      {!isMinimized && shouldShowReconnect && (
        <div className="mt-2 pt-2 border-t border-white/20">
          <button 
            onClick={handleManualReconnect} 
            disabled={isReconnecting}
            className={cn(
              'w-full py-1 px-2 text-xs rounded transition-all',
              'bg-white/10 hover:bg-white/20 active:scale-95',
              isReconnecting && 'opacity-50 cursor-not-allowed'
            )}
          >
            {isReconnecting ? 'Reconnecting...' : 'Reconnect Now'}
          </button>
        </div>
      )}
      
      {!isMinimized && reconnectAttempts >= maxReconnectAttempts && (
        <div className="mt-2 pt-2 border-t border-red-500/20 text-xs text-red-400">
          Max reconnect attempts reached. Please refresh the page.
        </div>
      )}
    </div>
  );
};

export default ConnectionStatus;