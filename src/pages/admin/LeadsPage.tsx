import { useState, useEffect } from 'react';
import { Badge } from '@/components/UI/badge';
import { Button } from '@/components/UI/button';
import { LeadStatusBadge } from '@/components/LeadStatusBadge';
import { apiService } from '@/services/apiService';

interface Lead {
  id: string;
  name: string;
  phone?: string;
  score: number;
  status: string;
  assigned_to?: string;
  source: string;
  captured_at: string;
}

export function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, new, qualified

  useEffect(() => {
    fetchLeads();
  }, [filter]);

  const fetchLeads = async () => {
    setLoading(true);
    try {
      let url = '/api/leads?limit=50';
      if (filter !== 'all') {
        url += `&status=${filter}`;
      }

      const res = await fetch(url, {
        headers: apiService.getHeaders(),
      });
      const data = (await res.json()) as { leads: Lead[] };
      if (data.leads) {
        setLeads(data.leads);
      }
    } catch (error) {
      console.error('Erro ao buscar leads', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Gestão de Leads</h1>
        <div className="flex gap-2">
          <Button
            variant={filter === 'all' ? 'default' : 'outline'}
            onClick={() => setFilter('all')}
          >
            Todos
          </Button>
          <Button
            variant={filter === 'new' ? 'default' : 'outline'}
            onClick={() => setFilter('new')}
          >
            Novos
          </Button>
          <Button
            variant={filter === 'qualified' ? 'default' : 'outline'}
            onClick={() => setFilter('qualified')}
          >
            Qualificados
          </Button>
        </div>
      </div>

      {loading ? (
        <div>Carregando...</div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="p-4 font-medium text-gray-600">Nome</th>
                <th className="p-4 font-medium text-gray-600">Telefone</th>
                <th className="p-4 font-medium text-gray-600">Status</th>
                <th className="p-4 font-medium text-gray-600">Score</th>
                <th className="p-4 font-medium text-gray-600">Atribuído</th>
                <th className="p-4 font-medium text-gray-600">Data</th>
                <th className="p-4 font-medium text-gray-600">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {leads.map((lead) => (
                <tr key={lead.id} className="hover:bg-gray-50">
                  <td className="p-4 font-medium">{lead.name}</td>
                  <td className="p-4 text-gray-600">{lead.phone || '-'}</td>
                  <td className="p-4">
                    <LeadStatusBadge status={lead.status} />
                  </td>
                  <td className="p-4">
                    <Badge variant={lead.score > 50 ? 'default' : 'outline'}>{lead.score}</Badge>
                  </td>
                  <td className="p-4 text-gray-600">
                    {lead.assigned_to ? (
                      <span className="flex items-center gap-1">
                        👤 {lead.assigned_to.split('@')[0]}
                      </span>
                    ) : (
                      <span className="text-gray-400 italic">Não atribuído</span>
                    )}
                  </td>
                  <td className="p-4 text-gray-500 text-sm">
                    {new Date(lead.captured_at).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="p-4">
                    <Button size="sm" variant="outline">
                      Ver
                    </Button>
                  </td>
                </tr>
              ))}

              {leads.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-gray-500">
                    Nenhum lead encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
