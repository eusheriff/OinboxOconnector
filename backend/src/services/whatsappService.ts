import { Bindings } from '../bindings';
import { formatWhatsAppJid } from '../utils/whatsapp';
import { circuitBreakers } from '../utils/circuitBreaker';

export const evolutionFetch = async (
  env: Bindings,
  endpoint: string,
  options: RequestInit = {},
) => {
  if (!env.EVOLUTION_API_URL || !env.EVOLUTION_API_KEY) {
    throw new Error('Evolution API not configured');
  }
  const url = `${env.EVOLUTION_API_URL}${endpoint}`;
  const apiKey = env.EVOLUTION_API_KEY;

  // Usa circuit breaker para proteger chamadas ao WhatsApp
  return circuitBreakers.whatsapp.execute(async () => {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        apikey: apiKey,
        ...options.headers,
      },
    });
    return response;
  });
};

export const sendWhatsAppMessage = async (
  env: Bindings,
  tenantId: string,
  number: string,
  text: string,
) => {
  const instanceName = `tenant_${tenantId}`;

  // Format number using utility
  const formattedNumber = formatWhatsAppJid(number);

  return await evolutionFetch(env, `/message/sendText/${instanceName}`, {
    method: 'POST',
    body: JSON.stringify({
      number: formattedNumber,
      text: text,
    }),
  });
};
