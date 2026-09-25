import React from 'react';
import { Bell, Menu as MenuIcon } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAppContext } from '../../context/AppContext';

interface HeaderProps {
  onMenuClick: () => void;
}

const Header: React.FC<HeaderProps> = ({ onMenuClick }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { notifications, profile } = useAppContext();

  const unreadCount = notifications.filter(n => !n.read).length;

  const getPageTitle = () => {
    const path = location.pathname.substring(1);
    if (!path) return 'Dashboard';
    return path.charAt(0).toUpperCase() + path.slice(1);
  };

  return (
    <header className="header">
      <div className="flex items-center gap-4">
        <button className="mobile-only menu-btn" onClick={onMenuClick}>
          <MenuIcon size={24} />
        </button>
        <h2 className="header-title">
          {getPageTitle()}
        </h2>
      </div>

      <div className="header-actions">
        <div className="canteen-indicator">
          <span style={{ 
            width: '8px', 
            height: '8px', 
            backgroundColor: 'var(--color-primary)', 
            borderRadius: '50%',
            flexShrink: 0
          }}></span>
          <span className="canteen-name">
            {profile?.canteen || 'Loading...'}
          </span>
        </div>

        <button 
          onClick={() => navigate('/notifications')}
          style={{ 
            background: 'none', 
            border: 'none', 
            color: 'var(--color-text-secondary)',
            position: 'relative',
            cursor: 'pointer',
            flexShrink: 0
          }}
        >
          <Bell size={20} />
          {unreadCount > 0 && (
            <span style={{
              position: 'absolute',
              top: '-4px',
              right: '-6px',
              minWidth: '16px',
              height: '16px',
              padding: '0 4px',
              backgroundColor: 'var(--color-accent)',
              borderRadius: '8px',
              color: 'white',
              fontSize: '10px',
              fontWeight: 'bold',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              {unreadCount}
            </span>
          )}
        </button>

      </div>
    </header>
  );
};

export default Header;
