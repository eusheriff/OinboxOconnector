import { Hono } from 'hono';
import { Bindings, Variables } from '../bindings';
import { authMiddleware } from '../middleware/auth';
import { createDatadogLogger, DatadogLogger } from '../utils/datadog';
import { formatWhatsAppJid } from '../utils/whatsapp';
import { circuitBreakers } from '../utils/circuitBreaker';

import { WhatsAppRepository } from '../services/whatsappRepository';
import { evolutionFetch, sendWhatsAppMessage } from '../services/whatsappService';
import { SalesTools } from '../services/salesTools';

const whatsapp = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// ==================== WEBHOOK (Público) ====================
// Recebe mensagens da Evolution API
whatsapp.post('/webhook', async (c) => {
  const env = c.env;
  const payload = (await c.req.json()) as { instance: string; event: string; data: any };
  const logger = createDatadogLogger(env);

  // Repository Instance
  // Cast env.DB as D1Database because Bindings might use a generic definition
  const repo = new WhatsAppRepository(
    env.DB as unknown as import('@cloudflare/workers-types').D1Database,
  );

  await logger?.info('[WhatsApp Webhook] Received', {
    payload: JSON.stringify(payload).slice(0, 500),
  });

  // Identificar Tenant pelo nome da inst|ncia (formato: tenant_{tenantId})
  const instanceName = payload.instance;
  let tenantId = 'default';

  if (instanceName && instanceName.startsWith('tenant_')) {
    tenantId = instanceName.replace('tenant_', '');
  } else {
    await logger?.warn('[WhatsApp Webhook] Unknown instance format', { instanceName });
    return c.json({ received: true, warning: 'unknown_instance_format' });
  }

  const eventType = payload.event;

  if (eventType === 'messages.upsert') {
    const message = payload.data;
    const remoteJid = message.key?.remoteJid;

    // Evitar processar mensagens de status
    if (remoteJid === 'status@broadcast') return c.json({ received: true });

    const messageContent =
      message.message?.conversation ||
      message.message?.extendedTextMessage?.text ||
      message.message?.imageMessage?.caption ||
      '[Media]';
    const isFromMe = message.key?.fromMe || false;

    const mediaUrl =
      message.message?.imageMessage?.url ||
      message.message?.videoMessage?.url ||
      message.message?.documentMessage?.url ||
      null;

    // Salvar mensagem no banco com tenant correto
    try {
      const messageId = crypto.randomUUID();
      await repo.saveMessage({
        id: messageId,
        tenant_id: tenantId,
        remote_jid: remoteJid!,
        message_id: message.key?.id,
        content: messageContent,
        media_url: mediaUrl,
        direction: isFromMe ? 'outbound' : 'inbound',
        status: 'received',
        created_at: new Date().toISOString(),
      });

      await logger?.info(`[WhatsApp] Mensagem salva`, { tenantId, messageId });

        // AGENTE IA - Responder automaticamente se for mensagem recebida (inbound)
      if (!isFromMe) {
        const phoneClean = remoteJid!.replace('@s.whatsapp.net', '');
        const lead = await repo.findLeadByPhone(tenantId, phoneClean);

        // OBT�M OU CRIA A CONVERSA (Status inicial é 'bot')
        const conversation = await repo.getOrCreateOmniConversation(tenantId, remoteJid!, lead?.id);

        if (lead) {
          // UPDATE CRM metrics
          await env.DB.prepare(
            "UPDATE leads SET status = 'responded', responded_at = CURRENT_TIMESTAMP WHERE id = ?"
          ).bind(lead.id).run();

          await env.DB.prepare(
            "UPDATE campaign_leads SET status = 'stopped' WHERE lead_id = ? AND status IN ('active', 'pending')"
          ).bind(lead.id).run();
        }

        // HANDOFF CHECK: A IA só "fala" na conversa se o status for explícitamente 'bot'
        if (conversation.status !== 'bot') {
          await logger?.info('[WhatsApp] IA Silenciada (Conversa em Handoff/Open / Humano na linha)', { convId: conversation.id, status: conversation.status });
          return c.json({ received: true, action: 'bypassed_to_human' });
        }

        await logger?.info('[WhatsApp] Acionando Agente de Vendas (Captain/IA)...');

        // 1. AN�LISE DE INTEN��O (Autopilot CRM)
        let agentResponseText = '';
        let intent = 'OTHER';
        const salesTools = new SalesTools(env); // Instantiate SalesTools

        try {
          const analysis = await salesTools.analyzeIntention(messageContent, []);
          intent = analysis.intent;
          agentResponseText = analysis.suggested_reply;

          await logger?.info(`[Sales Specialist] Intent Detected: ${intent}`, { analysis });

          // 2. MOVIMENTA��O AUT�NOMA CRM & HANDOFF
          if (intent === 'INTERESTED' || intent === 'SUPPORT') {
            // Transbordo Expresso
            await env.DB.prepare("UPDATE conversations SET status = 'open' WHERE id = ?").bind(conversation.id).run();
            await logger?.info(`[WhatsApp] �� HANDOFF! Intent ${intent}. Bot silenciado.`, { convId: conversation.id });

            // Notification
            if (lead) {
               await env.DB.prepare(
                `INSERT INTO notifications (id, tenant_id, user_id, type, title, message, metadata)
                 VALUES (?, ?, ?, 'handover', 'Suporte/Interesse Solicitado', ?, ?)`
              )
                .bind(
                  crypto.randomUUID(),
                  tenantId,
                  lead.assigned_to || null,
                  `O lead ${phoneClean} tem intenção de ${intent}. Assuma o chat imediatamente.`,
                  JSON.stringify({ leadId: lead.id, phone: phoneClean, intent })
                )
                .run();
            }

            if (lead && intent === 'INTERESTED') {
              await env.DB.prepare("UPDATE leads SET status = 'hot_lead', unread_count = unread_count + 1 WHERE id = ?").bind(lead.id).run();
              if (!agentResponseText) agentResponseText = '�timo! Vou te transferir para um especialista agora mesmo.';
            } else if (lead && intent === 'SUPPORT') {
              await env.DB.prepare("UPDATE leads SET status = 'needs_support' WHERE id = ?").bind(lead.id).run();
              if (!agentResponseText) agentResponseText = 'Certo, estou te transferindo para o nosso atendimento humano!';
            }
          } else if (intent === 'NOT_INTERESTED' && lead) {
             await env.DB.prepare("UPDATE leads SET status = 'archived' WHERE id = ?").bind(lead.id).run();
             if (!agentResponseText) agentResponseText = 'Entendido. Agradecemos a atenção!';
          }
        } catch (e) {
          console.error('Failed to analyze intent:', e);
        }

        // 3. FALLBACK: Se não houve resposta definitiva do Especialista, chamar o Generalista (Orchestrator)
        if (!agentResponseText || intent === 'OTHER' || intent === 'SUPPORT') {
          // Recuperar contexto para conversa fluida
          const history = await repo.getMessagesHistory(tenantId, remoteJid!);
          const knowledge = await repo.getKnowledgeBase(tenantId);

          const hubUrl = 'https://agent-hub.oconnector.tech/v1/hub/orchestrate';

          try {
            const hubResponse = await circuitBreakers.agentHub.execute(async () => {
              return fetch(hubUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  request: messageContent,
                  userId: remoteJid,
                  origin_domain: 'Oconnector.oconnector.tech',
                }),
              });
            });

            if (hubResponse.ok) {
              const hubData = (await hubResponse.json()) as { result: { response: string } };
              agentResponseText = hubData.result?.response;
            }
          } catch (error) {
            await logger?.warn('[WhatsApp] Agent Hub Orchestrator unavailable (circuit breaker)', {
              error: error instanceof Error ? error.message : String(error),
            });
            // Fallback: resposta padrão quando Agent Hub está indisponível
            agentResponseText =
              'Recebemos sua mensagem! Um de nossos consultores irá responder em breve.';
          }
        }

        // Mock result object to match downstream expectations (or refactor downstream)
        const agentResult = {
          text: agentResponseText,
          toolUsed: false, // Hub handles this internally now
        };

        // 5. Enviar resposta se houver
        if (agentResult.text) {
          const formattedNumber = remoteJid!.replace('@s.whatsapp.net', '');

          // Use imported service
          await sendWhatsAppMessage(env, tenantId, formattedNumber, agentResult.text);

          // Salvar a resposta da IA no banco
          const aiMsgId = crypto.randomUUID();
          await repo.saveMessage({
            id: aiMsgId,
            tenant_id: tenantId,
            remote_jid: remoteJid!,
            content: agentResult.text,
            direction: 'outbound',
            status: 'sent',
            created_at: new Date().toISOString(),
          });

          await logger?.info('[WhatsApp] Agente respondeu', { toolUsed: agentResult.toolUsed });
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      await logger?.error('[WhatsApp] Erro ao processar mensagem/agente', { error: errorMessage });
    }
  }

  return c.json({ received: true });
});

