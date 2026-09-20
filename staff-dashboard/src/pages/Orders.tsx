import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';

const Orders: React.FC = () => {
  const { orders, updateOrderStatus } = useAppContext();
  const [searchParams] = useSearchParams();
  const initialFilter = searchParams.get('status') || 'All';
  
  const [filter, setFilter] = useState(initialFilter);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const statusParam = searchParams.get('status');
    if (statusParam) {
      setFilter(statusParam);
    }
  }, [searchParams]);

  const filters = ['All', 'Placed', 'Preparing', 'Ready', 'Collected'];

  const filteredOrders = orders.filter(order => {
    const matchesFilter = filter === 'All' || order.status.toLowerCase() === filter.toLowerCase();
    const matchesSearch = order.orderNumber.includes(search) || order.studentName.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const renderActionButtons = (order: typeof orders[0]) => {
    return (
      <div className="flex gap-2">
        {order.status === 'PLACED' && (
          <button className="btn btn-primary" style={{ padding: '4px 12px', fontSize: '12px' }} onClick={() => updateOrderStatus(order.id, 'PREPARING')}>
            Start Preparing
          </button>
        )}
        {order.status === 'PREPARING' && (
          <button className="btn btn-primary" style={{ padding: '4px 12px', fontSize: '12px' }} onClick={() => updateOrderStatus(order.id, 'READY')}>
            Mark Ready
          </button>
        )}
        {order.status === 'READY' && (
          <button className="btn btn-outline" style={{ padding: '4px 12px', fontSize: '12px' }} onClick={() => updateOrderStatus(order.id, 'COLLECTED')}>
            Mark Collected
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="card" style={{ minHeight: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
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
        
        <div style={{ flex: '1 1 250px', minWidth: '200px' }}>
          <input 
            type="text" 
            placeholder="Search order # or name..." 
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

      <table className="orders-desktop-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderBottom: '2px solid var(--color-background)', color: 'var(--color-text-secondary)', textAlign: 'left' }}>
            <th style={{ padding: '16px', fontWeight: 600, fontSize: '14px' }}>Order #</th>
            <th style={{ padding: '16px', fontWeight: 600, fontSize: '14px' }}>Student</th>
            <th style={{ padding: '16px', fontWeight: 600, fontSize: '14px' }}>Items</th>
            <th style={{ padding: '16px', fontWeight: 600, fontSize: '14px' }}>Amount</th>
            <th style={{ padding: '16px', fontWeight: 600, fontSize: '14px' }}>Status</th>
            <th style={{ padding: '16px', fontWeight: 600, fontSize: '14px' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {filteredOrders.map(order => (
            <tr key={order.id} style={{ borderBottom: '1px solid var(--color-background)' }}>
              <td style={{ padding: '16px', fontWeight: 700 }}>#{order.orderNumber}</td>
              <td style={{ padding: '16px' }}>
                <div style={{ fontWeight: 600 }}>{order.studentName}</div>
                <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>{order.hostel}</div>
              </td>
              <td style={{ padding: '16px', color: 'var(--color-text-secondary)', fontSize: '14px' }}>
                {order.items.map(item => `${item.quantity}× ${item.foodItemName}`).join(', ')}
              </td>
              <td style={{ padding: '16px', fontWeight: 600 }}>₹{order.totalAmount}</td>
              <td style={{ padding: '16px' }}>
                <span style={{ fontWeight: 600, fontSize: '12px', color: 'var(--color-primary)' }}>{order.status}</span>
              </td>
              <td style={{ padding: '16px' }}>
                {renderActionButtons(order)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Mobile Orders List */}
      <div className="mobile-list">
        {filteredOrders.map(order => (
          <div key={order.id} className="order-card">
            <div style={{ width: '100%' }}>
              <div className="flex items-center gap-2" style={{ marginBottom: '8px', flexWrap: 'wrap' }}>
                <span style={{ fontWeight: 700, fontSize: '16px' }}>#{order.orderNumber}</span>
                <span style={{ color: 'var(--color-text-secondary)', fontSize: '14px' }}>•</span>
                <span style={{ fontWeight: 600 }}>{order.studentName}</span>
                <span className="badge" style={{ backgroundColor: 'var(--color-background)', color: 'var(--color-text-secondary)' }}>
                  {order.hostel}
                </span>
              </div>
              <div style={{ color: 'var(--color-text-secondary)', fontSize: '14px', marginBottom: '16px' }}>
                {order.items.map(item => `${item.quantity} × ${item.foodItemName}`).join(', ')}
              </div>
              
              <div className="flex justify-between items-center w-full flex-wrap gap-4">
                <div>
                  <div style={{ fontWeight: 700 }}>₹{order.totalAmount}</div>
                  <span style={{ fontWeight: 600, fontSize: '12px', color: 'var(--color-primary)' }}>{order.status}</span>
                </div>
                <div>
                  {renderActionButtons(order)}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {filteredOrders.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--color-text-secondary)' }}>
          No orders found.
        </div>
      )}
    </div>
  );
};

export default Orders;
