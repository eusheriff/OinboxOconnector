/**
 * Omnichannel Routes - Conversas e mensagens de canais sociais
 *
 * Rotas:
 * GET    /api/omnichannel/conversations         - Listar conversas de todos os canais
 * GET    /api/omnichannel/conversations/:id/messages - Mensagens de uma conversa
 * POST   /api/omnichannel/send                  - Enviar mensagem (qualquer canal)
 * PATCH  /api/omnichannel/conversations/:id/status - Atualizar status
 */

import { Hono } from 'hono';
import { Bindings, Variables } from '../bindings';
import { ChannelRepository } from '../services/channelRepository';
import { FacebookChannelService } from '../services/channels/facebookChannel';
import { InstagramChannelService } from '../services/channels/instagramChannel';
import { TelegramChannelService } from '../services/channels/telegramChannel';
import { createDatadogLogger } from '../utils/datadog';

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// Listar conversas de todos os canais sociais
app.get('/conversations', async (c) => {
  const user = c.get('user');
  const db = c.env.DB;

  try {
    const conversations = await db
      .prepare(
        `SELECT
          c.id,
          c.tenant_id,
          c.channel_id,
          c.contact_id,
          c.contact_type,
          c.status,
          c.assigned_to,
          c.channel_type,
          c.external_conversation_id,
          c.contact_phone,
          c.contact_email,
          c.contact_platform_id,
          c.contact_profile_pic,
          c.contact_name,
          c.unread_count,
          c.last_message_at,
          c.created_at,
          ch.provider,
          ch.name as channel_name,
          (SELECT content FROM omnichannel_messages m2
           WHERE m2.conversation_id = c.id
           ORDER BY m2.created_at DESC LIMIT 1) as last_message,
          (SELECT sender_type FROM omnichannel_messages m3
           WHERE m3.conversation_id = c.id
           ORDER BY m3.created_at DESC LIMIT 1) as last_sender_type
         FROM conversations c
         LEFT JOIN channels ch ON c.channel_id = ch.id
         WHERE c.tenant_id = ?
         ORDER BY c.last_message_at DESC
         LIMIT 100`,
      )
      .bind(user.tenantId)
      .all();

    return c.json({
      success: true,
      conversations: conversations.results,
    });
  } catch (error) {
    const logger = createDatadogLogger(c.env);
    await logger?.error('[Omnichannel] Failed to list conversations', {
      error: error instanceof Error ? error.message : String(error),
    });
    return c.json({ success: false, error: 'Failed to list conversations' }, 500);
  }
});

// Obter mensagens de uma conversa
app.get('/conversations/:id/messages', async (c) => {
  const user = c.get('user');
  const db = c.env.DB;
  const conversationId = c.req.param('id');
  const limit = parseInt(c.req.query('limit') || '50');

  try {
    // Verificar que a conversa pertence ao tenant
    const conversation = await db
      .prepare('SELECT id, tenant_id FROM conversations WHERE id = ? AND tenant_id = ?')
      .bind(conversationId, user.tenantId)
      .first();

    if (!conversation) {
      return c.json({ success: false, error: 'Conversation not found' }, 404);
    }

    const messages = await db
      .prepare(
        `SELECT
          id,
          tenant_id,
          conversation_id,
          sender_type,
          sender_id,
          content,
          message_type,
          media_url,
          external_id,
          channel_type,
          channel_message_id,
          sender_platform,
          is_forwarded,
          reply_to_message_id,
          metadata,
          status,
          created_at
         FROM omnichannel_messages
         WHERE conversation_id = ?
         ORDER BY created_at DESC
         LIMIT ?`,
      )
      .bind(conversationId, limit)
      .all();

    // Marcar como lidas (reset unread_count)
    await db
      .prepare('UPDATE conversations SET unread_count = 0 WHERE id = ?')
      .bind(conversationId)
      .run();

    return c.json({
      success: true,
      messages: messages.results.reverse(), // Ordem cronologica
    });
  } catch (error) {
    const logger = createDatadogLogger(c.env);
    await logger?.error('[Omnichannel] Failed to get messages', {
      error: error instanceof Error ? error.message : String(error),
    });
    return c.json({ success: false, error: 'Failed to get messages' }, 500);
  }
});

