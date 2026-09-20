import React, { useState } from 'react';
import { mockOrders } from '../data/mockOrders';

const Orders: React.FC = () => {
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');

  const filters = ['All', 'Placed', 'Preparing', 'Ready', 'Collected'];

  const filteredOrders = mockOrders.filter(order => {
    const matchesFilter = filter === 'All' || order.status.toLowerCase() === filter.toLowerCase();
    const matchesSearch = order.orderNumber.includes(search) || order.studentName.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="card" style={{ minHeight: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div style={{ display: 'flex', gap: '8px' }}>
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
        
        <div>
          <input 
            type="text" 
            placeholder="Search order # or name..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              padding: '10px 16px',
              borderRadius: '8px',
              border: '1px solid var(--color-border)',
              width: '250px',
              outline: 'none',
              fontFamily: 'inherit'
            }}
          />
        </div>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
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
                <button className="btn btn-outline" style={{ padding: '4px 12px', fontSize: '12px' }}>Manage</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      
      {filteredOrders.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--color-text-secondary)' }}>
          No orders found.
        </div>
      )}
    </div>
  );
};

export default Orders;
