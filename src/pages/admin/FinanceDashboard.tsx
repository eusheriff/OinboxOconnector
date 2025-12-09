import React from 'react';
import { DollarSign, TrendingUp, CreditCard, Calendar } from 'lucide-react';

const FinanceDashboard: React.FC = () => {
    // Mock Data
    const transactions = [
        { id: 1, tenant: 'Imobiliária Silva', amount: 499.00, date: '2023-10-25', status: 'Succeeded' },
        { id: 2, tenant: 'Casa Nova Imóveis', amount: 199.00, date: '2023-10-24', status: 'Succeeded' },
        { id: 3, tenant: 'Top Lar', amount: 499.00, date: '2023-10-24', status: 'Failed' },
        { id: 4, tenant: 'Imóveis & Cia', amount: 499.00, date: '2023-10-23', status: 'Succeeded' },
    ];

    return (
        <div className="space-y-8">
            <h2 className="text-3xl font-bold text-white flex items-center gap-3">
                <DollarSign className="text-yellow-400" />
                Financeiro
            </h2>

            {/* Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-card p-6 rounded-xl border border-border shadow-lg">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-gray-400">MRR (Receita Recorrente)</h3>
                        <TrendingUp className="text-green-500" />
                    </div>
                    <p className="text-4xl font-bold text-white">R$ 12.450,00</p>
                    <p className="text-sm text-green-400 mt-2 flex items-center gap-1">
                        +15% vs mês anterior
                    </p>
                </div>

                <div className="bg-card p-6 rounded-xl border border-border shadow-lg">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-gray-400">Ticket Médio</h3>
                        <CreditCard className="text-blue-500" />
                    </div>
                    <p className="text-4xl font-bold text-white">R$ 389,00</p>
                </div>

                <div className="bg-card p-6 rounded-xl border border-border shadow-lg">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-gray-400">Assinaturas Ativas</h3>
                        <Calendar className="text-purple-500" />
                    </div>
                    <p className="text-4xl font-bold text-white">32</p>
                </div>
            </div>

            {/* Recent Transactions */}
            <div className="bg-card rounded-xl border border-border overflow-hidden">
                <div className="p-6 border-b border-border">
                    <h3 className="text-xl font-bold text-white">Transações Recentes</h3>
                </div>
                <table className="w-full text-left text-gray-300">
                    <thead className="bg-slate-700 text-gray-100 uppercase text-sm">
                        <tr>
                            <th className="p-4">Cliente</th>
                            <th className="p-4">Data</th>
                            <th className="p-4">Valor</th>
                            <th className="p-4">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700">
                        {transactions.map((t) => (
                            <tr key={t.id} className="hover:bg-slate-750 transition-colors">
                                <td className="p-4 font-medium text-white">{t.tenant}</td>
                                <td className="p-4">{new Date(t.date).toLocaleDateString('pt-BR')}</td>
                                <td className="p-4">R$ {t.amount.toFixed(2).replace('.', ',')}</td>
                                <td className="p-4">
                                    <span className={`px-2 py-1 rounded text-xs font-bold ${t.status === 'Succeeded' ? 'bg-green-900 text-green-200' : 'bg-red-900 text-red-200'
                                        }`}>
                                        {t.status === 'Succeeded' ? 'Aprovado' : 'Falhou'}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default FinanceDashboard;
