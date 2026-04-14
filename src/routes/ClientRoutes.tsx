import React, { Suspense } from 'react';
import { Outlet, Route, Routes, Navigate } from 'react-router-dom';
import { User } from '@shared/types';
import Sidebar from '../components/Sidebar';
import DashboardHome from '../components/Dashboard/DashboardHome';
import Pipeline from '../components/CRM/Pipeline';
import PropertyList from '../components/Properties/PropertyList';
import ClientList from '../components/Clients/ClientList';
import CalendarView from '../components/Calendar/CalendarView';
import InboxPage from '../pages/client/InboxPage';
import ListingForm from '../components/Listings/ListingForm';
import ClientSettings from '../pages/client/SettingsPage';
import Campaigns from '../pages/client/Campaigns';
import WhatsAppManager from '../components/Admin/WhatsAppBotManager';
import { LeadsPage } from '../pages/admin/LeadsPage';
import { SkeletonCard } from '../components/UI/Skeleton';
import { TrialAlert } from '../components/UI/TrialAlert';

// Lazy loaded components
const LegalHub = React.lazy(() =>
  import('../components/LegalHub').then((m) => ({ default: m.LegalHub })),
);
const AIConsultant = React.lazy(() => import('../pages/client/AIConsultant'));
const MarketingStudio = React.lazy(() => import('../pages/client/MarketingStudio'));
const Calculator = React.lazy(() => import('../pages/client/Calculator'));
const Contracts = React.lazy(() => import('../pages/client/Contracts'));
const MapPage = React.lazy(() => import('../pages/client/MapPage'));

interface ClientRoutesProps {
  user: User;
  onLogout: () => void;
}

const isSuperAdmin = (user: User | null): boolean => {
  if (!user || !user.role) return false;
  const role = user.role.toLowerCase();
  return role === 'superadmin' || role === 'super_admin';
};

function LazyFallback() {
  return (
    <div className="p-6">
      <SkeletonCard />
    </div>
  );
}

const ClientLayout: React.FC<{ user: User; onLogout: () => void }> = ({ user, onLogout }) => (
  <div className="flex h-screen bg-white">
    <Sidebar user={user} onLogout={onLogout} />
    <main className="flex-1 overflow-auto relative flex flex-col">
      <TrialAlert user={user} />
      <div className="flex-1 relative">
        <Outlet />
      </div>
    </main>
  </div>
);

export const ClientRoutes: React.FC<ClientRoutesProps> = ({ user, onLogout }) => {
  if (isSuperAdmin(user)) {
    return <Navigate to="/admin" />;
  }

  return (
    <Routes>
      <Route element={<ClientLayout user={user} onLogout={onLogout} />}>
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
        <Route
          path="ai-consultant"
          element={
            <Suspense fallback={<LazyFallback />}>
              <AIConsultant />
            </Suspense>
          }
        />
        <Route path="listings/new" element={<ListingForm />} />
        <Route path="campaigns" element={<Campaigns />} />
        <Route
          path="marketing"
          element={
            <Suspense fallback={<LazyFallback />}>
              <MarketingStudio />
            </Suspense>
          }
        />
        <Route
          path="contracts"
          element={
            <Suspense fallback={<LazyFallback />}>
              <Contracts />
            </Suspense>
          }
        />
        <Route
          path="calculator"
          element={
            <Suspense fallback={<LazyFallback />}>
              <Calculator />
            </Suspense>
          }
        />
        <Route
          path="map"
          element={
            <Suspense fallback={<LazyFallback />}>
              <MapPage />
            </Suspense>
          }
        />
        <Route
          path="legal-hub"
          element={
            <Suspense fallback={<LazyFallback />}>
              <LegalHub />
            </Suspense>
          }
        />
        <Route path="settings" element={<ClientSettings />} />
        <Route path="whatsapp" element={<WhatsAppManager />} />
        <Route path="leads" element={<LeadsPage />} />
        <Route path="*" element={<Navigate to="/app" />} />
      </Route>
    </Routes>
  );
};
