import React, { useState, useEffect, useCallback } from 'react';
import './NotificationSystem.css';

export interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'achievement' | 'kill' | 'death' | 'round';
  title: string;
  message: string;
  duration?: number;
  icon?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'center';
  timestamp?: number;
}

interface NotificationSystemProps {
  maxNotifications?: number;
  defaultDuration?: number;
  position?: Notification['position'];
}

interface NotificationContextType {
  notifications: Notification[];
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp'>) => string;
  removeNotification: (id: string) => void;
  clearAllNotifications: () => void;
  // Gaming-specific notifications
  showKillNotification: (killer: string, victim: string, weapon: string, headshot?: boolean) => void;
  showAchievement: (title: string, description: string, icon?: string) => void;
  showRoundEnd: (winner: 'CT' | 'T', condition: string, mvp?: string) => void;
}

export const NotificationContext = React.createContext<NotificationContextType | undefined>(undefined);

export const useNotifications = () => {
  const context = React.useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

const NotificationSystem: React.FC<NotificationSystemProps> = ({
  maxNotifications = 5,
  defaultDuration = 5000,
  position = 'top-right'
}) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const addNotification = useCallback((notification: Omit<Notification, 'id' | 'timestamp'>) => {
    const id = `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newNotification: Notification = {
      ...notification,
      id,
      timestamp: Date.now(),
      duration: notification.duration ?? defaultDuration,
      position: notification.position ?? position,
    };

    setNotifications(prev => {
      let updated = [newNotification, ...prev];
      
      // Limit number of notifications
      if (updated.length > maxNotifications) {
        updated = updated.slice(0, maxNotifications);
      }
      
      return updated;
    });

    // Auto-remove notification after duration
    if (newNotification.duration > 0) {
      setTimeout(() => {
        removeNotification(id);
      }, newNotification.duration);
    }

    return id;
  }, [defaultDuration, maxNotifications, position]);

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  }, []);

  const clearAllNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  // Gaming-specific notification helpers
  const showKillNotification = useCallback((killer: string, victim: string, weapon: string, headshot = false) => {
    addNotification({
      type: 'kill',
      title: headshot ? 'HEADSHOT!' : 'ELIMINATION',
      message: `${killer} eliminated ${victim} with ${weapon}`,
      duration: 3000,
      icon: headshot ? '🎯' : '💀',
    });
  }, [addNotification]);

  const showAchievement = useCallback((title: string, description: string, icon = '🏆') => {
    addNotification({
      type: 'achievement',
      title: 'Achievement Unlocked!',
      message: `${title}: ${description}`,
      duration: 6000,
      icon,
    });
  }, [addNotification]);

  const showRoundEnd = useCallback((winner: 'CT' | 'T', condition: string, mvp?: string) => {
    const winnerText = winner === 'CT' ? 'Counter-Terrorists' : 'Terrorists';
    let message = `${winnerText} win by ${condition}`;
    if (mvp) {
      message += ` | MVP: ${mvp}`;
    }

    addNotification({
      type: 'round',
      title: 'Round Complete',
      message,
      duration: 4000,
      icon: winner === 'CT' ? '🛡️' : '💣',
    });
  }, [addNotification]);

  const contextValue: NotificationContextType = {
    notifications,
    addNotification,
    removeNotification,
    clearAllNotifications,
    showKillNotification,
    showAchievement,
    showRoundEnd,
  };

  // Group notifications by position
  const groupedNotifications = notifications.reduce((groups, notification) => {
    const pos = notification.position || position;
    if (!groups[pos]) {
      groups[pos] = [];
    }
    groups[pos].push(notification);
    return groups;
  }, {} as Record<string, Notification[]>);

  return (
    <NotificationContext.Provider value={contextValue}>
      {Object.entries(groupedNotifications).map(([pos, notifs]) => (
        <div key={pos} className={`notification-container notification-${pos}`}>
          {notifs.map(notification => (
            <NotificationItem
              key={notification.id}
              notification={notification}
              onClose={() => removeNotification(notification.id)}
            />
          ))}
        </div>
      ))}
    </NotificationContext.Provider>
  );
};

interface NotificationItemProps {
  notification: Notification;
  onClose: () => void;
}

const NotificationItem: React.FC<NotificationItemProps> = ({ notification, onClose }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    // Trigger enter animation
    const enterTimer = setTimeout(() => setIsVisible(true), 10);
    
    // Start progress countdown if duration is set
    if (notification.duration && notification.duration > 0) {
      const startTime = Date.now();
      const progressInterval = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const remaining = Math.max(0, notification.duration! - elapsed);
        const progressPercent = (remaining / notification.duration!) * 100;
        setProgress(progressPercent);

        if (remaining <= 0) {
          clearInterval(progressInterval);
        }
      }, 50);

      return () => {
        clearTimeout(enterTimer);
        clearInterval(progressInterval);
      };
    }

    return () => clearTimeout(enterTimer);
  }, [notification.duration]);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(onClose, 300); // Match CSS transition duration
  };

  const getNotificationIcon = () => {
    if (notification.icon) return notification.icon;
    
    switch (notification.type) {
      case 'info': return 'ℹ️';
      case 'success': return '✅';
      case 'warning': return '⚠️';
      case 'error': return '❌';
      case 'achievement': return '🏆';
      case 'kill': return '💀';
      case 'death': return '☠️';
      case 'round': return '🎯';
      default: return 'ℹ️';
    }
  };

  return (
    <div 
      className={`
        notification-item 
        notification-${notification.type}
        ${isVisible ? 'notification-visible' : ''}
        ${isExiting ? 'notification-exiting' : ''}
      `}
      data-testid="notification"
    >
      {/* Progress bar for timed notifications */}
      {notification.duration && notification.duration > 0 && (
        <div className="notification-progress">
          <div 
            className="notification-progress-bar"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {/* Main notification content */}
      <div className="notification-content">
        <div className="notification-icon">
          {getNotificationIcon()}
        </div>
        
        <div className="notification-text">
          <div className="notification-title">{notification.title}</div>
          <div className="notification-message">{notification.message}</div>
          {notification.timestamp && (
            <div className="notification-timestamp">
              {new Date(notification.timestamp).toLocaleTimeString()}
            </div>
          )}
        </div>

        {/* Action button */}
        {notification.action && (
          <button
            className="notification-action"
            onClick={notification.action.onClick}
          >
            {notification.action.label}
          </button>
        )}

        {/* Close button */}
        <button
          className="notification-close"
          onClick={handleClose}
          aria-label="Close notification"
        >
          ×
        </button>
      </div>
    </div>
  );
};

// Gaming-specific notification components
export const KillFeedNotification: React.FC<{
  killer: string;
  victim: string;
  weapon: string;
  headshot?: boolean;
}> = ({ killer, victim, weapon, headshot }) => {
  const { showKillNotification } = useNotifications();

  useEffect(() => {
    showKillNotification(killer, victim, weapon, headshot);
  }, [killer, victim, weapon, headshot, showKillNotification]);

  return null;
};

export const AchievementNotification: React.FC<{
  title: string;
  description: string;
  icon?: string;
}> = ({ title, description, icon }) => {
  const { showAchievement } = useNotifications();

  useEffect(() => {
    showAchievement(title, description, icon);
  }, [title, description, icon, showAchievement]);

  return null;
};

// Notification provider wrapper
export const NotificationProvider: React.FC<{ 
  children: React.ReactNode;
  options?: NotificationSystemProps;
}> = ({ children, options }) => {
  return (
    <>
      {children}
      <NotificationSystem {...options} />
    </>
  );
};

export default NotificationSystem;