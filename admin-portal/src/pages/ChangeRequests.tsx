import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import type { ChangeRequest } from '../types';

const ChangeRequests: React.FC = () => {
  const { changeRequests, staff, canteens, updateChangeRequestStatus } = useAppContext();
  
  const [searchParams] = useSearchParams();
  const initialFilter = searchParams.get('filter') || 'All';
  const [filter, setFilter] = useState(initialFilter);
  
  const [selectedRequest, setSelectedRequest] = useState<ChangeRequest | null>(null);
  const [modalType, setModalType] = useState<'Approve' | 'Reject' | null>(null);

  useEffect(() => {
    const filterParam = searchParams.get('filter');
    if (filterParam) {
      setFilter(filterParam);
    }
  }, [searchParams]);

  const filters = ['All', 'Pending', 'Approved', 'Rejected'];

  const filteredRequests = changeRequests.filter(req => {
    return filter === 'All' || req.status.toLowerCase() === filter.toLowerCase();
  });

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
    <div className="card" style={{ minHeight: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 700 }}>Staff Change Requests</h2>
        
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {filters.map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                padding: '8px 16px',
                borderRadius: '20px',
                border: 'none',
                fontWeight: 600,
                fontSize: '14px',
                cursor: 'pointer',
                backgroundColor: filter === f ? 'var(--color-primary)' : 'var(--color-background)',
                color: filter === f ? 'white' : 'var(--color-text-secondary)'
              }}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gap: '16px' }}>
        {filteredRequests.map(req => (
          <div key={req.id} style={{
            border: '1px solid var(--color-border)',
            borderRadius: '12px',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: 700 }}>{getStaffName(req.staffId)}</h3>
                  <span className="badge" style={{ backgroundColor: 'var(--color-background)', color: 'var(--color-text-secondary)' }}>
                    {getStaffIdString(req.staffId)}
                  </span>
                </div>
                
                <div style={{ fontSize: '14px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ color: 'var(--color-text-secondary)' }}>
                    From: <span style={{ color: 'var(--color-text-primary)', fontWeight: 500 }}>{getCanteenName(req.currentCanteenId)}</span>
                  </div>
                  <div style={{ color: 'var(--color-text-secondary)' }}>
                    To: <span style={{ color: 'var(--color-text-primary)', fontWeight: 500 }}>{getCanteenName(req.requestedCanteenId)}</span>
                  </div>
                  <div style={{ color: 'var(--color-text-secondary)', marginTop: '4px', fontStyle: 'italic' }}>
                    "{req.reason}"
                  </div>
                </div>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '12px' }}>
                <span style={{ 
                  fontWeight: 700, 
                  fontSize: '14px',
                  color: req.status === 'PENDING' ? 'var(--color-accent)' : 
                         req.status === 'APPROVED' ? 'var(--color-primary)' : 'var(--color-text-secondary)'
                }}>
                  {req.status}
                </span>
                
                {req.status === 'PENDING' && (
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button 
                      className="btn btn-outline" 
                      style={{ padding: '6px 12px', fontSize: '14px', borderColor: 'var(--color-accent)', color: 'var(--color-accent)' }}
                      onClick={() => handleActionClick(req, 'Reject')}
                    >
                      Reject
                    </button>
                    <button 
                      className="btn btn-primary" 
                      style={{ padding: '6px 12px', fontSize: '14px' }}
                      onClick={() => handleActionClick(req, 'Approve')}
                    >
                      Approve
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {filteredRequests.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--color-text-secondary)' }}>
          No requests found.
        </div>
      )}

      {/* Confirmation Modal */}
      {selectedRequest && modalType && (
        <div className="modal-overlay" onClick={() => setSelectedRequest(null)}>
          <div className="card modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '24px' }}>
              {modalType} Canteen Change?
            </h2>
            
            <div style={{ marginBottom: '24px', lineHeight: 1.6 }}>
              {modalType === 'Approve' ? (
                <>
                  <span style={{ fontWeight: 600 }}>{getStaffName(selectedRequest.staffId)}</span> will be reassigned from:
                  <div style={{ fontWeight: 600, color: 'var(--color-text-secondary)', marginTop: '8px' }}>{getCanteenName(selectedRequest.currentCanteenId)}</div>
                  <div style={{ margin: '8px 0' }}>to:</div>
                  <div style={{ fontWeight: 600, color: 'var(--color-primary)' }}>{getCanteenName(selectedRequest.requestedCanteenId)}</div>
                </>
              ) : (
                <>
                  Are you sure you want to reject the request for <span style={{ fontWeight: 600 }}>{getStaffName(selectedRequest.staffId)}</span> to move to <span style={{ fontWeight: 600 }}>{getCanteenName(selectedRequest.requestedCanteenId)}</span>?
                </>
              )}
            </div>

            <div className="flex gap-4 mt-6">
              <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => setSelectedRequest(null)}>Cancel</button>
              <button 
                className="btn btn-primary" 
                style={{ flex: 1, backgroundColor: modalType === 'Reject' ? 'var(--color-accent)' : 'var(--color-primary)', border: 'none' }} 
                onClick={confirmAction}
              >
                {modalType} Request
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChangeRequests;
