import React, { useState } from 'react';
import { mockNotifications } from '../data/mockNotifications';

const Notifications: React.FC = () => {
  const [notifications, setNotifications] = useState(mockNotifications);

  const markAllAsRead = () => {
    setNotifications(notifications.map(n => ({ ...n, read: true })));
  };

  return (
    <div className="card" style={{ maxWidth: '800px', margin: '0 auto', minHeight: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 700 }}>Notifications</h2>
        <button onClick={markAllAsRead} className="btn btn-outline" style={{ padding: '6px 12px', fontSize: '14px' }}>
          Mark all as read
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {notifications.map(notification => (
          <div key={notification.id} style={{
            padding: '16px',
            borderRadius: '8px',
            backgroundColor: notification.read ? 'transparent' : 'rgba(135, 159, 45, 0.05)',
            border: `1px solid ${notification.read ? 'var(--color-border)' : 'var(--color-primary)'}`,
            display: 'flex',
            gap: '16px',
            alignItems: 'flex-start'
          }}>
            <div style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: notification.type === 'alert' ? 'var(--color-accent)' : 'var(--color-primary)',
              marginTop: '6px'
            }} />
            <div style={{ flex: 1 }}>
              <p style={{ 
                fontSize: '16px', 
                fontWeight: notification.read ? 500 : 600,
                color: 'var(--color-text-primary)'
              }}>
                {notification.message}
              </p>
              <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
                {notification.createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Notifications;
