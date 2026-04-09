import { Bindings } from '../bindings';
import { circuitBreakers } from '../utils/circuitBreaker';

export interface SalesAnalysisResult {
  intent: 'INTERESTED' | 'NOT_INTERESTED' | 'SUPPORT' | 'OTHER';
  suggested_reply: string;
  confidence: number;
}

export class SalesTools {
  private env: Bindings;

  constructor(env: Bindings) {
    this.env = env;
  }

  /**
   * Analisa a intenção da resposta do lead usando o Agent Hub (Skill: analyze-response)
   * Protegido por circuit breaker para evitar chamadas quando o serviço está indisponível.
   */
  async analyzeIntention(message: string, history: any[] = []): Promise<SalesAnalysisResult> {
    const AGENT_HUB_URL = 'https://agent-hub.oconnector.tech/api/skill/analyze-response';

    try {
      const response = await circuitBreakers.agentHub.execute(async () => {
        return fetch(AGENT_HUB_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message, history }),
        });
      });

      if (!response.ok) {
        console.warn(`[SalesTools] Analyze failed: ${response.status}`);
        return { intent: 'OTHER', suggested_reply: '', confidence: 0 };
      }

      const data = (await response.json()) as any;
      return {
        intent: data.result?.intent || 'OTHER',
        suggested_reply: data.result?.suggested_reply || '',
        confidence: data.result?.confidence || 0,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('[SalesTools] Error analyzing intention (circuit breaker):', errorMessage);
      return { intent: 'OTHER', suggested_reply: '', confidence: 0 };
    }
  }

  /**
   * Gera um Pitch de Vendas personalizado (Skill: generate-pitch)
   * Protegido por circuit breaker para evitar chamadas quando o serviço está indisponível.
   */
  async generatePitch(leadName: string, bizName: string, leadData: any): Promise<string> {
    const AGENT_HUB_URL = 'https://agent-hub.oconnector.tech/api/skill/generate-pitch';

    try {
      const response = await circuitBreakers.agentHub.execute(async () => {
        return fetch(AGENT_HUB_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: leadName,
            business: bizName,
            ...leadData,
          }),
        });
      });

      if (!response.ok) return '';

      const data = (await response.json()) as any;
      return data.pitch || data.result?.pitch || '';
    } catch (error) {
      console.error('[SalesTools] Error generating pitch (circuit breaker):', error);
      return '';
    }
  }
}
