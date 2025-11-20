import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

// Helper to convert blob/file to base64
export const fileToGenerativePart = async (file: File): Promise<{inlineData: {data: string, mimeType: string}}> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = (reader.result as string).split(',')[1];
      resolve({
        inlineData: {
          data: base64String,
          mimeType: file.type
        }
      });
    };
    reader.readAsDataURL(file);
  });
};

export const analyzePropertyImage = async (file: File): Promise<{ features: string, description: string }> => {
  if (!apiKey) return { features: "Erro de API Key", description: "Erro de API Key" };

  try {
    const imagePart = await fileToGenerativePart(file);
    
    const prompt = `
      Analise esta imagem de um imóvel imobiliário.
      1. Liste as características visíveis (ex: tipo de piso, iluminação, cômodos, acabamentos).
      2. Crie uma descrição comercial curta e atraente baseada no que você vê.
      
      Retorne APENAS um JSON no seguinte formato (sem markdown):
      {
        "features": "lista de caracteristicas separadas por virgula",
        "description": "texto da descrição"
      }
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [imagePart, { text: prompt }]
      }
    });

    const text = response.text || "{}";
    const cleanJson = text.replace(/```json|```/g, '').trim();
    return JSON.parse(cleanJson);
  } catch (error) {
    console.error("Error analyzing image:", error);
    return { features: "", description: "Não foi possível analisar a imagem." };
  }
};

export const generatePropertyDescription = async (features: string, type: string, location: string): Promise<string> => {
  if (!apiKey) return "Erro: API Key não configurada.";

  try {
    const prompt = `
      Você é um especialista em copywritting imobiliário.
      Crie uma descrição curta, luxuosa e persuasiva para:
      - Tipo: ${type}
      - Local: ${location}
      - Destaques: ${features}

      Use emojis moderados. Foque na experiência de morar lá. Máximo 300 caracteres.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text || "Não foi possível gerar a descrição.";
  } catch (error) {
    return "Erro ao gerar descrição.";
  }
};

export const summarizeConversation = async (messages: {sender: string, text: string}[]): Promise<string> => {
  if (!apiKey) return "";

  try {
    const prompt = `
      Resuma a conversa a seguir em 2 frases curtas para um corretor de imóveis.
      Identifique: 1. O que o cliente procura ou dúvida principal. 2. O status atual (quente, frio, agendado).
      
      Conversa:
      ${messages.map(m => `${m.sender}: ${m.text}`).join('\n')}
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text || "";
  } catch (error) {
    return "Não foi possível resumir.";
  }
};

export const suggestReply = async (
    conversationHistory: string[], 
    tone: 'formal' | 'friendly', 
    propertyContext?: string
): Promise<string> => {
  if (!apiKey) return "Erro: API Key não configurada.";

  try {
    let prompt = `
      Aja como um corretor imobiliário experiente. Sugira uma resposta ${tone === 'formal' ? 'formal' : 'amigável'} para o cliente.
      
      Histórico recente:
      ${conversationHistory.slice(-5).join('\n')}
    `;

    if (propertyContext) {
      prompt += `\n\nContexto do Imóvel que o cliente está vendo: ${propertyContext}\nUse estas informações para responder dúvidas técnicas se houver.`;
    }

    prompt += `\nA resposta deve ser curta, direta e convidar para uma visita.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text || "Erro ao gerar sugestão.";
  } catch (error) {
    return "Erro ao gerar sugestão.";
  }
};

// --- NOVAS FUNÇÕES FLASH AGENT (gemini-2.5-flash-lite) ---

