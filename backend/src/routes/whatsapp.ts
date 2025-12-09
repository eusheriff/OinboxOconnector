import { Hono } from 'hono';
import { Bindings, Variables } from '../types';
import { authMiddleware } from '../middleware/auth';

const whatsapp = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// Helper para chamar Evolution API
async function evolutionFetch(env: Bindings, endpoint: string, options: RequestInit = {}) {
    const url = `${env.EVOLUTION_API_URL}${endpoint}`;
    const response = await fetch(url, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            'apikey': env.EVOLUTION_API_KEY,
            ...options.headers,
        },
    });
    return response;
}

// ==================== WEBHOOK (Público - usa secret no path ou header se possível, aqui simplificado) ====================
// Recebe mensagens da Evolution API
whatsapp.post('/webhook', async (c) => {
    const env = c.env;
    const payload = await c.req.json();

    console.log('[WhatsApp Webhook] Received:', JSON.stringify(payload).slice(0, 500));

    // Identificar Tenant pela instância no payload
    // Evolution envia: { "instance": "tenant_123", ... }
    const instanceName = payload.instance;
    let tenantId = 'default';

    if (instanceName && instanceName.startsWith('tenant_')) {
        tenantId = instanceName.replace('tenant_', '');
    }

    const eventType = payload.event;

    if (eventType === 'messages.upsert') {
        const message = payload.data;
        const remoteJid = message.key?.remoteJid;
        
        // Evitar processar mensagens de status
        if (remoteJid === 'status@broadcast') return c.json({ received: true });

        const messageContent = message.message?.conversation ||
            message.message?.extendedTextMessage?.text ||
            message.message?.imageMessage?.caption ||
            '[Media]';
        const isFromMe = message.key?.fromMe || false;

        // Salvar mensagem no banco com tenant correto
        try {
            const messageId = crypto.randomUUID();
            await env.DB.prepare(`
                INSERT INTO whatsapp_messages (id, tenant_id, remote_jid, message_id, content, direction, status, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `).bind(
                messageId,
                tenantId,
                remoteJid,
                message.key?.id,
                messageContent,
                isFromMe ? 'outbound' : 'inbound',
                'received',
                new Date().toISOString()
            ).run();

            console.log(`[WhatsApp] Mensagem salva para tenant ${tenantId}: ${messageId}`);
        } catch (error) {
            console.error('[WhatsApp] Erro ao salvar mensagem:', error);
        }
    }

    return c.json({ received: true });
});

// ==================== ROTAS AUTENTICADAS ====================
whatsapp.use('/*', authMiddleware);

// Middleware para garantir instância existente
const ensureInstance = async (env: Bindings, tenantId: string) => {
    const instanceName = `tenant_${tenantId}`;
    
    // Verificar se existe
    const check = await evolutionFetch(env, `/instance/connectionState/${instanceName}`);
    
    if (check.status === 404) {
        console.log(`[WhatsApp] Criando instância para tenant ${tenantId}...`);
        // Criar instância
        const create = await evolutionFetch(env, '/instance/create', {
            method: 'POST',
            body: JSON.stringify({
                instanceName: instanceName,
                qrcode: true,
                integration: 'WHATSAPP-BAILEYS',
                webhook: `${env.EVOLUTION_API_URL.replace('/api', '')}/api/whatsapp/webhook`, // TODO: URL correta do webhook do worker
                webhook_by_events: true,
                events: ['messages.upsert']
            })
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
    const user = c.get('user') as any; // Resolver tipo user depois de auth
    const tenantId = user?.tenantId || 'default';

    if (!env.EVOLUTION_API_URL) {
        return c.json({ status: 'not_configured', message: 'Evolution API não configurada' });
    }

    try {
        // Garantir que instância existe (lazy creation)
        const instanceName = await ensureInstance(env, tenantId);

        const response = await evolutionFetch(env, `/instance/connectionState/${instanceName}`);
        const data: any = await response.json();

        return c.json({
            status: data.instance?.state === 'open' ? 'connected' : 'disconnected',
            state: data.instance?.state,
            instanceName: instanceName,
        });
    } catch (error: any) {
        console.error('Erro status:', error);
        return c.json({ status: 'error', message: error.message }, 500);
    }
});

// Obter QR Code
whatsapp.get('/qrcode', async (c) => {
    const env = c.env;
    const user = c.get('user') as any;
    const tenantId = user?.tenantId || 'default';

    try {
        const instanceName = await ensureInstance(env, tenantId);
        
        const response = await evolutionFetch(env, `/instance/connect/${instanceName}`);
        const data: any = await response.json();

        if (data.base64) {
            return c.json({
                qrcode: data.base64,
                pairingCode: data.pairingCode,
            });
        }

        return c.json({
            status: 'already_connected',
            message: 'Instância já está conectada'
        });
    } catch (error: any) {
        return c.json({ error: error.message }, 500);
    }
});

// Enviar mensagem
whatsapp.post('/send', async (c) => {
    const env = c.env;
    const user = c.get('user') as any;
    const tenantId = user?.tenantId || 'default';
    const instanceName = `tenant_${tenantId}`;

    const { number, message, mediaUrl, mediaType } = await c.req.json();

    if (!number || !message) {
        return c.json({ error: 'Número e mensagem são obrigatórios' }, 400);
    }

    const formattedNumber = number.replace(/\D/g, '') + '@s.whatsapp.net';

    try {
        let endpoint = `/message/sendText/${instanceName}`;
        let body: any = {
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
        await env.DB.prepare(`
            INSERT INTO whatsapp_messages (id, tenant_id, remote_jid, content, direction, status, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `).bind(
            messageId,
            tenantId,
            formattedNumber,
            message,
            'outbound',
            'sent',
            new Date().toISOString()
        ).run();

        return c.json({ success: true, messageId, evolutionResponse: data });
    } catch (error: any) {
        return c.json({ error: error.message }, 500);
    }
});

// Listar mensagens
whatsapp.get('/messages', async (c) => {
    const env = c.env;
    const user = c.get('user') as any;
    const tenantId = user?.tenantId || 'default';

    const remoteJid = c.req.query('remoteJid');
    const limit = parseInt(c.req.query('limit') || '50');

    try {
        let query = 'SELECT * FROM whatsapp_messages WHERE tenant_id = ?';
        const params: any[] = [tenantId];

        if (remoteJid) {
            query += ' AND remote_jid = ?';
            params.push(remoteJid);
        }

        query += ' ORDER BY created_at DESC LIMIT ?';
        params.push(limit);

        const result = await env.DB.prepare(query).bind(...params).all();

        return c.json({ messages: result.results });
    } catch (error: any) {
        return c.json({ error: error.message }, 500);
    }
});

// Reconectar
whatsapp.post('/reconnect', async (c) => {
    const env = c.env;
    const user = c.get('user') as any;
    const instanceName = `tenant_${user?.tenantId || 'default'}`;

    try {
        const response = await evolutionFetch(env, `/instance/restart/${instanceName}`, {
            method: 'PUT',
        });
        const data = await response.json();
        return c.json({ success: true, data });
    } catch (error: any) {
        return c.json({ error: error.message }, 500);
    }
});

// Logout
whatsapp.delete('/logout', async (c) => {
    const env = c.env;
    const user = c.get('user') as any;
    const instanceName = `tenant_${user?.tenantId || 'default'}`;

    try {
        const response = await evolutionFetch(env, `/instance/logout/${instanceName}`, {
            method: 'DELETE',
        });
        const data = await response.json();
        return c.json({ success: true, data });
    } catch (error: any) {
        return c.json({ error: error.message }, 500);
    }
});

export default whatsapp;
