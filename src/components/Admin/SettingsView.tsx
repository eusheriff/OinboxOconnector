import React, { useState } from 'react';
import { Zap, CheckCircle2 } from 'lucide-react';

const SettingsView: React.FC = () => {
  const [geminiStatus, setGeminiStatus] = useState<'idle' | 'loading' | 'success' | 'error'>(
    'idle',
  );
  const [geminiResponse, setGeminiResponse] = useState('');

  const testGeminiConnection = async () => {
    setGeminiStatus('loading');
    try {
      // Lógica movida para o backend (Segurança)
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'https://api.oinbox.oconnector.tech'}/api/admin/test-ai-connection`,
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

      setGeminiResponse(data.message || 'Connection OK');
      setGeminiStatus('success');
    } catch (error: any) {
      console.error('Gemini Error:', error);
      setGeminiResponse(`Error: ${error.message || 'Unknown error'}`);
      setGeminiStatus('error');
    }
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-foreground mb-6">⚙️ Configurações & Integrações</h1>

      <div className="bg-card p-6 rounded-xl border border-border shadow-sm max-w-2xl">
        <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
          <Zap className="w-5 h-5 text-yellow-500" />
          Status das APIs
        </h3>

        <div className="space-y-4">
          {/* Gemini Check */}
          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border border-border">
            <div>
              <div className="font-semibold">Google Gemini AI</div>
              <div className="text-sm text-muted-foreground">
                Key:{' '}
                {geminiStatus === 'success'
                  ? 'Conectado (Backend) ✅'
                  : 'Gerenciado pelo Servidor 🔒'}
              </div>
              {geminiResponse && (
                <div
                  className={`mt-2 text-sm p-2 rounded ${geminiStatus === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}
                >
                  Resposta: {geminiResponse}
                </div>
              )}
            </div>
            <button
              onClick={testGeminiConnection}
              disabled={geminiStatus === 'loading'}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 text-sm font-medium transition-colors"
            >
              {geminiStatus === 'loading' ? 'Testando...' : 'Testar Conexão'}
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
                  : 'Não Configurada ❌'}
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
