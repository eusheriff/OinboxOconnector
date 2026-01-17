import { Bindings } from '../types';
import { createDatadogLogger } from '../utils/datadog';
import { runAgent } from './agentService'; // Re-use agent logic for matching? Or direct calling? 
// Direct calling is better for specific task.

interface MatchCandidate {
    id: string;
    name: string;
    ai_summary: string;
    phone: string;
}

export async function findMatches(env: Bindings, property: any, tenantId: string, agentPhone: string | null) {
  const logger = createDatadogLogger(env);

  if (!agentPhone) {
      await logger?.warn('Match Reverso skipped: Agent has no phone number.', { tenantId });
      return;
  }

  try {
    // 1. SQL Filter (Budget check + Limit)
    // "budget IS NULL OR budget >= price" - lenient check
    // Limit to 20 most recent active leads
    const candidates = await env.DB.prepare(`
        SELECT id, name, ai_summary, phone 
        FROM clients 
        WHERE tenant_id = ? 
          AND status IN ('Novo', 'Em Atendimento')
          AND (budget IS NULL OR budget >= ?)
        ORDER BY created_at DESC
        LIMIT 20
    `)
    .bind(tenantId, property.price || 0)
    .all<MatchCandidate>();

    if (candidates.results.length === 0) {
        return;
    }

    // 2. AI Semantic Match
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
        ${JSON.stringify(candidates.results.map(c => ({ id: c.id, name: c.name, summary: c.ai_summary })))}

        TASK:
        Identify which leads have a HIGH probability of being interested in this property based on their summary/preferences.
        Ignore leads that clearly want something else (e.g. want Rent but property is Sale).
        
        OUTPUT:
        Return ONLY a JSON array of IDs of matching leads. Example: ["id1", "id3"].
        If no matches, return [].
    `;

    const apiKey = env.API_KEY; // Gemini Key
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    
    const response = await fetch(geminiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }]
        })
    });
    
    const data: any = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    // Clean and parse JSON
    const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const matchIds: string[] = JSON.parse(jsonStr);

    if (matchIds.length === 0) return;

    // 3. Filter full objects
    const matches = candidates.results.filter(c => matchIds.includes(c.id));

    // 4. Notify Agent via WhatsApp
    const matchNames = matches.map(m => m.name).join(', ');
    const message = `🔥 *Match Reverso Encontrado!* 🔥\n\n` +
                    `🏠 Imóvel: *${property.title}*\n` +
                    `💰 Preço: R$ ${property.price}\n\n` +
                    `Encontramos ${matches.length} leads interessados na sua base:\n` +
                    `👥 *${matchNames}*\n\n` +
                    `👉 Abra o CRM e aborde-os agora!`;

    const instanceName = `tenant_${tenantId}`;
    const evolutionUrl = `${env.EVOLUTION_API_URL}/message/sendText/${instanceName}`;
    const formattedPhone = agentPhone.replace(/\D/g, '') + '@s.whatsapp.net';

    await fetch(evolutionUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'apikey': env.EVOLUTION_API_KEY as string
        },
        body: JSON.stringify({
            number: formattedPhone,
            text: message
        })
    });

    await logger?.info(`Match Reverso sent to agent`, { matches: matches.length });

  } catch (error: any) {
    await logger?.error('Error in Match Reverso', { error: error.message });
  }
}
