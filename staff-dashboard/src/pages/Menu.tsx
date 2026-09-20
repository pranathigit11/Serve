import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import type { MenuItem, MenuAvailability } from '../types';

const MENU_CATEGORIES = [
  'Sandwiches',
  'Desi Bite Bites',
  'Omelettes',
  'Juices',
  'Dosas',
  'Hot Beverages'
];

const Menu: React.FC = () => {
  const { menuItems, updateMenuAvailability, addMenuItem, updateMenuItem } = useAppContext();
  
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All Categories');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);

  // Form state
  const [formData, setFormData] = useState<Partial<MenuItem>>({
    name: '',
    category: '',
    price: 0,
    description: '',
    prepTime: '',
    availability: 'AVAILABLE',
  });

  const categories = ['All Categories', ...MENU_CATEGORIES];

  const filteredMenu = menuItems.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = categoryFilter === 'All Categories' || item.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const handleToggle = (id: string, currentStatus: MenuAvailability) => {
    const newStatus: MenuAvailability = currentStatus === 'AVAILABLE' ? 'OUT_OF_STOCK' : 'AVAILABLE';
    updateMenuAvailability(id, newStatus);
  };

  const openAddModal = () => {
    setEditingItem(null);
    setFormData({
      name: '',
      category: '',
      price: 0,
      description: '',
      prepTime: '',
      availability: 'AVAILABLE',
    });
    setIsModalOpen(true);
  };

  const openEditModal = (item: MenuItem) => {
    setEditingItem(item);
    setFormData({ ...item });
    setIsModalOpen(true);
  };

  const handleSave = () => {
    if (!formData.category) {
      alert("Please select a category.");
      return;
    }
    if (!formData.name || !formData.price) {
      alert("Please fill in the required fields: Name, Price");
      return;
    }
    
    if (editingItem) {
      updateMenuItem(formData as MenuItem);
    } else {
      const newItem: MenuItem = {
        ...(formData as MenuItem),
        id: `m${Date.now()}`,
        imageUrl: '/placeholder-food.jpg', // mock image
      };
      addMenuItem(newItem);
    }
    setIsModalOpen(false);
  };

  return (
    <div className="card" style={{ minHeight: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 700 }}>Menu Management</h2>
        <button className="btn btn-primary" onClick={openAddModal}>Add Item</button>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              style={{
                padding: '8px 16px',
                borderRadius: '20px',
                border: 'none',
                fontWeight: 600,
                fontSize: '14px',
                cursor: 'pointer',
                backgroundColor: categoryFilter === cat ? 'var(--color-primary)' : 'var(--color-background)',
                color: categoryFilter === cat ? 'white' : 'var(--color-text-secondary)'
              }}
            >
              {cat}
            </button>
          ))}
        </div>
        
        <div style={{ flex: '1 1 250px', minWidth: '200px' }}>
          <input 
            type="text" 
            placeholder="Search menu items..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              padding: '10px 16px',
              borderRadius: '8px',
              border: '1px solid var(--color-border)',
              width: '100%',
              outline: 'none',
              fontFamily: 'inherit'
            }}
          />
        </div>
      </div>

      <div className="menu-grid" style={{ display: 'grid', gap: '24px' }}>
        {filteredMenu.map(item => (
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
              <button 
                className="btn btn-outline" 
                style={{ padding: '4px 12px', fontSize: '12px' }}
                onClick={() => openEditModal(item)}
              >
                Edit
              </button>
            </div>
            
            {item.description && (
              <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>{item.description}</p>
            )}

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
      
      {filteredMenu.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--color-text-secondary)' }}>
          No menu items found.
        </div>
      )}

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="card modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '24px' }}>
              {editingItem ? 'Edit Menu Item' : 'Add Menu Item'}
            </h2>
            
            <div className="flex flex-col gap-4">
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, fontSize: '14px' }}>Food Name</label>
                <input 
                  type="text" 
                  value={formData.name} 
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--color-border)', outline: 'none' }}
                />
              </div>
              
              <div className="flex gap-4">
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, fontSize: '14px' }}>Category</label>
                  <select 
                    value={formData.category} 
                    onChange={e => setFormData({...formData, category: e.target.value})}
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--color-border)', outline: 'none', background: 'var(--color-surface)' }}
                  >
                    <option value="" disabled>Select Category</option>
                    {MENU_CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, fontSize: '14px' }}>Price (₹)</label>
                  <input 
                    type="number" 
                    value={formData.price} 
                    onChange={e => setFormData({...formData, price: Number(e.target.value)})}
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--color-border)', outline: 'none' }}
                  />
                </div>
              </div>
              
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, fontSize: '14px' }}>Description</label>
                <textarea 
                  value={formData.description} 
                  onChange={e => setFormData({...formData, description: e.target.value})}
                  rows={3}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--color-border)', outline: 'none', fontFamily: 'inherit' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, fontSize: '14px' }}>Preparation Time</label>
                <input 
                  type="text" 
                  value={formData.prepTime} 
                  onChange={e => setFormData({...formData, prepTime: e.target.value})}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--color-border)', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, fontSize: '14px' }}>Availability</label>
                <select 
                  value={formData.availability} 
                  onChange={e => setFormData({...formData, availability: e.target.value as MenuAvailability})}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--color-border)', outline: 'none', background: 'var(--color-surface)' }}
                >
                  <option value="AVAILABLE">AVAILABLE</option>
                  <option value="OUT_OF_STOCK">OUT OF STOCK</option>
                </select>
              </div>
            </div>

            <div className="flex gap-4 mt-6" style={{ marginTop: '24px' }}>
              <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => setIsModalOpen(false)}>Cancel</button>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleSave}>
                {editingItem ? 'Save Changes' : 'Add Item'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Menu;
