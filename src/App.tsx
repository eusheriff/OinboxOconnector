import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { User } from '@shared/types';
import { authStorage } from './lib/authStorage';
import { ToastProvider, useToast } from './contexts/ToastContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { ManuWidget } from './components/UI/ManuWidget';
import { PublicRoutes } from './routes/PublicRoutes';
import { AdminRoutes } from './routes/AdminRoutes';
import { ClientRoutes } from './routes/ClientRoutes';
import { UpgradePlan } from './components/Subscription/UpgradePlan';

interface AuthWrapperProps {
  user: User | null;
  setUser: (u: User | null) => void;
}

const AuthWrapper: React.FC<AuthWrapperProps> = ({ user, setUser }) => {
  const { addToast } = useToast();

  const handleLogout = () => {
    setUser(null);
    authStorage.clear();
    addToast('info', 'Você saiu do sistema.');
  };

  return (
    <Routes>
      {/* Rotas públicas */}
      <Route path="/*" element={<PublicRoutes user={user} setUser={setUser} />} />

      {/* Upgrade */}
      <Route path="/upgrade" element={<UpgradePlan />} />

      {/* Admin */}
      {user && (
        <Route
          path="/admin/*"
          element={<AdminRoutes user={user} onLogout={handleLogout} />}
        />
      )}

      {/* Client */}
      {user && (
        <Route
          path="/app/*"
          element={<ClientRoutes user={user} onLogout={handleLogout} />}
        />
      )}

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" />} />
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
            <ManuWidget />
          </ToastProvider>
        </ThemeProvider>
      </div>
    </Router>
  );
}

export default App;
