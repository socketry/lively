import { cn } from '@/utils/tailwind';
import React, { useEffect, useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import type { GameNotification } from '@/types/game';

interface NotificationProps {
  notification: GameNotification;
  onRemove: (id: string) => void;
}

const NotificationItem: React.FC<NotificationProps> = ({ notification, onRemove }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);

  useEffect(() => {
    // Slide in animation
    const timer = setTimeout(() => setIsVisible(true), 50);
    return () => clearTimeout(timer);
  }, []);

  const handleRemove = () => {
    setIsRemoving(true);
    setTimeout(() => onRemove(notification.id), 300);
  };

  const getNotificationIcon = () => {
    switch (notification.type) {
      case 'success':
        return '✅';
      case 'error':
        return '❌';
      case 'warning':
        return '⚠️';
      case 'info':
        return 'ℹ️';
      default:
        return '🔔';
    }
  };

  const getNotificationStyle = () => {
    switch (notification.type) {
      case 'success':
        return 'border-green-500/30 bg-green-500/20 text-green-400';
      case 'error':
        return 'border-red-500/30 bg-red-500/20 text-red-400';
      case 'warning':
        return 'border-yellow-500/30 bg-yellow-500/20 text-yellow-400';
      case 'info':
        return 'border-blue-500/30 bg-blue-500/20 text-blue-400';
      default:
        return 'border-white/20 bg-white/10 text-white';
    }
  };

  return (
    <div 
      className={cn(
        'backdrop-blur-xl border rounded-lg p-4 shadow-2xl transition-all duration-300 transform',
        getNotificationStyle(),
        isVisible && !isRemoving ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0',
        'hover:scale-[1.02] cursor-pointer group'
      )}
      onClick={handleRemove}
      role="alert"
      aria-live="polite"
    >
      <div className="flex items-start space-x-3">
        <div className="text-lg flex-shrink-0 animate-bounce">
          {getNotificationIcon()}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <div>
              <h4 className="font-semibold text-sm leading-tight">
                {notification.title}
              </h4>
              <p className="text-sm opacity-90 mt-1 leading-tight">
                {notification.message}
              </p>
            </div>
            
            <button 
              onClick={(e) => {
                e.stopPropagation();
                handleRemove();
              }}
              className="ml-2 text-lg opacity-60 hover:opacity-100 transition-opacity group-hover:scale-110"
              aria-label="Close notification"
            >
              ×
            </button>
          </div>
          
          {notification.action && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                notification.action?.callback();
                handleRemove();
              }}
              className="mt-2 text-xs px-2 py-1 bg-white/10 hover:bg-white/20 rounded transition-colors"
            >
              {notification.action.label}
            </button>
          )}
        </div>
      </div>
      
      {/* Progress bar for auto-dismiss */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20 rounded-b-lg overflow-hidden">
        <div 
          className="h-full bg-current opacity-60 transition-all duration-300 ease-linear"
          style={{
            width: '100%',
            animation: 'notification-progress 5s linear forwards'
          }}
        />
      </div>
    </div>
  );
};

const NotificationContainer: React.FC = () => {
  const { state, actions } = useApp();
  const { notifications = [] } = state || {};
  const { removeNotification } = actions || {};

  useEffect(() => {
    if (!notifications || notifications.length === 0 || !removeNotification) return;
    
    // Auto-remove notifications after their duration
    const timers = notifications.map((notification: GameNotification) => {
      const duration = notification.duration || 5000;
      return setTimeout(() => {
        removeNotification(notification.id);
      }, duration);
    });

    return () => {
      timers.forEach(timer => clearTimeout(timer));
    };
  }, [notifications, removeNotification]);

  if (!notifications || notifications.length === 0) return null;

  return (
    <>
      <style jsx>{`
        @keyframes notification-progress {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>
      
      <div className="fixed top-4 right-4 z-[100] space-y-3 max-w-sm w-full pointer-events-none">
        {notifications.map((notification: GameNotification, index) => (
          <div
            key={notification.id}
            className="pointer-events-auto"
            style={{
              animationDelay: `${index * 100}ms`,
              animationFillMode: 'both'
            }}
          >
            <NotificationItem 
              notification={notification}
              onRemove={removeNotification || (() => {})}
            />
          </div>
        ))}
      </div>
    </>
  );
};

// Helper hook for creating notifications with game-specific actions
export const useGameNotifications = () => {
  const { actions } = useApp();
  const { addNotification } = actions || {};

  const notifyPlayerReady = (playerName: string, isReady: boolean) => {
    if (!addNotification) return;
    
    addNotification({
      id: `ready-${playerName}-${Date.now()}`,
      type: isReady ? 'success' : 'warning',
      title: isReady ? 'Player Ready' : 'Player Not Ready',
      message: `${playerName} is ${isReady ? 'ready' : 'not ready'} to play`,
      duration: 3000
    });
  };

  const notifyBotAction = (action: 'added' | 'removed', botName: string, difficulty?: string) => {
    if (!addNotification) return;
    
    addNotification({
      id: `bot-${action}-${Date.now()}`,
      type: action === 'added' ? 'success' : 'info',
      title: `Bot ${action === 'added' ? 'Added' : 'Removed'}`,
      message: `${botName}${difficulty ? ` (${difficulty})` : ''} ${action === 'added' ? 'joined' : 'left'} the game`,
      duration: 3000
    });
  };

  const notifyConnectionStatus = (status: 'connected' | 'disconnected' | 'error', message?: string) => {
    if (!addNotification) return;
    
    addNotification({
      id: `connection-${status}-${Date.now()}`,
      type: status === 'connected' ? 'success' : status === 'error' ? 'error' : 'warning',
      title: `Connection ${status.charAt(0).toUpperCase() + status.slice(1)}`,
      message: message || `WebSocket connection ${status}`,
      duration: status === 'error' ? 7000 : 4000,
      action: status === 'error' ? {
        label: 'Retry',
        callback: () => window.location.reload()
      } : undefined
    });
  };

  const notifyGameAction = (action: string, message: string, type: GameNotification['type'] = 'info') => {
    if (!addNotification) return;
    
    addNotification({
      id: `game-${action}-${Date.now()}`,
      type,
      title: action.charAt(0).toUpperCase() + action.slice(1),
      message,
      duration: 4000
    });
  };

  return {
    notifyPlayerReady,
    notifyBotAction,
    notifyConnectionStatus,
    notifyGameAction
  };
};

export default NotificationContainer;