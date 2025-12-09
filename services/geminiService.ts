import { AIConfig } from "../types";
import { apiService } from "./apiService";

// --- CONFIGURAÇÃO DE IA ---
// Gerencia a troca entre Gemini (Nuvem) e Ollama (Local)
const getAIConfig = (): AIConfig => {
  const stored = localStorage.getItem('oconnector_ai_config');
  if (stored) return JSON.parse(stored);

  return {
    provider: 'gemini', // Default
    ollamaBaseUrl: 'http://localhost:11434',
    selectedModel: 'llama3.1:8b',
    visionModel: 'qwen3-vl:8b'
  };
};

// Helper para chamar o Backend (Router Inteligente)
const callBackendAI = async (prompt: string, systemPrompt?: string, session_id?: string) => {
  try {
    const response = await fetch(`${import.meta.env.VITE_API_URL || 'https://oconnector-saas.xerifegomes-e71.workers.dev/api'}/ai/generate`, {
      method: 'POST',
      headers: apiService.getHeaders(),
      body: JSON.stringify({ prompt, systemPrompt, session_id })
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error((err as any).error || 'Erro na IA');
    }

    const data = await response.json();
    return (data as any).text;
  } catch (e) {
    console.error("AI Error:", e);
    return "Erro ao processar solicitação de IA. Tente novamente mais tarde.";
  }
};

// Export GroundingSource interface for use in components
export interface GroundingSource {
  title: string;
  uri: string;
}

// --- OLLAMA API CLIENT (Local Fallback) ---
const callOllamaAPI = async (model: string, prompt: string, imageBase64?: string, jsonMode: boolean = false) => {
  const config = getAIConfig();
  try {
    const messages: any[] = [{ role: "user", content: prompt }];
    if (imageBase64) messages[0].images = [imageBase64];

    const response = await fetch(`${config.ollamaBaseUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: model,
        messages: messages,
        stream: false,
        format: jsonMode ? "json" : undefined
      })
    });

    if (!response.ok) throw new Error("Falha ao conectar com Ollama");
    const data = await response.json();
    return (data as any).message?.content || "";
  } catch (error) {
    console.error("Ollama Error:", error);
    return "";
  }
};

// Helper to convert blob/file to base64
export const fileToGenerativePart = async (file: File): Promise<string> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      const base64String = result.split(',')[1];
      resolve(base64String);
    };
    reader.readAsDataURL(file);
  });
};

// --- FUNÇÕES UNIFICADAS (ROUTER) ---

export const analyzePropertyImage = async (file: File): Promise<{ features: string, description: string }> => {
  const config = getAIConfig();
  const base64 = await fileToGenerativePart(file);

  const prompt = `
    Analise esta imagem de um imóvel.
    1. Liste as características visíveis (ex: piso, iluminação, cômodos).
    2. Crie uma descrição comercial curta.
    
    Retorne APENAS um JSON: { "features": "lista", "description": "texto" }
  `;

  try {
    let text = "";
    if (config.provider === 'ollama') {
      text = await callOllamaAPI(config.visionModel || 'qwen3-vl:8b', prompt, base64, true);
    } else {
      // Para imagens, ainda usamos o backend se suportar, ou mantemos local se for complexo enviar imagem grande
      // Simplificação: Envia para backend apenas texto por enquanto, imagem requer multipart
      // TODO: Implementar envio de imagem para backend AI
      return { features: "Análise de imagem via backend em breve", description: "Funcionalidade em migração." };
    }

    const cleanJson = text.replace(/```json|```/g, '').trim();
    return JSON.parse(cleanJson);
  } catch (error) {
    return { features: "", description: "Erro na análise da imagem." };
  }
};

export const generatePropertyDescription = async (features: string, type: string, location: string): Promise<string> => {
  const config = getAIConfig();
  const prompt = `
      Você é um copywriter imobiliário. Crie uma descrição curta e luxuosa para:
      Tipo: ${type}, Local: ${location}, Destaques: ${features}.
      Máximo 300 caracteres.
  `;

  if (config.provider === 'ollama') return await callOllamaAPI(config.selectedModel, prompt);
  return await callBackendAI(prompt, "Você é um copywriter imobiliário.");
};

export const summarizeConversation = async (messages: { sender: string, text: string }[]): Promise<string> => {
  const config = getAIConfig();
  const prompt = `
      Resuma esta conversa imobiliária em 2 frases. Identifique o interesse e status.
      Conversa: ${messages.map(m => `${m.sender}: ${m.text}`).join('\n')}
  `;

  if (config.provider === 'ollama') return await callOllamaAPI(config.selectedModel, prompt);
  return await callBackendAI(prompt);
};

export const suggestReply = async (conversationHistory: string[], tone: 'formal' | 'friendly', propertyContext?: string): Promise<string> => {
  const config = getAIConfig();
  let prompt = `Aja como um corretor. Sugira resposta ${tone} e curta. Histórico: ${conversationHistory.slice(-5).join('\n')}`;
  if (propertyContext) prompt += `\nContexto Imóvel: ${propertyContext}`;

  if (config.provider === 'ollama') return await callOllamaAPI(config.selectedModel, prompt);
  return await callBackendAI(prompt);
};

export const generateMarketingCaption = async (propertyTitle: string, location: string, price: string, templateType: string): Promise<string> => {
  const config = getAIConfig();
  const prompt = `
      Crie uma legenda curta e engajadora para Instagram/Facebook sobre este imóvel:
      Imóvel: ${propertyTitle}
      Local: ${location}
      Preço: ${price}
      Estilo do Post: ${templateType} (Ex: Vendido, Oportunidade, Luxo)
      Use emojis, hashtags e uma Call to Action (CTA) no final.
  `;

  if (config.provider === 'ollama') return await callOllamaAPI(config.selectedModel, prompt);
  return await callBackendAI(prompt);
};

export const analyzeClientProfile = async (messages: { sender: string, text: string }[]): Promise<any> => {
  const config = getAIConfig();
  const prompt = `
    Analise a conversa e extraia JSON: { "budget": "", "urgency": "", "preferences": [], "sentiment": "", "summary": "" }.
    Conversa: ${messages.map(m => `${m.sender}: ${m.text}`).join('\n')}
  `;

  try {
    let text = "";
    if (config.provider === 'ollama') {
      text = await callOllamaAPI(config.selectedModel, prompt, undefined, true);
    } else {
      text = await callBackendAI(prompt, "Você é um analista de dados. Retorne APENAS JSON.");
    }

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    return jsonMatch ? JSON.parse(jsonMatch[0]) : {};
  } catch (error) {
    return null;
  }
};

// --- FUNÇÃO PRINCIPAL DA AGENTE MANÚ ---
export const fastAgentResponse = async (lastMessage: string, clientName: string, profileSummary: string, session_id: string, persona?: string): Promise<string> => {
  const config = getAIConfig();

  // O Backend agora injeta a "Persona Manú" e a "Base de Conhecimento" automaticamente.
  // Aqui enviamos apenas o contexto específico da sessão atual.
  const prompt = `
  CONTEXTO DO CLIENTE:
  - Nome: ${clientName}
  - Perfil Resumido: ${profileSummary}
  
  ÚLTIMA MENSAGEM DO CLIENTE: "${lastMessage}"
  `;

  // System Prompt simplificado para o Frontend (o Backend adiciona o pesado)
  const systemPrompt = `Você é Manú, corretora da Euimob.`;

  if (config.provider === 'ollama') return await callOllamaAPI(config.selectedModel, prompt);
  return await callBackendAI(prompt, systemPrompt, session_id);
};

// --- FERRAMENTAS ESPECÍFICAS (MAPS, SEARCH) ---

// Funções que dependem de ferramentas complexas (Maps, Voice) mantidas simplificadas ou removidas temporariamente para focar no core
export const askLocationAssistant = async (location: string, queryType: string): Promise<{ text: string, sources: any[] }> => {
  return { text: "Funcionalidade em manutenção para migração de backend.", sources: [] };
};

export const askGlobalAgent = async (message: string, history: any[], session_id?: string): Promise<string> => {
  return await callBackendAI(message, "Você é a IA do Euimob.", session_id);
}

export const askMarketExpert = async (message: string, history: any[], session_id?: string): Promise<string> => {
  const config = getAIConfig();
  const prompt = `Pergunta: ${message}`;
  const systemPrompt = `Você é um Corretor Sênior Especialista. Responda sobre mercado imobiliário com autoridade e clareza.`;

  if (config.provider === 'ollama') return await callOllamaAPI(config.selectedModel, prompt);
  return await callBackendAI(prompt, systemPrompt, session_id);
};

export const processVoiceNote = async (audioTranscription: string): Promise<any> => {
  return {};
}
