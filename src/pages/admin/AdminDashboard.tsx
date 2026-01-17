import React, { useEffect, useState } from 'react';
// import { apiService } from '../../../services/apiService';
import { DollarSign, Building2, Activity } from 'lucide-react';

const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Assuming apiService has a method for this, or we fetch directly
        // For now, let's mock or assume we add getAdminStats to apiService
        const response = await fetch(
          `${import.meta.env.VITE_API_URL || 'http://localhost:8787'}/api/admin/stats`,
          {
            headers: { Authorization: `Bearer ${localStorage.getItem('oinbox_token')}` },
          },
        );
        const data = await response.json();
        setStats(data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) return <div className="text-white">Carregando métricas...</div>;

  return (
    <div className="space-y-8">
      <h2 className="text-3xl font-bold text-white">Visão Geral</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-card p-6 rounded-xl border border-border shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-gray-400">Total de Inquilinos</h3>
            <Building2 className="text-blue-500" />
          </div>
          <p className="text-4xl font-bold text-white">{stats?.totalTenants || 0}</p>
        </div>

        <div className="bg-card p-6 rounded-xl border border-border shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-gray-400">Inquilinos Ativos</h3>
            <Activity className="text-green-500" />
          </div>
          <p className="text-4xl font-bold text-white">{stats?.activeTenants || 0}</p>
        </div>

        <div className="bg-card p-6 rounded-xl border border-border shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-gray-400">MRR (Receita Mensal)</h3>
            <DollarSign className="text-yellow-500" />
          </div>
          <p className="text-4xl font-bold text-white">
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
              stats?.mrr || 0,
            )}
          </p>
        </div>
      </div>

      {/* Recent Activity or Charts could go here */}
    </div>
  );
};

export default AdminDashboard;
