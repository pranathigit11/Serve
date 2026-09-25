import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import type { Canteen } from '../types';

const Canteens: React.FC = () => {
  const { canteens, hostels, addCanteen, updateCanteen, toggleCanteenStatus, refreshData } = useAppContext();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCanteen, setEditingCanteen] = useState<Canteen | null>(null);

  // Form state
  const [formData, setFormData] = useState<Partial<Canteen>>({
    name: '',
    location: '',
    hostelsServed: [],
    status: 'ACTIVE',
  });

  const [hostelsInput, setHostelsInput] = useState('');

  const openAddModal = () => {
    setEditingCanteen(null);
    setFormData({
      name: '',
      location: '',
      hostelsServed: [],
      status: 'ACTIVE',
    });
    setHostelsInput('');
    setIsModalOpen(true);
  };

  const openEditModal = (canteen: Canteen) => {
    setEditingCanteen(canteen);
    setFormData({ ...canteen });
    setHostelsInput(canteen.hostelsServed.join(', '));
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name || !formData.location || !hostelsInput) {
      alert("Please fill in all fields.");
      return;
    }
    
    const parsedHostels = hostelsInput.split(',').map(h => h.trim()).filter(h => h.length > 0);
    // Find matching hostel IDs
    const hostelIds = parsedHostels.map(name => {
      const found = hostels.find((h: any) => h.name.toLowerCase() === name.toLowerCase());
      return found ? found.id : null;
    }).filter(id => id !== null) as string[];
    
    try {
      if (editingCanteen) {
        await updateCanteen({
          ...(formData as Canteen)
        });
        // Now update hostels
        await fetch(`http://localhost:5001/api/admin/canteens/${editingCanteen.id}/hostels`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ hostelIds })
        });
        await refreshData();
      } else {
        await addCanteen({
          ...(formData as Canteen),
          hostelIds
        });
      }
      setIsModalOpen(false);
    } catch (e: any) {
      alert("Error: " + e.message);
    }
  };

  return (
    <div className="card" style={{ minHeight: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 700 }}>Canteens</h2>
        <button className="btn btn-primary" onClick={openAddModal}>Add Canteen</button>
      </div>

      <div className="menu-grid" style={{ display: 'grid', gap: '24px' }}>
        {canteens.map(canteen => (
          <div key={canteen.id} style={{
            border: '1px solid var(--color-border)',
            borderRadius: '12px',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            opacity: canteen.status === 'INACTIVE' ? 0.7 : 1
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '4px' }}>{canteen.name}</h3>
                <div style={{ fontSize: '14px', color: 'var(--color-text-secondary)' }}>{canteen.location}</div>
              </div>
              <button 
                className="btn btn-outline" 
                style={{ padding: '4px 12px', fontSize: '12px' }}
                onClick={() => openEditModal(canteen)}
              >
                Edit
              </button>
            </div>
            
            <div>
              <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-text-secondary)', marginBottom: '8px' }}>SERVES:</div>
              <ul style={{ listStyleType: 'none', padding: 0, margin: 0, fontSize: '14px' }}>
                {canteen.hostelsServed.map(hostel => (
                  <li key={hostel} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <span style={{ color: 'var(--color-primary)' }}>✓</span> {hostel}
                  </li>
                ))}
              </ul>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: '16px', borderTop: '1px solid var(--color-background)' }}>
              <span style={{ 
                fontSize: '14px', 
                fontWeight: 600,
                color: canteen.status === 'ACTIVE' ? 'var(--color-primary)' : 'var(--color-accent)'
              }}>
                {canteen.status}
              </span>
              <button 
                onClick={() => toggleCanteenStatus(canteen.id, canteen.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE')}
                className="btn btn-outline" 
                style={{ padding: '6px 12px', fontSize: '12px' }}
              >
                Toggle
              </button>
            </div>
          </div>
        ))}
      </div>
      
      {canteens.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--color-text-secondary)' }}>
          No canteens found.
        </div>
      )}

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="card modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '24px' }}>
              {editingCanteen ? 'Edit Canteen' : 'Add Canteen'}
            </h2>
            
            <div className="flex flex-col gap-4">
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, fontSize: '14px' }}>Canteen Name</label>
                <input 
                  type="text" 
                  value={formData.name} 
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--color-border)', outline: 'none' }}
                />
              </div>
              
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, fontSize: '14px' }}>Location</label>
                <input 
                  type="text" 
                  value={formData.location} 
                  onChange={e => setFormData({...formData, location: e.target.value})}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--color-border)', outline: 'none' }}
                />
              </div>
              
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, fontSize: '14px' }}>Hostels Served (Comma separated)</label>
                <textarea 
                  value={hostelsInput} 
                  onChange={e => setHostelsInput(e.target.value)}
                  rows={3}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--color-border)', outline: 'none', fontFamily: 'inherit' }}
                  placeholder="e.g. Godavari, Krishna"
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, fontSize: '14px' }}>Status</label>
                <select 
                  value={formData.status} 
                  onChange={e => setFormData({...formData, status: e.target.value as 'ACTIVE' | 'INACTIVE'})}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--color-border)', outline: 'none', background: 'var(--color-surface)' }}
                >
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                </select>
              </div>
            </div>

            <div className="flex gap-4 mt-6" style={{ marginTop: '24px' }}>
              <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => setIsModalOpen(false)}>Cancel</button>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleSave}>
                {editingCanteen ? 'Save Changes' : 'Add Canteen'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Canteens;
