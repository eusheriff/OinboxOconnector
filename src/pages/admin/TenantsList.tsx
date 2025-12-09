import React, { useEffect, useState } from 'react';
import TenantManagementModal from '../../components/Admin/TenantManagementModal';

const TenantsList: React.FC = () => {
    const [tenants, setTenants] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedTenant, setSelectedTenant] = useState<any>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    useEffect(() => {
        const fetchTenants = async () => {
            try {
                const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8787'}/api/admin/tenants`, {
                    headers: { 'Authorization': `Bearer ${localStorage.getItem('oconnector_token')}` }
                });
                const data = await response.json() as any;
                setTenants(data);
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        fetchTenants();
    }, []);

    const handleImpersonate = async (tenantId: string) => {
        // Removed confirm dialog to fix UI glitch


        try {
            const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8787'}/api/admin/tenants/${tenantId}/impersonate`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('oconnector_token')}` }
            });
            const data = await response.json() as any;

            if (data.token) {
                // Save current admin token
                localStorage.setItem('oconnector_admin_token', localStorage.getItem('oconnector_token') || '');

                // Set new impersonation token
                localStorage.setItem('oconnector_token', data.token);
                localStorage.setItem('oconnector_tenant_id', data.user.tenant_id || '');
                localStorage.setItem('user', JSON.stringify(data.user));

                // Redirect to client app
                window.location.href = '/app';
            } else {
                alert('Erro ao acessar painel: ' + (data.error || 'Erro desconhecido'));
            }
        } catch (error) {
            console.error(error);
            alert('Erro ao conectar com o servidor.');
        }
    };

    const handleManagePassword = async (tenantId: string, action: 'create' | 'delete', password?: string) => {
        try {
            const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8787'}/api/admin/tenants/${tenantId}/password`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('oconnector_token')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ action, password })
            });
            const data = await response.json() as any;

            if (data.success) {
                alert(data.message || 'Operação realizada com sucesso!');
            } else {
                alert('Erro: ' + (data.error || 'Erro desconhecido'));
            }
        } catch (error) {
            console.error(error);
            alert('Erro ao conectar com o servidor.');
        }
    };

    const handleDelete = async (tenantId: string) => {
        if (!confirm('Tem certeza que deseja EXCLUIR este cliente? Esta ação é irreversível.')) return;

        try {
            const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8787'}/api/admin/tenants/${tenantId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('oconnector_token')}` }
            });

            if (response.ok) {
                setTenants(tenants.filter(t => t.id !== tenantId));
                alert('Cliente excluído com sucesso.');
            } else {
                const data = await response.json() as any;
                alert('Erro ao excluir: ' + (data.error || 'Erro desconhecido'));
            }
        } catch (error) {
            console.error(error);
            alert('Erro ao conectar com o servidor.');
        }
    };

    const handleEdit = (tenant: any) => {
        setSelectedTenant(tenant);
        setIsModalOpen(true);
    };

    const handleAddTenant = () => {
        setSelectedTenant(null);
        setIsModalOpen(true);
    };

    const handleSaveTenant = async (tenantData: any) => {
        try {
            const isNew = !tenantData.id;
            const url = isNew
                ? `${import.meta.env.VITE_API_URL || 'http://localhost:8787'}/api/admin/tenants`
                : `${import.meta.env.VITE_API_URL || 'http://localhost:8787'}/api/admin/tenants/${tenantData.id}`;

            const method = isNew ? 'POST' : 'PUT';

            const response = await fetch(url, {
                method: method,
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('oconnector_token')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(tenantData)
            });

            if (response.ok) {
                const result = await response.json() as any;
                if (isNew) {
                    // Refresh list or add to state
                    // For simplicity, just reloading list or adding dummy
                    alert('Inquilino criado com sucesso! Senha padrão: 123456');
                    window.location.reload(); // Simple reload to fetch fresh data
                } else {
                    setTenants(tenants.map(t => t.id === tenantData.id ? tenantData : t));
                    alert('Cliente atualizado com sucesso!');
                }
            } else {
                const data = await response.json() as any;
                alert(`Erro ao ${isNew ? 'criar' : 'atualizar'}: ` + (data.error || 'Erro desconhecido'));
            }
        } catch (error) {
            console.error(error);
            alert('Erro ao conectar com o servidor.');
        }
    };

    if (loading) return <div className="text-white">Carregando inquilinos...</div>;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-white">Gerenciar Inquilinos</h2>
                <button
                    onClick={handleAddTenant}
                    className="bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
                >
                    + Adicionar Inquilino
                </button>
            </div>

            <div className="bg-card rounded-xl border border-border overflow-hidden">
                <table className="w-full text-left text-gray-300">
                    <thead className="bg-slate-700 text-gray-100 uppercase text-sm">
                        <tr>
                            <th className="p-4">Nome da Empresa</th>
                            <th className="p-4">Dono</th>
                            <th className="p-4">Plano</th>
                            <th className="p-4">Status</th>
                            <th className="p-4">Data de Entrada</th>
                            <th className="p-4">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700">
                        {tenants.map((tenant) => (
                            <tr key={tenant.id} className="hover:bg-slate-750 transition-colors">
                                <td className="p-4 font-medium text-white">{tenant.name}</td>
                                <td className="p-4">{tenant.owner_name}</td>
                                <td className="p-4">
                                    <span className={`px-2 py-1 rounded text-xs font-bold ${tenant.plan === 'Pro' ? 'bg-purple-900 text-purple-200' : 'bg-gray-700 text-gray-300'
                                        }`}>
                                        {tenant.plan}
                                    </span>
                                </td>
                                <td className="p-4">
                                    <span className={`px-2 py-1 rounded text-xs font-bold ${tenant.status === 'Active' ? 'bg-green-900 text-green-200' : 'bg-red-900 text-red-200'
                                        }`}>
                                        {tenant.status}
                                    </span>
                                </td>
                                <td className="p-4 text-sm text-gray-400">
                                    {new Date(tenant.joined_at).toLocaleDateString('pt-BR')}
                                </td>
                                <td className="p-4 flex gap-2">
                                    {/* Impersonate button moved to modal */}
                                    <button
                                        onClick={() => handleEdit(tenant)}
                                        className="text-blue-400 hover:text-blue-300 text-sm font-medium border border-blue-400/30 px-2 py-1 rounded hover:bg-blue-400/10 transition-colors"
                                        title="Gerenciar Assinatura e Detalhes"
                                    >
                                        Gerenciar
                                    </button>

                                    <button
                                        onClick={() => handleDelete(tenant.id)}
                                        className="text-red-400 hover:text-red-300 text-sm font-medium border border-red-400/30 px-2 py-1 rounded hover:bg-red-400/10 transition-colors"
                                        title="Excluir Cliente"
                                    >
                                        Excluir
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>


            <TenantManagementModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                tenant={selectedTenant}
                onSave={handleSaveTenant}
                onManagePassword={handleManagePassword}
                onImpersonate={handleImpersonate}
            />
        </div >
    );
};

export default TenantsList;
