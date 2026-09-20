import React, { useState } from 'react';
import { mockOrders } from '../data/mockOrders';
import type { Order, OrderStatus } from '../types';

const Dashboard: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>(mockOrders);

  const activeOrders = orders.filter(o => o.status !== 'COLLECTED');
  const preparingCount = orders.filter(o => o.status === 'PREPARING').length;
  const readyCount = orders.filter(o => o.status === 'READY').length;
  
  // Mock today's completed
  const completedCount = 36;

  const handleStatusChange = (orderId: string, newStatus: OrderStatus) => {
    setOrders(orders.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
  };

  return (
    <div className="flex flex-col gap-6">
      <div style={{ marginBottom: '8px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: '4px' }}>
          Good evening, Staff
        </h1>
        <p style={{ color: 'var(--color-text-secondary)' }}>
          Here's what's happening at Krishna & Godavari Night Canteen right now.
        </p>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '24px' }}>
        <SummaryCard title="ACTIVE ORDERS" value={activeOrders.length} />
        <SummaryCard title="PREPARING" value={preparingCount} color="var(--color-accent)" />
        <SummaryCard title="READY FOR PICKUP" value={readyCount} color="var(--color-primary)" />
        <SummaryCard title="TODAY'S COMPLETED" value={completedCount} />
      </div>

      {/* Active Orders List */}
      <div className="card" style={{ marginTop: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 700 }}>Active Orders</h2>
          <button className="btn btn-outline" style={{ padding: '6px 12px', fontSize: '14px' }}>View All</button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {activeOrders.map(order => (
            <div key={order.id} style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              padding: '16px',
              border: '1px solid var(--color-border)',
              borderRadius: '8px'
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
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
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 700 }}>₹{order.totalAmount}</div>
                  <OrderStatusBadge status={order.status} />
                </div>
                
                <div style={{ width: '160px', display: 'flex', justifyContent: 'flex-end' }}>
                  {order.status === 'PLACED' && (
                    <button className="btn btn-primary" onClick={() => handleStatusChange(order.id, 'PREPARING')}>
                      Start Preparing
                    </button>
                  )}
                  {order.status === 'PREPARING' && (
                    <button className="btn btn-primary" onClick={() => handleStatusChange(order.id, 'READY')}>
                      Mark Ready
                    </button>
                  )}
                  {order.status === 'READY' && (
                    <button className="btn btn-outline" onClick={() => handleStatusChange(order.id, 'COLLECTED')}>
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
    </div>
  );
};

const SummaryCard = ({ title, value, color = 'var(--color-text-primary)' }: { title: string, value: number, color?: string }) => (
  <div className="card" style={{ padding: '24px' }}>
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
  
  if (status === 'PLACED') {
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
