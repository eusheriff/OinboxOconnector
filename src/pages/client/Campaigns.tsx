import React, { useState, useEffect } from 'react';
import { Plus, Send, Users, BarChart, Loader2, Play, Trash2 } from 'lucide-react';
import { apiService } from '@/services/apiService';
import { useToast } from '@/contexts/ToastContext';

interface Campaign {
  id: string;
  name: string;
  type: 'Email' | 'WhatsApp';
  status: 'active' | 'completed' | 'draft' | 'paused';
  sent_count: number;
  openRate?: string;
  created_at: string;
}

export default function Campaigns() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const { addToast } = useToast();
  const [showModal, setShowModal] = useState(false);
  const [newCampaignName, setNewCampaignName] = useState('');

  const fetchCampaigns = async () => {
    try {
      const data = (await apiService.getCampaigns()) as any;
      if (data && data.campaigns) {
        setCampaigns(data.campaigns);
      }
    } catch (error) {
      console.error('Failed to fetch campaigns', error);
      // addToast('error', 'Erro ao carregar campanhas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const handleCreate = async () => {
    if (!newCampaignName) return;
    try {
      await apiService.createCampaign({ name: newCampaignName, type: 'whatsapp' });
      addToast('success', 'Campanha criada com sucesso!');
      setShowModal(false);
      setNewCampaignName('');
      fetchCampaigns();
    } catch (e) {
      addToast('error', 'Erro ao criar campanha');
    }
  };

  const handleStart = async (id: string) => {
    try {
      await apiService.startCampaign(id);
      addToast('success', 'Campanha iniciada!');
      fetchCampaigns();
    } catch (e) {
      addToast('error', 'Erro ao iniciar campanha');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja realmente excluir esta campanha?')) return;
    try {
      await apiService.deleteCampaign(id);
      addToast('success', 'Campanha removida');
      fetchCampaigns();
    } catch (e) {
      addToast('error', 'Erro ao remover');
    }
  };

  // Metrics (Derived from real data)
  const totalSent = campaigns.reduce((acc, curr) => acc + (curr.sent_count || 0), 0);
  const totalActive = campaigns.filter((c) => c.status === 'active').length;

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full p-12">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Campanhas</h1>
          <p className="text-gray-600">Gerencie seus disparos de marketing</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-medium transition-colors"
        >
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
              <h3 className="text-2xl font-bold">{totalSent}</h3>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-100 text-green-600 rounded-lg">
              <Users size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-500">Ativas Agora</p>
              <h3 className="text-2xl font-bold">{totalActive}</h3>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-purple-100 text-purple-600 rounded-lg">
              <BarChart size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-500">Taxa de Resposta</p>
              <h3 className="text-2xl font-bold">-</h3>
            </div>
          </div>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-96 shadow-xl">
            <h3 className="text-lg font-bold mb-4">Nova Campanha WhatsApp</h3>
            <input
              className="w-full border p-2 rounded mb-4"
              placeholder="Nome da Campanha ex: Lançamento Verão"
              value={newCampaignName}
              onChange={(e) => setNewCampaignName(e.target.value)}
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-gray-600">
                Cancelar
              </button>
              <button
                onClick={handleCreate}
                className="px-4 py-2 bg-primary text-white rounded hover:bg-blue-700"
              >
                Criar
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {campaigns.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            Nenhuma campanha encontrada. Crie a primeira para começar!
          </div>
        ) : (
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 font-semibold text-gray-700">Nome</th>
                <th className="px-6 py-4 font-semibold text-gray-700">Tipo</th>
                <th className="px-6 py-4 font-semibold text-gray-700">Status</th>
                <th className="px-6 py-4 font-semibold text-gray-700">Enviados</th>
                <th className="px-6 py-4 font-semibold text-gray-700">Data</th>
                <th className="px-6 py-4 font-semibold text-gray-700 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {campaigns.map((camp) => (
                <tr key={camp.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium text-gray-900">{camp.name}</td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                      WhatsApp
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`flex items-center gap-2 text-sm ${
                        camp.status === 'active'
                          ? 'text-green-600'
                          : camp.status === 'completed'
                            ? 'text-gray-600'
                            : 'text-orange-600'
                      }`}
                    >
                      <span
                        className={`w-2 h-2 rounded-full ${
                          camp.status === 'active'
                            ? 'bg-green-600'
                            : camp.status === 'completed'
                              ? 'bg-gray-400'
                              : 'bg-orange-400'
                        }`}
                      />
                      {camp.status === 'draft' ? 'Rascunho' : camp.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-600">{camp.sent_count || 0}</td>
                  <td className="px-6 py-4 text-gray-600">
                    {new Date(camp.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-right flex justify-end gap-2">
                    {camp.status === 'draft' && (
                      <button
                        onClick={() => handleStart(camp.id)}
                        className="text-green-600 hover:text-green-800 p-1"
                        title="Iniciar"
                      >
                        <Play size={18} />
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(camp.id)}
                      className="text-red-500 hover:text-red-700 p-1"
                      title="Excluir"
                    >
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
