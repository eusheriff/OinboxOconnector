import { Hono } from 'hono';
import { Bindings, Variables } from '../bindings';
import { superAuthMiddleware } from '../middleware/auth';
import { formatWhatsAppJid } from '../utils/whatsapp';

const evolution = new Hono<{ Bindings: Bindings; Variables: Variables }>();

/**
 * Processa mensagens restantes com delay via scheduler assíncrono.
 * Substitui o setTimeout não confiável em Cloudflare Workers.
 */
async function processDelayedMessages(
  env: Bindings,
  instanceName: string,
  messages: Array<{
    id: string;
    lead_id: string;
    message_content: string;
    phone: string;
    lead_name: string;
  }>,
  delaySeconds: number,
  initialSent: number,
): Promise<void> {
  const baseUrl = env.EVOLUTION_API_URL;
  const apiKey = env.EVOLUTION_API_KEY;

  if (!baseUrl || !apiKey) return;

  let sentCount = initialSent;

  for (const msg of messages) {
    // Aguardar delay antes de cada mensagem
    await new Promise((resolve) => setTimeout(resolve, delaySeconds * 1000));

    if (!msg.phone) {
      await env.DB.prepare(
        `UPDATE campaign_messages SET status = 'failed', error_message = 'Sem telefone', failed_at = CURRENT_TIMESTAMP WHERE id = ?`,
      )
        .bind(msg.id)
        .run();
      continue;
    }

    const formattedPhone = msg.phone.replace(/\D/g, '');
    const jid = formatWhatsAppJid(msg.phone);

    try {
      const response = await evolutionRequest(
        baseUrl,
        apiKey,
        `/message/sendText/${instanceName}`,
        'POST',
        {
          number: formattedPhone,
          text: msg.message_content,
        },
      );

      if (response.ok) {
        await env.DB.prepare(
          `UPDATE campaign_messages SET status = 'sent', sent_at = CURRENT_TIMESTAMP WHERE id = ?`,
        )
          .bind(msg.id)
          .run();

        await env.DB.prepare(
          `UPDATE leads SET whatsapp_status = 'sent', last_message_at = CURRENT_TIMESTAMP,
           status = CASE WHEN status = 'qualified' THEN 'contacted' ELSE status END
           WHERE id = ?`,
        )
          .bind(msg.lead_id)
          .run();

        sentCount++;
      }
    } catch {
      // Silenciosamente continua - erros já são logados no fluxo principal
    }
  }
}

// Webhook não precisa de auth (vem da Evolution API)
// Outras rotas precisam de auth

// Types para Evolution API
interface EvolutionInstance {
  instance: {
    instanceName: string;
    status: string;
  };
}

interface EvolutionQRCode {
  base64: string;
  code: string;
}

interface EvolutionWebhookPayload {
  event: string;
  instance: string;
  data: {
    key?: {
      remoteJid: string;
      id: string;
    };
    message?: {
      conversation?: string;
    };
    status?: string;
    messageTimestamp?: number;
  };
}

// Helper para fazer requests à Evolution API
async function evolutionRequest(
  baseUrl: string,
  apiKey: string,
  endpoint: string,
  method: string = 'GET',
  body?: unknown,
): Promise<Response> {
  const url = `${baseUrl}${endpoint}`;

  const options: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      apikey: apiKey,
    },
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  return fetch(url, options);
}

