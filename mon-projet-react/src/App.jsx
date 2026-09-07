import { Navigate, Route, BrowserRouter as Router, Routes } from 'react-router-dom';
import { AuthAdminProvider, useAuthAdmin } from './Contexts/AuthContext';

import ForgotPassword from './pages/ForgotPassword';
import LoginPage from './pages/LoginPage';
import ResetPassword from './pages/ResetPassword';

import AdminProfile from './pages/AdminProfile';
import AffectationPage from './pages/AffectationPage';
import DashboardStats from './pages/DashboardStats';
import DriversPage from './pages/DriversPage';

const PrivateRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuthAdmin();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return isAuthenticated ? children : <Navigate to="/login" />;
};

function AppContent() {
  const { isAuthenticated } = useAuthAdmin();

  return (
    <Router>
      <Routes>
        {/* Pages Publiques */}
        <Route 
          path="/login" 
          element={!isAuthenticated ? <LoginPage /> : <Navigate to="/dashboard" />} 
        />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        {/* Pages Protégées */}
        <Route path="/dashboard" element={<PrivateRoute><DashboardStats /></PrivateRoute>} />
        <Route path="/drivers" element={<PrivateRoute><DriversPage /></PrivateRoute>} />
        <Route path="/deliveries/assign" element={<PrivateRoute><AffectationPage /></PrivateRoute>} />
        <Route path="/profile" element={<PrivateRoute><AdminProfile /></PrivateRoute>} />

        {/* Redirections */}
        <Route path="/" element={<Navigate to="/dashboard" />} />
        <Route path="*" element={<Navigate to="/dashboard" />} />
      </Routes>
    </Router>
  );
}

export default function App() {
  return (
    <AuthAdminProvider>
      <AppContent />
    </AuthAdminProvider>
  );
}