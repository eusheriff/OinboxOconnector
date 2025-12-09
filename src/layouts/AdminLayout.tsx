import React from 'react';
import { Outlet, Link, useNavigate } from 'react-router-dom';
import { LogOut, LayoutDashboard, Users, Settings, Bot, MessageCircle, DollarSign, Shield, ToggleLeft, Radio, BarChart3, Activity, CreditCard } from 'lucide-react';

import { User } from '../../types';

interface AdminLayoutProps {
    user: User;
    onLogout: () => void;
}

const AdminLayout: React.FC<AdminLayoutProps> = ({ user, onLogout }) => {
    const navigate = useNavigate();

    return (
        <div className="flex h-screen bg-background text-white font-sans">
            {/* Admin Sidebar */}
            <aside className="w-64 bg-card border-r border-border flex flex-col">
                <div className="p-6 border-b border-border">
                    <h1 className="text-xl font-bold text-blue-400">Oinbox <span className="text-xs text-gray-400 block">Super Admin</span></h1>
                </div>

                <nav className="flex-1 p-4 space-y-2">
                    <Link to="/admin" className="flex items-center gap-3 px-4 py-3 text-gray-300 hover:bg-accent rounded-lg transition-colors">
                        <LayoutDashboard size={20} />
                        Dashboard
                    </Link>
                    <Link to="/admin/inbox" className="flex items-center gap-3 px-4 py-3 text-gray-300 hover:bg-accent rounded-lg transition-colors">
                        <MessageCircle size={20} />
                        Inbox (Suporte)
                    </Link>
                    <Link to="/admin/tenants" className="flex items-center gap-3 px-4 py-3 text-gray-300 hover:bg-accent rounded-lg transition-colors">
                        <Users size={20} />
                        Inquilinos (Tenants)
                    </Link>
                    <Link to="/admin/ai" className="flex items-center gap-3 px-4 py-3 text-gray-300 hover:bg-accent rounded-lg transition-colors">
                        <Bot size={20} />
                        IA Control Panel
                    </Link>
                    <Link to="/admin/whatsapp" className="flex items-center gap-3 px-4 py-3 text-gray-300 hover:bg-accent rounded-lg transition-colors">
                        <MessageCircle size={20} />
                        WhatsApp
                    </Link>
                    <Link to="/admin/finance" className="flex items-center gap-3 px-4 py-3 text-gray-300 hover:bg-accent rounded-lg transition-colors">
                        <DollarSign size={20} />
                        Financeiro
                    </Link>
                    <Link to="/admin/audit-logs" className="flex items-center gap-3 px-4 py-3 text-gray-300 hover:bg-accent rounded-lg transition-colors">
                        <Shield size={20} />
                        Audit Logs
                    </Link>
                    <Link to="/admin/features" className="flex items-center gap-3 px-4 py-3 text-gray-300 hover:bg-accent rounded-lg transition-colors">
                        <ToggleLeft size={20} />
                        Feature Flags
                    </Link>
                    <Link to="/admin/broadcasts" className="flex items-center gap-3 px-4 py-3 text-gray-300 hover:bg-accent rounded-lg transition-colors">
                        <Radio size={20} />
                        Avisos
                    </Link>
                    <Link to="/admin/ai-analytics" className="flex items-center gap-3 px-4 py-3 text-gray-300 hover:bg-accent rounded-lg transition-colors">
                        <BarChart3 size={20} />
                        AI Analytics
                    </Link>
                    <Link to="/admin/health" className="flex items-center gap-3 px-4 py-3 text-gray-300 hover:bg-accent rounded-lg transition-colors">
                        <Activity size={20} />
                        System Health
                    </Link>
                    <Link to="/admin/subscriptions" className="flex items-center gap-3 px-4 py-3 text-gray-300 hover:bg-accent rounded-lg transition-colors">
                        <CreditCard size={20} />
                        Assinaturas
                    </Link>
                    <Link to="/admin/settings" className="flex items-center gap-3 px-4 py-3 text-gray-300 hover:bg-accent rounded-lg transition-colors">
                        <Settings size={20} />
                        Configurações
                    </Link>
                </nav>

                <div className="p-4 border-t border-border">
                    <button onClick={onLogout} className="flex items-center gap-3 px-4 py-3 text-red-400 hover:bg-accent rounded-lg w-full transition-colors">
                        <LogOut size={20} />
                        Sair
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-auto bg-background p-8">
                <Outlet />
            </main>
        </div>
    );
};

export default AdminLayout;
