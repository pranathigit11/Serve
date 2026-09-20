import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import Layout from './components/layout/Layout';
import Dashboard from './pages/Dashboard';
import Canteens from './pages/Canteens';
import ChangeRequests from './pages/ChangeRequests';
import Staff from './pages/Staff';

function App() {
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

export default App;
