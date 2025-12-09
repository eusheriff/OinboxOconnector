import React, { useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import BroadcastBanner from '../components/BroadcastBanner';
import { AppView } from '../../types';
import { User } from '../../types';

interface ClientLayoutProps {
    user: User;
    onLogout: () => void;
}

const ClientLayout: React.FC<ClientLayoutProps> = ({ user, onLogout }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const [currentView, setCurrentView] = React.useState<AppView>(AppView.DASHBOARD);

    const adminToken = localStorage.getItem('oconnector_admin_token');

    // Sync Sidebar state with URL
    useEffect(() => {
        const path = location.pathname;
        if (path === '/app') setCurrentView(AppView.DASHBOARD);
        else if (path === '/app/inbox') setCurrentView(AppView.INBOX);
        else if (path === '/app/pipeline') setCurrentView(AppView.CRM);
        else if (path === '/app/properties') setCurrentView(AppView.MY_PROPERTIES);
        else if (path === '/app/clients') setCurrentView(AppView.MY_CLIENTS);
        else if (path === '/app/calendar') setCurrentView(AppView.CALENDAR);
        else if (path === '/app/ai-consultant') setCurrentView(AppView.AI_CONSULTANT);
        else if (path === '/app/listings/new') setCurrentView(AppView.LISTINGS_FORM);
        else if (path === '/app/campaigns') setCurrentView(AppView.CAMPAIGNS);
        else if (path === '/app/marketing') setCurrentView(AppView.MARKETING);
        else if (path === '/app/contracts') setCurrentView(AppView.CONTRACTS);
        else if (path === '/app/calculator') setCurrentView(AppView.CALCULATOR);
        else if (path === '/app/map') setCurrentView(AppView.MAP);
        else if (path === '/app/settings') setCurrentView(AppView.SETTINGS);
    }, [location.pathname]);

    const handleExitImpersonation = () => {
        if (adminToken) {
            localStorage.setItem('oconnector_token', adminToken);
            localStorage.removeItem('oconnector_admin_token');
            localStorage.removeItem('oconnector_tenant_id');
            window.location.href = '/admin/tenants';
        }
    };

    const handleViewChange = (view: AppView) => {
        setCurrentView(view);
        switch (view) {
            case AppView.DASHBOARD: navigate('/app'); break;
            case AppView.INBOX: navigate('/app/inbox'); break;
            case AppView.CRM: navigate('/app/pipeline'); break;
            case AppView.MY_PROPERTIES: navigate('/app/properties'); break;
            case AppView.MY_CLIENTS: navigate('/app/clients'); break;
            case AppView.CALENDAR: navigate('/app/calendar'); break;
            case AppView.AI_CONSULTANT: navigate('/app/ai-consultant'); break;
            case AppView.LISTINGS_FORM: navigate('/app/listings/new'); break;
            case AppView.CAMPAIGNS: navigate('/app/campaigns'); break;
            case AppView.MARKETING: navigate('/app/marketing'); break;
            case AppView.CONTRACTS: navigate('/app/contracts'); break;
            case AppView.CALCULATOR: navigate('/app/calculator'); break;
            case AppView.MAP: navigate('/app/map'); break;
            case AppView.SETTINGS: navigate('/app/settings'); break;
            default: break;
        }
    };

    return (
        <div className="flex h-screen bg-gray-100 font-sans flex-row">
            <Sidebar currentView={currentView} onViewChange={handleViewChange} />
            <div className="flex-1 flex flex-col h-screen overflow-hidden">
                {adminToken && (
                    <div className="bg-yellow-500 text-black px-4 py-2 text-center font-bold flex justify-between items-center shadow-md z-50">
                        <span>🕵️ Você está acessando como este cliente (Modo Espião)</span>
                        <button
                            onClick={handleExitImpersonation}
                            className="bg-black text-white px-3 py-1 rounded text-sm hover:bg-gray-800 transition-colors"
                        >
                            Sair do Acesso
                        </button>
                    </div>
                )}
                <BroadcastBanner />
                <main className="flex-1 overflow-auto relative bg-gray-50">
                    <Outlet />
                </main>
            </div>
        </div>
    );
};

export default ClientLayout;
