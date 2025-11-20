
import React, { useState } from 'react';
import { Client } from '../../types';
import { Search, Plus, MoreVertical, Phone, Mail, User, X } from 'lucide-react';

interface ClientListProps {
  clients: Client[];
  onAddClient: (client: Client) => void;
}

const ClientList: React.FC<ClientListProps> = ({ clients, onAddClient }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Form State
  const [newClient, setNewClient] = useState<Partial<Client>>({
    name: '', email: '', phone: '', status: 'Novo', budget: '', notes: ''
  });

  const handleSave = () => {
    if (!newClient.name) return;
    
    const client: Client = {
      id: Date.now().toString(),
      name: newClient.name || '',
      email: newClient.email || '',
      phone: newClient.phone || '',
      status: newClient.status as any || 'Novo',
      budget: newClient.budget,
      notes: newClient.notes,
      registeredAt: new Date()
    };

    onAddClient(client);
    setIsModalOpen(false);
    setNewClient({ name: '', email: '', phone: '', status: 'Novo', budget: '', notes: '' });
  };

  const filteredClients = clients.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex-1 bg-gray-50 p-8 overflow-y-auto h-full">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Meus Clientes</h1>
            <p className="text-gray-500 text-sm">Gerencie sua carteira de clientes e oportunidades.</p>
          </div>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg font-bold flex items-center gap-2 shadow-lg shadow-blue-600/20 transition-all"
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
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
          </div>
          <select className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-2 text-sm text-slate-600 focus:outline-none">
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
                <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Cliente</th>
                <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Contatos</th>
                <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Orçamento</th>
                <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Cadastro</th>
                <th className="p-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredClients.map((client) => (
                <tr key={client.id} className="hover:bg-blue-50/50 transition-colors group">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold">
                        {client.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-bold text-slate-800">{client.name}</p>
                        <p className="text-xs text-gray-500 truncate max-w-[150px]">{client.notes || 'Sem notas'}</p>
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
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      client.status === 'Novo' ? 'bg-blue-100 text-blue-800' :
                      client.status === 'Fechado' ? 'bg-green-100 text-green-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {client.status}
                    </span>
                  </td>
                  <td className="p-4">
                    <span className="text-sm font-semibold text-slate-700">{client.budget || '-'}</span>
                  </td>
                  <td className="p-4">
                    <span className="text-xs text-gray-500">{client.registeredAt.toLocaleDateString()}</span>
                  </td>
                  <td className="p-4 text-right">
                    <button className="text-gray-400 hover:text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity">
                      <MoreVertical className="w-5 h-5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {filteredClients.length === 0 && (
            <div className="p-8 text-center text-gray-500">
              Nenhum cliente encontrado.
            </div>
          )}
        </div>
      </div>

      {/* Add Client Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-scale-in">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-slate-800">Novo Cadastro de Cliente</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-red-500">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">Nome Completo *</label>
                <div className="flex items-center gap-2 border border-gray-300 rounded-lg px-3 py-2 focus-within:ring-2 focus-within:ring-blue-500">
                  <User className="w-4 h-4 text-gray-400" />
                  <input 
                    type="text" 
                    className="flex-1 outline-none text-sm" 
                    placeholder="Ex: João Silva"
                    value={newClient.name}
                    onChange={e => setNewClient({...newClient, name: e.target.value})}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">Email</label>
                  <div className="flex items-center gap-2 border border-gray-300 rounded-lg px-3 py-2 focus-within:ring-2 focus-within:ring-blue-500">
                    <Mail className="w-4 h-4 text-gray-400" />
                    <input 
                      type="email" 
                      className="flex-1 outline-none text-sm" 
                      placeholder="joao@..."
                      value={newClient.email}
                      onChange={e => setNewClient({...newClient, email: e.target.value})}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">Telefone</label>
                  <div className="flex items-center gap-2 border border-gray-300 rounded-lg px-3 py-2 focus-within:ring-2 focus-within:ring-blue-500">
                    <Phone className="w-4 h-4 text-gray-400" />
                    <input 
                      type="tel" 
                      className="flex-1 outline-none text-sm" 
                      placeholder="(11) 9..."
                      value={newClient.phone}
                      onChange={e => setNewClient({...newClient, phone: e.target.value})}
                    />
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">Status Inicial</label>
                <select 
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                  value={newClient.status}
                  onChange={e => setNewClient({...newClient, status: e.target.value as any})}
                >
                  <option>Novo</option>
                  <option>Em Atendimento</option>
                  <option>Fechado</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">Orçamento Estimado</label>
                <input 
                    type="text" 
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="Ex: R$ 500k - 600k"
                    value={newClient.budget}
                    onChange={e => setNewClient({...newClient, budget: e.target.value})}
                />
              </div>
              <button 
                onClick={handleSave}
                disabled={!newClient.name}
                className="w-full py-3 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-colors disabled:opacity-50"
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
