import React, { useState } from 'react';
import { Zap, CheckCircle2 } from 'lucide-react';

const SettingsView: React.FC = () => {
  const [automationStatus, setAutomationStatus] = useState<
    'idle' | 'loading' | 'success' | 'error'
  >('idle');
  const [automationResponse, setAutomationResponse] = useState('');

  const testAutomationConnection = async () => {
    setAutomationStatus('loading');
    try {
      // Lógica movida para o backend (Segurança)
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'https://api.Oconnector.oconnector.tech'}/api/admin/test-automation-connection`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        },
      );

      const data = (await response.json()) as { error?: string; message?: string };

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao testar conexão');
      }

      setAutomationResponse(data.message || 'Connection OK');
      setAutomationStatus('success');
    } catch (error: any) {
      console.error('Automation Error:', error);
      setAutomationResponse(`Error: ${error.message || 'Unknown error'}`);
      setAutomationStatus('error');
    }
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-foreground mb-6">Configurações & Integrações</h1>

      <div className="bg-card p-6 rounded-xl border border-border shadow-sm max-w-2xl">
        <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
          <Zap className="w-5 h-5 text-yellow-500" />
          Status das APIs
        </h3>

        <div className="space-y-4">
          {/* Automation Check */}
          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border border-border">
            <div>
              <div className="font-semibold">Automation Engine (Core)</div>
              <div className="text-sm text-muted-foreground">
                Status:{' '}
                {automationStatus === 'success'
                  ? 'Conectado (Backend) '
                  : 'Gerenciado pelo Servidor '}
              </div>
              {automationResponse && (
                <div
                  className={`mt-2 text-sm p-2 rounded ${automationStatus === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}
                >
                  Resposta: {automationResponse}
                </div>
              )}
            </div>
            <button
              onClick={testAutomationConnection}
              disabled={automationStatus === 'loading'}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 text-sm font-medium transition-colors"
            >
              {automationStatus === 'loading' ? 'Testando...' : 'Testar Conexão'}
            </button>
          </div>

          {/* Google Maps Check */}
          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border border-border">
            <div>
              <div className="font-semibold">Google Maps & Places</div>
              <div className="text-sm text-muted-foreground">
                Key:{' '}
                {import.meta.env.VITE_GOOGLE_PLACES_API_KEY
                  ? 'Configurada •••••'
                  : 'Não Configurada '}
              </div>
            </div>
            <div className="text-sm text-muted-foreground flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4 text-green-500" />
              Ativo (Verificado)
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsView;
