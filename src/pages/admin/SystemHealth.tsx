import React, { useEffect, useState } from 'react';
import { Activity, CheckCircle, AlertTriangle, Server, Database } from 'lucide-react';

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'down';
  uptime: number;
  timestamp: string;
  services: {
    database: { status: string; latency: string };
    api: { status: string; latency: string };
    storage: { status: string };
  };
}

const SystemHealth: React.FC = () => {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchHealth = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:8787'}/api/admin/health-check`,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem('oinbox_token')}` },
        },
      );
      const data = (await response.json()) as HealthStatus;
      setHealth(data);
    } catch {
      // Silent fail
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 30000); // Auto-refresh every 30s
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'connected':
      case 'online':
        return 'text-green-400';
      case 'degraded':
        return 'text-yellow-400';
      default:
        return 'text-red-400';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'connected':
      case 'online':
        return <CheckCircle className="text-green-400" />;
      case 'degraded':
        return <AlertTriangle className="text-yellow-400" />;
      default:
        return <AlertTriangle className="text-red-400" />;
    }
  };

  if (loading && !health) return <div className="text-white">Carregando status do sistema...</div>;
  if (!health) return <div className="text-red-400">Erro ao carregar status.</div>;

  return (
    <div className="space-y-8">
      <h2 className="text-3xl font-bold text-white flex items-center gap-3">
        <Activity className="text-red-400" />
        System Health
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Overall Status */}
        <div className="bg-card p-6 rounded-xl border border-border flex flex-col items-center justify-center text-center">
          <div className="mb-4 transform scale-150">{getStatusIcon(health.status)}</div>
          <h3 className="text-xl font-bold text-white mb-1">
            Sistema {health.status === 'healthy' ? 'Operacional' : 'Instável'}
          </h3>
          <p className="text-gray-400 text-sm">
            Última atualização: {new Date(health.timestamp).toLocaleTimeString()}
          </p>
        </div>

        {/* Database */}
        <div className="bg-card p-6 rounded-xl border border-border">
          <div className="flex items-center gap-3 mb-4">
            <Database className="text-blue-400" />
            <h3 className="text-lg font-bold text-white">Database (D1)</h3>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-gray-300">
              <span>Status:</span>
              <span className={`font-bold ${getStatusColor(health.services.database.status)}`}>
                {health.services.database.status}
              </span>
            </div>
            <div className="flex justify-between text-gray-300">
              <span>Latência:</span>
              <span>{health.services.database.latency}</span>
            </div>
          </div>
        </div>

        {/* API */}
        <div className="bg-card p-6 rounded-xl border border-border">
          <div className="flex items-center gap-3 mb-4">
            <Server className="text-purple-400" />
            <h3 className="text-lg font-bold text-white">API Workers</h3>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-gray-300">
              <span>Status:</span>
              <span className={`font-bold ${getStatusColor(health.services.api.status)}`}>
                {health.services.api.status}
              </span>
            </div>
            <div className="flex justify-between text-gray-300">
              <span>Latência:</span>
              <span>{health.services.api.latency}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SystemHealth;
