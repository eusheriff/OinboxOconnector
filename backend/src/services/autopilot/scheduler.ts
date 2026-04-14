import { Bindings } from '../../bindings';
import { ExecutionContext } from '@cloudflare/workers-types';
import { createDatadogLogger } from '../../utils/datadog';
import { sendWhatsAppMessage } from '../../services/whatsappService';
import { SalesTools } from '../salesTools';

export async function runAutopilot(env: Bindings, ctx: ExecutionContext) {
  const logger = createDatadogLogger(env);

  try {
    // 1. Ingest New Qualified Leads into Active Campaigns
    // ---------------------------------------------------
    // Busca leads qualificados que ainda não estão em nenhuma campanha
    // E adiciona na campanha "Padrão" (se houver apenas uma ativa)
    const newLeads = await env.DB.prepare(
      `
        SELECT l.id, l.status 
        FROM leads l
        LEFT JOIN campaign_leads cl ON l.id = cl.lead_id
        WHERE l.status = 'qualified' 
        AND cl.id IS NULL
        LIMIT 50
    `,
    ).all<{ id: string }>();

    if (newLeads.results.length > 0) {
      // Buscar campanha ativa (MVP: Pega a primeira ativa do tipo outreach)
      const campaign = await env.DB.prepare(
        "SELECT id FROM campaigns WHERE status = 'active' LIMIT 1",
      ).first<{ id: string }>();

      if (campaign) {
        const stmt = env.DB.prepare(`
                INSERT INTO campaign_leads (id, campaign_id, lead_id, current_step, status, next_action_at)
                VALUES (?, ?, ?, 0, 'pending', CURRENT_TIMESTAMP)
            `);

        const batch = newLeads.results.map((l: { id: string }) =>
          stmt.bind(crypto.randomUUID(), campaign.id, l.id),
        );

        if (batch.length > 0) {
          await (env.DB as unknown as D1Database).batch(batch as any);
        }
        await logger?.info(
          `[Autopilot] Added ${newLeads.results.length} leads to campaign ${campaign.id}`,
        );
      }
    }

    // 2. Process Pending Actions (Queue)
    // ----------------------------------
    // Busca leads que estão "pending" e cuja hora de ação já chegou (next_action_at <= NOW)
    const pendingActions = await env.DB.prepare(
      `
        SELECT cl.*, l.phone, l.name, l.ai_pitch, l.tenant_id, c.settings
        FROM campaign_leads cl
        JOIN leads l ON cl.lead_id = l.id
        JOIN campaigns c ON cl.campaign_id = c.id
        WHERE cl.status IN ('pending', 'active')
        AND cl.next_action_at <= CURRENT_TIMESTAMP
        LIMIT 20
    `,
    ).all<any>();

    for (const action of pendingActions.results) {
      try {
        await processAction(env, action, logger);
      } catch (err) {
        console.error(`Failed to process action for lead ${action.lead_id}`, err);
        // Marcar como erro para não travar a fila
        await env.DB.prepare(
          "UPDATE campaign_leads SET status = 'failed', error_log = ? WHERE id = ?",
        )
          .bind(String(err), action.id)
          .run();
      }
    }
  } catch (error) {
    await logger?.error('[Autopilot] Critical Failure', { error });
  }
}

async function processAction(env: Bindings, item: any, logger: any) {
  const AGENT_HUB_URL = 'https://agent-hub.oconnector.tech/api/skill/generate-pitch';

  // Configuração da campanha (Simples para MVP)

  // Instantiate SalesTools
  const salesTools = new SalesTools(env);

  // Configuração da campanha (Simples para MVP)
  let messageToSend = '';
  const nextStep = item.current_step + 1;
  let nextActionDelay = 0; // horas

  if (item.current_step === 0) {
    // Step 0: Pitch Inicial
    messageToSend = item.ai_pitch || '';

    // Se não tiver pitch salvo, gera agora
    if (!messageToSend) {
      try {
        messageToSend = await salesTools.generatePitch(item.name, 'Sua Empresa', {
          phone: item.phone,
        });
      } catch (e) {
        console.error('Failed to generate pitch', e);
      }

      // Fallback final
      if (!messageToSend) messageToSend = `Olá ${item.name}, tudo bem?`;
    }

    nextActionDelay = 24; // Follow up amanhã
  } else if (item.current_step === 1) {
    // Step 1: Follow up
    messageToSend = `Oi ${item.name}, conseguiu ver minha mensagem anterior?`;
    nextActionDelay = 48; // Próximo em 2 dias
  } else {
    // Fim da linha
    await env.DB.prepare("UPDATE campaign_leads SET status = 'completed' WHERE id = ?")
      .bind(item.id)
      .run();
    return;
  }

  if (!messageToSend) return;

  logger?.info(`[AUTOPILOT SEND] To: ${item.phone} | Msg: ${messageToSend}`);

  // ... Verificações de horário ...
  const hour = new Date().getHours();
  if (hour < 9 || hour > 19) {
    // Reagendar para amanhã às 10h
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(10, 0, 0, 0);
    await env.DB.prepare('UPDATE campaign_leads SET next_action_at = ? WHERE id = ?')
      .bind(tomorrow.toISOString(), item.id)
      .run();
    return;
  }

  // Default to 'default' tenant if null, but try to use item.tenant_id
  const tenantId = item.tenant_id || 'default';

  // Enviar mensagem
  try {
    await sendWhatsAppMessage(env, tenantId, item.phone, messageToSend);
  } catch (error) {
    logger?.error('[AUTOPILOT] Failed to send', { error });
    return; // Não avança passo se falhar
  }

  // Atualizar estado
  const nextActionDate = new Date();
  nextActionDate.setHours(nextActionDate.getHours() + nextActionDelay);

  // Registra envio
  await env.DB.prepare(
    `
        INSERT INTO campaign_messages (id, campaign_id, lead_id, step, content, status) VALUES (?, ?, ?, ?, ?, 'sent')
    `,
  )
    .bind(crypto.randomUUID(), item.campaign_id, item.lead_id, item.current_step, messageToSend)
    .run();

  // Avança passo
  await env.DB.prepare(
    `
        UPDATE campaign_leads SET current_step = ?, next_action_at = ? WHERE id = ?
    `,
  )
    .bind(nextStep, nextActionDate.toISOString(), item.id)
    .run();

  // Mover Lead no Kanban CRM
  if (item.current_step === 0) {
    await env.DB.prepare(
      "UPDATE leads SET status = 'contacted', contacted_at = CURRENT_TIMESTAMP WHERE id = ?",
    )
      .bind(item.lead_id)
      .run();
  }
}
