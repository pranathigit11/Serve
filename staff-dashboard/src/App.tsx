import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import DashboardLayout from './components/layout/DashboardLayout';
import Dashboard from './pages/Dashboard';
import Orders from './pages/Orders';
import Menu from './pages/Menu';
import Notifications from './pages/Notifications';
import Profile from './pages/Profile';
import Login from './pages/Login';

import { AppProvider } from './context/AppContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { getConfig } from './lib/config';

const CenteredMessage: React.FC<{ text: string }> = ({ text }) => (
  <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-secondary)' }}>
    {text}
  </div>
);

const AuthGate: React.FC = () => {
  const { status } = useAuth();
  if (status === 'loading') return <CenteredMessage text="Loading…" />;
  if (status !== 'ready') return <Login />;
  return (
    <AppProvider>
      <Router>
        <Routes>
          <Route path="/" element={<DashboardLayout />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="orders" element={<Orders />} />
            <Route path="menu" element={<Menu />} />
            <Route path="notifications" element={<Notifications />} />
            <Route path="profile" element={<Profile />} />
          </Route>
        </Routes>
      </Router>
    </AppProvider>
  );
};

const App: React.FC = () => {
  try {
    getConfig();
  } catch (error) {
    return <CenteredMessage text={(error as Error).message} />;
  }
  return (
    <AuthProvider>
      <AuthGate />
    </AuthProvider>
  );
};

export default App;
