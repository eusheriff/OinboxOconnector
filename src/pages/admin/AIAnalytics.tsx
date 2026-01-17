import React, { useEffect, useState } from 'react';
import { BarChart3, RefreshCw } from 'lucide-react';

interface AIUsage {
  tenant_name: string;
  provider: string;
  model: string;
  total_tokens: number;
  request_count: number;
}

const AIAnalytics: React.FC = () => {
  const [data, setData] = useState<AIUsage[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:8787'}/api/admin/ai-usage`,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem('oinbox_token')}` },
        },
      );
      const result = (await response.json()) as AIUsage[];
      setData(result);
    } catch {
      // Silent fail
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const maxTokens = Math.max(...data.map((d) => d.total_tokens), 1);

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold text-white flex items-center gap-3">
          <BarChart3 className="text-green-400" />
          AI Usage Analytics
        </h2>
        <button
          onClick={fetchData}
          className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg flex items-center gap-2"
        >
          <RefreshCw size={20} className={loading ? 'animate-spin' : ''} /> Atualizar
        </button>
      </div>

      <div className="bg-card p-6 rounded-xl border border-border">
        <h3 className="text-xl font-bold text-white mb-6">Consumo de Tokens por Tenant</h3>
        <div className="space-y-4">
          {data.map((item, index) => (
            <div key={index} className="space-y-1">
              <div className="flex justify-between text-sm text-gray-300">
                <span className="font-bold">
                  {item.tenant_name}{' '}
                  <span className="text-gray-500 font-normal">
                    ({item.provider}/{item.model})
                  </span>
                </span>
                <span>{item.total_tokens.toLocaleString()} tokens</span>
              </div>
              <div className="w-full bg-slate-700 rounded-full h-4 overflow-hidden">
                <div
                  className="bg-green-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${(item.total_tokens / maxTokens) * 100}%` }}
                ></div>
              </div>
              <div className="text-xs text-gray-500 text-right">
                {item.request_count} requisições
              </div>
            </div>
          ))}
          {data.length === 0 && !loading && (
            <div className="text-center text-gray-500 py-8">Nenhum dado de uso encontrado.</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AIAnalytics;
