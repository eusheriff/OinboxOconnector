import React, { useState } from 'react';
import { Client } from '../../types';
import {
  Search,
  Plus,
  MoreVertical,
  Phone,
  Mail,
  User,
  X,
  Flame,
  Snowflake,
  ThermometerSun,
  BrainCircuit,
  Loader2,
} from 'lucide-react';
import { apiService } from '../../services/apiService';
import { useToast } from '../contexts/ToastContext';

interface ClientListProps {
  clients: Client[];
  onAddClient: (client: Client) => void;
}

const ClientList: React.FC<ClientListProps> = ({ clients, onAddClient }) => {
  const { addToast } = useToast();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);

  // Form State
  const [newClient, setNewClient] = useState<Partial<Client>>({
    name: '',
    email: '',
    phone: '',
    status: 'Novo',
    budget: '',
    notes: '',
  });

  const handleSave = () => {
    if (!newClient.name) return;

    const client: Client = {
      id: Date.now().toString(),
      name: newClient.name || '',
      email: newClient.email || '',
      phone: newClient.phone || '',
      status: (newClient.status as Client['status']) || 'Novo',
      budget: newClient.budget,
      notes: newClient.notes,
      registeredAt: new Date(),
      leadScore: 50, // Default score
      temperature: 'Warm',
    };

    onAddClient(client);
    setIsModalOpen(false);
    setNewClient({ name: '', email: '', phone: '', status: 'Novo', budget: '', notes: '' });
  };

  const filteredClients = clients.filter(
    (c) =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.email.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const getTempIcon = (temp?: string) => {
    switch (temp) {
      case 'Hot':
        return <Flame className="w-4 h-4 text-red-500 fill-current" />;
      case 'Cold':
        return <Snowflake className="w-4 h-4 text-blue-400" />;
      default:
        return <ThermometerSun className="w-4 h-4 text-orange-400" />;
    }
  };

  const handleAnalyze = async (client: Client) => {
    setAnalyzingId(client.id);
    try {
      const result = await apiService.analyzeClient(client.id);
      // Update local state (in a real app, you might re-fetch clients or update context)
      client.leadScore = result.score;
      client.aiSummary = result.summary;
      addToast('success', `Análise Concluída. Nota: ${result.score}. Resumo: ${result.summary}`);
    } catch (e) {
      addToast('error', 'Erro ao analisar lead.');
    } finally {
      setAnalyzingId(null);
    }
  };

  return (
    <div className="flex-1 bg-gray-50 p-8 overflow-y-auto h-full">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Meus Clientes</h1>
            <p className="text-gray-500 text-sm">
              Gerencie sua carteira de clientes e oportunidades.
            </p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-primary hover:bg-primary/90 text-white px-4 py-2.5 rounded-lg font-bold flex items-center gap-2 shadow-lg shadow-primary/20 transition-all"
          >
            <Plus className="w-5 h-5" /> Novo Cliente
          </button>
        </div>

        {/* Filters & Search */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 mb-6 flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por nome, email ou telefone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
            />
          </div>
          <select className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-2 text-sm text-muted-foreground focus:outline-none">
            <option>Todos os Status</option>
            <option>Novos</option>
            <option>Em Atendimento</option>
            <option>Fechados</option>
          </select>
        </div>

        {/* Clients Table/List */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Temp.
                </th>
                <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Cliente
                </th>
                <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Contatos
                </th>
                <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Score IA
                </th>
                <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Cadastro
                </th>
                <th className="p-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredClients.map((client) => (
                <tr key={client.id} className="hover:bg-blue-50/50 transition-colors group">
                  <td className="p-4">
                    <div
                      className="flex justify-center"
                      title={`Temperatura: ${client.temperature}`}
                    >
                      {getTempIcon(client.temperature)}
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-muted-foreground font-bold">
                        {client.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-bold text-foreground">{client.name}</p>
                        <p className="text-xs text-gray-500 truncate max-w-[150px]">
                          {client.notes || 'Sem notas'}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-1.5 text-xs text-gray-600">
                        <Mail className="w-3 h-3" /> {client.email}
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-gray-600">
                        <Phone className="w-3 h-3" /> {client.phone}
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        client.status === 'Novo'
                          ? 'bg-blue-100 text-blue-800'
                          : client.status === 'Fechado'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-yellow-100 text-yellow-800'
                      }`}
                    >
                      {client.status}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          style={{ width: `${client.leadScore || 0}%` }}
                          className={`h-full ${
                            (client.leadScore || 0) > 70
                              ? 'bg-red-500'
                              : (client.leadScore || 0) > 40
                                ? 'bg-orange-400'
                                : 'bg-blue-400'
                          }`}
                        ></div>
                      </div>
                      <span className="text-xs font-bold text-muted-foreground">
                        {client.leadScore || 0}
                      </span>
                    </div>
                    {client.aiSummary && (
                      <p
                        className="text-[10px] text-gray-500 mt-1 truncate max-w-[100px]"
                        title={client.aiSummary}
                      >
                        {client.aiSummary}
                      </p>
                    )}
                  </td>
                  <td className="p-4">
                    <span className="text-xs text-gray-500">
                      {client.registeredAt.toLocaleDateString()}
                    </span>
                  </td>
                  <td className="p-4 text-right flex items-center justify-end gap-2">
                    <button
                      onClick={() => handleAnalyze(client)}
                      disabled={analyzingId === client.id}
                      className="text-purple-600 hover:bg-purple-50 p-1.5 rounded-lg transition-colors"
                      title="Analisar com IA"
                    >
                      {analyzingId === client.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <BrainCircuit className="w-4 h-4" />
                      )}
                    </button>
                    <button className="text-gray-400 hover:text-muted-foreground p-1.5 rounded-lg hover:bg-gray-50 transition-colors">
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredClients.length === 0 && (
            <div className="p-8 text-center text-gray-500">Nenhum cliente encontrado.</div>
          )}
        </div>
      </div>

      {/* Add Client Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-scale-in">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-foreground">Novo Cadastro de Cliente</h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-red-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">
                  Nome Completo *
                </label>
                <div className="flex items-center gap-2 border border-gray-300 rounded-lg px-3 py-2 focus-within:ring-2 focus-within:ring-primary">
                  <User className="w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    className="flex-1 outline-none text-sm"
                    placeholder="Ex: João Silva"
                    value={newClient.name}
                    onChange={(e) => setNewClient({ ...newClient, name: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">Email</label>
                  <div className="flex items-center gap-2 border border-gray-300 rounded-lg px-3 py-2 focus-within:ring-2 focus-within:ring-primary">
                    <Mail className="w-4 h-4 text-gray-400" />
                    <input
                      type="email"
                      className="flex-1 outline-none text-sm"
                      placeholder="joao@..."
                      value={newClient.email}
                      onChange={(e) => setNewClient({ ...newClient, email: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">Telefone</label>
                  <div className="flex items-center gap-2 border border-gray-300 rounded-lg px-3 py-2 focus-within:ring-2 focus-within:ring-primary">
                    <Phone className="w-4 h-4 text-gray-400" />
                    <input
                      type="tel"
                      className="flex-1 outline-none text-sm"
                      placeholder="(11) 9..."
                      value={newClient.phone}
                      onChange={(e) => setNewClient({ ...newClient, phone: e.target.value })}
                    />
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">Status Inicial</label>
                <select
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none bg-white"
                  value={newClient.status}
                  onChange={(e) => setNewClient({ ...newClient, status: e.target.value as any })}
                >
                  <option>Novo</option>
                  <option>Em Atendimento</option>
                  <option>Fechado</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">
                  Orçamento Estimado
                </label>
                <input
                  type="text"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none"
                  placeholder="Ex: R$ 500k - 600k"
                  value={newClient.budget}
                  onChange={(e) => setNewClient({ ...newClient, budget: e.target.value })}
                />
              </div>
              <button
                onClick={handleSave}
                disabled={!newClient.name}
                className="w-full py-3 bg-primary text-white rounded-lg font-bold hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                Salvar Cliente
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientList;