// 1. Analisa o perfil do cliente em alta velocidade
export const analyzeClientProfile = async (messages: {sender: string, text: string}[]): Promise<any> => {
  if (!apiKey) return null;

  try {
    const prompt = `
      Você é um Agente Pessoal de Inteligência Artificial para uma imobiliária.
      Analise a conversa abaixo e extraia o perfil do cliente em formato JSON.
      Se não encontrar a informação, deixe em branco ou null.
      
      Conversa:
      ${messages.map(m => `${m.sender}: ${m.text}`).join('\n')}

      Retorne APENAS JSON:
      {
        "budget": "estimativa de valor ou null",
        "urgency": "Baixa, Média ou Alta",
        "preferences": ["array de strings com o que ele gosta, ex: piscina, varanda"],
        "sentiment": "Positivo, Neutro ou Crítico",
        "summary": "uma frase sobre o perfil comportamental dele"
      }
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-lite', // LITE MODEL for Speed
      contents: prompt,
      config: {
        responseMimeType: "application/json"
      }
    });

    const text = response.text || "{}";
    return JSON.parse(text);
  } catch (error) {
    console.error("Fast Profile Error:", error);
    return null;
  }
};

// 2. Resposta Relâmpago (Flash Reply)
export const fastAgentResponse = async (
    lastMessage: string, 
    clientName: string, 
    profileSummary: string
): Promise<string> => {
  if (!apiKey) return "";

  try {
    const prompt = `
      Você é o assistente pessoal do cliente ${clientName}.
      Perfil do cliente: ${profileSummary}.
      Última mensagem dele: "${lastMessage}".
      
      Gere uma resposta IMEDIATA, curta (max 1 frase) e ultra-personalizada para manter o engajamento.
      Não seja robótico. Aja como um humano digitando rápido.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-lite', // LITE MODEL for Low Latency
      contents: prompt,
    });

    return response.text || "";
  } catch (error) {
    return "";
  }
};


export interface GroundingSource {
  title: string;
  uri: string;
}

export interface LocationResponse {
  text: string;
  sources: GroundingSource[];
}

export const askLocationAssistant = async (location: string, queryType: string): Promise<LocationResponse> => {
  if (!apiKey) return { text: "Erro: API Key ausente", sources: [] };

  try {
    const prompt = `
      O cliente está interessado em um imóvel em: ${location}.
      Como corretor, forneça informações atualizadas sobre: ${queryType} nas proximidades.
      Seja vendedor, cite nomes de lugares reais e destaque pontos positivos da região.
      Mantenha a resposta curta (máximo 3 frases) para enviar no chat.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        tools: [{ googleMaps: {} }],
      }
    });

    const sources: GroundingSource[] = [];
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];

    chunks.forEach((chunk: any) => {
      if (chunk.web?.uri && chunk.web?.title) {
         sources.push({ title: chunk.web.title, uri: chunk.web.uri });
      }
    });

    return {
      text: response.text || "Não encontrei informações sobre essa região no momento.",
      sources: sources
    };

  } catch (error) {
    console.error("Maps Grounding Error:", error);
    return { text: "Erro ao consultar o Google Maps.", sources: [] };
  }
};

// --- AGENTE GLOBAL INSTITUCIONAL ---
export const askGlobalAgent = async (message: string, history: {role: string, text: string}[]): Promise<string> => {
    if (!apiKey) return "Desculpe, estou em manutenção (Sem API Key).";

    try {
        const prompt = `
            Você é a IA Especialista do ImobDesk, uma plataforma SaaS para o mercado imobiliário.
            
            Sua missão é tirar dúvidas de 3 tipos de público:
            1. Clientes Finais: Pessoas procurando imóveis. Explique como o ImobDesk ajuda corretores a atendê-los melhor e mais rápido.
            2. Corretores/Imobiliárias: Explique os recursos técnicos (Inbox Unificado, IA Generativa, Publicação em 50 portais, CRM). Tente vender a plataforma.
            3. Parceiros/Investidores: Fale sobre a tecnologia escalável e inovação com Gemini AI.

            Pergunta atual: "${message}"

            Histórico da conversa:
            ${history.map(h => `${h.role}: ${h.text}`).join('\n')}

            Mantenha um tom profissional, inovador e prestativo. Respostas curtas e diretas (max 3 parágrafos).
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash', // Rápido e inteligente o suficiente para Q&A geral
            contents: prompt
        });

        return response.text || "Desculpe, não entendi. Poderia reformular?";
    } catch (error) {
        console.error("Global Agent Error", error);
        return "Estou com dificuldades de conexão no momento.";
    }
}