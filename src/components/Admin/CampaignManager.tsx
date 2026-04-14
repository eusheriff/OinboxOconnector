import React, { useState, useEffect } from 'react';
import { apiService } from '@/services/apiService';
import {
  Plus,
  Play,
  Pause,
  Trash2,
  BarChart2,
  MessageSquare,
  CheckCircle2,
  AlertCircle,
  MoreVertical,
  Clock,
  Send,
  Users,
} from 'lucide-react';

interface Campaign {
  id: string;
  name: string;
  description?: string;
  status: 'active' | 'paused' | 'draft' | 'archived';
  type: string;
  settings: {
    target_status?: string;
    min_score?: number;
    steps?: Array<{
      delay: number;
      type: string;
      template: string;
    }>;
  };
  created_at: string;
}

interface CampaignStats {
  total: number;
  engaged: number;
  completed: number;
  responded: number;
}

const CampaignManager: React.FC = () => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [stats, setStats] = useState<CampaignStats | null>(null);

  // Form State
  const [newName, setNewName] = useState('');
  const [newTemplate, setNewTemplate] = useState('Olá {{name}}, tudo bem? Sou da OInbox.');
  const [newFollowup, setNewFollowup] = useState('Olá {{name}}, conseguiu ver minha mensagem?');

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const fetchCampaigns = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('https://api.oinbox.oconnector.tech/api/campaigns', {
        headers: apiService.getHeaders(),
      });
      if (response.ok) {
        const data = (await response.json()) as any;
        if (data.campaigns) setCampaigns(data.campaigns);
      } else {
        console.error('Failed to fetch campaigns:', response.status, response.statusText);
      }
    } catch (e) {
      console.error('Failed to fetch campaigns', e);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchStats = async (id: string) => {
    try {
      const res = await fetch(`https://api.oinbox.oconnector.tech/api/campaigns/${id}`, {
        headers: apiService.getHeaders(),
      });
      const data = (await res.json()) as any;
      if (data.stats) setStats(data.stats);
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreate = async () => {
    try {
      const res = await fetch('https://api.oinbox.oconnector.tech/api/campaigns', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...apiService.getHeaders(),
        },
        body: JSON.stringify({
          name: newName,
          description: 'Campanha de Outreach Automática',
          message_template: newTemplate, // Backend expects this for step 0
          // Logic to pass steps will utilize the backend default for MVP or expands if needed
        }),
      });

      if (res.ok) {
        setShowCreateModal(false);
        setNewName('');
        fetchCampaigns();
      } else {
        alert('Erro ao criar campanha');
      }
    } catch (e) {
      console.error(e);
      alert('Erro ao criar campanha');
    }
  };

  const handleStart = async (id: string) => {
    if (!confirm('Deseja iniciar esta campanha? Leads qualificados entrarão na fila.')) return;
    try {
      const res = await fetch(`https://api.oinbox.oconnector.tech/api/campaigns/${id}/start`, {
        method: 'POST',
        headers: apiService.getHeaders(),
      });
      const data = (await res.json()) as any;
      if (res.ok) {
        alert(data.message);
        fetchCampaigns();
      } else {
        alert(data.error);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza? Isso apagará todo o histórico desta campanha.')) return;
    try {
      await fetch(`https://api.oinbox.oconnector.tech/api/campaigns/${id}`, {
        method: 'DELETE',
        headers: apiService.getHeaders(),
      });
      fetchCampaigns();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="p-8 h-full flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">� Campanhas de Outreach</h1>
          <p className="text-muted-foreground text-sm">
            Automação de WhatsApp para aquisição de leads
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-primary text-primary-foreground px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20"
        >
          <Plus className="w-4 h-4" />
          Nova Campanha
        </button>
      </div>

      {isLoading ? (
        <div className="flex-1 flex items-center justify-center text-muted-foreground">
          Carregando...
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 overflow-y-auto pb-10">
          {campaigns.map((campaign) => (
            <div
              key={campaign.id}
              className="bg-card border border-border rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow relative group"
            >
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-2">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      campaign.status === 'active'
                        ? 'bg-green-500 animate-pulse'
                        : campaign.status === 'draft'
                          ? 'bg-gray-400'
                          : 'bg-yellow-500'
                    }`}
                  ></span>
                  <span className="text-xs font-bold uppercase text-muted-foreground">
                    {campaign.status}
                  </span>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleDelete(campaign.id)}
                    className="p-1 hover:bg-destructive/10 text-muted-foreground hover:text-destructive rounded"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <h3 className="font-bold text-lg mb-1">{campaign.name}</h3>
              <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                {campaign.description || 'Sem descrição'}
              </p>

              <div className="bg-muted/50 rounded-lg p-3 mb-4 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Users className="w-4 h-4" />
                    <span>Leads</span>
                  </div>
                  <span className="font-bold">--</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Send className="w-4 h-4" />
                    <span>Engajados</span>
                  </div>
                  <span className="font-bold">--</span>
                </div>
              </div>

              <div className="flex gap-2">
                {campaign.status === 'draft' || campaign.status === 'paused' ? (
                  <button
                    onClick={() => handleStart(campaign.id)}
                    className="flex-1 bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground py-2 rounded-lg text-sm font-bold transition-colors flex items-center justify-center gap-2"
                  >
                    <Play className="w-4 h-4" />
                    Iniciar
                  </button>
                ) : (
                  <button className="flex-1 bg-yellow-500/10 text-yellow-600 hover:bg-yellow-500 hover:text-white py-2 rounded-lg text-sm font-bold transition-colors flex items-center justify-center gap-2">
                    <Pause className="w-4 h-4" />
                    Pausar
                  </button>
                )}
                <button
                  onClick={() => {
                    setSelectedCampaign(campaign);
                    fetchStats(campaign.id);
                  }}
                  className="px-3 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors"
                >
                  <BarChart2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}

          {campaigns.length === 0 && (
            <div className="col-span-full py-10 text-center text-muted-foreground border-2 border-dashed border-border rounded-xl">
              <p>Nenhuma campanha criada.</p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="text-primary font-bold mt-2 hover:underline"
              >
                Criar a primeira
              </button>
            </div>
          )}
        </div>
      )}

      {/* CREATE MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border w-full max-w-lg rounded-xl shadow-2xl p-6">
            <h2 className="text-xl font-bold mb-4">Nova Campanha</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Nome da Campanha</label>
                <input
                  type="text"
                  className="w-full bg-background border border-input rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-primary"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Ex: Prospecção Imobiliárias GO"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Template Mensagem 1 (Pitch)
                </label>
                <textarea
                  className="w-full bg-background border border-input rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-primary h-24"
                  value={newTemplate}
                  onChange={(e) => setNewTemplate(e.target.value)}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Variáveis: {'{{name}}'}, {'{{empresa}}'}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Template Mensagem 2 (Follow-up 24h)
                </label>
                <textarea
                  className="w-full bg-background border border-input rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-primary h-24"
                  value={newFollowup}
                  onChange={(e) => setNewFollowup(e.target.value)}
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 hover:bg-accent rounded-lg"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreate}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-bold"
              >
                Criar Campanha
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STATS MODAL */}
      {selectedCampaign && stats && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border w-full max-w-2xl rounded-xl shadow-2xl p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold">{selectedCampaign.name} - Resultados</h2>
              <button
                onClick={() => {
                  setSelectedCampaign(null);
                  setStats(null);
                }}
                className="p-2 hover:bg-accent rounded-full"
              >
                <Clock className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-4 gap-4 mb-8">
              <div className="bg-muted p-4 rounded-xl text-center">
                <h3 className="text-2xl font-bold">{stats.total}</h3>
                <p className="text-xs text-muted-foreground uppercase">Total Leads</p>
              </div>
              <div className="bg-blue-500/10 text-blue-500 p-4 rounded-xl text-center">
                <h3 className="text-2xl font-bold">{stats.engaged}</h3>
                <p className="text-xs opacity-80 uppercase">Engajados</p>
              </div>
              <div className="bg-green-500/10 text-green-500 p-4 rounded-xl text-center">
                <h3 className="text-2xl font-bold">{stats.responded}</h3>
                <p className="text-xs opacity-80 uppercase">Respostas</p>
              </div>
              <div className="bg-purple-500/10 text-purple-500 p-4 rounded-xl text-center">
                <h3 className="text-2xl font-bold">
                  {Math.round((stats.responded / stats.total) * 100) || 0}%
                </h3>
                <p className="text-xs opacity-80 uppercase">Conversão</p>
              </div>
            </div>

            <div className="bg-muted/30 p-4 rounded-xl">
              <h3 className="font-bold mb-2 text-sm">Log Recente</h3>
              <p className="text-sm text-muted-foreground">
                Funcionalidade de log detalhado em breve.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CampaignManager;
