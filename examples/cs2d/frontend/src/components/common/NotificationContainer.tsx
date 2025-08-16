import { cn } from '@/utils/tailwind';
import React, { useEffect } from 'react';
import { useApp } from '@/contexts/AppContext';

const NotificationContainer: React.FC = () => {
  const { state, actions } = useApp();
  const { notifications } = state;
  const { removeNotification } = actions;

  useEffect(() => {
    if (!notifications || notifications.length === 0) return;
    
    // Auto-remove notifications after 5 seconds
    const timers = notifications.map((notification: any) => {
      return setTimeout(() => {
        removeNotification(notification.id);
      }, 5000);
    });

    return () => {
      timers.forEach(timer => clearTimeout(timer));
    };
  }, [notifications, removeNotification]);

  if (!notifications || notifications.length === 0) return null;

  return (
    <div className="notification-container">
      {notifications.map((notification: any) => (
        <div 
          key={notification.id} 
          className={cn('notification', notification.type)}
        >
          <div className="notification-content">
            <h4 className="notification-title">{notification.title}</h4>
            <p className="notification-message">{notification.message}</p>
          </div>
          <button 
            onClick={() => removeNotification(notification.id)}
            className="notification-close"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
};

export default NotificationContainer;