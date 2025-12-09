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
                const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8787'}/api/admin/audit-logs`, {
                    headers: { 'Authorization': `Bearer ${localStorage.getItem('oconnector_token')}` }
                });
                const data = await response.json() as any;
                setLogs(data);
            } catch (error) {
                console.error("Failed to fetch audit logs", error);
            } finally {
                setLoading(false);
            }
        };
        fetchLogs();
    }, []);

    return (
        <div className="space-y-8">
            <h2 className="text-3xl font-bold text-white flex items-center gap-3">
                <Shield className="text-blue-400" />
                Logs de Auditoria
            </h2>

            <div className="bg-card rounded-xl border border-border overflow-hidden">
                <div className="p-4 border-b border-border flex justify-between items-center">
                    <h3 className="text-lg font-semibold text-white">Atividades Recentes</h3>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="text"
                            placeholder="Buscar logs..."
                            className="bg-background text-white pl-10 pr-4 py-2 rounded-lg border border-border focus:outline-none focus:border-blue-500"
                        />
                    </div>
                </div>

                {loading ? (
                    <div className="p-8 text-center text-gray-400">Carregando logs...</div>
                ) : (
                    <table className="w-full text-left text-gray-300">
                        <thead className="bg-slate-700 text-gray-100 uppercase text-sm">
                            <tr>
                                <th className="p-4">Data/Hora</th>
                                <th className="p-4">Usuário</th>
                                <th className="p-4">Ação</th>
                                <th className="p-4">Detalhes</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700">
                            {logs.map((log) => (
                                <tr key={log.id} className="hover:bg-slate-750 transition-colors">
                                    <td className="p-4 text-sm text-gray-400">
                                        {new Date(log.created_at).toLocaleString('pt-BR')}
                                    </td>
                                    <td className="p-4 font-medium text-white">{log.user_name || 'Sistema'}</td>
                                    <td className="p-4">
                                        <span className="bg-background text-blue-300 px-2 py-1 rounded text-xs font-mono">
                                            {log.action}
                                        </span>
                                    </td>
                                    <td className="p-4 text-sm text-gray-400 font-mono truncate max-w-xs">
                                        {log.details}
                                    </td>
                                </tr>
                            ))}
                            {logs.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="p-8 text-center text-gray-500">
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
