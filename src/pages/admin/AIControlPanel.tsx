import React, { useState, useEffect } from 'react';
import { Save, Bot, Cpu, DollarSign } from 'lucide-react';
import { useToast } from '@/contexts/ToastContext';

interface AIConfig {
  model: string;
  systemPrompt: string;
  maxTokens: number;
  temperature: number;
}

const AIControlPanel: React.FC = () => {
  const { addToast } = useToast();
  const [config, setConfig] = useState<AIConfig>({
    model: 'llama-3.3-70b-versatile',
    systemPrompt: '',
    maxTokens: 2048,
    temperature: 0.7,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const response = await fetch(
          `${import.meta.env.VITE_API_URL || 'http://localhost:8787'}/api/admin/ai-config`,
          {
            headers: { Authorization: `Bearer ${localStorage.getItem('Oconnector_token')}` },
          },
        );
        const data = (await response.json()) as AIConfig;
        if (data && Object.keys(data).length > 0) {
          setConfig(data);
        }
      } catch (error) {
        console.error('Failed to fetch AI config', error);
      } finally {
        setLoading(false);
      }
    };
    fetchConfig();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:8787'}/api/admin/ai-config`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('Oconnector_token')}`,
          },
          body: JSON.stringify(config),
        },
      );
      addToast('success', 'Configurações salvas com sucesso!');
    } catch (error) {
      console.error('Failed to save AI config', error);
      addToast('error', 'Erro ao salvar configurações.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="text-white">Carregando configurações...</div>;

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold text-white flex items-center gap-3">
          <Bot className="text-purple-400" />
          Painel de Controle IA
        </h2>
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50"
        >
          <Save size={20} />
          {saving ? 'Salvando...' : 'Salvar Alterações'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Model Settings */}
        <div className="bg-card p-6 rounded-xl border border-border shadow-lg space-y-6">
          <h3 className="text-xl font-semibold text-gray-200 flex items-center gap-2">
            <Cpu className="text-blue-400" />
            Configurações do Modelo
          </h3>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Modelo Principal</label>
            <select
              value={config.model}
              onChange={(e) => setConfig({ ...config, model: e.target.value })}
              className="w-full bg-background border border-border rounded-lg p-3 text-white focus:ring-2 focus:ring-purple-500 outline-none"
            >
              <option value="llama-3.3-70b-versatile">Llama 3.3 70B (Engine - Recomendado)</option>
              <option value="llama-3.1-8b-instant">Llama 3.1 8B Instant (Engine - Rapido)</option>
              <option value="mixtral-8x7b-32768">Mixtral 8x7B (Engine)</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Max Tokens</label>
              <input
                type="number"
                value={config.maxTokens}
                onChange={(e) => setConfig({ ...config, maxTokens: parseInt(e.target.value, 10) })}
                className="w-full bg-background border border-border rounded-lg p-3 text-white focus:ring-2 focus:ring-purple-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Temperatura</label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="1"
                value={config.temperature}
                onChange={(e) => setConfig({ ...config, temperature: parseFloat(e.target.value) })}
                className="w-full bg-background border border-border rounded-lg p-3 text-white focus:ring-2 focus:ring-purple-500 outline-none"
              />
            </div>
          </div>
        </div>

        {/* Cost Estimation (Mock) */}
        <div className="bg-card p-6 rounded-xl border border-border shadow-lg space-y-6">
          <h3 className="text-xl font-semibold text-gray-200 flex items-center gap-2">
            <DollarSign className="text-green-400" />
            Estimativa de Custos
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-background p-4 rounded-lg">
              <p className="text-gray-400 text-sm">Custo Mensal (Est.)</p>
              <p className="text-2xl font-bold text-white">R$ 124,50</p>
            </div>
            <div className="bg-background p-4 rounded-lg">
              <p className="text-gray-400 text-sm">Tokens Processados</p>
              <p className="text-2xl font-bold text-white">1.2M</p>
            </div>
          </div>
          <p className="text-sm text-gray-500">
            * Estimativa baseada no uso atual e precos da API Engine.
          </p>
        </div>
      </div>

      {/* System Prompt */}
      <div className="bg-card p-6 rounded-xl border border-border shadow-lg space-y-4">
        <h3 className="text-xl font-semibold text-gray-200">Prompt do Sistema Global</h3>
        <p className="text-gray-400 text-sm">
          Este prompt define a personalidade base e as regras de negócio para todas as IAs dos
          inquilinos. O contexto específico de cada imobiliária será injetado automaticamente.
        </p>
        <textarea
          value={config.systemPrompt}
          onChange={(e) => setConfig({ ...config, systemPrompt: e.target.value })}
          rows={10}
          className="w-full bg-background border border-border rounded-lg p-4 text-white focus:ring-2 focus:ring-purple-500 outline-none font-mono text-sm"
          placeholder="Você é um assistente virtual especialista em mercado imobiliário..."
        />
      </div>
    </div>
  );
};

export default AIControlPanel;
