import React from 'react';
import { Menu as MenuIcon } from 'lucide-react';
import { useLocation } from 'react-router-dom';

interface HeaderProps {
  onMenuClick: () => void;
}

const Header: React.FC<HeaderProps> = ({ onMenuClick }) => {
  const location = useLocation();

  const getPageTitle = () => {
    const path = location.pathname.substring(1);
    if (!path) return 'Dashboard';
    return path.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  return (
    <header className="header" style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '16px 24px',
      backgroundColor: 'var(--color-surface)',
      borderBottom: '1px solid var(--color-border)',
      position: 'sticky',
      top: 0,
      zIndex: 10,
    }}>
      <div className="flex items-center gap-4" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <button className="mobile-only menu-btn" onClick={onMenuClick} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
          <MenuIcon size={24} />
        </button>
        <h2 className="header-title" style={{ fontSize: '20px', fontWeight: 800, margin: 0 }}>
          {getPageTitle()}
        </h2>
      </div>

      <div className="header-actions" style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
        <div className="canteen-indicator" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 12px', backgroundColor: 'var(--color-background)', borderRadius: '20px' }}>
          <span style={{ 
            width: '8px', 
            height: '8px', 
            backgroundColor: 'var(--color-primary)', 
            borderRadius: '50%',
            flexShrink: 0
          }}></span>
          <span className="canteen-name" style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-text-secondary)' }}>
            System Administrator
          </span>
        </div>
      </div>
    </header>
  );
};

export default Header;
