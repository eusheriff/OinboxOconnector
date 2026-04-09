import React, { useState } from 'react';
import { Upload, FileText, AlertTriangle, CheckCircle, Smartphone } from 'lucide-react';

interface AnalysisResult {
  risk_score: number;
  critical_alerts: string[];
  suggestions: string[];
  summary: string;
}

export const LegalHub: React.FC = () => {
  const [contractText, setContractText] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);

  const handleAnalyze = async () => {
    if (!contractText) return;
    setAnalyzing(true);
    setResult(null);

    try {
      const response = await fetch('https://agent-hub.oconnector.tech/v1/hub/orchestrate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input: `Analise este contrato: ${contractText}`,
          origin_domain: 'legal.oinbox.oconnector.tech',
          type: 'text',
        }),
      });

      const data = (await response.json()) as { response?: string };

      // Parse the JSON returned by Lex (which might be inside the 'response' text field)
      try {
        const aiContent = data.response || '';
        // Simple extraction if the response is strict JSON, otherwise we might need regex
        const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          setResult(JSON.parse(jsonMatch[0]));
        } else {
          // Fallback for non-JSON responses
          setResult({
            risk_score: 50,
            critical_alerts: ['Formato de resposta não estruturado.'],
            suggestions: [],
            summary: aiContent,
          });
        }
      } catch (e) {
        console.error('Error parsing AI response', e);
      }
    } catch (error) {
      console.error('Analysis failed', error);
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
          <span className="text-indigo-600">⚖️</span> Hub Jurídico (Lex)
        </h1>
        <p className="text-gray-600 mt-2">
          Auditoria de contratos imobiliários com inteligência artificial (Lei do Inquilinato).
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Input Section */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5 text-gray-500" />
            Contrato para Análise
          </h2>

          <textarea
            className="w-full h-96 p-4 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent font-mono text-sm"
            placeholder="Cole o texto do contrato aqui..."
            value={contractText}
            onChange={(e) => setContractText(e.target.value)}
          />

          <button
            onClick={handleAnalyze}
            disabled={analyzing || !contractText}
            className={`mt-4 w-full py-3 px-4 rounded-lg text-white font-medium flex items-center justify-center gap-2 transition-colors
              ${analyzing ? 'bg-indigo-300 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'}
            `}
          >
            {analyzing ? (
              <>Analyzing via Gemini 2.5...</>
            ) : (
              <>
                <CheckCircle className="w-5 h-5" />
                Auditar Contrato Agora
              </>
            )}
          </button>
        </div>

        {/* Results Section */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-gray-500" />
            Resultado da Auditoria
          </h2>

          {!result && !analyzing && (
            <div className="h-96 flex flex-col items-center justify-center text-gray-400 border-2 border-dashed border-gray-100 rounded-lg">
              <Upload className="w-12 h-12 mb-2" />
              <p>Envie um contrato para ver os riscos.</p>
            </div>
          )}

          {analyzing && (
            <div className="h-96 flex flex-col items-center justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mb-4"></div>
              <p className="text-gray-500">Lex está lendo cada cláusula...</p>
            </div>
          )}

          {result && (
            <div className="space-y-6 animate-fade-in">
              {/* Score Card */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <span className="font-medium text-gray-700">Índice de Segurança</span>
                <div
                  className={`text-2xl font-bold ${
                    result.risk_score > 80
                      ? 'text-green-600'
                      : result.risk_score > 50
                        ? 'text-yellow-600'
                        : 'text-red-600'
                  }`}
                >
                  {result.risk_score}/100
                </div>
              </div>

              {/* Alerts */}
              <div>
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
                  Alertas Críticos
                </h3>
                <ul className="space-y-2">
                  {result.critical_alerts.map((alert, idx) => (
                    <li
                      key={idx}
                      className="flex items-start gap-2 text-sm text-red-700 p-2 bg-red-50 rounded border border-red-100"
                    >
                      <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                      {alert}
                    </li>
                  ))}
                  {result.critical_alerts.length === 0 && (
                    <li className="text-sm text-green-600 flex items-center gap-2">
                      <CheckCircle className="w-4 h-4" /> Nenhum risco crítico detectado.
                    </li>
                  )}
                </ul>
              </div>

              {/* Summary */}
              <div>
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  Parecer Técnico
                </h3>
                <p className="text-sm text-gray-600 leading-relaxed bg-blue-50 p-4 rounded-lg border border-blue-100">
                  {result.summary}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