// GET /api/evolution/status - Status da conexão WhatsApp
evolution.get('/status', superAuthMiddleware, async (c) => {
  const baseUrl = c.env.EVOLUTION_API_URL;
  const apiKey = c.env.EVOLUTION_API_KEY;

  if (!baseUrl || !apiKey) {
    return c.json({ error: 'Evolution API não configurada', connected: false }, 500);
  }

  try {
    const response = await evolutionRequest(baseUrl, apiKey, '/instance/fetchInstances');
    const data = (await response.json()) as EvolutionInstance[];

    if (!response.ok) {
      return c.json({ error: 'Falha ao buscar instâncias', connected: false }, 500);
    }

    // Verificar se existe instância 'oinbox' ou similar
    const instance = data.find(
      (i: EvolutionInstance) =>
        i.instance.instanceName === 'oinbox' || i.instance.instanceName === 'superadmin',
    );

    if (!instance) {
      return c.json({
        connected: false,
        status: 'no_instance',
        message: 'Nenhuma instância configurada',
      });
    }

    return c.json({
      connected: instance.instance.status === 'open',
      status: instance.instance.status,
      instanceName: instance.instance.instanceName,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return c.json({ error: `Falha ao conectar: ${errorMessage}`, connected: false }, 500);
  }
});

// POST /api/evolution/connect - Iniciar pareamento QR Code
evolution.post('/connect', superAuthMiddleware, async (c) => {
  const baseUrl = c.env.EVOLUTION_API_URL;
  const apiKey = c.env.EVOLUTION_API_KEY;

  if (!baseUrl || !apiKey) {
    return c.json({ error: 'Evolution API não configurada' }, 500);
  }

  const instanceName = 'superadmin';

  try {
    // Primeiro tentar criar instância
    const createResponse = await evolutionRequest(baseUrl, apiKey, '/instance/create', 'POST', {
      instanceName,
      qrcode: true,
      integration: 'WHATSAPP-BAILEYS',
    });

    if (!createResponse.ok) {
      // Instância pode já existir, tentar conectar
      const connectResponse = await evolutionRequest(
        baseUrl,
        apiKey,
        `/instance/connect/${instanceName}`,
        'GET',
      );

      if (!connectResponse.ok) {
        return c.json({ error: 'Falha ao conectar instância' }, 500);
      }

      const qrData = (await connectResponse.json()) as EvolutionQRCode;
      return c.json({
        success: true,
        qrcode: qrData.base64,
        code: qrData.code,
      });
    }

    const data = (await createResponse.json()) as { qrcode?: EvolutionQRCode };
    return c.json({
      success: true,
      qrcode: data.qrcode?.base64,
      code: data.qrcode?.code,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return c.json({ error: `Falha ao criar instância: ${errorMessage}` }, 500);
  }
});

// POST /api/evolution/send - Enviar mensagem individual
evolution.post('/send', superAuthMiddleware, async (c) => {
  const { phone, message, leadId } = await c.req.json();

  if (!phone || !message) {
    return c.json({ error: 'Telefone e mensagem são obrigatórios' }, 400);
  }

  const baseUrl = c.env.EVOLUTION_API_URL;
  const apiKey = c.env.EVOLUTION_API_KEY;

  if (!baseUrl || !apiKey) {
    return c.json({ error: 'Evolution API não configurada' }, 500);
  }

  const instanceName = 'superadmin';

  // Formatar número para WhatsApp usando utilitário centralizado
  const jid = formatWhatsAppJid(phone);
  const formattedPhone = phone.replace(/\D/g, '');

  try {
    const response = await evolutionRequest(
      baseUrl,
      apiKey,
      `/message/sendText/${instanceName}`,
      'POST',
      {
        number: formattedPhone,
        text: message,
      },
    );

    if (!response.ok) {
      const error = await response.json();
      return c.json({ error: 'Falha ao enviar mensagem', details: error }, 500);
    }

    const data = (await response.json()) as { key?: { id: string } };

    // Se tiver leadId, atualizar status do lead
    if (leadId) {
      await c.env.DB.prepare(
        `
        UPDATE leads SET 
          whatsapp_status = 'sent',
          whatsapp_jid = ?,
          last_message_at = CURRENT_TIMESTAMP,
          status = CASE WHEN status = 'qualified' THEN 'contacted' ELSE status END,
          contacted_at = CASE WHEN status = 'qualified' THEN CURRENT_TIMESTAMP ELSE contacted_at END
        WHERE id = ?
      `,
      )
        .bind(jid, leadId)
        .run();
    }

    return c.json({
      success: true,
      messageId: data.key?.id,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return c.json({ error: `Falha ao enviar: ${errorMessage}` }, 500);
  }
});

// POST /api/evolution/batch - Enviar mensagens em lote (para campanhas)
evolution.post('/batch', superAuthMiddleware, async (c) => {
  const { campaignId, delaySeconds = 30 } = await c.req.json();

  if (!campaignId) {
    return c.json({ error: 'campaignId é obrigatório' }, 400);
  }

  const baseUrl = c.env.EVOLUTION_API_URL;
  const apiKey = c.env.EVOLUTION_API_KEY;

  if (!baseUrl || !apiKey) {
    return c.json({ error: 'Evolution API não configurada' }, 500);
  }

  // Buscar mensagens pendentes
  const { results: messages } = await c.env.DB.prepare(
    `
    SELECT cm.*, l.phone, l.name as lead_name
    FROM campaign_messages cm
    JOIN leads l ON cm.lead_id = l.id
    WHERE cm.campaign_id = ? AND cm.status = 'queued'
    ORDER BY cm.queued_at ASC
    LIMIT 10
  `,
  )
    .bind(campaignId)
    .all<{
      id: string;
      lead_id: string;
      message_content: string;
      phone: string;
      lead_name: string;
    }>();

  if (messages.length === 0) {
    return c.json({ success: true, message: 'Nenhuma mensagem pendente', sent: 0 });
  }

  const instanceName = 'superadmin';
  let sentCount = 0;
  const errors: string[] = [];

  for (const msg of messages) {
    if (!msg.phone) {
      await c.env.DB.prepare(
        `UPDATE campaign_messages SET status = 'failed', error_message = 'Sem telefone', failed_at = CURRENT_TIMESTAMP WHERE id = ?`,
      )
        .bind(msg.id)
        .run();
      continue;
    }

    const formattedPhone = msg.phone.replace(/\D/g, '');
    const jid = formatWhatsAppJid(msg.phone);

    try {
      const response = await evolutionRequest(
        baseUrl,
        apiKey,
        `/message/sendText/${instanceName}`,
        'POST',
        {
          number: formattedPhone,
          text: msg.message_content,
        },
      );

      if (response.ok) {
        await c.env.DB.prepare(
          `UPDATE campaign_messages SET status = 'sent', sent_at = CURRENT_TIMESTAMP WHERE id = ?`,
        )
          .bind(msg.id)
          .run();

        await c.env.DB.prepare(
          `UPDATE leads SET whatsapp_status = 'sent', last_message_at = CURRENT_TIMESTAMP, 
           status = CASE WHEN status = 'qualified' THEN 'contacted' ELSE status END
           WHERE id = ?`,
        )
          .bind(msg.lead_id)
          .run();

        sentCount++;
      } else {
        const error = await response.text();
        await c.env.DB.prepare(
          `UPDATE campaign_messages SET status = 'failed', error_message = ?, failed_at = CURRENT_TIMESTAMP WHERE id = ?`,
        )
          .bind(error.substring(0, 500), msg.id)
          .run();
        errors.push(`${msg.lead_name}: ${error}`);
      }

      // Delay entre mensagens para evitar bloqueio
      // Em Cloudflare Workers, setTimeout não é confiável. Usamos processamento assíncrono via waitUntil.
      if (delaySeconds > 0 && c.executionCtx) {
        // Fire-and-forget: não bloqueia a resposta mas continua processando
        const remainingMessages = messages.slice(sentCount + 1);
        if (remainingMessages.length > 0) {
          c.executionCtx.waitUntil(
            processDelayedMessages(c.env, instanceName, remainingMessages, delaySeconds, sentCount),
          );
        }
        break; // Sai do loop atual, o waitUntil cuida do resto
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      errors.push(`${msg.lead_name}: ${errorMessage}`);
    }
  }

  // Atualizar contadores da campanha
  await c.env.DB.prepare(
    `
    UPDATE campaigns SET 
      sent_count = (SELECT COUNT(*) FROM campaign_messages WHERE campaign_id = ? AND status = 'sent'),
      failed_count = (SELECT COUNT(*) FROM campaign_messages WHERE campaign_id = ? AND status = 'failed')
    WHERE id = ?
  `,
  )
    .bind(campaignId, campaignId, campaignId)
    .run();

  return c.json({
    success: true,
    sent: sentCount,
    errors: errors.length > 0 ? errors : undefined,
    remaining: messages.length - sentCount,
  });
});

// POST /api/evolution/webhook - Webhook para eventos da Evolution API
evolution.post('/webhook', async (c) => {
  const payload = (await c.req.json()) as EvolutionWebhookPayload;
  const logger = c.get('logger');

  logger?.info('Evolution Webhook', { event: payload.event, instance: payload.instance });

  try {
    switch (payload.event) {
      case 'messages.upsert': {
        // Nova mensagem recebida
        const remoteJid = payload.data.key?.remoteJid;
        const messageContent = payload.data.message?.conversation;

        if (remoteJid && messageContent) {
          // Verificar se é resposta de um lead
          const lead = await c.env.DB.prepare('SELECT id FROM leads WHERE whatsapp_jid = ?')
            .bind(remoteJid)
            .first<{ id: string }>();

          if (lead) {
            // Atualizar status do lead
            await c.env.DB.prepare(
              `
              UPDATE leads SET 
                whatsapp_status = 'replied',
                status = 'responded',
                responded_at = CURRENT_TIMESTAMP
              WHERE id = ?
            `,
            )
              .bind(lead.id)
              .run();

            // Atualizar mensagem da campanha se existir
            await c.env.DB.prepare(
              `
              UPDATE campaign_messages SET 
                status = 'replied',
                replied_at = CURRENT_TIMESTAMP,
                reply_content = ?
              WHERE lead_id = ? AND status != 'replied'
            `,
            )
              .bind(messageContent, lead.id)
              .run();
          }
        }
        break;
      }

      case 'messages.update': {
        // Status de entrega atualizado
        const status = payload.data.status;
        const messageId = payload.data.key?.id;

        if (status && messageId) {
          // Mapear status da Evolution para nosso status
          const statusMap: Record<string, string> = {
            SERVER_ACK: 'sent',
            DELIVERY_ACK: 'delivered',
            READ: 'read',
            PLAYED: 'read',
          };

          const ourStatus = statusMap[status];
          if (ourStatus) {
            await c.env.DB.prepare(
              `
              UPDATE campaign_messages SET 
                status = ?,
                ${ourStatus === 'delivered' ? 'delivered_at = CURRENT_TIMESTAMP,' : ''}
                ${ourStatus === 'read' ? 'read_at = CURRENT_TIMESTAMP,' : ''}
                id = id
              WHERE id = ?
            `,
            )
              .bind(ourStatus, messageId)
              .run();
          }
        }
        break;
      }
    }

    return c.json({ success: true });
  } catch (error) {
    logger?.error('Evolution Webhook Error', { error });
    return c.json({ success: false }, 500);
  }
});

export default evolution;