// ==================== ROTAS AUTENTICADAS ====================
// Auth agora é aplicado globalmente em index.ts (antes do tenant enforcement)
// whatsapp.use('/*', authMiddleware);

// Middleware para garantir inst|ncia existente por USU�RIO
const ensureInstance = async (
  env: Bindings,
  userId: string,
  tenantId: string,
  logger: DatadogLogger | null,
) => {
  if (!env.EVOLUTION_API_URL) {
    throw new Error('Evolution API not configured');
  }

  // FIX: Instance name must be consistent with whatsappService (tenant based)
  const instanceName = `tenant_${tenantId}`;

  // Verificar se existe
  const check = await evolutionFetch(env, `/instance/connectionState/${instanceName}`);

  if (check.status === 404) {
    await logger?.info(`[WhatsApp] Criando inst|ncia`, { userId, tenantId, instanceName });
    // Criar inst|ncia
    const webhookBaseUrl = env.PUBLIC_WORKER_URL || 'https://api.Oconnector.oconnector.tech';

    // Metadata para identificar o tenant no webhook depois
    const create = await evolutionFetch(env, '/instance/create', {
      method: 'POST',
      body: JSON.stringify({
        instanceName: instanceName,
        qrcode: true,
        integration: 'WHATSAPP-BAILEYS',
        webhook: `${webhookBaseUrl}/api/whatsapp/webhook`, // Webhook global, tenant no payload? Não, evolution manda instance no payload
        events: [
          'messages.upsert',
          'messages.update',
          'messages.media',
          'connection.update',
          'qrcode.updated',
        ],
      }),
    });

    if (!create.ok) {
      const errorBody = await create.text();
      await logger?.error(`Falha criação inst|ncia`, { status: create.status, body: errorBody });
      throw new Error(`Falha ao criar inst|ncia: ${create.status} - ${errorBody}`);
    }
  }
  return instanceName;
};

