import React, { useState, useEffect } from 'react';
import { Star, Zap, Brain, CheckCircle, Sparkles, Play, RefreshCw } from 'lucide-react';
import { apiService } from '@/services/apiService';

interface Lead {
  id: string;
  name: string;
  phone: string;
  website: string;
  rating: number;
  reviews_count: number;
  score: number;
  status: string;
  notes: string;
}

const API_BASE = 'https://api.oinbox.oconnector.tech';

export const QualificationView: React.FC = () => {
  const [unqualifiedLeads, setUnqualifiedLeads] = useState<Lead[]>([]);
  const [qualifiedLeads, setQualifiedLeads] = useState<Lead[]>([]);
  const [isQualifying, setIsQualifying] = useState(false);
  const [qualificationResult, setQualificationResult] = useState<{
    qualified: number;
    total: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeads();
  }, []);

  const fetchLeads = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/leads`, {
        headers: apiService.getHeaders(),
      });
      if (!response.ok) throw new Error('Failed to fetch leads');
      const data = (await response.json()) as { leads?: Lead[] };
      const leads = data.leads || [];
      setUnqualifiedLeads(leads.filter((l: Lead) => l.status === 'new'));
      setQualifiedLeads(leads.filter((l: Lead) => l.status === 'qualified'));
    } catch (error) {
      console.error('Error fetching leads:', error);
    } finally {
      setLoading(false);
    }
  };

  const runQualification = async () => {
    if (unqualifiedLeads.length === 0) {
      alert('Não há leads novos para qualificar.');
      return;
    }

    setIsQualifying(true);
    setQualificationResult(null);

    try {
      const leadIds = unqualifiedLeads.map((l) => l.id);
      const response = await fetch(`${API_BASE}/api/leads/qualify`, {
        method: 'POST',
        headers: apiService.getHeaders(),
        body: JSON.stringify({ leadIds }),
      });

      if (!response.ok) {
        const errorData = (await response.json()) as { error?: string };
        throw new Error(errorData.error || 'Qualification failed');
      }

      const result = (await response.json()) as { qualified: number; total: number };
      setQualificationResult({ qualified: result.qualified, total: result.total });

      // Refresh leads
      await fetchLeads();
    } catch (error: any) {
      console.error('Qualification error:', error);
      alert('Erro ao qualificar: ' + error.message);
    } finally {
      setIsQualifying(false);
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
          <Brain className="w-8 h-8 text-purple-500" />
          Qualificação com IA
        </h1>
        <p className="text-muted-foreground mt-2 flex items-center gap-2">
          <Sparkles className="w-4 h-4" />
          Powered by Automation 2.0 Flash - Análise automática de cada lead
        </p>
      </header>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="text-sm text-muted-foreground">Leads Novos</div>
          <div className="text-3xl font-bold text-foreground">
            {loading ? '...' : unqualifiedLeads.length}
          </div>
          <div className="text-xs text-muted-foreground mt-1">Aguardando análise IA</div>
        </div>
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="text-sm text-muted-foreground">Leads Qualificados</div>
          <div className="text-3xl font-bold text-green-500">
            {loading ? '...' : qualifiedLeads.length}
          </div>
          <div className="text-xs text-muted-foreground mt-1">Aprovados pela IA (score � 50)</div>
        </div>
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="text-sm text-muted-foreground">Score Médio</div>
          <div className="text-3xl font-bold text-foreground">
            {loading || qualifiedLeads.length === 0
              ? '--'
              : Math.round(
                  qualifiedLeads.reduce((sum, l) => sum + (l.score || 0), 0) /
                    qualifiedLeads.length,
                )}
          </div>
          <div className="text-xs text-muted-foreground mt-1">Pontuação média IA</div>
        </div>
      </div>

      {/* AI Info Box */}
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-950/30 dark:to-blue-950/30 border border-purple-200 dark:border-purple-800 rounded-xl p-6 mb-8">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-purple-100 dark:bg-purple-900 rounded-lg">
            <Brain className="w-6 h-6 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">Como a IA Qualifica</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-xl">
              A IA analisa automaticamente cada lead considerando:
            </p>
            <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                Telefone disponível (+30 pts) - essencial para contato
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                Rating � 4.0 (+20 pts) - negócio bem avaliado
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                Reviews � 50 (+25 pts) ou � 20 (+15 pts)
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                Website disponível (+10 pts) - presença online
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Qualification Action */}
      <div className="bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 rounded-xl p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Zap className="w-5 h-5 text-primary" />
              Executar Qualificação IA
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              A IA irá analisar {unqualifiedLeads.length} leads e atribuir scores automaticamente.
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={fetchLeads}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 border border-border rounded-lg text-foreground hover:bg-muted transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Atualizar
            </button>
            <button
              onClick={runQualification}
              disabled={isQualifying || unqualifiedLeads.length === 0}
              className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isQualifying ? (
                <>
                  <Brain className="w-5 h-5 animate-pulse" />
                  IA Analisando...
                </>
              ) : (
                <>
                  <Play className="w-5 h-5" />
                  Qualificar com IA
                </>
              )}
            </button>
          </div>
        </div>

        {qualificationResult && (
          <div className="mt-4 p-4 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg flex items-center gap-3">
            <CheckCircle className="w-6 h-6 text-green-500" />
            <div>
              <div className="font-medium text-green-800 dark:text-green-200">
                Análise Concluída!
              </div>
              <div className="text-sm text-green-600 dark:text-green-400">
                {qualificationResult.qualified} de {qualificationResult.total} leads foram
                qualificados pela IA.
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Top Qualified Leads Preview */}
      {qualifiedLeads.length > 0 && (
        <div className="mt-8 bg-card border border-border rounded-xl p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <Star className="w-5 h-5 text-yellow-500" />
            Top Leads Qualificados pela IA
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="py-3 px-2">Nome</th>
                  <th className="py-3 px-2">Telefone</th>
                  <th className="py-3 px-2">Rating</th>
                  <th className="py-3 px-2">Reviews</th>
                  <th className="py-3 px-2">Score IA</th>
                  <th className="py-3 px-2">Parecer IA</th>
                </tr>
              </thead>
              <tbody>
                {qualifiedLeads
                  .sort((a, b) => (b.score || 0) - (a.score || 0))
                  .slice(0, 5)
                  .map((lead) => (
                    <tr key={lead.id} className="border-b border-border/50">
                      <td className="py-3 px-2 font-medium text-foreground">{lead.name}</td>
                      <td className="py-3 px-2 text-foreground">{lead.phone || '-'}</td>
                      <td className="py-3 px-2">
                        <span className="flex items-center gap-1">
                          <Star className="w-4 h-4 text-yellow-500" />
                          {lead.rating || '-'}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-foreground">{lead.reviews_count || 0}</td>
                      <td className="py-3 px-2">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            (lead.score || 0) >= 70
                              ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                              : (lead.score || 0) >= 50
                                ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300'
                                : 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
                          }`}
                        >
                          {lead.score || 0}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-xs text-muted-foreground max-w-xs truncate">
                        {lead.notes?.includes('[IA]')
                          ? lead.notes.split('[IA]').pop()?.trim()
                          : '-'}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default QualificationView;
