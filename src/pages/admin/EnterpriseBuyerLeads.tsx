import React, { useState, useEffect } from 'react';
import {
  Home,
  Search,
  Filter,
  Phone,
  Mail,
  MapPin,
  DollarSign,
  Eye,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Building2,
  BedDouble,
  ChevronDown,
} from 'lucide-react';

interface BuyerLead {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  interest_type: string;
  property_type: string;
  city: string;
  neighborhood?: string;
  budget_min?: number;
  budget_max?: number;
  bedrooms?: number;
  notes?: string;
  ai_score: number;
  accessed: boolean;
  contacted: boolean;
  captured_at: string;
}

interface EnterpriseBuyerLeadsProps {
  apiUrl?: string;
  authToken?: string;
}

const EnterpriseBuyerLeads: React.FC<EnterpriseBuyerLeadsProps> = ({ 
  apiUrl = '', 
  authToken = '' 
}) => {
  const [leads, setLeads] = useState<BuyerLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLead, setSelectedLead] = useState<BuyerLead | null>(null);
  const [stats, setStats] = useState({ available: 0, accessed: 0, contacted: 0 });
  const [filters, setFilters] = useState({
    city: '',
    interest_type: '',
    property_type: '',
    min_budget: '',
    max_budget: '',
  });
  const [showFilters, setShowFilters] = useState(false);

  // Mock data para demonstração
  const mockLeads: BuyerLead[] = [
    { id: '1', name: 'João Silva', phone: '(11) 99999-1234', email: 'joao@email.com', interest_type: 'compra', property_type: 'casa', city: 'São Paulo', neighborhood: 'Morumbi', budget_min: 400000, budget_max: 600000, bedrooms: 3, ai_score: 85, accessed: true, contacted: false, captured_at: '2026-01-10' },
    { id: '2', name: 'Maria Santos', phone: '***', email: '***', interest_type: 'aluguel', property_type: 'apartamento', city: 'São Paulo', neighborhood: 'Pinheiros', budget_min: 2000, budget_max: 3500, bedrooms: 2, ai_score: 78, accessed: false, contacted: false, captured_at: '2026-01-09' },
    { id: '3', name: 'Carlos Oliveira', phone: '(21) 97777-9012', email: 'carlos@email.com', interest_type: 'compra', property_type: 'terreno', city: 'Rio de Janeiro', neighborhood: 'Barra', budget_min: 150000, budget_max: 250000, ai_score: 72, accessed: true, contacted: true, captured_at: '2026-01-08' },
    { id: '4', name: 'Ana Pereira', phone: '***', email: '***', interest_type: 'compra', property_type: 'apartamento', city: 'São Paulo', neighborhood: 'Moema', budget_min: 500000, budget_max: 800000, bedrooms: 4, ai_score: 91, accessed: false, contacted: false, captured_at: '2026-01-10' },
    { id: '5', name: 'Roberto Lima', phone: '***', email: '***', interest_type: 'aluguel', property_type: 'comercial', city: 'São Paulo', neighborhood: 'Paulista', budget_min: 5000, budget_max: 10000, ai_score: 65, accessed: false, contacted: false, captured_at: '2026-01-09' },
  ];

  useEffect(() => {
    // Simular carregamento
    setTimeout(() => {
      setLeads(mockLeads);
      setStats({ available: 156, accessed: 23, contacted: 8 });
      setLoading(false);
    }, 500);
  }, []);

  const handleViewLead = (lead: BuyerLead) => {
    // Simular acesso ao lead (revela contato)
    const updatedLeads = leads.map(l => 
      l.id === lead.id ? { ...l, accessed: true, phone: '(11) 99999-' + Math.floor(1000 + Math.random() * 9000), email: 'contato@email.com' } : l
    );
    setLeads(updatedLeads);
    setSelectedLead(updatedLeads.find(l => l.id === lead.id) || null);
  };

  const handleMarkContacted = (leadId: string) => {
    setLeads(leads.map(l => 
      l.id === leadId ? { ...l, contacted: true } : l
    ));
    setSelectedLead(prev => prev?.id === leadId ? { ...prev, contacted: true } : prev);
  };

  const formatBudget = (value?: number, type?: string) => {
    if (!value) return '-';
    if (type === 'aluguel') return `R$ ${value.toLocaleString('pt-BR')}/mês`;
    if (value >= 1000000) return `R$ ${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `R$ ${(value / 1000).toFixed(0)}k`;
    return `R$ ${value}`;
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'bg-green-100 text-green-700';
    if (score >= 60) return 'bg-yellow-100 text-yellow-700';
    return 'bg-gray-100 text-gray-700';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Home className="w-6 h-6 text-purple-600" />
          Oportunidades de Leads
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          Leads de compradores e alugadores disponíveis para seu plano Enterprise
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Home className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase font-bold">Disponíveis</p>
              <p className="text-2xl font-bold text-gray-900">{stats.available}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Eye className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase font-bold">Acessados</p>
              <p className="text-2xl font-bold text-gray-900">{stats.accessed}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <CheckCircle2 className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase font-bold">Contatados</p>
              <p className="text-2xl font-bold text-gray-900">{stats.contacted}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm mb-6">
        <div className="p-4 flex items-center justify-between border-b border-gray-100">
          <div className="flex items-center gap-4 flex-1">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por nome, cidade..."
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none"
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
                showFilters ? 'bg-purple-50 border-purple-300 text-purple-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Filter className="w-4 h-4" />
              Filtros
              <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
            </button>
          </div>
        </div>

        {showFilters && (
          <div className="p-4 bg-gray-50 border-b border-gray-100">
            <div className="grid grid-cols-5 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Cidade</label>
                <select 
                  value={filters.city}
                  onChange={(e) => setFilters({ ...filters, city: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                >
                  <option value="">Todas</option>
                  <option value="sao-paulo">São Paulo</option>
                  <option value="rio">Rio de Janeiro</option>
                  <option value="bh">Belo Horizonte</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Interesse</label>
                <select 
                  value={filters.interest_type}
                  onChange={(e) => setFilters({ ...filters, interest_type: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                >
                  <option value="">Todos</option>
                  <option value="compra">Compra</option>
                  <option value="aluguel">Aluguel</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Tipo</label>
                <select 
                  value={filters.property_type}
                  onChange={(e) => setFilters({ ...filters, property_type: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                >
                  <option value="">Todos</option>
                  <option value="casa">Casa</option>
                  <option value="apartamento">Apartamento</option>
                  <option value="terreno">Terreno</option>
                  <option value="comercial">Comercial</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Budget Mín</label>
                <input
                  type="number"
                  value={filters.min_budget}
                  onChange={(e) => setFilters({ ...filters, min_budget: e.target.value })}
                  placeholder="R$ 0"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Budget Máx</label>
                <input
                  type="number"
                  value={filters.max_budget}
                  onChange={(e) => setFilters({ ...filters, max_budget: e.target.value })}
                  placeholder="Sem limite"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                />
              </div>
            </div>
          </div>
        )}

        {/* Leads List */}
        <div className="divide-y divide-gray-100">
          {leads.map((lead) => (
            <div 
              key={lead.id} 
              className={`p-4 hover:bg-gray-50 transition-colors ${lead.contacted ? 'bg-green-50/30' : ''}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {/* Avatar */}
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                    lead.interest_type === 'compra' ? 'bg-blue-100' : 'bg-orange-100'
                  }`}>
                    {lead.property_type === 'casa' && <Home className={`w-5 h-5 ${lead.interest_type === 'compra' ? 'text-blue-600' : 'text-orange-600'}`} />}
                    {lead.property_type === 'apartamento' && <Building2 className={`w-5 h-5 ${lead.interest_type === 'compra' ? 'text-blue-600' : 'text-orange-600'}`} />}
                    {lead.property_type === 'terreno' && <MapPin className={`w-5 h-5 ${lead.interest_type === 'compra' ? 'text-blue-600' : 'text-orange-600'}`} />}
                    {lead.property_type === 'comercial' && <Building2 className={`w-5 h-5 ${lead.interest_type === 'compra' ? 'text-blue-600' : 'text-orange-600'}`} />}
                  </div>

                  {/* Info */}
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-900">{lead.name}</span>
                      <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${getScoreColor(lead.ai_score)}`}>
                        {lead.ai_score}
                      </span>
                      {lead.contacted && (
                        <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-green-100 text-green-700 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Contatado
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                      <span className={`px-2 py-0.5 text-xs font-bold rounded ${
                        lead.interest_type === 'compra' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'
                      }`}>
                        {lead.interest_type === 'compra' ? 'Compra' : 'Aluguel'}
                      </span>
                      <span className="capitalize">{lead.property_type}</span>
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {lead.city}{lead.neighborhood ? `, ${lead.neighborhood}` : ''}
                      </span>
                      {lead.bedrooms && (
                        <span className="flex items-center gap-1">
                          <BedDouble className="w-3 h-3" />
                          {lead.bedrooms} quartos
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  {/* Budget */}
                  <div className="text-right">
                    <p className="text-xs text-gray-500">Budget</p>
                    <p className="font-bold text-gray-900">
                      {formatBudget(lead.budget_min, lead.interest_type)} - {formatBudget(lead.budget_max, lead.interest_type)}
                    </p>
                  </div>

                  {/* Contact or View */}
                  {lead.accessed ? (
                    <div className="flex items-center gap-2">
                      <a href={`tel:${lead.phone}`} className="p-2 bg-green-100 rounded-lg text-green-600 hover:bg-green-200 transition-colors">
                        <Phone className="w-4 h-4" />
                      </a>
                      <a href={`mailto:${lead.email}`} className="p-2 bg-blue-100 rounded-lg text-blue-600 hover:bg-blue-200 transition-colors">
                        <Mail className="w-4 h-4" />
                      </a>
                      {!lead.contacted && (
                        <button 
                          onClick={() => handleMarkContacted(lead.id)}
                          className="px-3 py-1.5 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 transition-colors"
                        >
                          Marcar Contatado
                        </button>
                      )}
                    </div>
                  ) : (
                    <button
                      onClick={() => handleViewLead(lead)}
                      className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                    >
                      <Eye className="w-4 h-4" />
                      Ver Contato
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Empty state */}
      {leads.length === 0 && (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
          <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-700">Nenhum lead encontrado</h3>
          <p className="text-gray-500 text-sm mt-1">Ajuste os filtros ou aguarde novos leads</p>
        </div>
      )}
    </div>
  );
};

export default EnterpriseBuyerLeads;
