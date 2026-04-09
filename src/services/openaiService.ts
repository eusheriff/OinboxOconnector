import { AIConfig } from '@shared/types';
import { apiService } from './apiService';

// === Tipos e Interfaces ===

export interface GroundingSource {
  title: string;
  uri: string;
}

export interface AIResponse {
  text: string;
  error?: string;
}

export interface ClientAnalysisResult {
  budget: string;
  urgency: string;
  preferences: string[];
  sentiment: 'Positivo' | 'Neutro' | 'Crítico';
  summary: string;
}

export interface ImageAnalysisResult {
  features: string;
  description: string;
}

export type Tone = 'formal' | 'friendly';

export type AIProvider = 'openai' | 'ollama';

export interface OpenAIConfig {
  provider: AIProvider;
  ollamaBaseUrl: string;
  selectedModel: string;
  visionModel: string;
}

export interface ErrorMessage {
  message: string;
  code?: string;
  retryable: boolean;
}

// === Erros Customizados ===

export class AIError extends Error {
  public readonly code: string;
  public readonly retryable: boolean;

  constructor(message: string, code: string = 'AI_ERROR', retryable: boolean = true) {
    super(message);
    this.name = 'AIError';
    this.code = code;
    this.retryable = retryable;
  }
}

// === Configuração de IA ===

const getAIConfig = (): OpenAIConfig => {
  const stored = localStorage.getItem('oconnector_ai_config');
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      console.warn('Falha ao parsear configuração de IA, usando defaults');
    }
  }

  return {
    provider: 'openai',
    ollamaBaseUrl: 'http://localhost:11434',
    selectedModel: 'llama3.1:8b',
    visionModel: 'qwen3-vl:8b',
  };
};

// === Helpers para chamadas de IA ===

const callBackendAI = async (
  prompt: string,
  systemPrompt?: string,
  sessionId?: string,
): Promise<string> => {
  const apiUrl = import.meta.env.VITE_API_URL || 'https://api.oinbox.oconnector.tech';

  try {
    const response = await fetch(`${apiUrl}/api/ai/generate`, {
      method: 'POST',
      headers: apiService.getHeaders(),
      body: JSON.stringify({ prompt, systemPrompt, session_id: sessionId }),
    });

    if (!response.ok) {
      const errorData = (await response.json().catch(() => ({}))) as { error?: string };
      const errorMessage = errorData.error || `Erro na IA: ${response.status}`;

      const retryable = response.status >= 500 || response.status === 429;
      throw new AIError(errorMessage, `HTTP_${response.status}`, retryable);
    }

    const data: AIResponse = await response.json();

    if (data.error) {
      throw new AIError(data.error, 'BACKEND_AI_ERROR', true);
    }

    if (!data.text) {
      throw new AIError('Resposta vazia da IA', 'EMPTY_RESPONSE', false);
    }

    return data.text;
  } catch (error) {
    if (error instanceof AIError) {
      throw error;
    }

    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new AIError('Erro de conexão com o servidor de IA', 'NETWORK_ERROR', true);
    }

    throw new AIError(
      'Erro inesperado ao processar solicitação de IA',
      'UNEXPECTED_ERROR',
      false,
    );
  }
};

