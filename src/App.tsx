import React, { useState, useEffect } from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useNavigate,
  useLocation,
} from 'react-router-dom';
import { User } from '@shared/types';
import { authStorage } from './lib/authStorage';
import { ToastProvider, useToast } from './contexts/ToastContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { AdminRoutes } from './routes/AdminRoutes';
import { ClientRoutes } from './routes/ClientRoutes';
import { UpgradePlan } from './components/Subscription/UpgradePlan';
import LoginPage from './components/Auth/LoginPage';
import RegisterPage from './components/Auth/RegisterPage';
import LandingPage from './components/Landing/LandingPage';
import { apiService } from './services/apiService';

interface AuthWrapperProps {
  user: User | null;
  setUser: (u: User | null) => void;
}

const AuthWrapper: React.FC<AuthWrapperProps> = ({ user, setUser }) => {
  const { addToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    setUser(null);
    authStorage.clear();
    addToast('info', 'Você saiu do sistema.');
    navigate('/');
  };

  const isSuperAdmin = (u: User | null): boolean => {
    if (!u || !u.role) return false;
    const role = u.role.toLowerCase();
    return role === 'superadmin' || role === 'super_admin';
  };

  const handleAuthLogin = async (email: string, pass: string) => {
    const data = await apiService.login(email, pass);
    if (data && typeof data === 'object') {
      const responseData = data as { user: User; token?: string; tenantId?: string };
      if (responseData.user) {
        // First, persist credentials to localStorage synchronously
        if (responseData.token) authStorage.setToken(responseData.token);
        if (responseData.tenantId) authStorage.setTenantId(responseData.tenantId);
        authStorage.setUser(responseData.user);

        // Then, update state to trigger re-render of authenticated routes
        setUser(responseData.user);
      }
    }
  };

  const handleClientLogin = async (email: string, pass: string) => {
    const data = await apiService.clientLogin(email, pass);
    if (data && typeof data === 'object') {
      const responseData = data as { user: User; token?: string; tenantId?: string };
      if (responseData.user) {
        // First, persist credentials to localStorage synchronously
        if (responseData.token) authStorage.setToken(responseData.token);
        if (responseData.tenantId) authStorage.setTenantId(responseData.tenantId);
        const clientUser = { ...responseData.user, role: 'client' as const };
        authStorage.setUser(clientUser);

        // Then, update state to trigger re-render of authenticated routes
        setUser(clientUser);
      }
    }
  };

  return (
    <Routes>
      {/* 1. �reas Autenticadas (Prioridade Máxima) */}
      {user && (
        <>
          <Route path="/admin/*" element={<AdminRoutes user={user} onLogout={handleLogout} />} />
          <Route path="/app/*" element={<ClientRoutes user={user} onLogout={handleLogout} />} />
        </>
      )}

      {/* 2. Upgrade e Outras Páginas Específicas */}
      <Route path="/upgrade" element={<UpgradePlan />} />

      {/* 3. Rotas Públicas Flattened */}
      <Route
        path="/"
        element={
          <LandingPage
            onNavigateLogin={() => navigate('/login')}
            onNavigateRegister={(plan) => {
              const url = plan ? `/register?plan=${encodeURIComponent(plan)}` : '/register';
              navigate(url);
            }}
          />
        }
      />
      <Route
        path="/login"
        element={
          user ? (
            <Navigate to={isSuperAdmin(user) ? '/admin' : '/app'} replace />
          ) : (
            <LoginPage
              onLogin={handleAuthLogin}
              onClientLogin={handleClientLogin}
              onBack={() => navigate('/')}
              onRegisterClick={() => navigate('/register')}
            />
          )
        }
      />
      <Route
        path="/register"
        element={
          user ? (
            <Navigate to="/app" replace />
          ) : (
            <RegisterPage onSwitchToLogin={() => navigate('/login')} />
          )
        }
      />

      {/* 4. Fallback Global */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

function App() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const storedUser = authStorage.getUser();
    if (storedUser) {
      setUser(storedUser as User);
    }
  }, []);

  return (
    <Router>
      <div className="app-container">
        <ThemeProvider>
          <ToastProvider>
            <AuthWrapper user={user} setUser={setUser} />
          </ToastProvider>
        </ThemeProvider>
      </div>
    </Router>
  );
}

export default App;
