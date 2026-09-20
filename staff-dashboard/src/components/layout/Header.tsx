import React from 'react';
import { Bell, Menu as MenuIcon } from 'lucide-react';
import { useLocation } from 'react-router-dom';

interface HeaderProps {
  onMenuClick: () => void;
}

const Header: React.FC<HeaderProps> = ({ onMenuClick }) => {
  const location = useLocation();

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
            Krishna & Godavari Night Canteen
          </span>
        </div>

        <button style={{ 
          background: 'none', 
          border: 'none', 
          color: 'var(--color-text-secondary)',
          position: 'relative',
          cursor: 'pointer',
          flexShrink: 0
        }}>
          <Bell size={20} />
          <span style={{
            position: 'absolute',
            top: '-2px',
            right: '-2px',
            width: '8px',
            height: '8px',
            backgroundColor: 'var(--color-accent)',
            borderRadius: '50%'
          }}></span>
        </button>

      </div>
    </header>
  );
};

export default Header;
