import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/layout/Layout';
import Dashboard from './pages/Dashboard';
import Canteens from './pages/Canteens';
import ChangeRequests from './pages/ChangeRequests';
import Staff from './pages/Staff';
import Login from './pages/Login';
import { getConfig } from './lib/config';

const CenteredMessage: React.FC<{ text: string }> = ({ text }) => (
  <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-secondary)' }}>
    {text}
  </div>
);

function AuthGate() {
  const { status } = useAuth();
  if (status === 'loading') return <CenteredMessage text="Loading…" />;
  if (status !== 'ready') return <Login />;
  return (
    <AppProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="canteens" element={<Canteens />} />
            <Route path="change-requests" element={<ChangeRequests />} />
            <Route path="staff" element={<Staff />} />
          </Route>
        </Routes>
      </Router>
    </AppProvider>
  );
}

function App() {
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
}

export default App;
