import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import ClientLayout from './src/layouts/ClientLayout';
import AdminLayout from './src/layouts/AdminLayout';
import { LogIn } from 'lucide-react';
import { apiService } from './services/apiService';
import { User, Property, Client } from './types';
import LoginPage from './components/Auth/LoginPage';
import RegisterPage from './components/Auth/RegisterPage';
import LandingPage from './components/Landing/LandingPage';
import DashboardHome from './components/Dashboard/DashboardHome';
import Pipeline from './components/CRM/Pipeline';
import ChatList from './components/Inbox/ChatList';
import PropertyList from './components/Properties/PropertyList';
import ClientList from './components/Clients/ClientList';
import CalendarView from './components/Calendar/CalendarView';
import AdminDashboard from './src/pages/admin/AdminDashboard';
import TenantsList from './src/pages/admin/TenantsList';
import AIControlPanel from './src/pages/admin/AIControlPanel';
import WhatsAppManager from './src/pages/admin/WhatsAppManager';
import FinanceDashboard from './src/pages/admin/FinanceDashboard';
import AuditLogs from './src/pages/admin/AuditLogs';
import FeatureManager from './src/pages/admin/FeatureManager';
import BroadcastManager from './src/pages/admin/BroadcastManager';
import AIAnalytics from './src/pages/admin/AIAnalytics';
import SystemHealth from './src/pages/admin/SystemHealth';
import SubscriptionManager from './src/pages/admin/SubscriptionManager';
import SettingsPage from './src/pages/admin/SettingsPage';

// New Client Pages
import AIConsultant from './src/pages/client/AIConsultant';
import NewListing from './src/pages/client/NewListing';
import Calculator from './src/pages/client/Calculator';
import ClientSettings from './src/pages/client/SettingsPage';
import Campaigns from './src/pages/client/Campaigns';
import MarketingStudio from './src/pages/client/MarketingStudio';
import Contracts from './src/pages/client/Contracts';
import MapPage from './src/pages/client/MapPage';

import AdminInbox from './src/pages/admin/AdminInbox';
import InboxPage from './src/pages/client/InboxPage';
import ToastContainer from './components/UI/ToastContainer';
import { ToastNotification } from './types';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [toasts, setToasts] = useState<ToastNotification[]>([]);

  const addToast = (type: 'success' | 'error' | 'info', message: string) => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  };

  const handleLogin = (userData: User) => {
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
    addToast('success', `Bem-vindo, ${userData.name}!`);
  };

  const handleAuthLogin = async (email: string, pass: string) => {
    try {
      const data: any = await apiService.login(email, pass);
      if (data.user) {
        if (data.token) {
          localStorage.setItem('oinbox_token', data.token);
        }
        if (data.tenantId) {
          localStorage.setItem('oinbox_tenant_id', data.tenantId);
        }
        handleLogin(data.user);
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

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  return (
    <Router>
      <div className="app-container">
        <ToastContainer toasts={toasts} removeToast={(id) => setToasts(prev => prev.filter(t => t.id !== id))} />
        <Routes>
          <Route path="/" element={<LandingPage onNavigateLogin={() => window.location.href = '/login'} onNavigateRegister={() => window.location.href = '/register'} />} />
          <Route path="/login" element={user ? (user.role === 'super_admin' ? <Navigate to="/admin" /> : <Navigate to="/app" />) : <LoginPage onLogin={handleAuthLogin} onBack={() => window.location.href = '/'} onRegisterClick={() => window.location.href = '/register'} />} />
          <Route path="/register" element={user ? <Navigate to="/app" /> : <RegisterPage onSwitchToLogin={() => window.location.href = '/login'} />} />

          {/* Admin Routes */}
          <Route path="/admin" element={user && user.role === 'super_admin' ? <AdminLayout user={user} onLogout={handleLogout} /> : <Navigate to="/login" />}>
            <Route index element={<AdminDashboard />} />
            <Route path="tenants" element={<TenantsList />} />
            <Route path="inbox" element={<AdminInbox />} />
            <Route path="ai" element={<AIControlPanel />} />
            <Route path="whatsapp" element={<WhatsAppManager />} />
            <Route path="finance" element={<FinanceDashboard />} />
            <Route path="audit-logs" element={<AuditLogs />} />
            <Route path="features" element={<FeatureManager />} />
            <Route path="broadcasts" element={<BroadcastManager />} />
            <Route path="ai-analytics" element={<AIAnalytics />} />
            <Route path="health" element={<SystemHealth />} />
            <Route path="subscriptions" element={<SubscriptionManager />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>

          {/* Client App Routes */}
          <Route path="/app" element={user ? <ClientLayout user={user} onLogout={handleLogout} /> : <Navigate to="/login" />}>
            <Route index element={<DashboardHome clients={[]} deals={[]} properties={[]} conversations={[]} onNavigate={() => { }} />} />
            <Route path="pipeline" element={<Pipeline onNavigateToChat={() => { }} />} />
import InboxPage from './src/pages/client/InboxPage';
            <Route path="inbox" element={<InboxPage />} />
            <Route path="properties" element={<PropertyList properties={[]} onNavigateToCreate={() => { }} onDeleteProperty={() => { }} />} />
            <Route path="clients" element={<ClientList clients={[]} onAddClient={() => { }} />} />
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
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
