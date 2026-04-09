import { Bindings } from '../bindings';
import { circuitBreakers } from '../utils/circuitBreaker';

export interface OpenAIOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface OpenAIResponse {
  choices?: Array<{
    message?: {
      content: string;
    };
  }>;
  error?: {
    message: string;
    code: string;
  };
}

const GPT_4O_MODEL = 'gpt-4o';
const GPT_4O_MINI_MODEL = 'gpt-4o-mini';
const OPENAI_API_BASE = 'https://api.openai.com/v1/chat/completions';

/**
 * Chamada genérica à OpenAI API (GPT-4o) com circuit breaker e tratamento de erro consistente.
 */
export async function callOpenAI(
  apiKey: string,
  prompt: string,
  systemPrompt?: string,
  options: OpenAIOptions = {},
): Promise<string> {
  const model = options.model || GPT_4O_MINI_MODEL;

  const messages: Array<{ role: string; content: string }> = [];

  if (systemPrompt) {
    messages.push({ role: 'system', content: systemPrompt });
  }

  messages.push({ role: 'user', content: prompt });

  const body: Record<string, unknown> = {
    model,
    messages,
    temperature: options.temperature ?? 0.7,
    max_tokens: options.maxTokens,
  };

  // Usa circuit breaker para proteger chamadas à OpenAI
  return circuitBreakers.openai.execute(async () => {
    const response = await fetch(OPENAI_API_BASE, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI API error (${response.status}): ${errorText}`);
    }

    const data: OpenAIResponse = await response.json();

    if (data.error) {
      throw new Error(`OpenAI returned an error: ${data.error.message}`);
    }

    return data.choices?.[0]?.message?.content || '';
  });
}

/**
 * Chamada rápida ao GPT-4o-mini (modelo mais barato e rápido).
 */
export async function callGPT4oMini(
  apiKey: string,
  prompt: string,
  systemPrompt?: string,
): Promise<string> {
  return callOpenAI(apiKey, prompt, systemPrompt, { model: GPT_4O_MINI_MODEL });
}

/**
 * Chamada ao GPT-4o para tarefas mais complexas.
 */
export async function callGPT4o(
  apiKey: string,
  prompt: string,
  systemPrompt?: string,
): Promise<string> {
  return callOpenAI(apiKey, prompt, systemPrompt, { model: GPT_4O_MODEL });
}

/**
 * Analisa dados de um cliente (CRM) e retorna score + resumo.
 */
export async function analyzeClientData(
  env: Pick<Bindings, 'OPENAI_API_KEY'>,
  conversation: string,
): Promise<{ score: number; summary: string }> {
  const prompt =
    'Analise a seguinte conversa entre um corretor (ou IA) e um cliente imobiliário.\n\n' +
    'CONVERSA:\n' +
    conversation +
    '\n\n' +
    'TAREFA:\n' +
    '1. Atribua uma nota de 0 a 100 para a probabilidade de compra deste cliente (Lead Score).\n' +
    '2. Escreva um resumo curto (max 2 frases) sobre o perfil e urgência dele.\n\n' +
    'SAÍDA JSON (apenas JSON):\n' +
    '{ "score": 85, "summary": "Cliente busca 3 quartos urgente, tem crédito aprovado." }';

  const text = await callGPT4oMini(env.OPENAI_API_KEY, prompt);
  const jsonStr = text
    .replace(/```json/g, '')
    .replace(/```/g, '')
    .trim();

  return JSON.parse(jsonStr) as { score: number; summary: string };
}

/**
 * Gera descrição vendedora para um imóvel.
 */
export async function generatePropertyDescription(
  env: Pick<Bindings, 'OPENAI_API_KEY'>,
  property: { features?: unknown; type?: string; location?: string },
): Promise<string> {
  const prompt =
    'Crie uma descrição vendedora e atraente para um anúncio de imóvel (Zap Imóveis / OLX).\n\n' +
    'DADOS DO IMÓVEL:\n' +
    '- Tipo: ' +
    (property.type || '') +
    '\n' +
    '- Localização: ' +
    (property.location || '') +
    '\n' +
    '- Detalhes: ' +
    JSON.stringify(property.features || {}) +
    '\n\n' +
    'REGRAS:\n' +
    '- Use emojis.\n' +
    '- Destaque os pontos fortes.\n' +
    '- Use gatilhos de escassez ("Últimas unidades", "Oportunidade").\n' +
    '- Chamada para ação no final (Agendar visita).\n' +
    '- Formato: Título chamativo + Corpo do texto.';

  return callGPT4oMini(env.OPENAI_API_KEY, prompt);
}

/**
 * Executa match semântico entre imóvel e leads candidatos.
 * Retorna array de IDs dos leads com alta probabilidade de interesse.
 */
export async function matchProperties(
  env: Pick<Bindings, 'OPENAI_API_KEY'>,
  property: Record<string, unknown>,
  candidates: Array<{ id: string; name: string; summary: string }>,
): Promise<string[]> {
  const prompt = `
    You are a Real Estate Matchmaker.

    NEW PROPERTY:
    Title: ${property.title}
    Type: ${property.listing_type}
    Location: ${property.location}
    Price: ${property.price}
    Features: ${JSON.stringify(property.features)}
    Description: ${property.description}

    CANDIDATE LEADS:
    ${JSON.stringify(candidates)}

    TASK:
    Identify which leads have a HIGH probability of being interested in this property based on their summary/preferences.
    Ignore leads that clearly want something else (e.g. want Rent but property is Sale).

    OUTPUT:
    Return ONLY a JSON array of IDs of matching leads. Example: ["id1", "id3"].
    If no matches, return [].
  `;

  const text = await callGPT4oMini(env.OPENAI_API_KEY, prompt);
  const jsonStr = text
    .replace(/```json/g, '')
    .replace(/```/g, '')
    .trim();

  return JSON.parse(jsonStr) as string[];
}
