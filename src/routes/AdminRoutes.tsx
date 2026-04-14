import React from 'react';
import { Route, Routes, Navigate } from 'react-router-dom';
import { User } from '@shared/types';
import { UpgradePlan } from '../components/Subscription/UpgradePlan';
import SuperAdminLeadCapture from '../components/Admin/SuperAdminLeadCapture';
import AdminDashboard from '../pages/admin/AdminDashboard';
import TenantsList from '../pages/admin/TenantsList';
import AIControlPanel from '../pages/admin/AIControlPanel';
import WhatsAppManager from '../pages/admin/WhatsAppManager';
import FinanceDashboard from '../pages/admin/FinanceDashboard';
import AuditLogs from '../pages/admin/AuditLogs';
import FeatureManager from '../pages/admin/FeatureManager';
import BroadcastManager from '../pages/admin/BroadcastManager';
import AIAnalytics from '../pages/admin/AIAnalytics';
import SystemHealth from '../pages/admin/SystemHealth';
import SubscriptionManager from '../pages/admin/SubscriptionManager';
import SettingsPage from '../pages/admin/SettingsPage';
import AdminInbox from '../pages/admin/AdminInbox';
import ProspectingMap from '../pages/admin/ProspectingMap';
import { LeadsPage } from '../pages/admin/LeadsPage';
import EnterpriseBuyerLeads from '../pages/admin/EnterpriseBuyerLeads';
import AIConsultant from '../pages/client/AIConsultant';

interface AdminRoutesProps {
  user: User;
  onLogout: () => void;
}

const isSuperAdmin = (user: User | null): boolean => {
  if (!user || !user.role) return false;
  const role = user.role.toLowerCase();
  return role === 'superadmin' || role === 'super_admin';
};

const isTrialExpired = (user: User): boolean => {
  const userWithTrial = user as unknown as Record<string, unknown>;
  const trialEndsAt = userWithTrial.trialEndsAt as string | undefined;
  const plan = userWithTrial.plan as string | undefined;
  if (!trialEndsAt || !plan?.includes('Trial')) return false;
  return new Date() > new Date(trialEndsAt);
};

export const AdminRoutes: React.FC<AdminRoutesProps> = ({ user, onLogout }) => {
  if (!isSuperAdmin(user)) {
    return <Navigate to="/login" />;
  }

  if (isTrialExpired(user)) {
    return <Navigate to="/upgrade" />;
  }

  return (
    <Routes>
      <Route index element={<SuperAdminLeadCapture onLogout={onLogout} />} />
      <Route path="dashboard" element={<AdminDashboard />} />
      <Route path="tenants" element={<TenantsList />} />
      <Route path="ai-control" element={<AIControlPanel />} />
      <Route path="whatsapp" element={<WhatsAppManager />} />
      <Route path="finance" element={<FinanceDashboard />} />
      <Route path="audit" element={<AuditLogs />} />
      <Route path="features" element={<FeatureManager />} />
      <Route path="broadcast" element={<BroadcastManager />} />
      <Route path="ai-analytics" element={<AIAnalytics />} />
      <Route path="health" element={<SystemHealth />} />
      <Route path="subscriptions" element={<SubscriptionManager />} />
      <Route path="settings" element={<SettingsPage />} />
      <Route path="inbox" element={<AdminInbox />} />
      <Route path="prospecting" element={<ProspectingMap />} />
      <Route path="leads" element={<LeadsPage />} />
      <Route path="ai-consultant" element={<AIConsultant />} />
      <Route path="buyer-leads" element={<EnterpriseBuyerLeads />} />
      <Route path="*" element={<Navigate to="/admin" />} />
    </Routes>
  );
};