// Atualizar status da conversa
app.patch('/conversations/:id/status', async (c) => {
  const user = c.get('user');
  const db = c.env.DB;
  const conversationId = c.req.param('id');

  const body = await c.req.json().catch(() => null);
  if (!body?.status || !['open', 'resolved', 'bot'].includes(body.status)) {
    return c.json({ success: false, error: 'Invalid status' }, 400);
  }

  try {
    await db
      .prepare('UPDATE conversations SET status = ? WHERE id = ? AND tenant_id = ?')
      .bind(body.status, conversationId, user.tenantId)
      .run();

    return c.json({ success: true });
  } catch (error) {
    const logger = createDatadogLogger(c.env);
    await logger?.error('[Omnichannel] Failed to update status', {
      error: error instanceof Error ? error.message : String(error),
    });
    return c.json({ success: false, error: 'Failed to update status' }, 500);
  }
});

// Enviar mensagem (generic, qualquer canal social)
app.post('/send', async (c) => {
  const user = c.get('user');
  const db = c.env.DB;
  const logger = createDatadogLogger(c.env);

  const body = await c.req.json().catch(() => null);
  if (!body?.conversation_id || !body?.content) {
    return c.json({ success: false, error: 'Missing conversation_id or content' }, 400);
  }

  try {
    const repo = new ChannelRepository(db);

    const conversation = await db
      .prepare(
        `SELECT c.id, c.channel_id, c.channel_type, c.contact_platform_id,
                ch.provider
         FROM conversations c
         LEFT JOIN channels ch ON c.channel_id = ch.id
         WHERE c.id = ? AND c.tenant_id = ?`,
      )
      .bind(body.conversation_id, user.tenantId)
      .first<any>();

    if (!conversation) {
      return c.json({ success: false, error: 'Conversation not found' }, 404);
    }

    // Salvar mensagem no D1 (sempre)
    const messageId = crypto.randomUUID();
    const now = new Date().toISOString();

    await db
      .prepare(
        `INSERT INTO omnichannel_messages
         (id, tenant_id, conversation_id, sender_type, sender_id, content,
          message_type, status, created_at)
         VALUES (?, ?, ?, 'agent', ?, ?, 'text', 'sent', ?)`,
      )
      .bind(
        messageId,
        user.tenantId,
        body.conversation_id,
        user.sub,
        body.content,
        now,
      )
      .run();

    await db
      .prepare('UPDATE conversations SET last_message_at = ? WHERE id = ?')
      .bind(now, body.conversation_id)
      .run();

    // Enviar via API do canal especifico
    const provider = (conversation.provider || conversation.channel_type || '').toLowerCase();
    let sentExternally = false;

    switch (provider) {
      case 'facebook': {
        const token = await repo.getValidToken(conversation.channel_id, 'facebook');
        if (token?.access_token && conversation.contact_platform_id) {
          const fbService = new FacebookChannelService(repo);
          sentExternally = await fbService.sendMessage(
            token.access_token,
            conversation.contact_platform_id,
            body.content,
          );
        }
        break;
      }

      case 'instagram': {
        const token = await repo.getValidToken(conversation.channel_id, 'instagram');
        if (token?.access_token && token.page_id && conversation.contact_platform_id) {
          const igService = new InstagramChannelService(repo);
          sentExternally = await igService.sendMessage(
            token.page_id,
            conversation.contact_platform_id,
            body.content,
            token.access_token,
          );
        }
        break;
      }

      case 'telegram': {
        const token = await repo.getOAuthToken(conversation.channel_id, 'telegram');
        if (token?.raw_token_response) {
          const tokenData = JSON.parse(token.raw_token_response);
          const botToken = tokenData._bot_token; // Armazenamos o bot_token aqui
          if (botToken && conversation.contact_platform_id) {
            const tgService = new TelegramChannelService(repo);
            const chatId = parseInt(conversation.contact_platform_id);
            const msgId = await tgService.sendMessage(botToken, chatId, body.content);
            sentExternally = msgId !== null;
          }
        }
        break;
      }

      default:
        // Canais sem integracao de envio ainda (X, TikTok, Line)
        // Mensagem salva no DB mas nao enviada externamente
        break;
    }

    if (sentExternally) {
      await repo.incrementMetric(user.tenantId, provider, 'messages_sent_today');
    }

    await logger?.info('[Omnichannel] Message sent', {
      messageId,
      conversationId: body.conversation_id,
      provider,
      sentExternally,
    });

    return c.json({ success: true, message_id: messageId, sent_externally: sentExternally });
  } catch (error) {
    const logger = createDatadogLogger(c.env);
    await logger?.error('[Omnichannel] Failed to send message', {
      error: error instanceof Error ? error.message : String(error),
    });
    return c.json({ success: false, error: 'Failed to send message' }, 500);
  }
});

export default app;
