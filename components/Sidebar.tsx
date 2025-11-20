import React from 'react';
import { AppView } from '../types';
import { Inbox, LayoutList, Settings, Building2, LogOut, Map, Kanban, Users } from 'lucide-react';

interface SidebarProps {
  currentView: AppView;
  onViewChange: (view: AppView) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, onViewChange }) => {
  const navItems = [
    { view: AppView.INBOX, label: 'Inbox', icon: Inbox },
    { view: AppView.CRM, label: 'Pipeline', icon: Kanban },
    { view: AppView.MY_CLIENTS, label: 'Meus Clientes', icon: Users }, // Novo
    { view: AppView.MY_PROPERTIES, label: 'Meus Imóveis', icon: Building2 }, // Novo
    { view: AppView.LISTINGS_FORM, label: 'Novo Anúncio', icon: LayoutList }, // Renomeado
    { view: AppView.MAP, label: 'Mapa', icon: Map },
    { view: AppView.SETTINGS, label: 'Configurações', icon: Settings },
  ];

  return (
    <aside className="w-20 lg:w-64 bg-slate-900 text-white flex flex-col h-screen transition-all duration-300 z-50">
      <div className="p-6 flex items-center justify-center lg:justify-start gap-3 border-b border-slate-800">
        <div className="bg-blue-600 p-2 rounded-lg">
          <Building2 className="w-6 h-6 text-white" />
        </div>
        <span className="font-bold text-xl hidden lg:block tracking-tight">OConnector</span>
      </div>

      <nav className="flex-1 py-6 flex flex-col gap-2 px-3 overflow-y-auto custom-scrollbar">
        {navItems.map((item) => {
          const isActive = currentView === item.view;
          return (
            <button
              key={item.view}
              onClick={() => onViewChange(item.view)}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                isActive 
                  ? 'bg-blue-600 text-white shadow-md' 
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              <span className="hidden lg:block font-medium truncate">{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-800 mt-auto">
        <button className="flex items-center gap-3 px-4 py-3 text-slate-400 hover:text-red-400 w-full rounded-lg hover:bg-slate-800 transition-colors">
          <LogOut className="w-5 h-5" />
          <span className="hidden lg:block font-medium">Sair</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;