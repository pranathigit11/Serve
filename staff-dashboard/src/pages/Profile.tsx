import React from 'react';

const Profile: React.FC = () => {
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
          AS
        </div>
        <h2 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '8px' }}>Admin Staff</h2>
        <p style={{ color: 'var(--color-text-secondary)' }}>ID: ST-001 • staff@serve.edu</p>
      </div>

      <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <div>
          <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-text-secondary)', marginBottom: '8px', letterSpacing: '1px' }}>
            CURRENT ASSIGNMENT
          </h3>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--color-background)', padding: '16px', borderRadius: '8px', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: '16px', marginBottom: '4px' }}>Krishna & Godavari Night Canteen</div>
              <div style={{ fontSize: '14px', color: 'var(--color-text-secondary)' }}>Serves: Krishna, Godavari</div>
            </div>
            <button className="btn btn-outline">Change Canteen</button>
          </div>
        </div>

        <div>
          <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-text-secondary)', marginBottom: '8px', letterSpacing: '1px' }}>
            ROLE
          </h3>
          <div style={{ backgroundColor: 'var(--color-background)', padding: '16px', borderRadius: '8px' }}>
            <div style={{ fontWeight: 600 }}>Canteen Manager</div>
            <div style={{ fontSize: '14px', color: 'var(--color-text-secondary)', marginTop: '4px' }}>Full access to menu and orders</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
