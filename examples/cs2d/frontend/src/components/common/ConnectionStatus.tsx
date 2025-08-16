import { cn } from '@/utils/tailwind';
import React, { useState, useMemo } from 'react';
import { useWebSocket } from '@/contexts/WebSocketContext';

interface ConnectionStatusProps {
  className?: string;
}

export const ConnectionStatus: React.FC<ConnectionStatusProps> = ({ className }) => {
  const { connectionStatus, latency, reconnectAttempts, connect } = useWebSocket();
  const [isMinimized, setIsMinimized] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

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

  const reconnect = (e: React.MouseEvent) => {
    e.stopPropagation();
    connect();
  };

  // Remove unused formatTime function

  return (
    <div 
      className={cn('connection-status', connectionStatus, className, {
        'minimized': isMinimized
      })} 
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
      <div className="status-indicator">
        <div className="status-dot" />
      </div>
      
      {!isMinimized && (
        <div className="status-content">
          <div className="status-text">
            <span className="status-label">{statusText}</span>
            {latency !== null && (
              <span className="latency">{latency}ms</span>
            )}
          </div>
          
          <button 
            className="toggle-details-btn"
            onClick={toggleDetails}
          >
            {showDetails ? '▼' : '▶'}
          </button>
          
          {showDetails && (
            <div className="status-details">
              <div className="detail-item">
                <span className="detail-label">Reconnect attempts:</span>
                <span className="detail-value">{reconnectAttempts}</span>
              </div>
            </div>
          )}
          
          {connectionStatus === 'disconnected' && (
            <div className="status-actions">
              <button 
                onClick={reconnect} 
                className="reconnect-btn hover:scale-105 active:scale-95 transition-transform"
              >
                Reconnect
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ConnectionStatus;