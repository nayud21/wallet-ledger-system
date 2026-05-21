import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/consumer/DashboardPage';
import SendPage from './pages/consumer/SendPage';
import TopUpPage from './pages/consumer/TopUpPage';
import HistoryPage from './pages/consumer/HistoryPage';
import AdminApp from './pages/AdminApp';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
      <Route path="/send"      element={<ProtectedRoute><SendPage /></ProtectedRoute>} />
      <Route path="/top-up"    element={<ProtectedRoute><TopUpPage /></ProtectedRoute>} />
      <Route path="/history"   element={<ProtectedRoute><HistoryPage /></ProtectedRoute>} />

      <Route path="/admin/*" element={<AdminApp />} />

      <Route path="/" element={<NavigateToDefault />} />
      <Route path="*" element={<NavigateToDefault />} />
    </Routes>
  );
}

function NavigateToDefault() {
  const { user } = useAuth();
  return <Navigate to={user ? '/dashboard' : '/login'} replace />;
}
