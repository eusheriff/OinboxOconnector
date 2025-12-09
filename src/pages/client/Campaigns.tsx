import React, { useState } from 'react';
import { Megaphone, Plus, Send, Users, BarChart } from 'lucide-react';

interface Campaign {
    id: string;
    name: string;
    type: 'Email' | 'WhatsApp';
    status: 'Ativa' | 'Concluída' | 'Rascunho';
    sent: number;
    openRate: string;
    date: string;
}

export default function Campaigns() {
    const [campaigns, setCampaigns] = useState<Campaign[]>([
        { id: '1', name: 'Lançamento Jardins', type: 'Email', status: 'Ativa', sent: 1250, openRate: '24%', date: '2024-03-15' },
        { id: '2', name: 'Promoção Verão', type: 'WhatsApp', status: 'Concluída', sent: 500, openRate: '85%', date: '2024-02-10' },
    ]);

    return (
        <div className="p-6 max-w-6xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Campanhas</h1>
                    <p className="text-gray-600">Gerencie seus disparos de marketing</p>
                </div>
                <button className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90 flex items-center gap-2 font-medium">
                    <Plus size={20} />
                    Nova Campanha
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-blue-100 text-primary rounded-lg">
                            <Send size={24} />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Total Enviado</p>
                            <h3 className="text-2xl font-bold">1.750</h3>
                        </div>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-green-100 text-green-600 rounded-lg">
                            <Users size={24} />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Leads Alcançados</p>
                            <h3 className="text-2xl font-bold">1.420</h3>
                        </div>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-purple-100 text-purple-600 rounded-lg">
                            <BarChart size={24} />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Taxa de Abertura</p>
                            <h3 className="text-2xl font-bold">42%</h3>
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                            <th className="px-6 py-4 font-semibold text-gray-700">Nome</th>
                            <th className="px-6 py-4 font-semibold text-gray-700">Canal</th>
                            <th className="px-6 py-4 font-semibold text-gray-700">Status</th>
                            <th className="px-6 py-4 font-semibold text-gray-700">Enviados</th>
                            <th className="px-6 py-4 font-semibold text-gray-700">Abertura</th>
                            <th className="px-6 py-4 font-semibold text-gray-700">Data</th>
                            <th className="px-6 py-4 font-semibold text-gray-700">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {campaigns.map((camp) => (
                            <tr key={camp.id} className="hover:bg-gray-50">
                                <td className="px-6 py-4 font-medium text-gray-900">{camp.name}</td>
                                <td className="px-6 py-4">
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${camp.type === 'Email' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
                                        }`}>
                                        {camp.type}
                                    </span>
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`flex items-center gap-2 text-sm ${camp.status === 'Ativa' ? 'text-green-600' :
                                            camp.status === 'Concluída' ? 'text-gray-600' : 'text-orange-600'
                                        }`}>
                                        <span className={`w-2 h-2 rounded-full ${camp.status === 'Ativa' ? 'bg-green-600' :
                                                camp.status === 'Concluída' ? 'bg-gray-400' : 'bg-orange-400'
                                            }`} />
                                        {camp.status}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-gray-600">{camp.sent}</td>
                                <td className="px-6 py-4 text-gray-600">{camp.openRate}</td>
                                <td className="px-6 py-4 text-gray-600">{camp.date}</td>
                                <td className="px-6 py-4">
                                    <button className="text-primary hover:text-blue-800 font-medium text-sm">Ver Detalhes</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
