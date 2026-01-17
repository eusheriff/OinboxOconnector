import { GoogleGenerativeAI } from '@google/generative-ai';

export const generateSalesPitch = async (apiKey: string, lead: { name: string; rating?: number; address?: string }) => {
  if (!apiKey) throw new Error('Gemini API Key missing');

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

  const prompt = `
    Você é um SDR (Sales Development Representative) sênior da OInbox (uma plataforma SaaS que centraliza WhatsApp, Instagram e Chatbot para imobiliárias).
    
    Seu objetivo: Escrever uma mensagem de abordagem fria (Cold Message) para o WhatsApp desta imobiliária.
    
    Dados do Lead:
    - Nome: ${lead.name}
    - Avaliação Google: ${lead.rating || 'N/A'}
    - Endereço: ${lead.address || 'Local'}
    
    Regras:
    1. Seja extremamente curto (máximo 300 caracteres).
    2. Use um tom profissional mas convidativo. Use 1 unico emoji.
    3. Se o rating for alto (> 4.5), elogie a reputação. Se for baixo ou N/A, foque em "não perder leads".
    4. A Call to Action (CTA) deve ser "Posso te mandar um vídeo rápido explicando?"
    5. Não invente dados.
    
    Gere apenas o texto da mensagem.
  `;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    return `Olá ${lead.name}, vi que vocês são destaque na região. Gostaria de apresentar o OInbox para otimizar seu atendimento WhatsApp. Posso enviar um vídeo?`;
  }
};
