import React from 'react';
import { Link } from 'react-router-dom';
import {
    LayoutDashboard,
    Calendar,
    Inbox,
    KanbanSquare,
    Bot,
    Users,
    Building2,
    PlusCircle,
    Megaphone,
    Palette,
    FileText,
    Calculator,
    Map,
    Settings
} from 'lucide-react';
import { AppView } from '../../types';

interface SidebarProps {
    currentView: AppView;
    onViewChange: (view: AppView) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, onViewChange }) => {

    const menuItems = [
        { view: AppView.DASHBOARD, label: 'Visão Geral', icon: LayoutDashboard, path: '/app' },
        { view: AppView.CALENDAR, label: 'Agenda', icon: Calendar, path: '/app/calendar' },
        { view: AppView.INBOX, label: 'Inbox', icon: Inbox, path: '/app/inbox' },
        { view: AppView.CRM, label: 'Pipeline', icon: KanbanSquare, path: '/app/pipeline' },
        { view: AppView.AI_CONSULTANT, label: 'Consultor IA', icon: Bot, path: '/app/ai-consultant' },
        { view: AppView.MY_CLIENTS, label: 'Meus Clientes', icon: Users, path: '/app/clients' },
        { view: AppView.MY_PROPERTIES, label: 'Meus Imóveis', icon: Building2, path: '/app/properties' },
        { view: AppView.LISTINGS_FORM, label: 'Novo Anúncio', icon: PlusCircle, path: '/app/listings/new' },
        { view: AppView.CAMPAIGNS, label: 'Campanhas', icon: Megaphone, path: '/app/campaigns' },
        { view: AppView.MARKETING, label: 'Marketing Studio', icon: Palette, path: '/app/marketing' },
        { view: AppView.CONTRACTS, label: 'Contratos', icon: FileText, path: '/app/contracts' },
        { view: AppView.CALCULATOR, label: 'Calculadora', icon: Calculator, path: '/app/calculator' },
        { view: AppView.MAP, label: 'Mapa', icon: Map, path: '/app/map' },
        { view: AppView.SETTINGS, label: 'Configurações', icon: Settings, path: '/app/settings' },
    ];

    return (
        <aside className="w-64 bg-sidebar text-sidebar-foreground flex flex-col h-full border-r border-sidebar-border flex-shrink-0 transition-all duration-300">
            <div className="p-4 flex items-center justify-center border-b border-sidebar-border">
                 <img src="/oinbox-logo.png" alt="Oinbox Logo" className="h-32 w-auto object-contain" />
            </div>

            <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1 custom-scrollbar">
                {menuItems.map((item) => {
                    const isActive = currentView === item.view;
                    return (
                        <Link
                            key={item.view}
                            to={item.path}
                            onClick={() => onViewChange(item.view)}
                            className={`
                                flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group
                                ${isActive
                                    ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-lg shadow-sidebar-primary/20'
                                    : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                                }
                            `}
                        >
                            <item.icon
                                size={18}
                                className={`
                                    transition-colors duration-200
                                    ${isActive ? 'text-sidebar-primary-foreground' : 'text-sidebar-foreground/50 group-hover:text-sidebar-accent-foreground'}
                                `}
                            />
                            {item.label}
                        </Link>
                    );
                })}
            </nav>

            <div className="p-4 border-t border-sidebar-border">
                <button className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-sidebar-foreground/70 hover:text-sidebar-accent-foreground transition-colors w-full rounded-lg hover:bg-sidebar-accent">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-log-out"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" x2="9" y1="12" y2="12" /></svg>
                    Sair da Conta
                </button>
            </div>
        </aside>
    );
};

export default Sidebar;
