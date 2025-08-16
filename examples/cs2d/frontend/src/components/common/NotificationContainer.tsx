import { cn } from '@/utils/tailwind';
import React from 'react';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '@/stores/app'

interface NotificationContainerProps {
  // TODO: Define props from Vue component
}

export const NotificationContainer: React.FC<NotificationContainerProps> = (props) => {
  const navigate = useNavigate();
  
  

const appStore = useApp()

const notifications = useMemo(() => appStore.notifications, [])

function removeNotification(id: string) {
  appStore.removeNotification(id)
}

  return (
    <div className="container mx-auto px-4">
      <div className="notification-container">
    <TransitionGroup name="notification" tag="div">
      <div
        {notifications.map((notification, index) => (
        key={notification.id}
        className="notification"
        className={notification.type}
        onClick={removeNotification(notification.id)}
      >
        <div className="notification-content">
          <h4 {notification.title && ( className="notification-title">
            {notification.title }
          </h4>)}
          <p className="notification-message">{notification.message }</p>)}
        </div>
        <button className="notification-close" @click.stop="removeNotification(notification.id)">
          ×
        </button>)}
      </div>
    </TransitionGroup>)}
  </div>
    </div>
  );
};

export default NotificationContainer;