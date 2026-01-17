import React from 'react';
import { Outlet, Link } from 'react-router-dom';
import { LayoutDashboard, Users, Settings, LogOut } from 'lucide-react';
import { User } from '../types';

interface AdminLayoutProps {
  user: User;
  onLogout: () => void;
}

export default function AdminLayout({ user, onLogout }: AdminLayoutProps) {
  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <aside className="w-64 bg-gray-900 text-white hidden md:flex flex-col">
        <div className="p-6 border-b border-gray-800">
          <h2 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">
            Super Admin
          </h2>
          {user && <p className="text-xs text-gray-400 mt-1">Logado como: {user.name}</p>}
        </div>
        
        <nav className="flex-1 p-4 space-y-2">
          <Link to="/admin" className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-800 transition-colors">
            <LayoutDashboard size={20} />
            Dashboard
          </Link>
          <Link to="/admin/tenants" className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-800 transition-colors">
            <Users size={20} />
            Tenants
          </Link>
          <Link to="/admin/settings" className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-800 transition-colors">
            <Settings size={20} />
            Configurações
          </Link>
          <Link to="/admin/leads" className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-800 transition-colors">
            <Users size={20} />
            Leads Ops
          </Link>
          <Link to="/admin/prospecting" className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-800 transition-colors text-indigo-300">
            <Users size={20} />
            Radar de Prospecção
          </Link>
        </nav>

        <div className="p-4 border-t border-gray-800">
          <button 
            onClick={onLogout}
            className="flex items-center gap-3 px-4 py-3 w-full rounded-lg hover:bg-red-900/20 text-red-400 hover:text-red-300 transition-colors"
          >
            <LogOut size={20} />
            Sair
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <header className="bg-white shadow-sm p-4 flex justify-between items-center md:hidden">
            <span className="font-bold">Super Admin</span>
            {/* Mobile menu trigger would go here */}
        </header>
        <div className="p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
