import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, ShoppingBag, UtensilsCrossed, Bell, User, LogOut, X } from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const handleLogout = () => {
    // Replace current history entry so user can't navigate 'back' to dashboard
    const roleSelectionUrl = import.meta.env.VITE_ROLE_SELECTION_URL || 'http://localhost:45678';
    window.location.replace(roleSelectionUrl);
  };

  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: <LayoutDashboard size={20} /> },
    { name: 'Orders', path: '/orders', icon: <ShoppingBag size={20} /> },
    { name: 'Menu', path: '/menu', icon: <UtensilsCrossed size={20} /> },
    { name: 'Notifications', path: '/notifications', icon: <Bell size={20} /> },
    { name: 'Profile', path: '/profile', icon: <User size={20} /> },
  ];

  return (
    <aside className={`sidebar ${isOpen ? 'open' : ''} flex flex-col justify-between`}>
      <div>
        <div className="sidebar-header">
          {/* Brand */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '0 16px', marginBottom: '32px' }}>
            <img src="/logo.png" alt="SERVE Logo" style={{ width: '36px', height: 'auto' }} />
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '24px', fontWeight: 900, color: 'var(--color-text-primary)', letterSpacing: '1px', lineHeight: '1.1' }}>SERVE</span>
              <span style={{ color: 'var(--color-primary)', fontSize: '11px', fontWeight: 700, letterSpacing: '0.5px' }}>STAFF DASHBOARD</span>
            </div>
          </div>
          <button className="mobile-only close-sidebar-btn" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        {/* Navigation */}
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '0 16px' }}>
          {navItems.map((item) => (
            <NavLink
              key={item.name}
              to={item.path}
              onClick={onClose}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px 16px',
                borderRadius: '8px',
                color: isActive ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                backgroundColor: isActive ? 'rgba(135, 159, 45, 0.1)' : 'transparent',
                fontWeight: isActive ? 600 : 500,
                transition: 'all 0.2s',
              })}
            >
              {item.icon}
              <span>{item.name}</span>
            </NavLink>
          ))}
        </nav>
      </div>

      {/* Logout */}
      <div style={{ padding: '0 16px' }}>
        <button
          onClick={handleLogout}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            width: '100%',
            padding: '12px 16px',
            borderRadius: '8px',
            color: 'var(--color-accent)',
            backgroundColor: 'transparent',
            border: 'none',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'background-color 0.2s',
          }}
          onMouseOver={(e) => (e.currentTarget.style.backgroundColor = 'rgba(232, 106, 46, 0.1)')}
          onMouseOut={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
        >
          <LogOut size={20} />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
