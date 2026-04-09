import React, { useEffect, useState } from 'react';
import { Shield, Search } from 'lucide-react';

interface AuditLog {
  id: string;
  user_name: string;
  action: string;
  details: string;
  created_at: string;
}

const AuditLogs: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const response = await fetch(
          `${import.meta.env.VITE_API_URL || 'http://localhost:8787'}/api/admin/audit-logs`,
          {
            headers: { Authorization: `Bearer ${localStorage.getItem('oinbox_token')}` },
          },
        );
        const data = (await response.json()) as AuditLog[];
        setLogs(data);
      } catch {
        // Silent fail
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, []);

  return (
    <div className="space-y-8">
      <h2 className="text-3xl font-bold text-foreground flex items-center gap-3">
        <Shield className="text-blue-500" />
        Logs de Auditoria
      </h2>

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="p-4 border-b border-border flex justify-between items-center flex-wrap gap-3">
          <h3 className="text-lg font-semibold text-foreground">Atividades Recentes</h3>
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground"
              size={18}
            />
            <input
              type="text"
              placeholder="Buscar logs..."
              className="bg-background text-foreground pl-10 pr-4 py-2 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center text-muted-foreground">Carregando logs...</div>
        ) : (
          <table className="w-full text-left">
            <thead className="bg-muted/50 text-muted-foreground uppercase text-sm">
              <tr>
                <th className="p-4">Data/Hora</th>
                <th className="p-4">Usuário</th>
                <th className="p-4">Ação</th>
                <th className="p-4">Detalhes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-muted/30 transition-colors">
                  <td className="p-4 text-sm text-muted-foreground">
                    {new Date(log.created_at).toLocaleString('pt-BR')}
                  </td>
                  <td className="p-4 font-medium text-foreground">{log.user_name || 'Sistema'}</td>
                  <td className="p-4">
                    <span className="bg-muted text-blue-600 dark:text-blue-400 px-2 py-1 rounded text-xs font-mono">
                      {log.action}
                    </span>
                  </td>
                  <td className="p-4 text-sm text-muted-foreground font-mono truncate max-w-xs">
                    {log.details}
                  </td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-muted-foreground">
                    Nenhum log encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default AuditLogs;
