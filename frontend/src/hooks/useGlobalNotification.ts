// src/hooks/useGlobalNotification.ts
import { useState, useCallback } from 'react';
import { NotificationItem, NotificationType } from '../components/common/GlobalNotification';

let notificationId = 0;

export const useGlobalNotification = () => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  const addNotification = useCallback((
    type: NotificationType,
    title: string,
    message?: string,
    duration: number = 5000
  ) => {
    const id = `notification_${++notificationId}`;
    const notification: NotificationItem = {
      id,
      type,
      title,
      message,
      duration,
    };

    setNotifications(prev => [...prev, notification]);
    return id;
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  }, []);

  const success = useCallback((title: string, message?: string, duration?: number) => {
    return addNotification('success', title, message, duration);
  }, [addNotification]);

  const info = useCallback((title: string, message?: string, duration?: number) => {
    return addNotification('info', title, message, duration);
  }, [addNotification]);

  const warning = useCallback((title: string, message?: string, duration?: number) => {
    return addNotification('warning', title, message, duration);
  }, [addNotification]);

  const error = useCallback((title: string, message?: string, duration?: number) => {
    return addNotification('error', title, message, duration);
  }, [addNotification]);

  const clear = useCallback(() => {
    setNotifications([]);
  }, []);

  return {
    notifications,
    addNotification,
    removeNotification,
    success,
    info,
    warning,
    error,
    clear
  };
};