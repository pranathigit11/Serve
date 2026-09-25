import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { OrderStatus } from '../types';
import { useAppContext } from '../context/AppContext';

const Dashboard: React.FC = () => {
  const { orders, updateOrderStatus, isAcceptingOrders, setIsAcceptingOrders } = useAppContext();
  const [showPauseModal, setShowPauseModal] = useState(false);
  const navigate = useNavigate();

  const activeOrders = orders.filter(o => o.status !== 'COLLECTED');
  const preparingCount = orders.filter(o => o.status === 'PREPARING').length;
  const readyCount = orders.filter(o => o.status === 'READY').length;
  const completedCount = orders.filter(o => o.status === 'COLLECTED').length;

  const handleStatusChange = (orderId: string, newStatus: OrderStatus) => {
    updateOrderStatus(orderId, newStatus);
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Canteen Status Card */}
      <div className="card">
        <h2 style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-text-secondary)', letterSpacing: '1px', marginBottom: '16px' }}>
          CANTEEN STATUS
        </h2>
        <div className="flex items-center justify-between canteen-status-content">
          <div style={{ marginBottom: '16px' }}>
            <div className="flex items-center gap-2" style={{ marginBottom: '8px' }}>
              <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: isAcceptingOrders ? 'var(--color-primary)' : 'var(--color-accent)' }}></div>
              <h3 style={{ fontSize: '18px', fontWeight: 700, color: isAcceptingOrders ? 'var(--color-primary)' : 'var(--color-accent)' }}>
                {isAcceptingOrders ? 'ACCEPTING ORDERS' : 'ORDER TAKING PAUSED'}
              </h3>
            </div>
            <p style={{ color: 'var(--color-text-secondary)' }}>
              {isAcceptingOrders 
                ? 'Krishna & Godavari Night Canteen is currently accepting new orders.'
                : 'New student orders are currently disabled.'}
            </p>
          </div>
          
          <button 
            className="btn canteen-status-btn" 
            style={{ 
              backgroundColor: isAcceptingOrders ? 'transparent' : 'var(--color-primary)',
              color: isAcceptingOrders ? 'var(--color-accent)' : 'white',
              border: `1px solid ${isAcceptingOrders ? 'var(--color-accent)' : 'transparent'}`
            }}
            onClick={async () => {
              if (isAcceptingOrders) {
                setShowPauseModal(true);
              } else {
                try { await setIsAcceptingOrders(true); } catch(e:any) { alert(e.message); }
              }
            }}
          >
            {isAcceptingOrders ? 'Pause Order Taking' : 'Resume Order Taking'}
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="dashboard-grid">
        <SummaryCard title="ACTIVE ORDERS" value={activeOrders.length} onClick={() => navigate('/orders')} />
        <SummaryCard title="PREPARING" value={preparingCount} color="var(--color-accent)" onClick={() => navigate('/orders?status=Preparing')} />
        <SummaryCard title="READY FOR PICKUP" value={readyCount} color="var(--color-primary)" onClick={() => navigate('/orders?status=Ready')} />
        <SummaryCard title="TODAY'S COMPLETED" value={completedCount} onClick={() => navigate('/orders?status=Collected')} />
      </div>

      {/* Active Orders List */}
      <div className="card" style={{ marginTop: '16px' }}>
        <div className="flex justify-between items-center" style={{ marginBottom: '24px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 700 }}>Active Orders</h2>
          <button className="btn btn-outline" style={{ padding: '6px 12px', fontSize: '14px' }} onClick={() => navigate('/orders')}>View All</button>
        </div>

        <div className="flex flex-col gap-4">
          {activeOrders.map(order => (
            <div key={order.id} className="order-card">
              <div className="order-card-info">
                <div className="flex items-center gap-2" style={{ marginBottom: '8px', flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: 700, fontSize: '16px' }}>#{order.orderNumber}</span>
                  <span style={{ color: 'var(--color-text-secondary)', fontSize: '14px' }}>•</span>
                  <span style={{ fontWeight: 600 }}>{order.studentName}</span>
                  <span className="badge" style={{ backgroundColor: 'var(--color-background)', color: 'var(--color-text-secondary)' }}>
                    {order.hostel}
                  </span>
                </div>
                <div style={{ color: 'var(--color-text-secondary)', fontSize: '14px' }}>
                  {order.items.map(item => `${item.quantity} × ${item.foodItemName}`).join(', ')}
                </div>
              </div>
              
              <div className="order-card-actions">
                <div className="order-card-status">
                  <div style={{ fontWeight: 700 }}>₹{order.totalAmount}</div>
                  <OrderStatusBadge status={order.status} />
                </div>
                
                <div className="order-card-buttons">
                  {(order.status === 'PLACED' || order.status === 'PAYMENT_CONFIRMED') && (
                    <button className="btn btn-primary" onClick={async () => {
                      try { await handleStatusChange(order.id, 'PREPARING'); } catch(e: any) { alert(e.message); }
                    }}>
                      Start Preparing
                    </button>
                  )}
                  {order.status === 'PREPARING' && (
                    <button className="btn btn-primary" onClick={async () => {
                      try { await handleStatusChange(order.id, 'READY'); } catch(e: any) { alert(e.message); }
                    }}>
                      Mark Ready
                    </button>
                  )}
                  {order.status === 'READY' && (
                    <button className="btn btn-outline" onClick={async () => {
                      try { await handleStatusChange(order.id, 'COLLECTED'); } catch(e: any) { alert(e.message); }
                    }}>
                      Mark Collected
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
          {activeOrders.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--color-text-secondary)' }}>
              No active orders at the moment.
            </div>
          )}
        </div>
      </div>

      {/* Pause Confirmation Modal */}
      {showPauseModal && (
        <div className="modal-overlay" onClick={() => setShowPauseModal(false)}>
          <div className="card modal-content" onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '12px' }}>Pause Order Taking?</h2>
            <p style={{ color: 'var(--color-text-secondary)', marginBottom: '8px' }}>
              New students will not be able to place new orders while order taking is paused.
            </p>
            <p style={{ color: 'var(--color-text-secondary)', marginBottom: '24px' }}>
              Existing orders will continue to be processed.
            </p>
            <div className="flex gap-4">
              <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => setShowPauseModal(false)}>Cancel</button>
              <button 
                className="btn" 
                style={{ flex: 1, backgroundColor: 'var(--color-accent)', color: 'white', border: 'none' }}
                onClick={async () => {
                  try {
                    await setIsAcceptingOrders(false);
                    setShowPauseModal(false);
                  } catch(e:any) { alert(e.message); }
                }}
              >
                Pause Orders
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const SummaryCard = ({ title, value, color = 'var(--color-text-primary)', onClick }: { title: string, value: number, color?: string, onClick?: () => void }) => (
  <div className="card" style={{ padding: '24px', cursor: onClick ? 'pointer' : 'default' }} onClick={onClick}>
    <h3 style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-text-secondary)', letterSpacing: '1px', marginBottom: '12px' }}>
      {title}
    </h3>
    <div style={{ fontSize: '36px', fontWeight: 900, color }}>
      {value}
    </div>
  </div>
);

const OrderStatusBadge = ({ status }: { status: OrderStatus }) => {
  let bgColor = 'var(--color-border)';
  let color = 'var(--color-text-secondary)';
  
  if (status === 'PLACED' || status === 'PAYMENT_CONFIRMED') {
    bgColor = 'rgba(232, 106, 46, 0.1)';
    color = 'var(--color-accent)';
  } else if (status === 'PREPARING') {
    bgColor = 'rgba(135, 159, 45, 0.1)';
    color = 'var(--color-primary)';
  } else if (status === 'READY') {
    bgColor = 'var(--color-primary)';
    color = 'white';
  } else if (status === 'COLLECTED') {
    bgColor = 'var(--color-background)';
    color = 'var(--color-text-secondary)';
  }

  return (
    <span className="badge" style={{ backgroundColor: bgColor, color, display: 'inline-block', marginTop: '4px' }}>
      {status}
    </span>
  );
};

export default Dashboard;