const callOllamaAPI = async (
  model: string,
  prompt: string,
  imageBase64?: string,
  jsonMode: boolean = false,
): Promise<string> => {
  const config = getAIConfig();

  try {
    const messages: { role: string; content: string; images?: string[] }[] = [
      { role: 'user', content: prompt },
    ];
    if (imageBase64) {
      messages[0].images = [imageBase64];
    }

    const response = await fetch(`${config.ollamaBaseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages,
        stream: false,
        format: jsonMode ? 'json' : undefined,
      }),
    });

    if (!response.ok) {
      throw new AIError(
        `Falha ao conectar com Ollama: ${response.status}`,
        'OLLAMA_ERROR',
        response.status >= 500,
      );
    }

    const data = (await response.json()) as { message?: { content: string } };
    const content = data.message?.content;

    if (!content) {
      throw new AIError('Resposta vazia do Ollama', 'OLLAMA_EMPTY', false);
    }

    return content;
  } catch (error) {
    if (error instanceof AIError) {
      throw error;
    }

    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new AIError(
        'Não foi possível conectar com o Ollama local. Verifique se o serviço está rodando.',
        'OLLAMA_NETWORK_ERROR',
        true,
      );
    }

    throw new AIError('Erro inesperado ao chamar Ollama', 'UNEXPECTED_ERROR', false);
  }
};

// === Helpers utilitários ===

export const fileToGenerativePart = async (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      const base64String = result.split(',')[1];
      resolve(base64String);
    };
    reader.onerror = () => reject(new AIError('Falha ao ler arquivo', 'FILE_READ_ERROR', false));
    reader.readAsDataURL(file);
  });
};

const parseJsonResponse = (text: string): Record<string, unknown> => {
  const cleanJson = text.replace(/```json|```/g, '').trim();
  try {
    return JSON.parse(cleanJson);
  } catch {
    throw new AIError('Falha ao parsear resposta JSON da IA', 'JSON_PARSE_ERROR', false);
  }
};

// === Funções de IA ===

export const analyzePropertyImage = async (file: File): Promise<ImageAnalysisResult> => {
  const config = getAIConfig();
  const base64 = await fileToGenerativePart(file);

  const prompt = `
    Analise esta imagem de um imóvel.
    1. Liste as características visíveis (ex: piso, iluminação, cômodos).
    2. Crie uma descrição comercial curta.

    Retorne APENAS um JSON: { "features": "lista", "description": "texto" }
  `;

  try {
    if (config.provider === 'ollama') {
      const text = await callOllamaAPI(config.visionModel || 'qwen3-vl:8b', prompt, base64, true);
      return parseJsonResponse(text) as unknown as ImageAnalysisResult;
    }

    // Para imagens, backend requer multipart (em desenvolvimento)
    return {
      features: 'Análise de imagem via backend em breve',
      description: 'Funcionalidade em migração.',
    };
  } catch (error) {
    const errorMessage =
      error instanceof AIError ? error.message : 'Erro na análise da imagem.';
    throw new AIError(errorMessage, 'IMAGE_ANALYSIS_ERROR', false);
  }
};

export const generatePropertyDescription = async (
  features: string,
  type: string,
  location: string,
): Promise<string> => {
  const config = getAIConfig();
  const prompt = `
    Você é um copywriter imobiliário. Crie uma descrição curta e luxuosa para:
    Tipo: ${type}, Local: ${location}, Destaques: ${features}.
    Máximo 300 caracteres.
  `;

  if (config.provider === 'ollama') {
    return callOllamaAPI(config.selectedModel, prompt);
  }

  return callBackendAI(prompt, 'Você é um copywriter imobiliário.');
};

export const summarizeConversation = async (
  messages: { sender: string; text: string }[],
): Promise<string> => {
  const config = getAIConfig();
  const prompt = `
    Resuma esta conversa imobiliária em 2 frases. Identifique o interesse e status.
    Conversa: ${messages.map((m) => `${m.sender}: ${m.text}`).join('\n')}
  `;

  if (config.provider === 'ollama') {
    return callOllamaAPI(config.selectedModel, prompt);
  }

  return callBackendAI(prompt);
};

export const suggestReply = async (
  conversationHistory: string[],
  tone: Tone,
  propertyContext?: string,
): Promise<string> => {
  const config = getAIConfig();
  let prompt = `Aja como um corretor. Sugira resposta ${tone} e curta. Histórico: ${conversationHistory.slice(-5).join('\n')}`;
  if (propertyContext) prompt += `\nContexto Imóvel: ${propertyContext}`;

  if (config.provider === 'ollama') {
    return callOllamaAPI(config.selectedModel, prompt);
  }

  return callBackendAI(prompt);
};

export const generateMarketingCaption = async (
  propertyTitle: string,
  location: string,
  price: string,
  templateType: string,
): Promise<string> => {
  const config = getAIConfig();
  const prompt = `
    Crie uma legenda curta e engajadora para Instagram/Facebook sobre este imóvel:
    Imóvel: ${propertyTitle}
    Local: ${location}
    Preço: ${price}
    Estilo do Post: ${templateType} (Ex: Vendido, Oportunidade, Luxo)
    Use emojis, hashtags e uma Call to Action (CTA) no final.
  `;

  if (config.provider === 'ollama') {
    return callOllamaAPI(config.selectedModel, prompt);
  }

  return callBackendAI(prompt);
};

export const analyzeClientProfile = async (
  messages: { sender: string; text: string }[],
): Promise<ClientAnalysisResult | null> => {
  const config = getAIConfig();
  const prompt = `
    Analise a conversa e extraia JSON: { "budget": "", "urgency": "", "preferences": [], "sentiment": "", "summary": "" }.
    Conversa: ${messages.map((m) => `${m.sender}: ${m.text}`).join('\n')}
  `;

  try {
    let text: string;

    if (config.provider === 'ollama') {
      text = await callOllamaAPI(config.selectedModel, prompt, undefined, true);
    } else {
      text = await callBackendAI(prompt, 'Você é um analista de dados. Retorne APENAS JSON.');
    }

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new AIError('Nenhum JSON encontrado na resposta da IA', 'NO_JSON', false);
    }

    return parseJsonResponse(jsonMatch[0]) as unknown as ClientAnalysisResult;
  } catch (error) {
    if (error instanceof AIError) {
      console.error('Erro na análise de perfil:', error.message);
      return null;
    }
    return null;
  }
};

export const fastAgentResponse = async (
  lastMessage: string,
  clientName: string,
  profileSummary: string,
  sessionId: string,
  _persona?: string,
): Promise<string> => {
  const config = getAIConfig();

  const prompt = `
    CONTEXTO DO CLIENTE:
    - Nome: ${clientName}
    - Perfil Resumido: ${profileSummary}

    ÚLTIMA MENSAGEM DO CLIENTE: "${lastMessage}"
  `;

  const systemPrompt = `Você é Manú, corretora da Euimob.`;

  if (config.provider === 'ollama') {
    return callOllamaAPI(config.selectedModel, prompt);
  }

  return callBackendAI(prompt, systemPrompt, sessionId);
};

export const askLocationAssistant = async (
  _location: string,
  _queryType: string,
): Promise<{ text: string; sources: GroundingSource[] }> => {
  return {
    text: 'Funcionalidade em manutenção para migração de backend.',
    sources: [],
  };
};

export const askGlobalAgent = async (
  message: string,
  _history: Record<string, unknown>[],
  sessionId?: string,
): Promise<string> => {
  const apiUrl = import.meta.env.VITE_API_URL || 'https://api.oinbox.oconnector.tech';

  try {
    const response = await fetch(`${apiUrl}/api/ai/public-chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: message,
        systemPrompt:
          'Você é a IA do Oinbox, uma plataforma de gestão imobiliária com inteligência artificial.',
        session_id: sessionId,
      }),
    });

    if (!response.ok) {
      const retryable = response.status >= 500 || response.status === 429;
      throw new AIError(
        `Erro na API: ${response.status}`,
        `HTTP_${response.status}`,
        retryable,
      );
    }

    const data: { text?: string } = await response.json();
    return data.text || 'Erro ao processar resposta.';
  } catch (error) {
    if (error instanceof AIError) {
      throw error;
    }

    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new AIError('Erro de conexão', 'NETWORK_ERROR', true);
    }

    return 'Erro ao processar solicitação de IA. Tente novamente mais tarde.';
  }
};

export const askMarketExpert = async (
  message: string,
  _history: Record<string, unknown>[],
  sessionId?: string,
): Promise<string> => {
  const config = getAIConfig();
  const prompt = `Pergunta: ${message}`;
  const systemPrompt = `Você é um Corretor Sênior Especialista. Responda sobre mercado imobiliário com autoridade e clareza.`;

  if (config.provider === 'ollama') {
    return callOllamaAPI(config.selectedModel, prompt);
  }

  return callBackendAI(prompt, systemPrompt, sessionId);
};

export const processVoiceNote = async (
  _audioTranscription: string,
): Promise<Record<string, unknown>> => {
  return {};
};
