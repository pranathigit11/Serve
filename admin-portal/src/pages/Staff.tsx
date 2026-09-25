import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import type { StaffMember } from '../types';

const Staff: React.FC = () => {
  const { staff, canteens, updateStaffAssignment } = useAppContext();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);
  const [selectedCanteen, setSelectedCanteen] = useState('');

  const getCanteenName = (canteenId: string) => canteens.find(c => c.id === canteenId)?.name || 'Unknown Canteen';

  const openAssignModal = (member: StaffMember) => {
    setSelectedStaff(member);
    setSelectedCanteen(member.canteenId);
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (selectedStaff && selectedCanteen) {
      try {
        await updateStaffAssignment(selectedStaff.id, selectedCanteen);
        setIsModalOpen(false);
        setSelectedStaff(null);
      } catch (error: any) {
        alert("Error: " + error.message);
      }
    }
  };

  return (
    <div className="card" style={{ minHeight: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 700 }}>Staff Management</h2>
      </div>

      <div style={{ display: 'grid', gap: '16px' }}>
        {staff.map(member => (
          <div key={member.id} style={{
            border: '1px solid var(--color-border)',
            borderRadius: '12px',
            padding: '16px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '16px',
            opacity: member.status === 'INACTIVE' ? 0.7 : 1
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{
                width: '48px',
                height: '48px',
                backgroundColor: 'var(--color-primary)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: '20px',
                fontWeight: 'bold',
              }}>
                {member.name.substring(0, 2).toUpperCase()}
              </div>
              
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: 700 }}>{member.name}</h3>
                  <span className="badge" style={{ backgroundColor: 'var(--color-background)', color: 'var(--color-text-secondary)' }}>
                    {member.staffId}
                  </span>
                </div>
                <div style={{ fontSize: '14px', color: 'var(--color-text-secondary)', marginBottom: '2px' }}>
                  {member.email} • {member.role}
                </div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                  {getCanteenName(member.canteenId)}
                </div>
              </div>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ 
                fontSize: '12px', 
                fontWeight: 700,
                color: member.status === 'ACTIVE' ? 'var(--color-primary)' : 'var(--color-text-secondary)'
              }}>
                {member.status}
              </span>
              <button 
                className="btn btn-outline" 
                style={{ padding: '6px 12px', fontSize: '14px' }}
                onClick={() => openAssignModal(member)}
              >
                Change Assignment
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Assign Canteen Modal */}
      {isModalOpen && selectedStaff && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="card modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '24px' }}>
              Assign Canteen
            </h2>
            
            <div style={{ marginBottom: '24px' }}>
              <div style={{ marginBottom: '16px' }}>
                <span style={{ color: 'var(--color-text-secondary)' }}>Staff Member:</span>
                <span style={{ fontWeight: 600, marginLeft: '8px' }}>{selectedStaff.name} ({selectedStaff.staffId})</span>
              </div>
              <div style={{ marginBottom: '16px' }}>
                <span style={{ color: 'var(--color-text-secondary)' }}>Current Canteen:</span>
                <span style={{ fontWeight: 600, marginLeft: '8px' }}>{getCanteenName(selectedStaff.canteenId)}</span>
              </div>
              
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, fontSize: '14px' }}>Assign To:</label>
              <select 
                value={selectedCanteen} 
                onChange={(e) => setSelectedCanteen(e.target.value)}
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--color-border)', outline: 'none', background: 'var(--color-surface)' }}
              >
                {canteens.filter(c => c.status === 'ACTIVE').map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div className="flex gap-4 mt-6">
              <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => setIsModalOpen(false)}>Cancel</button>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleSave}>
                Save Assignment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Staff;
