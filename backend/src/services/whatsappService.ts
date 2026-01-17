
import { Bindings } from '../types';

export const evolutionFetch = async (env: Bindings, endpoint: string, options: RequestInit = {}) => {
  if (!env.EVOLUTION_API_URL || !env.EVOLUTION_API_KEY) {
    throw new Error('Evolution API not configured');
  }
  const url = `${env.EVOLUTION_API_URL}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      apikey: env.EVOLUTION_API_KEY,
      ...options.headers,
    },
  });
  return response;
};

export const sendWhatsAppMessage = async (
  env: Bindings,
  tenantId: string,
  number: string,
  text: string
) => {
  const instanceName = `tenant_${tenantId}`;
  
  // Format number (simple version, assume BR)
  // Ensure we don't double append @s.whatsapp.net if already there
  let formattedNumber = number.replace(/\D/g, ''); 
  if (!formattedNumber.includes('@s.whatsapp.net')) {
      formattedNumber += '@s.whatsapp.net';
  }

  return await evolutionFetch(env, `/message/sendText/${instanceName}`, {
    method: 'POST',
    body: JSON.stringify({
      number: formattedNumber,
      text: text,
    }),
  });
};
