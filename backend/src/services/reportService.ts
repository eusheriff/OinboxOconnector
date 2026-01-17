import { Bindings } from '../types';
import { createDatadogLogger } from '../utils/datadog';

// Interface for report data
interface PropertyStats {
  property_id: string;
  title: string;
  owner_name: string;
  owner_phone: string;
  total_views: number;
  total_leads: number;
}

export async function generateWeeklyReport(env: Bindings, tenantId: string) {
  const logger = createDatadogLogger(env);
  
  // Calculate date range (last 7 days)
  const today = new Date();
  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(today.getDate() - 7);
  
  const dateStr = sevenDaysAgo.toISOString().split('T')[0];

  try {
    // Check if tenant has Evolution API configured (can't send WhatsApp without it)
    if (!env.EVOLUTION_API_URL || !env.EVOLUTION_API_KEY) {
        await logger?.warn(`Evolution API not configured for reporting. Tenant: ${tenantId}`);
        return;
    }

    // 1. Fetch properties with stats for the last 7 days AND valid owner phone
    // We aggregate daily stats
    const query = `
      SELECT 
        p.id as property_id,
        p.title,
        p.owner_name,
        p.owner_phone,
        COALESCE(SUM(s.views), 0) as total_views,
        COALESCE(SUM(s.leads_count), 0) as total_leads
      FROM properties p
      LEFT JOIN property_daily_stats s ON p.id = s.property_id
      WHERE p.tenant_id = ?
        AND p.owner_phone IS NOT NULL
        AND p.owner_phone != ''
        AND s.date >= ?
      GROUP BY p.id
      HAVING total_views > 0 OR total_leads > 0 -- Only report if there's activity? Maybe report anyway to show "no activity"? 
                                                -- Let's report anyway if requested, but for now only active ones to save cost/spam.
                                                -- Actually, owners want to know even if 0. 
                                                -- BUT query does LEFT JOIN, so if no stats, sums are 0 or null.
      -- Re-thinking: If no stats for 7 days, they might not be in daily_stats table.
      -- Let's query all properties and left join the sum.
    `;
    
    // Improved query to get all properties and stats (even if 0)
    // Filter by having owner_phone
    const statsQuery = `
        SELECT 
            p.id as property_id,
            p.title,
            p.owner_name,
            p.owner_phone,
            (SELECT COALESCE(SUM(views), 0) FROM property_daily_stats WHERE property_id = p.id AND date >= ?) as total_views,
            (SELECT COALESCE(SUM(leads_count), 0) FROM property_daily_stats WHERE property_id = p.id AND date >= ?) as total_leads
        FROM properties p
        WHERE p.tenant_id = ? 
          AND p.owner_phone IS NOT NULL 
          AND p.owner_phone != ''
    `;

    const result = await env.DB.prepare(statsQuery)
      .bind(dateStr, dateStr, tenantId)
      .all<PropertyStats>();

    const properties = result.results;

    if (properties.length === 0) {
        await logger?.info(`No properties with owners found for tenant ${tenantId}`);
        return;
    }

    // 2. Initialise WhatsApp instance helper (simplified version of whatsapp.ts logic)
    const instanceName = `tenant_${tenantId}`;
    const evolutionUrl = `${env.EVOLUTION_API_URL}/message/sendText/${instanceName}`;

    // 3. Loop and send (Rate limit consideration: simple loop for MVP)
    for (const prop of properties) {
        const message = `Olá ${prop.owner_name || 'Proprietário'}, aqui é da sua imobiliária.\n\n` +
                        `📊 *Relatório Semanal do seu Imóvel:*\n` +
                        `🏠 *${prop.title}*\n\n` +
                        `👀 Visualizações: ${prop.total_views}\n` +
                        `🤝 Interessados (Leads): ${prop.total_leads}\n\n` +
                        `Estamos trabalhando para vender/alugar seu imóvel! 🚀\n` +
                        `Bom fim de semana!`;

        // Send via Evolution API
        const formattedPhone = prop.owner_phone.replace(/\D/g, '') + '@s.whatsapp.net';
        
        await fetch(evolutionUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': env.EVOLUTION_API_KEY
            },
            body: JSON.stringify({
                number: formattedPhone,
                text: message
            })
        });

        // Update last_report_sent_at
        await env.DB.prepare('UPDATE properties SET last_report_sent_at = CURRENT_TIMESTAMP WHERE id = ?')
            .bind(prop.property_id)
            .run();
        
        // Small delay to be gentle
        await new Promise(r => setTimeout(r, 500));
    }

    await logger?.info(`Sent weekly reports for ${properties.length} properties in tenant ${tenantId}`);

  } catch (error: any) {
    await logger?.error('Error generating weekly report', { error: error.message, tenantId });
  }
}
