
import { GoogleGenAI } from "@google/genai";
import { AIConfig } from "../types";

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

// Helper seguro para API Key do Gemini
const getApiKey = () => {
  // @ts-ignore
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_KEY) {
    // @ts-ignore
    return import.meta.env.VITE_API_KEY;
  }
  if (typeof process !== 'undefined' && process.env && process.env.API_KEY) {
    return process.env.API_KEY;
  }
  return '';
};

const API_KEY = getApiKey();
const ai = new GoogleGenAI({ apiKey: API_KEY });

// Export GroundingSource interface for use in components
export interface GroundingSource {
  title: string;
  uri: string;
}

// --- OLLAMA API CLIENT ---
const callOllamaAPI = async (model: string, prompt: string, imageBase64?: string, jsonMode: boolean = false) => {
  const config = getAIConfig();
  
  try {
    const messages: any[] = [{ role: "user", content: prompt }];
    
    // Se houver imagem, adiciona ao payload (Ollama suporta array de imagens)
    if (imageBase64) {
      messages[0].images = [imageBase64];
    }

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
    return data.message?.content || "";

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
      // Remove header data:image/png;base64, para ficar apenas a string
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
      // Usa modelo de visão local (qwen3-vl ou llava)
      text = await callOllamaAPI(config.visionModel || 'qwen3-vl:8b', prompt, base64, true);
    } else {
      // Usa Gemini
      if (!API_KEY) return { features: "Erro: API Key", description: "Configure Gemini." };
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts: [{ inlineData: { data: base64, mimeType: file.type } }, { text: prompt }] }
      });
      text = response.text || "{}";
    }

    const cleanJson = text.replace(/```json|```/g, '').trim();
    return JSON.parse(cleanJson);
  } catch (error) {
    console.error("Image Analysis Error:", error);
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

  if (config.provider === 'ollama') {
    return await callOllamaAPI(config.selectedModel, prompt);
  }

  if (!API_KEY) return "Erro: API Key ausente.";
  const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
  return response.text || "Erro.";
};

export const summarizeConversation = async (messages: {sender: string, text: string}[]): Promise<string> => {
  const config = getAIConfig();
  const prompt = `
      Resuma esta conversa imobiliária em 2 frases. Identifique o interesse e status.
      Conversa: ${messages.map(m => `${m.sender}: ${m.text}`).join('\n')}
  `;

  if (config.provider === 'ollama') {
    return await callOllamaAPI(config.selectedModel, prompt);
  }

  if (!API_KEY) return "";
  const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
  return response.text || "";
};

export const suggestReply = async (
    conversationHistory: string[], 
    tone: 'formal' | 'friendly', 
    propertyContext?: string
): Promise<string> => {
  const config = getAIConfig();
  let prompt = `Aja como um corretor. Sugira resposta ${tone} e curta. Histórico: ${conversationHistory.slice(-5).join('\n')}`;
  if (propertyContext) prompt += `\nContexto Imóvel: ${propertyContext}`;

  if (config.provider === 'ollama') {
    return await callOllamaAPI(config.selectedModel, prompt);
  }

  if (!API_KEY) return "Erro Config.";
  const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
  return response.text || "Erro.";
};

export const analyzeClientProfile = async (messages: {sender: string, text: string}[]): Promise<any> => {
  const config = getAIConfig();
  const prompt = `
    Analise a conversa e extraia JSON: { "budget": "", "urgency": "", "preferences": [], "sentiment": "", "summary": "" }.
    Conversa: ${messages.map(m => `${m.sender}: ${m.text}`).join('\n')}
  `;

  try {
    let text = "";
    if (config.provider === 'ollama') {
      // Se tiver deepseek-r1, é melhor para raciocínio, senão usa o padrão
      const model = config.selectedModel.includes('deepseek') ? config.selectedModel : 'llama3.1:8b';
      text = await callOllamaAPI(model, prompt, undefined, true);
    } else {
      if (!API_KEY) return null;
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-lite',
        contents: prompt,
        config: { responseMimeType: "application/json" }
      });
      text = response.text || "{}";
    }
    
    // Limpeza extra para Ollama que às vezes manda texto antes do JSON
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    return jsonMatch ? JSON.parse(jsonMatch[0]) : {};
  } catch (error) {
    return null;
  }
};

