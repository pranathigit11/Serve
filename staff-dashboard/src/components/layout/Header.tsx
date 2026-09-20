import React from 'react';
import { Bell } from 'lucide-react';
import { useLocation } from 'react-router-dom';

const Header: React.FC = () => {
  const location = useLocation();

  const getPageTitle = () => {
    const path = location.pathname.substring(1);
    if (!path) return 'Dashboard';
    return path.charAt(0).toUpperCase() + path.slice(1);
  };

  return (
    <header style={{ 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'space-between', 
      padding: '20px 32px', 
      backgroundColor: 'var(--color-surface)',
      borderBottom: '1px solid var(--color-border)',
      height: '72px'
    }}>
      <h2 style={{ fontSize: '20px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
        {getPageTitle()}
      </h2>

      <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '8px', 
          padding: '6px 12px',
          backgroundColor: 'rgba(135, 159, 45, 0.1)',
          borderRadius: '20px'
        }}>
          <span style={{ 
            width: '8px', 
            height: '8px', 
            backgroundColor: 'var(--color-primary)', 
            borderRadius: '50%' 
          }}></span>
          <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-primary)' }}>
            Krishna & Godavari Night Canteen
          </span>
        </div>

        <button style={{ 
          background: 'none', 
          border: 'none', 
          color: 'var(--color-text-secondary)',
          position: 'relative',
          cursor: 'pointer'
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

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-text-primary)' }}>Admin Staff</p>
            <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>ID: ST-001</p>
          </div>
          <div style={{
            width: '40px',
            height: '40px',
            backgroundColor: 'var(--color-primary)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontWeight: 'bold'
          }}>
            AS
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
