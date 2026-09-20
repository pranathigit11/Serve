import React from 'react';
import { useAppContext } from '../context/AppContext';

const Notifications: React.FC = () => {
  const { notifications, markAllNotificationsRead, markNotificationRead } = useAppContext();

  return (
    <div className="card" style={{ maxWidth: '800px', margin: '0 auto', minHeight: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 700 }}>Notifications</h2>
        <button onClick={markAllNotificationsRead} className="btn btn-outline" style={{ padding: '6px 12px', fontSize: '14px' }}>
          Mark all as read
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {notifications.map(notification => (
          <div 
            key={notification.id} 
            onClick={() => markNotificationRead(notification.id)}
            style={{
              padding: '16px',
              borderRadius: '8px',
              backgroundColor: notification.read ? 'transparent' : 'rgba(135, 159, 45, 0.05)',
              border: `1px solid ${notification.read ? 'var(--color-border)' : 'var(--color-primary)'}`,
              display: 'flex',
              gap: '16px',
              alignItems: 'flex-start',
              cursor: notification.read ? 'default' : 'pointer'
            }}
          >
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
            {!notification.read && (
              <button 
                className="btn btn-outline" 
                style={{ padding: '4px 8px', fontSize: '12px' }}
                onClick={(e) => {
                  e.stopPropagation();
                  markNotificationRead(notification.id);
                }}
              >
                Mark Read
              </button>
            )}
          </div>
        ))}
        {notifications.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px', color: 'var(--color-text-secondary)' }}>
            No notifications.
          </div>
        )}
      </div>
    </div>
  );
};

export default Notifications;
