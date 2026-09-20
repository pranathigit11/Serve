import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import type { ChangeRequest } from '../types';

const Dashboard: React.FC = () => {
  const { canteens, staff, changeRequests, updateChangeRequestStatus } = useAppContext();
  const navigate = useNavigate();

  const activeCanteensCount = canteens.filter(c => c.status === 'ACTIVE').length;
  const pendingRequests = changeRequests.filter(r => r.status === 'PENDING');
  const pendingRequestsCount = pendingRequests.length;

  const [selectedRequest, setSelectedRequest] = useState<ChangeRequest | null>(null);
  const [modalType, setModalType] = useState<'Approve' | 'Reject' | null>(null);

  const getStaffName = (staffId: string) => staff.find(s => s.id === staffId)?.name || 'Unknown Staff';
  const getStaffIdString = (staffId: string) => staff.find(s => s.id === staffId)?.staffId || 'Unknown ID';
  const getCanteenName = (canteenId: string) => canteens.find(c => c.id === canteenId)?.name || 'Unknown Canteen';

  const handleActionClick = (req: ChangeRequest, type: 'Approve' | 'Reject') => {
    setSelectedRequest(req);
    setModalType(type);
  };

  const confirmAction = () => {
    if (selectedRequest && modalType) {
      updateChangeRequestStatus(selectedRequest.id, modalType.toUpperCase() as 'APPROVED' | 'REJECTED');
      setSelectedRequest(null);
      setModalType(null);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Summary Cards */}
      <div className="dashboard-grid">
        <SummaryCard 
          title="ACTIVE CANTEENS" 
          value={activeCanteensCount} 
          onClick={() => navigate('/canteens')} 
        />
        <SummaryCard 
          title="TOTAL STAFF" 
          value={staff.length} 
          color="var(--color-accent)" 
          onClick={() => navigate('/staff')} 
        />
        <SummaryCard 
          title="PENDING REQUESTS" 
          value={pendingRequestsCount} 
          color={pendingRequestsCount > 0 ? 'var(--color-primary)' : 'var(--color-text-primary)'} 
          onClick={() => navigate('/change-requests?filter=Pending')} 
        />
      </div>

      {/* Pending Actions */}
      <div style={{ marginTop: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 800, letterSpacing: '0.5px' }}>PENDING ACTIONS</h2>
          <button 
            onClick={() => navigate('/change-requests?filter=Pending')}
            style={{ 
              background: 'none', 
              border: 'none', 
              color: 'var(--color-primary)', 
              fontWeight: 600, 
              fontSize: '14px',
              cursor: 'pointer' 
            }}
          >
            View All
          </button>
        </div>

        {pendingRequestsCount === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '48px 24px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--color-text-primary)' }}>No pending actions</h3>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '14px' }}>Everything is up to date.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {pendingRequests.map(req => (
              <div key={req.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ fontSize: '12px', fontWeight: 800, color: 'var(--color-text-secondary)', letterSpacing: '0.5px' }}>
                  STAFF CANTEEN CHANGE REQUEST
                </div>
                
                <div>
                  <div style={{ fontWeight: 700, fontSize: '16px', marginBottom: '4px' }}>
                    {getStaffName(req.staffId)} <span style={{ color: 'var(--color-text-secondary)', fontWeight: 500 }}>• {getStaffIdString(req.staffId)}</span>
                  </div>
                  <div style={{ fontSize: '14px', color: 'var(--color-text-secondary)' }}>
                    {getCanteenName(req.currentCanteenId)} → <span style={{ fontWeight: 600, color: 'var(--color-primary)' }}>{getCanteenName(req.requestedCanteenId)}</span>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
                  <button 
                    className="btn btn-outline" 
                    style={{ borderColor: 'var(--color-accent)', color: 'var(--color-accent)', padding: '6px 16px', fontSize: '14px' }}
                    onClick={() => handleActionClick(req, 'Reject')}
                  >
                    Reject
                  </button>
                  <button 
                    className="btn btn-primary" 
                    style={{ padding: '6px 16px', fontSize: '14px' }}
                    onClick={() => handleActionClick(req, 'Approve')}
                  >
                    Approve
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      {selectedRequest && modalType && (
        <div className="modal-overlay" onClick={() => setSelectedRequest(null)}>
          <div className="card modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '24px' }}>
              {modalType} Request?
            </h2>
            
            <p style={{ color: 'var(--color-text-secondary)', marginBottom: '24px', lineHeight: 1.5 }}>
              Are you sure you want to {modalType.toLowerCase()} the request for <span style={{ fontWeight: 700, color: 'var(--color-text-primary)' }}>{getStaffName(selectedRequest.staffId)}</span>?
            </p>

            <div className="flex gap-4 mt-6">
              <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => setSelectedRequest(null)}>Cancel</button>
              <button 
                className="btn btn-primary" 
                style={{ flex: 1, backgroundColor: modalType === 'Reject' ? 'var(--color-accent)' : 'var(--color-primary)', border: 'none' }} 
                onClick={confirmAction}
              >
                {modalType}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const SummaryCard = ({ title, value, color = 'var(--color-text-primary)', onClick }: { title: string, value: number, color?: string, onClick?: () => void }) => (
  <div className="card" style={{ padding: '24px', cursor: onClick ? 'pointer' : 'default', transition: 'transform 0.2s, box-shadow 0.2s' }} 
       onClick={onClick}
       onMouseOver={e => e.currentTarget.style.transform = 'translateY(-2px)'}
       onMouseOut={e => e.currentTarget.style.transform = 'none'}>
    <h3 style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-text-secondary)', letterSpacing: '1px', marginBottom: '12px' }}>
      {title}
    </h3>
    <div style={{ fontSize: '36px', fontWeight: 900, color }}>
      {value}
    </div>
  </div>
);

export default Dashboard;
