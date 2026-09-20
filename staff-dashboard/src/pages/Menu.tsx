import React, { useState } from 'react';
import { mockMenu } from '../data/mockMenu';
import type { MenuAvailability } from '../types';

const Menu: React.FC = () => {
  const [menuItems, setMenuItems] = useState(mockMenu);

  const handleToggle = (id: string, currentStatus: MenuAvailability) => {
    const newStatus: MenuAvailability = currentStatus === 'AVAILABLE' ? 'OUT_OF_STOCK' : 'AVAILABLE';
    setMenuItems(menuItems.map(item => item.id === id ? { ...item, availability: newStatus } : item));
  };

  return (
    <div className="card" style={{ minHeight: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 700 }}>Menu Management</h2>
        <button className="btn btn-primary">Add Item</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '24px' }}>
        {menuItems.map(item => (
          <div key={item.id} style={{
            border: '1px solid var(--color-border)',
            borderRadius: '12px',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            opacity: item.availability === 'OUT_OF_STOCK' ? 0.7 : 1
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <span className="badge" style={{ backgroundColor: 'var(--color-background)', color: 'var(--color-text-secondary)', marginBottom: '8px', display: 'inline-block' }}>
                  {item.category}
                </span>
                <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '4px' }}>{item.name}</h3>
                <div style={{ fontWeight: 600, color: 'var(--color-primary)' }}>₹{item.price}</div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: '16px', borderTop: '1px solid var(--color-background)' }}>
              <span style={{ 
                fontSize: '14px', 
                fontWeight: 600,
                color: item.availability === 'AVAILABLE' ? 'var(--color-primary)' : 'var(--color-accent)'
              }}>
                {item.availability === 'AVAILABLE' ? 'AVAILABLE' : 'OUT OF STOCK'}
              </span>
              <button 
                onClick={() => handleToggle(item.id, item.availability)}
                className="btn btn-outline" 
                style={{ padding: '6px 12px', fontSize: '12px' }}
              >
                Toggle
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Menu;
