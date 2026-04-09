import { Bindings } from '../bindings';
import { createDatadogLogger } from '../utils/datadog';
import { matchProperties } from './aiService';
import { formatWhatsAppJid } from '../utils/whatsapp';

interface MatchCandidate {
  id: string;
  name: string;
  ai_summary: string;
  phone: string;
}

export async function findMatches(
  env: Bindings,
  property: any,
  tenantId: string,
  agentPhone: string | null,
) {
  const logger = createDatadogLogger(env);

  if (!agentPhone) {
    await logger?.warn('Match Reverso skipped: Agent has no phone number.', { tenantId });
    return;
  }

  try {
    // 1. SQL Filter (Budget check + Limit)
    // "budget IS NULL OR budget >= price" - lenient check
    // Limit to 20 most recent active leads
    const candidates = await env.DB.prepare(
      `
        SELECT id, name, ai_summary, phone 
        FROM clients 
        WHERE tenant_id = ? 
          AND status IN ('Novo', 'Em Atendimento')
          AND (budget IS NULL OR budget >= ?)
        ORDER BY created_at DESC
        LIMIT 20
    `,
    )
      .bind(tenantId, property.price || 0)
      .all<MatchCandidate>();

    if (candidates.results.length === 0) {
      return;
    }

    // 2. AI Semantic Match via aiService
    const candidateData = candidates.results.map((c) => ({
      id: c.id,
      name: c.name,
      summary: c.ai_summary,
    }));

    const matchIds = await matchProperties(env, property, candidateData);

    if (matchIds.length === 0) return;

    // 3. Filter full objects
    const matches = candidates.results.filter((c) => matchIds.includes(c.id));

    // 4. Notify Agent via WhatsApp
    const matchNames = matches.map((m) => m.name).join(', ');
    const message =
      `🔥 *Match Reverso Encontrado!* 🔥\n\n` +
      `🏠 Imóvel: *${property.title}*\n` +
      `💰 Preço: R$ ${property.price}\n\n` +
      `Encontramos ${matches.length} leads interessados na sua base:\n` +
      `👥 *${matchNames}*\n\n` +
      `👉 Abra o CRM e aborde-os agora!`;

    const instanceName = `tenant_${tenantId}`;
    const evolutionUrl = `${env.EVOLUTION_API_URL}/message/sendText/${instanceName}`;
    const formattedPhone = formatWhatsAppJid(agentPhone);

    await fetch(evolutionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: env.EVOLUTION_API_KEY as string,
      },
      body: JSON.stringify({
        number: formattedPhone,
        text: message,
      }),
    });

    await logger?.info(`Match Reverso sent to agent`, { matches: matches.length });
  } catch (error: any) {
    await logger?.error('Error in Match Reverso', { error: error.message });
  }
}
