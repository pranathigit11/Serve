import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';

const Profile: React.FC = () => {
  const { profile, requestCanteenChange } = useAppContext();
  const [showModal, setShowModal] = useState(false);
  const [selectedCanteen, setSelectedCanteen] = useState('');

  const canteenOptions = [
    'Krishna & Godavari Night Canteen',
    'Yamuna & Narmada Night Canteen',
    'Tapti & Saraswathi Night Canteen'
  ];

  const handleSubmit = () => {
    if (selectedCanteen) {
      requestCanteenChange(selectedCanteen);
      setShowModal(false);
    }
  };

  return (
    <div className="card" style={{ maxWidth: '600px', margin: '0 auto' }}>
      <div style={{ textAlign: 'center', padding: '32px 0' }}>
        <div style={{
          width: '100px',
          height: '100px',
          backgroundColor: 'var(--color-primary)',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontSize: '36px',
          fontWeight: 'bold',
          margin: '0 auto 24px'
        }}>
          {profile.name.substring(0, 2).toUpperCase()}
        </div>
        <h2 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '8px' }}>{profile.name}</h2>
        <p style={{ color: 'var(--color-text-secondary)' }}>ID: {profile.id} • staff@serve.edu</p>
      </div>

      <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <div>
          <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-text-secondary)', marginBottom: '8px', letterSpacing: '1px' }}>
            CURRENT ASSIGNMENT
          </h3>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--color-background)', padding: '16px', borderRadius: '8px', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: '16px', marginBottom: '4px' }}>{profile.canteen}</div>
              {profile.pendingCanteenRequest && (
                <div style={{ fontSize: '14px', color: 'var(--color-accent)', fontWeight: 600, marginTop: '8px' }}>
                  Requested: {profile.pendingCanteenRequest} (PENDING)
                </div>
              )}
            </div>
            <button className="btn btn-outline" onClick={() => setShowModal(true)}>Change Canteen</button>
          </div>
        </div>

        <div>
          <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-text-secondary)', marginBottom: '8px', letterSpacing: '1px' }}>
            ROLE
          </h3>
          <div style={{ backgroundColor: 'var(--color-background)', padding: '16px', borderRadius: '8px' }}>
            <div style={{ fontWeight: 600 }}>{profile.role}</div>
            <div style={{ fontSize: '14px', color: 'var(--color-text-secondary)', marginTop: '4px' }}>Full access to menu and orders</div>
          </div>
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="card modal-content" onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '24px' }}>Request Canteen Change</h2>
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, fontSize: '14px' }}>Select New Canteen</label>
              <select 
                value={selectedCanteen} 
                onChange={(e) => setSelectedCanteen(e.target.value)}
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--color-border)', outline: 'none', background: 'var(--color-surface)' }}
              >
                <option value="">-- Select a canteen --</option>
                {canteenOptions.filter(c => c !== profile.canteen).map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div className="flex gap-4">
              <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => setShowModal(false)}>Cancel</button>
              <button 
                className="btn btn-primary" 
                style={{ flex: 1 }} 
                onClick={handleSubmit}
                disabled={!selectedCanteen}
              >
                Submit Request
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;
