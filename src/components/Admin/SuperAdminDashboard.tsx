import React, { useState } from 'react';
import { AppView, Tenant } from '../../types';
import { MOCK_TENANTS } from '../../constants';
import {
  LayoutDashboard,
  Users,
  CreditCard,
  Activity,
  Server,
  LogOut,
  Search,
  MoreHorizontal,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Building2,
  Database,
  Globe,
} from 'lucide-react';

interface SuperAdminDashboardProps {
  onLogout: () => void;
}

const SuperAdminDashboard: React.FC<SuperAdminDashboardProps> = ({ onLogout }) => {
  const [activeView, setActiveView] = useState<AppView>(AppView.SUPER_ADMIN_OVERVIEW);
  const [tenants, setTenants] = useState<Tenant[]>(MOCK_TENANTS);

  // Metrics
  const totalMRR = tenants.reduce((acc, t) => acc + t.mrr, 0);
  const activeTenants = tenants.filter((t) => t.status === 'Active').length;
  const totalUsers = tenants.reduce((acc, t) => acc + t.usersCount, 0);

  const renderSidebar = () => (
    <aside className="w-64 bg-background text-white flex flex-col h-screen">
      <div className="p-6 flex items-center gap-3 border-b border-border">
        <div className="bg-purple-600 p-2 rounded-lg shadow-lg shadow-purple-900/50">
          <Activity className="w-6 h-6 text-white" />
        </div>
        <div>
          <span className="font-bold text-lg tracking-tight block">Euimob</span>
          <span className="text-[10px] text-purple-400 font-bold uppercase tracking-wider">
            Super Admin
          </span>
        </div>
      </div>

      <nav className="flex-1 py-6 flex flex-col gap-2 px-3">
        <button
          onClick={() => setActiveView(AppView.SUPER_ADMIN_OVERVIEW)}
          className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${activeView === AppView.SUPER_ADMIN_OVERVIEW ? 'bg-purple-600 text-white' : 'text-muted-foreground hover:bg-accent hover:text-white'}`}
        >
          <LayoutDashboard className="w-5 h-5" /> Visão Global
        </button>
        <button
          onClick={() => setActiveView(AppView.SUPER_ADMIN_TENANTS)}
          className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${activeView === AppView.SUPER_ADMIN_TENANTS ? 'bg-purple-600 text-white' : 'text-muted-foreground hover:bg-accent hover:text-white'}`}
        >
          <Users className="w-5 h-5" /> Gestão de Inquilinos
        </button>
        <button
          onClick={() => setActiveView(AppView.SUPER_ADMIN_FINANCE)}
          className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${activeView === AppView.SUPER_ADMIN_FINANCE ? 'bg-purple-600 text-white' : 'text-muted-foreground hover:bg-accent hover:text-white'}`}
        >
          <CreditCard className="w-5 h-5" /> Financeiro (Stripe)
        </button>
      </nav>

      <div className="p-4 border-t border-border">
        <div className="bg-card rounded-lg p-3 mb-3">
          <div className="flex items-center gap-2 mb-2">
            <Server className="w-4 h-4 text-green-400" />
            <span className="text-xs text-slate-300 font-bold">Status do Sistema</span>
          </div>
          <div className="space-y-1">
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>API Latency</span>
              <span className="text-green-400">45ms</span>
            </div>
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>Cloudflare</span>
              <span className="text-green-400">Operational</span>
            </div>
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>Gemini AI</span>
              <span className="text-green-400">Operational</span>
            </div>
          </div>
        </div>
        <button
          onClick={onLogout}
          className="flex items-center gap-3 px-4 py-3 text-muted-foreground hover:text-red-400 w-full rounded-lg hover:bg-accent transition-colors"
        >
          <LogOut className="w-5 h-5" />
          <span className="font-medium">Sair</span>
        </button>
      </div>
    </aside>
  );

  const renderOverview = () => (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-foreground mb-6">Visão Geral da Plataforma</h1>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <p className="text-xs font-bold text-gray-400 uppercase mb-1">MRR (Receita Mensal)</p>
          <h3 className="text-3xl font-bold text-foreground">R$ {totalMRR.toLocaleString()}</h3>
          <p className="text-xs text-green-600 font-bold mt-2 flex items-center gap-1">
            <TrendingUp className="w-3 h-3" /> +12% este mês
          </p>
        </div>
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <p className="text-xs font-bold text-gray-400 uppercase mb-1">Total de Inquilinos</p>
          <h3 className="text-3xl font-bold text-foreground">{tenants.length}</h3>
          <p className="text-xs text-muted-foreground mt-2">{activeTenants} ativos</p>
        </div>
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <p className="text-xs font-bold text-gray-400 uppercase mb-1">Usuários Totais</p>
          <h3 className="text-3xl font-bold text-foreground">{totalUsers}</h3>
          <p className="text-xs text-muted-foreground mt-2">
            Média de {Math.round(totalUsers / tenants.length)} por conta
          </p>
        </div>
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <p className="text-xs font-bold text-gray-400 uppercase mb-1">Consumo IA (Tokens)</p>
          <h3 className="text-3xl font-bold text-foreground">2.4M</h3>
          <p className="text-xs text-purple-600 font-bold mt-2">Gemini Pro + Flash</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <h3 className="font-bold text-foreground mb-4">Últimos Cadastros</h3>
          <div className="space-y-4">
            {tenants.slice(0, 3).map((t) => (
              <div
                key={t.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center text-purple-600 font-bold">
                    {t.name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-bold text-sm text-foreground">{t.name}</p>
                    <p className="text-xs text-gray-500">{t.plan}</p>
                  </div>
                </div>
                <span className="text-xs font-bold text-green-600">+ R$ {t.mrr}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <h3 className="font-bold text-foreground mb-4">Saúde da Infraestrutura</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Globe className="w-5 h-5 text-gray-400" />
                <span className="text-sm font-medium text-slate-700">
                  Cloudflare Workers (Edge)
                </span>
              </div>
              <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full">
                Online
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Database className="w-5 h-5 text-gray-400" />
                <span className="text-sm font-medium text-slate-700">Cloudflare D1 (Database)</span>
              </div>
              <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full">
                Online
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Server className="w-5 h-5 text-gray-400" />
                <span className="text-sm font-medium text-slate-700">Cloudflare R2 (Storage)</span>
              </div>
              <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full">
                Online
              </span>
            </div>
            <div className="mt-4 p-3 bg-blue-50 text-blue-800 text-xs rounded-lg border border-blue-100">
              <strong>Nota Técnica:</strong> Backup automático realizado há 2 horas.
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderTenants = () => (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-foreground">Gestão de Inquilinos (Tenants)</h1>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar imobiliária..."
            className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none"
          />
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="p-4 text-xs font-bold text-gray-500 uppercase">Empresa</th>
              <th className="p-4 text-xs font-bold text-gray-500 uppercase">Plano</th>
              <th className="p-4 text-xs font-bold text-gray-500 uppercase">Status</th>
              <th className="p-4 text-xs font-bold text-gray-500 uppercase">MRR</th>
              <th className="p-4 text-xs font-bold text-gray-500 uppercase">Entrou em</th>
              <th className="p-4"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {tenants.map((tenant) => (
              <tr key={tenant.id} className="hover:bg-gray-50">
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center">
                      <Building2 className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-bold text-sm text-foreground">{tenant.name}</p>
                      <p className="text-xs text-gray-500">{tenant.ownerName}</p>
                    </div>
                  </div>
                </td>
                <td className="p-4">
                  <span
                    className={`px-2 py-1 text-xs font-bold rounded-md ${
                      tenant.plan === 'Enterprise'
                        ? 'bg-purple-100 text-purple-700'
                        : tenant.plan === 'Business'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {tenant.plan}
                  </span>
                </td>
                <td className="p-4">
                  {tenant.status === 'Active' && (
                    <span className="flex items-center gap-1 text-xs font-bold text-green-600">
                      <CheckCircle2 className="w-3 h-3" /> Ativo
                    </span>
                  )}
                  {tenant.status === 'Overdue' && (
                    <span className="flex items-center gap-1 text-xs font-bold text-red-600">
                      <AlertCircle className="w-3 h-3" /> Atrasado
                    </span>
                  )}
                  {tenant.status === 'Trial' && (
                    <span className="flex items-center gap-1 text-xs font-bold text-orange-600">
                      <Activity className="w-3 h-3" /> Trial
                    </span>
                  )}
                </td>
                <td className="p-4 text-sm font-mono text-slate-700">
                  R$ {tenant.mrr.toLocaleString()}
                </td>
                <td className="p-4 text-xs text-gray-500">
                  {new Date(tenant.joinedAt).toLocaleDateString()}
                </td>
                <td className="p-4 text-right">
                  <button className="p-1 hover:bg-gray-200 rounded text-gray-500">
                    <MoreHorizontal className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-gray-100 font-sans">
      {renderSidebar()}
      <main className="flex-1 overflow-y-auto">
        {activeView === AppView.SUPER_ADMIN_OVERVIEW && renderOverview()}
        {activeView === AppView.SUPER_ADMIN_TENANTS && renderTenants()}
        {activeView === AppView.SUPER_ADMIN_FINANCE && (
          <div className="flex items-center justify-center h-full text-gray-400">
            <div className="text-center">
              <CreditCard className="w-12 h-12 mx-auto mb-4 opacity-20" />
              <p>Integração Stripe Connect em desenvolvimento.</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default SuperAdminDashboard;
