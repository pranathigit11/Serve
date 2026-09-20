import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';

const Dashboard: React.FC = () => {
  const { canteens, staff, changeRequests } = useAppContext();
  const navigate = useNavigate();

  const activeCanteensCount = canteens.filter(c => c.status === 'ACTIVE').length;
  const pendingRequestsCount = changeRequests.filter(r => r.status === 'PENDING').length;

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

      <div className="card" style={{ marginTop: '16px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '16px' }}>Welcome to SERVE Administration</h2>
        <p style={{ color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
          Use the sidebar to manage canteens across the campus, reassign staff members to different locations, 
          and approve or reject staff canteen change requests.
        </p>
      </div>
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

export default Dashboard;
