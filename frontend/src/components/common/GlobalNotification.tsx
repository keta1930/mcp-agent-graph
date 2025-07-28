// src/components/common/GlobalNotification.tsx
import React, { useState, useEffect } from 'react';
import { CheckCircleOutlined, InfoCircleOutlined, ExclamationCircleOutlined, CloseCircleOutlined, CloseOutlined } from '@ant-design/icons';
import './GlobalNotification.css';

export type NotificationType = 'success' | 'info' | 'warning' | 'error';

export interface NotificationItem {
  id: string;
  type: NotificationType;
  title: string;
  message?: string;
  duration?: number; // 自动关闭时间（毫秒），0表示不自动关闭
  onClose?: () => void;
}

interface GlobalNotificationProps {
  notifications: NotificationItem[];
  onRemove: (id: string) => void;
}

const GlobalNotification: React.FC<GlobalNotificationProps> = ({ notifications, onRemove }) => {
  const [visibleNotifications, setVisibleNotifications] = useState<Set<string>>(new Set());

  // 处理通知的显示和自动关闭
  useEffect(() => {
    notifications.forEach(notification => {
      // 新通知立即显示
      if (!visibleNotifications.has(notification.id)) {
        setVisibleNotifications(prev => new Set(prev).add(notification.id));
        
        // 设置自动关闭
        if (notification.duration && notification.duration > 0) {
          setTimeout(() => {
            handleClose(notification.id);
          }, notification.duration);
        }
      }
    });
  }, [notifications, visibleNotifications]);

  const handleClose = (id: string) => {
    // 先隐藏动画
    setVisibleNotifications(prev => {
      const newSet = new Set(prev);
      newSet.delete(id);
      return newSet;
    });
    
    // 延迟移除以允许动画完成
    setTimeout(() => {
      onRemove(id);
    }, 300);
  };

  const getIcon = (type: NotificationType) => {
    switch (type) {
      case 'success':
        return <CheckCircleOutlined style={{ color: '#52c41a' }} />;
      case 'info':
        return <InfoCircleOutlined style={{ color: '#1890ff' }} />;
      case 'warning':
        return <ExclamationCircleOutlined style={{ color: '#faad14' }} />;
      case 'error':
        return <CloseCircleOutlined style={{ color: '#ff4d4f' }} />;
      default:
        return <InfoCircleOutlined style={{ color: '#1890ff' }} />;
    }
  };

  const getTypeClass = (type: NotificationType) => {
    return `notification-${type}`;
  };

  if (notifications.length === 0) {
    return null;
  }

  return (
    <div className="global-notifications-container">
      {notifications.map(notification => (
        <div
          key={notification.id}
          className={`
            global-notification 
            ${getTypeClass(notification.type)}
            ${visibleNotifications.has(notification.id) ? 'visible' : 'hidden'}
          `}
        >
          <div className="notification-content">
            <div className="notification-icon">
              {getIcon(notification.type)}
            </div>
            <div className="notification-text">
              <div className="notification-title">
                {notification.title}
              </div>
              {notification.message && (
                <div className="notification-message">
                  {notification.message}
                </div>
              )}
            </div>
            <div className="notification-close">
              <CloseOutlined 
                onClick={() => handleClose(notification.id)}
                style={{ cursor: 'pointer', color: 'var(--text-secondary)' }}
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default GlobalNotification;