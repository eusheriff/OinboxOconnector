import React from 'react';
import { FileText, Plus, Download, Clock } from 'lucide-react';

export default function Contracts() {
    const contracts = [
        { id: '1', title: 'Contrato de Compra e Venda - Ap. 302', client: 'Roberto Silva', status: 'Assinado', date: '22/11/2024' },
        { id: '2', title: 'Proposta de Locação - Casa Jd. Flores', client: 'Ana Maria', status: 'Pendente', date: '20/11/2024' },
        { id: '3', title: 'Termo de Visita', client: 'Carlos Eduardo', status: 'Rascunho', date: '19/11/2024' },
    ];

    return (
        <div className="p-6 max-w-6xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Contratos</h1>
                    <p className="text-gray-600">Gerencie e gere documentos jurídicos</p>
                </div>
                <button className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90 flex items-center gap-2 font-medium">
                    <Plus size={20} />
                    Novo Documento
                </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                            <th className="px-6 py-4 font-semibold text-gray-700">Documento</th>
                            <th className="px-6 py-4 font-semibold text-gray-700">Cliente</th>
                            <th className="px-6 py-4 font-semibold text-gray-700">Status</th>
                            <th className="px-6 py-4 font-semibold text-gray-700">Data</th>
                            <th className="px-6 py-4 font-semibold text-gray-700">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {contracts.map((doc) => (
                            <tr key={doc.id} className="hover:bg-gray-50">
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-blue-50 text-primary rounded-lg">
                                            <FileText size={20} />
                                        </div>
                                        <span className="font-medium text-gray-900">{doc.title}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-gray-600">{doc.client}</td>
                                <td className="px-6 py-4">
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${doc.status === 'Assinado' ? 'bg-green-100 text-green-700' :
                                            doc.status === 'Pendente' ? 'bg-yellow-100 text-yellow-700' :
                                                'bg-gray-100 text-gray-700'
                                        }`}>
                                        {doc.status}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-gray-600 flex items-center gap-2">
                                    <Clock size={14} /> {doc.date}
                                </td>
                                <td className="px-6 py-4">
                                    <button className="text-gray-400 hover:text-primary transition-colors">
                                        <Download size={20} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
