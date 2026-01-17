import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import ClientLayout from './layouts/ClientLayout';
import AdminLayout from './layouts/AdminLayout';
import { apiService } from './services/apiService';
import { User, ToastNotification } from './types';
import LoginPage from './components/Auth/LoginPage';
import RegisterPage from './components/Auth/RegisterPage';
import LandingPage from './components/Landing/LandingPage';
import DashboardHome from './components/Dashboard/DashboardHome';
import Pipeline from './components/CRM/Pipeline';
import PropertyList from './components/Properties/PropertyList';
import ClientList from './components/Clients/ClientList';
import CalendarView from './components/Calendar/CalendarView';
import SuperAdminLeadCapture from './components/Admin/SuperAdminLeadCapture';
import { UpgradePlan } from './components/Subscription/UpgradePlan';
import AdminDashboard from './pages/admin/AdminDashboard';
import TenantsList from './pages/admin/TenantsList';
import AIControlPanel from './pages/admin/AIControlPanel';
import WhatsAppManager from './pages/admin/WhatsAppManager';
import FinanceDashboard from './pages/admin/FinanceDashboard';
import AuditLogs from './pages/admin/AuditLogs';
import FeatureManager from './pages/admin/FeatureManager';
import BroadcastManager from './pages/admin/BroadcastManager';
import AIAnalytics from './pages/admin/AIAnalytics';
import SystemHealth from './pages/admin/SystemHealth';
import SubscriptionManager from './pages/admin/SubscriptionManager';
import SettingsPage from './pages/admin/SettingsPage';
import ProspectingMap from './pages/admin/ProspectingMap';

// New Client Pages
import AIConsultant from './pages/client/AIConsultant';
import NewListing from './pages/client/NewListing';
import Calculator from './pages/client/Calculator';
import ClientSettings from './pages/client/SettingsPage';
import Campaigns from './pages/client/Campaigns';
import MarketingStudio from './pages/client/MarketingStudio';
import Contracts from './pages/client/Contracts';
import MapPage from './pages/client/MapPage';

import AdminInbox from './pages/admin/AdminInbox';
import InboxPage from './pages/client/InboxPage';
import { ToastProvider, useToast } from './contexts/ToastContext';
import { LeadsPage } from './pages/admin/LeadsPage';
import { ManuWidget } from './components/UI/ManuWidget';

// Auth Wrapper component to handle toast triggering inside context
const AuthWrapper: React.FC<{
  user: User | null;
  setUser: (u: User | null) => void;
}> = ({ user, setUser }) => {
  const { addToast } = useToast();

  const handleLogin = (userData: User) => {
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
    addToast('success', `Bem-vindo, ${userData.name}!`);
  };

  const handleAuthLogin = async (email: string, pass: string) => {
    try {
      const data = await apiService.login(email, pass);
      if (data && typeof data === 'object') {
        const responseData = data as { user: User; token?: string; tenantId?: string };
        if (responseData.user) {
          if (responseData.token) {
            localStorage.setItem('oinbox_token', responseData.token);
          }
          if (responseData.tenantId) {
            localStorage.setItem('oinbox_tenant_id', responseData.tenantId);
          }
          handleLogin(responseData.user);
        }
      }
    } catch (error) {
      addToast('error', 'Falha no login. Verifique suas credenciais.');
      throw error;
    }
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('user');
    localStorage.removeItem('oinbox_token');
    localStorage.removeItem('oinbox_tenant_id');
    addToast('info', 'Você saiu do sistema.');
  };

  return (
    <Routes>
      <Route
        path="/"
        element={
          <LandingPage
            onNavigateLogin={() => (window.location.href = '/login')}
            onNavigateRegister={(planName) => {
              const url = planName ? `/register?plan=${encodeURIComponent(planName)}` : '/register';
              window.location.href = url;
            }}
          />
        }
      />
      <Route
        path="/login"
        element={
          user ? (
            user.role === 'SuperAdmin' ? (
              <Navigate to="/admin" />
            ) : (
              <Navigate to="/app" />
            )
          ) : (
            <LoginPage
              onLogin={handleAuthLogin}
              onBack={() => (window.location.href = '/')}
              onRegisterClick={() => (window.location.href = '/register')}
            />
          )
        }
      />
      <Route
        path="/register"
        element={
          user ? (
            <Navigate to="/app" />
          ) : (
            <RegisterPage onSwitchToLogin={() => (window.location.href = '/login')} />
          )
        }
      />

      {/* Upgrade Route */}
      <Route path="/upgrade" element={<UpgradePlan />} />

      {/* Admin Routes - Monolithic View */}
      <Route
        path="/admin/*"
        element={
          user && user.role === 'SuperAdmin' ? (
             // Simple Gate Check
             ((user as any).trialEndsAt && new Date() > new Date((user as any).trialEndsAt) && (user as any).plan?.includes('Trial')) 
             ? <Navigate to="/upgrade" /> 
             : <SuperAdminLeadCapture onLogout={handleLogout} />
          ) : (
            <Navigate to="/login" />
          )
        }
      />

      {/* Client App Routes */}
      <Route
        path="/app"
        element={
          user ? <ClientLayout user={user} onLogout={handleLogout} /> : <Navigate to="/login" />
        }
      >
        <Route
          index
          element={
            <DashboardHome
              clients={[]}
              deals={[]}
              properties={[]}
              conversations={[]}
              onNavigate={() => undefined}
            />
          }
        />
        <Route path="pipeline" element={<Pipeline onNavigateToChat={() => undefined} />} />
        <Route path="inbox" element={<InboxPage />} />
        <Route
          path="properties"
          element={
            <PropertyList
              properties={[]}
              onNavigateToCreate={() => undefined}
              onDeleteProperty={() => undefined}
            />
          }
        />
        <Route path="clients" element={<ClientList clients={[]} onAddClient={() => undefined} />} />
        <Route path="calendar" element={<CalendarView />} />
        {/* New Pages */}
        <Route path="ai-consultant" element={<AIConsultant />} />
        <Route path="listings/new" element={<NewListing />} />
        <Route path="campaigns" element={<Campaigns />} />
        <Route path="marketing" element={<MarketingStudio />} />
        <Route path="contracts" element={<Contracts />} />
        <Route path="calculator" element={<Calculator />} />
        <Route path="map" element={<MapPage />} />
        <Route path="settings" element={<ClientSettings />} />
        {/* WhatsApp Integration */}
        <Route path="whatsapp" element={<WhatsAppManager />} />
        <Route path="leads" element={<LeadsPage />} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
};

function App() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  return (
    <Router>
      <div className="app-container">
        <ToastProvider>
          <AuthWrapper user={user} setUser={setUser} />
          <ManuWidget />
        </ToastProvider>
      </div>
    </Router>
  );
}

export default App;