export const fastAgentResponse = async (lastMessage: string, clientName: string, profileSummary: string): Promise<string> => {
  const config = getAIConfig();
  const prompt = `Você é assistente pessoal de ${clientName}. Perfil: ${profileSummary}. Msg dele: "${lastMessage}". Responda curto e rápido (max 1 frase).`;

  if (config.provider === 'ollama') {
    return await callOllamaAPI(config.selectedModel, prompt);
  }

  if (!API_KEY) return "";
  const response = await ai.models.generateContent({ model: 'gemini-2.5-flash-lite', contents: prompt });
  return response.text || "";
};

// --- FERRAMENTAS ESPECÍFICAS (MAPS, SEARCH) ---
// Estas permanecem no Gemini pois Ollama não tem ferramentas de busca nativas integradas facilmente via API REST padrão sem plugins.
// Se estiver em modo Ollama, retornamos um aviso ou fallback textual.

export const askLocationAssistant = async (location: string, queryType: string): Promise<{text: string, sources: GroundingSource[]}> => {
  const config = getAIConfig();
  
  if (config.provider === 'ollama') {
     // Fallback sem Google Maps
     const prompt = `Liste pontos de interesse genéricos sobre ${queryType} em ${location}. (Modo Offline/Local)`;
     const text = await callOllamaAPI(config.selectedModel, prompt);
     return { text, sources: [] };
  }

  if (!API_KEY) return { text: "Erro: API Key", sources: [] };
  
  // Mantém implementação Gemini original com Tools
  try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Info sobre ${queryType} em ${location}.`,
        config: { tools: [{ googleMaps: {} }] }
      });
      
      let sources: GroundingSource[] = [];
      const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
      
      if (groundingChunks) {
         groundingChunks.forEach((chunk: any) => {
             if (chunk.web?.uri) {
                 sources.push({ title: chunk.web.title || 'Fonte Web', uri: chunk.web.uri });
             }
             if (chunk.maps?.uri) {
                  sources.push({ title: chunk.maps.title || 'Google Maps', uri: chunk.maps.uri });
             }
         });
      }

      return { text: response.text || "", sources }; 
  } catch(e) { return { text: "Erro", sources: [] } }
};

export const askGlobalAgent = async (message: string, history: any[]): Promise<string> => {
    const config = getAIConfig();
    const prompt = `Você é a IA do OConnector. Responda dúvidas sobre a plataforma imobiliária. Msg: ${message}`;
    
    if (config.provider === 'ollama') {
        return await callOllamaAPI(config.selectedModel, prompt);
    }
    if (!API_KEY) return "Erro.";
    const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
    return response.text || "";
}

export const askMarketExpert = async (message: string, history: any[]): Promise<string> => {
    const config = getAIConfig();
    const prompt = `Você é um Corretor Sênior Especialista. Responda sobre mercado imobiliário. Pergunta: ${message}`;
    
    if (config.provider === 'ollama') {
        // Deepseek R1 é excelente para especialistas
        const model = config.selectedModel.includes('deepseek') ? 'deepseek-r1:7b' : config.selectedModel;
        return await callOllamaAPI(model, prompt);
    }
    
    if (!API_KEY) return "Erro.";
    const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
    return response.text || "";
};

export const processVoiceNote = async (audioTranscription: string): Promise<any> => {
    const config = getAIConfig();
    const prompt = `Extraia JSON do texto: "${audioTranscription}". Formato: { "summary": "", "actionItem": "", "clientMood": "", "budgetUpdate": "" }`;

    try {
        let text = "";
        if (config.provider === 'ollama') {
             text = await callOllamaAPI(config.selectedModel, prompt, undefined, true);
        } else {
             if (!API_KEY) return null;
             const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
                config: { responseMimeType: "application/json" }
            });
            text = response.text || "{}";
        }
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        return jsonMatch ? JSON.parse(jsonMatch[0]) : {};
    } catch (e) { return null; }
}
