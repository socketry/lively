import React from 'react';

interface Notification {
  id: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'error';
  timestamp: number;
}

interface NotificationsHUDProps {
  notifications: Notification[];
}

const typeIcons = {
  info: 'ℹ️',
  warning: '⚠️',
  success: '✅',
  error: '❌'
};

const typeColors = {
  info: 'bg-blue-900 border-blue-500 text-blue-200',
  warning: 'bg-yellow-900 border-yellow-500 text-yellow-200',
  success: 'bg-green-900 border-green-500 text-green-200',
  error: 'bg-red-900 border-red-500 text-red-200'
};

export const NotificationsHUD: React.FC<NotificationsHUDProps> = ({ notifications }) => {
  const visibleNotifications = notifications
    .filter(n => (Date.now() - n.timestamp) < 5000) // Show for 5 seconds
    .slice(-3); // Max 3 notifications

  if (visibleNotifications.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2 min-w-[400px]">
      {visibleNotifications.map((notification, index) => {
        const age = Date.now() - notification.timestamp;
        const opacity = Math.max(0.3, 1 - (age / 5000));
        const isNew = age < 500;

        return (
          <div
            key={notification.id}
            className={`
              ${typeColors[notification.type]}
              border-2 rounded-lg px-4 py-3 transition-all duration-300 transform
              ${isNew ? 'scale-105 animate-pulse' : ''}
            `}
            style={{ opacity }}
          >
            <div className="flex items-center space-x-3">
              <div className="text-2xl">{typeIcons[notification.type]}</div>
              <div className="flex-1">
                <div className="font-bold text-lg">{notification.message}</div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};