// Status da inst|ncia
whatsapp.get('/status', async (c) => {
  const env = c.env;
  const user = c.get('user');
  const tenantId = user?.tenantId || 'default';
  const logger = c.get('logger');

  if (!env.EVOLUTION_API_URL) {
    return c.json({ status: 'not_configured', message: 'Evolution API não configurada' });
  }

  try {
    // Garantir que inst|ncia existe (lazy creation)
    const instanceName = await ensureInstance(env, user.sub, tenantId, logger);

    const response = await evolutionFetch(env, `/instance/connectionState/${instanceName}`);
    const data = (await response.json()) as { instance?: { state: string } };

    return c.json({
      status: data.instance?.state === 'open' ? 'connected' : 'disconnected',
      state: data.instance?.state,
      instanceName: instanceName,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    await logger?.error('Erro status', { error: errorMessage });
    return c.json({ status: 'error', message: errorMessage }, 500);
  }
});

// Obter QR Code
whatsapp.get('/qrcode', async (c) => {
  const env = c.env;
  const user = c.get('user');
  const tenantId = user?.tenantId || 'default';
  const logger = c.get('logger');

  try {
    const instanceName = await ensureInstance(env, user.sub, tenantId, logger);

    const response = await evolutionFetch(env, `/instance/connect/${instanceName}`);
    const data = (await response.json()) as { base64?: string; pairingCode?: string };

    if (data.base64) {
      return c.json({
        qrcode: data.base64,
        pairingCode: data.pairingCode,
      });
    }

    return c.json({
      status: 'already_connected',
      message: 'Inst|ncia já está conectada',
    });
  } catch (error) {
    const err = error as Error;
    return c.json({ error: err.message }, 500);
  }
});

// Enviar mensagem
whatsapp.post('/send', async (c) => {
  const env = c.env;
  const user = c.get('user');
  const tenantId = user?.tenantId || 'default';

  // Consistência: todas as inst|ncias são tenant-based (igual status, qrcode, reconnect, logout)
  const instanceName = `tenant_${tenantId}`;

  const { number, message, mediaUrl, mediaType, isPrivate } = await c.req.json();

  if (!number || !message) {
    return c.json({ error: 'Número e mensagem são obrigatórios' }, 400);
  }

  const formattedNumber = formatWhatsAppJid(number);

  try {
    let evolutionData = null;

    // Busca Canal de WhatsApp do Tenant
    const channel = await c.env.DB.prepare(
      "SELECT id, provider, config FROM channels WHERE tenant_id = ? AND status = 'active' AND provider IN ('whatsapp', 'whatsapp_cloud') LIMIT 1"
    ).bind(tenantId).first<{id: string, provider: string, config: string}>();

    if (!channel && !isPrivate) {
       return c.json({ error: 'Nenhum canal ativo de WhatsApp encontrado' }, 400);
    }

    // Se N�O for nota privada, envia para o Mundo Externo (WhatsApp real)
    if (!isPrivate && channel) {
      if (channel.provider === 'whatsapp_cloud') {
         // ENVIO OFICIAL META GRAPH API
         const config = JSON.parse(channel.config || '{}');
         const token = config.oauth_access_token;
         const phoneId = config.phone_number_id;

         if (!token || !phoneId) {
            throw new Error('Canal Cloud API não completou configuração (Falta Telefone ou Token)');
         }

         const metaUrl = `https://graph.facebook.com/v21.0/${phoneId}/messages`;
         
         let payload: any = {
           messaging_product: "whatsapp",
           recipient_type: "individual",
           to: formattedNumber,
         };

         if (mediaUrl && mediaType) {
            const isImage = mediaType.startsWith('image');
            payload.type = isImage ? 'image' : 'document';
            payload[payload.type] = {
               link: mediaUrl,
               caption: message || ''
            };
         } else {
            payload.type = 'text';
            payload.text = { body: message };
         }

         const metaResp = await fetch(metaUrl, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
         });

         const metaData = await metaResp.json() as any;
         if (!metaResp.ok) throw new Error(`Meta API Error: ${JSON.stringify(metaData)}`);
         
         evolutionData = metaData; // re-use variable names for brevity

      } else {
         // ENVIO EVOLUTION API (BAILEYS)
         let endpoint = `/message/sendText/${instanceName}`;
         let body: Record<string, unknown> = {
           number: formattedNumber,
           text: message,
         };

         if (mediaUrl && mediaType) {
           endpoint = `/message/sendMedia/${instanceName}`;
           body = {
             number: formattedNumber,
             mediatype: mediaType,
             media: mediaUrl,
             caption: message,
           };
         }

         const response = await evolutionFetch(env, endpoint, {
           method: 'POST',
           body: JSON.stringify(body),
         });

         evolutionData = await response.json();
      }
    }

    // Salvar mensagem localmente na timeline (seja publica ou privada)
    const messageId = crypto.randomUUID();
    const repo = new WhatsAppRepository(
      env.DB as unknown as import('@cloudflare/workers-types').D1Database,
    );

    // Identificar tipo e status reais 
    const finalMessageType = isPrivate ? 'private_note' : (mediaUrl ? 'image' : 'text');
    const finalStatus = isPrivate ? 'sent' : 'queued'; // Notas privadas já nascem 'sent' localmente

    await repo.saveMessage({
      id: messageId,
      tenant_id: tenantId,
      remote_jid: formattedNumber,
      message_id: undefined, // outbound msg id from evolution? data.key.id?
      content: message,
      media_url: mediaUrl,
      message_type: finalMessageType,
      direction: 'outbound',
      status: finalStatus,
      created_at: new Date().toISOString(),
    });

    return c.json({ success: true, messageId, isPrivate, evolutionResponse: evolutionData });
  } catch (error) {
    const err = error as Error;
    return c.json({ error: err.message }, 500);
  }
});

// Listar mensagens
whatsapp.get('/messages', async (c) => {
  const env = c.env;
  const user = c.get('user');
  const tenantId = user?.tenantId || 'default';

  const remoteJid = c.req.query('remoteJid');
  const limit = parseInt(c.req.query('limit') || '50', 10);

  try {
    // Repo Instance
    const repo = new WhatsAppRepository(
      env.DB as unknown as import('@cloudflare/workers-types').D1Database,
    );
    const messages = await repo.getRawMessages(tenantId, remoteJid, limit);

    return c.json({ messages });
  } catch (error) {
    const err = error as Error;
    return c.json({ error: err.message }, 500);
  }
});

// Listar Conversas Ativas (Inbox)
whatsapp.get('/conversations', async (c) => {
  const env = c.env;
  const user = c.get('user');
  const tenantId = user?.tenantId || 'default';

  try {
    const repo = new WhatsAppRepository(env.DB as unknown as import('@cloudflare/workers-types').D1Database);
    const conversations = await repo.getConversations(tenantId);
    return c.json({ conversations });
  } catch (error) {
    return c.json({ error: (error as Error).message }, 500);
  }
});

// Mensagens por Conversa
whatsapp.get('/conversations/:id/messages', async (c) => {
  const env = c.env;
  const conversationId = c.req.param('id');
  const limit = parseInt(c.req.query('limit') || '50', 10);

  try {
    const repo = new WhatsAppRepository(env.DB as unknown as import('@cloudflare/workers-types').D1Database);
    const messages = await repo.getConversationMessages(conversationId, limit);
    return c.json({ messages });
  } catch (error) {
    return c.json({ error: (error as Error).message }, 500);
  }
});

// Mudar Status (Handoff)
whatsapp.patch('/conversations/:id/status', async (c) => {
  const env = c.env;
  const conversationId = c.req.param('id');
  const user = c.get('user');
  const { status } = await c.req.json();

  if (!['bot', 'open', 'resolved'].includes(status)) {
    return c.json({ error: 'Status inválido' }, 400);
  }

  try {
    const repo = new WhatsAppRepository(env.DB as unknown as import('@cloudflare/workers-types').D1Database);
    
    // Se estiver assumindo (bot -> open), assina pro user atual
    const assignedTo = status === 'open' ? user?.sub : undefined;

    await repo.updateConversationStatus(conversationId, status, assignedTo);
    return c.json({ success: true, status, assignedTo });
  } catch (error) {
    return c.json({ error: (error as Error).message }, 500);
  }
});

// Reconectar
whatsapp.post('/reconnect', async (c) => {
  const env = c.env;
  const user = c.get('user');
  const instanceName = `tenant_${user?.tenantId || 'default'}`;

  try {
    const response = await evolutionFetch(env, `/instance/restart/${instanceName}`, {
      method: 'PUT',
    });
    const data = await response.json();
    return c.json({ success: true, data });
  } catch (error) {
    const err = error as Error;
    return c.json({ error: err.message }, 500);
  }
});

// Logout
whatsapp.delete('/logout', async (c) => {
  const env = c.env;
  const user = c.get('user');
  const instanceName = `tenant_${user?.tenantId || 'default'}`;

  try {
    const response = await evolutionFetch(env, `/instance/logout/${instanceName}`, {
      method: 'DELETE',
    });
    const data = await response.json();
    return c.json({ success: true, data });
  } catch (error) {
    const err = error as Error;
    return c.json({ error: err.message }, 500);
  }
});

export default whatsapp;
