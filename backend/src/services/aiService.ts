import { Bindings } from '../bindings';

export interface OllamaOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  imageBase64?: string;
  jsonMode?: boolean;
}

export interface OllamaResponse {
  message?: {
    content: string;
  };
  error?: string;
}

// Modelo default: Gemma 4 via Ollama
const DEFAULT_MODEL = 'gemma4:e2b';
const DEFAULT_OLLAMA_URL = 'http://localhost:11434';

/**
 * Chamada genérica ao Ollama API com tratamento de erro.
 */
export async function callOllama(
  ollamaUrl: string,
  prompt: string,
  systemPrompt?: string,
  options: OllamaOptions = {},
): Promise<string> {
  const model = options.model || DEFAULT_MODEL;
  const messages: Array<{ role: string; content: string; images?: string[] }> = [];

  if (systemPrompt) {
    messages.push({ role: 'system', content: systemPrompt });
  }

  const userMessage: { role: string; content: string; images?: string[] } = {
    role: 'user',
    content: prompt,
  };

  if (options.imageBase64) {
    userMessage.images = [options.imageBase64];
  }

  messages.push(userMessage);

  const body: Record<string, unknown> = {
    model,
    messages,
    stream: false,
    ...(options.jsonMode ? { format: 'json' } : {}),
    options: {
      temperature: options.temperature ?? 0.7,
      ...(options.maxTokens ? { num_predict: options.maxTokens } : {}),
    },
  };

  const response = await fetch(`${ollamaUrl}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Ollama API error (${response.status}): ${errorText}`);
  }

  const data: OllamaResponse = await response.json();

  if (data.error) {
    throw new Error(`Ollama returned an error: ${data.error}`);
  }

  return data.message?.content || '';
}

/**
 * Chamada rápida ao modelo default (gemma4:e2b).
 */
export async function callGemma(
  ollamaUrl: string,
  prompt: string,
  systemPrompt?: string,
): Promise<string> {
  return callOllama(ollamaUrl, prompt, systemPrompt);
}

/**
 * Analisa dados de um cliente (CRM) e retorna score + resumo.
 */
export async function analyzeClientData(
  env: Pick<Bindings, 'OLLAMA_URL' | 'OLLAMA_MODEL'>,
  conversation: string,
): Promise<{ score: number; summary: string }> {
  const ollamaUrl = env.OLLAMA_URL || DEFAULT_OLLAMA_URL;
  const model = env.OLLAMA_MODEL || DEFAULT_MODEL;

  const prompt =
    'Analise a seguinte conversa entre um corretor (ou IA) e um cliente imobiliário.\n\n' +
    'CONVERSA:\n' +
    conversation +
    '\n\n' +
    'TAREFA:\n' +
    '1. Atribua uma nota de 0 a 100 para a probabilidade de compra deste cliente (Lead Score).\n' +
    '2. Escreva um resumo curto (max 2 frases) sobre o perfil e urgência dele.\n\n' +
    'SAÍDA JSON (apenas JSON, sem markdown):\n' +
    '{ "score": 85, "summary": "Cliente busca 3 quartos urgente, tem crédito aprovado." }';

  const text = await callOllama(ollamaUrl, prompt, undefined, { model, jsonMode: true });
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
  env: Pick<Bindings, 'OLLAMA_URL' | 'OLLAMA_MODEL'>,
  property: { features?: unknown; type?: string; location?: string },
): Promise<string> {
  const ollamaUrl = env.OLLAMA_URL || DEFAULT_OLLAMA_URL;
  const model = env.OLLAMA_MODEL || DEFAULT_MODEL;

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

  return callOllama(ollamaUrl, prompt, undefined, { model });
}

/**
 * Executa match semântico entre imóvel e leads candidatos.
 * Retorna array de IDs dos leads com alta probabilidade de interesse.
 */
export async function matchProperties(
  env: Pick<Bindings, 'OLLAMA_URL' | 'OLLAMA_MODEL'>,
  property: Record<string, unknown>,
  candidates: Array<{ id: string; name: string; summary: string }>,
): Promise<string[]> {
  const ollamaUrl = env.OLLAMA_URL || DEFAULT_OLLAMA_URL;
  const model = env.OLLAMA_MODEL || DEFAULT_MODEL;

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

  const text = await callOllama(ollamaUrl, prompt, undefined, { model, jsonMode: true });
  const jsonStr = text
    .replace(/```json/g, '')
    .replace(/```/g, '')
    .trim();

  return JSON.parse(jsonStr) as string[];
}
