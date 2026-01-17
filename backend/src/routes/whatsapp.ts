import { Hono } from 'hono';
import { Bindings, Variables } from '../types';
import { authMiddleware } from '../middleware/auth';
import { createDatadogLogger, DatadogLogger } from '../utils/datadog';
import { runAgent } from '../services/agentService';

const whatsapp = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// Helper para chamar Evolution API
async function evolutionFetch(env: Bindings, endpoint: string, options: RequestInit = {}) {
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
}

// ==================== WEBHOOK (Público - usa secret no path ou header se possível, aqui simplificado) ====================
// Recebe mensagens da Evolution API
// ==================== WEBHOOK (Público) ====================
// Recebe mensagens da Evolution API
whatsapp.post('/webhook', async (c) => {
  const env = c.env;
  const payload = await c.req.json() as { instance: string; event: string; data: any };
  const logger = createDatadogLogger(env);

  await logger?.info('[WhatsApp Webhook] Received', {
    payload: JSON.stringify(payload).slice(0, 500),
  });

  // Identificar Tenant pela instância de USUÁRIO
  // Evolution envia: { "instance": "user_userId", ... }
  const instanceName = payload.instance;
  let tenantId = 'default';
  let userId = '';

  if (instanceName && instanceName.startsWith('user_')) {
    userId = instanceName.replace('user_', '');
    
    // Buscar tenant do usuário no banco
    const user = await env.DB.prepare('SELECT tenant_id FROM users WHERE id = ?')
        .bind(userId)
        .first<{ tenant_id: string }>();
        
    if (user) {
        tenantId = user.tenant_id;
    } else {
        await logger?.warn(`[WhatsApp] Usuário não encontrado para instância`, { instanceName });
        // Fallback: Tentar parser antigo tenant_
        if (instanceName.startsWith('tenant_')) {
            tenantId = instanceName.replace('tenant_', '');
        }
    }
  } else if (instanceName && instanceName.startsWith('tenant_')) {
     // Legado / Fallback
     tenantId = instanceName.replace('tenant_', '');
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

    // Salvar mensagem no banco com tenant correto
    try {
      const messageId = crypto.randomUUID();
      await env.DB.prepare(
        `
        INSERT INTO whatsapp_messages (id, tenant_id, remote_jid, message_id, content, direction, status, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `,
      )
        .bind(
          messageId,
          tenantId,
          remoteJid,
          message.key?.id,
          messageContent,
          isFromMe ? 'outbound' : 'inbound',
          'received',
          new Date().toISOString(),
        )
        .run();

      await logger?.info(`[WhatsApp] Mensagem salva`, { tenantId, messageId });

      // AGENTE IA - Responder automaticamente se for mensagem recebida (inbound)
      if (!isFromMe) {
        // LEAD OPS: Check for Human Handover
        // Se o lead já está atribuído a alguém, a IA NÃO deve responder (exceto se for configurada como copiloto)
        // Para MVP: Se assigned_to existe, SILÊNCIO (corretor assume).
        
        // Normalize phone for lookup (remove suffix)
        const phoneClean = remoteJid!.replace('@s.whatsapp.net', '');
        
        const lead = await env.DB.prepare(
            "SELECT id, assigned_to FROM leads WHERE tenant_id = ? AND phone LIKE '%' || ? || '%'"
        ).bind(tenantId, phoneClean).first<{id: string, assigned_to: string}>();

        if (lead && lead.assigned_to) {
            await logger?.info('[WhatsApp] Silenciando IA (Lead atribuído)', { leadId: lead.id, assignedTo: lead.assigned_to });
            
            // TODO: Notificar corretor que chegou msg nova?
            return c.json({ received: true, action: 'human_handover' });
        }

        await logger?.info('[WhatsApp] Acionando Agente IA...');
        
        // 1. Recuperar histórico recente (para contexto)
        const historyResults = await env.DB.prepare(
            `SELECT direction, content FROM whatsapp_messages 
             WHERE tenant_id = ? AND remote_jid = ? 
             ORDER BY created_at DESC LIMIT 10`
        ).bind(tenantId, remoteJid).all<{ direction: string; content: string }>();
        
        // O banco retorna do mais novo para o mais antigo, precisamos inverter
        const history = historyResults.results.reverse().map(m => ({
            role: m.direction === 'inbound' ? 'user' : 'assistant',
            content: m.content
        }));

        // 2. Recuperar Knowledge Base (Contexto Geral)
        const kbResults = await env.DB.prepare(
           'SELECT content FROM knowledge_base WHERE tenant_id = ?'
        ).bind(tenantId).all<{ content: string }>();
        const knowledge = kbResults.results.map((r) => r.content).join('\n');

        // 3. Montar Prompt do Sistema
        const systemContext = 
            `Você é um corretor de imóveis virtual eficiente. Use as ferramentas para buscar imóveis. ` +
            `SeJA SUCINTO e use emojis. Não invente imóveis. ` +
            `IMPORTANTE: Se o cliente demonstrar interesse claro em comprar ou alugar (ex: perguntar preço, pedir visita, dizer o que busca), ` +
            `use a ferramenta 'register_lead' para salvar os dados dele IMEDIATAMENTE. ` +
            `Base de conhecimento: ${knowledge}`;
        
        // 4. Rodar Agente
        const agentResult = await runAgent(
            env.API_KEY,
            'gemini-1.5-flash',
            messageContent, // User message primarily
            env.DB,
            tenantId,
            logger,
            history, // Use 'history' as per original code
            systemContext // Safe system instruction
        );

        // 5. Enviar resposta se houver
        if (agentResult.text) {
             const formattedNumber = remoteJid!.replace('@s.whatsapp.net', '');
             
             // Use Shared Service
             const { sendWhatsAppMessage } = await import('../services/whatsappService');
             await sendWhatsAppMessage(env, tenantId, formattedNumber, agentResult.text);

             // Salvar a resposta da IA no banco
             const aiMsgId = crypto.randomUUID();
             await env.DB.prepare(
                `INSERT INTO whatsapp_messages (id, tenant_id, remote_jid, content, direction, status, created_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?)`
             ).bind(
                aiMsgId,
                tenantId,
                remoteJid,
                agentResult.text,
                'outbound',
                'sent',
                new Date().toISOString()
             ).run();

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
whatsapp.use('/*', authMiddleware);

// Middleware para garantir instância existente por USUÁRIO
const ensureInstance = async (env: Bindings, userId: string, tenantId: string, logger: DatadogLogger | null) => {
  if (!env.EVOLUTION_API_URL) {
    throw new Error('Evolution API not configured');
  }

  // MUDANÇA: Instância baseada em Usuário, não Tenant
  const instanceName = `user_${userId}`;

  // Verificar se existe
  const check = await evolutionFetch(env, `/instance/connectionState/${instanceName}`);

  if (check.status === 404) {
    await logger?.info(`[WhatsApp] Criando instância`, { userId, tenantId });
    // Criar instância
    const webhookBaseUrl = env.PUBLIC_WORKER_URL || 'https://api.oinbox.oconnector.tech';
    
    // Metadata para identificar o tenant no webhook depois
    const create = await evolutionFetch(env, '/instance/create', {
      method: 'POST',
      body: JSON.stringify({
        instanceName: instanceName,
        qrcode: true,
        integration: 'WHATSAPP-BAILEYS',
        webhook: `${webhookBaseUrl}/api/whatsapp/webhook`,
        webhook_by_events: true,
        events: ['messages.upsert'],
      }),
    });

    if (!create.ok) {
      throw new Error('Falha ao criar instância no Evolution API');
    }
  }
  return instanceName;
};

// Status da instância
whatsapp.get('/status', async (c) => {
  const env = c.env;
  const user = c.get('user');
  const tenantId = user?.tenantId || 'default';
  const logger = c.get('logger');

  if (!env.EVOLUTION_API_URL) {
    return c.json({ status: 'not_configured', message: 'Evolution API não configurada' });
  }

  try {
    // Garantir que instância existe (lazy creation)
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
      message: 'Instância já está conectada',
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
  const userId = user?.sub; // Assuming user.sub is available in context
  
  if (!userId) {
     return c.json({ error: 'User context required' }, 401);
  }

  const instanceName = `user_${userId}`;

  const { number, message, mediaUrl, mediaType } = await c.req.json();

  if (!number || !message) {
    return c.json({ error: 'Número e mensagem são obrigatórios' }, 400);
  }

  const formattedNumber = number.replace(/\D/g, '') + '@s.whatsapp.net';

  try {
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

    const data = await response.json();

    // Salvar mensagem
    const messageId = crypto.randomUUID();
    await env.DB.prepare(
      `
            INSERT INTO whatsapp_messages (id, tenant_id, remote_jid, content, direction, status, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `,
    )
      .bind(
        messageId,
        tenantId,
        formattedNumber,
        message,
        'outbound',
        'sent',
        new Date().toISOString(),
      )
      .run();

    return c.json({ success: true, messageId, evolutionResponse: data });
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
    let query = 'SELECT * FROM whatsapp_messages WHERE tenant_id = ?';
    const params: (string | number)[] = [tenantId];

    if (remoteJid) {
      query += ' AND remote_jid = ?';
      params.push(remoteJid);
    }

    query += ' ORDER BY created_at DESC LIMIT ?';
    params.push(limit);

    const result = await env.DB.prepare(query)
      .bind(...params)
      .all();

    return c.json({ messages: result.results });
  } catch (error) {
    const err = error as Error;
    return c.json({ error: err.message }, 500);
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
