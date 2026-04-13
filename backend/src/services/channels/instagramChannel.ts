/**
 * InstagramChannelService - Instagram Direct OAuth + Webhook
 *
 * Instagram usa a mesma Facebook App mas com Graph API diferente.
 * Fluxo:
 * 1. OAuth via Facebook (mesmo flow)
 * 2. Token da página Instagram é obtido via /{page-id}?fields=instagram_business_account
 * 3. Webhook recebe mensagens via Graph API subscriptions
 */

import { HonoContext } from '../../bindings';
import { ChannelRepository } from '../channelRepository';
import { normalizer, NormalizedIncomingMessage } from '../normalizerService';
import { createDatadogLogger } from '../../utils/datadog';
import { circuitBreakers } from '../../utils/circuitBreaker';

const INSTAGRAM_API_URL = 'https://graph.facebook.com/v18.0';

export class InstagramChannelService {
  constructor(private channelRepo: ChannelRepository) {}

  /**
   * Gera URL de OAuth para Instagram (usa Facebook OAuth)
   */
  getOAuthUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: '{app_id}',
      redirect_uri: '{redirect_uri}',
      state,
      scope: 'instagram_manage_messages,instagram_basic,pages_messaging',
      response_type: 'code',
    });
    return `https://www.facebook.com/v18.0/dialog/oauth?${params.toString()}`;
  }

  /**
   * Obtém Instagram Business Account ID vinculado à página
   */
  async getInstagramAccountId(
    pageId: string,
    pageAccessToken: string,
  ): Promise<string | null> {
    try {
      const url = `${INSTAGRAM_API_URL}/${pageId}?fields=instagram_business_account&access_token=${pageAccessToken}`;
      const response = await this.fetchWithCircuitBreaker(url, {});
      const data = response as {
        instagram_business_account?: { id: string };
        error?: { message: string };
      };

      if (data.error) {
        throw new Error(`Instagram API error: ${data.error.message}`);
      }

      return data.instagram_business_account?.id || null;
    } catch {
      return null;
    }
  }

  /**
   * Registra webhook para Instagram
   */
  async registerWebhook(
    appId: string,
    appSecret: string,
    pageAccessToken: string,
    webhookUrl: string,
  ): Promise<boolean> {
    try {
      // Instagram webhooks são configurados no App Dashboard do Facebook
      // Verificar se já está configurado
      const url = `${INSTAGRAM_API_URL}/${appId}/subscriptions?access_token=${pageAccessToken}`;
      const response = await this.fetchWithCircuitBreaker(url, {});
      const data = response as {
        data?: Array<{ object: string; callback_url: string }>;
      };

      return data.data?.some(sub => sub.callback_url === webhookUrl) || false;
    } catch {
      return false;
    }
  }

  /**
   * Processa webhook do Instagram Direct
   */
  async handleWebhook(
    c: HonoContext,
    tenantId: string,
    channelId: string,
  ) {
    const logger = createDatadogLogger(c.env);
    const body = await c.req.json();

    if (c.req.method === 'GET') {
      return this.handleWebhookVerification(c);
    }

    try {
      await logger?.info('[Instagram Webhook] Received message', {
        tenantId,
        channelId,
      });

      const result = normalizer.normalize('instagram', body);

      if (result.skip) {
        return c.json({ status: 'ok' }, 200);
      }

      if (!result.success || !result.message) {
        await logger?.error('[Instagram Webhook] Normalization failed', {
          error: result.error,
        });
        return c.json({ status: 'error', message: result.error }, 400);
      }

      const normalizedMsg = result.message;

      await this.saveMessage(c, tenantId, channelId, normalizedMsg);

      await this.channelRepo.incrementMetric(tenantId, 'instagram', 'messages_received_today');

      await logger?.info('[Instagram Webhook] Message saved', {
        messageId: normalizedMsg.message_id,
      });

      return c.json({ status: 'ok' }, 200);
    } catch (error) {
      await logger?.error('[Instagram Webhook] Error processing', {
        error: error instanceof Error ? error.message : String(error),
      });

      await this.channelRepo.incrementCounter(tenantId, 'instagram', 'webhook_failures');
      return c.json({ status: 'error' }, 500);
    }
  }

  private handleWebhookVerification(c: HonoContext) {
    const mode = c.req.query('hub.mode');
    const challenge = c.req.query('hub.challenge');

    if (mode === 'subscribe' && challenge) {
      return c.text(challenge, 200);
    }

    return c.text('Forbidden', 403);
  }

  /**
   * Envia mensagem via Instagram Direct
   */
  async sendMessage(
    igAccountId: string,
    recipientPsid: string,
    message: string,
    pageAccessToken: string,
  ): Promise<boolean> {
    const url = `${INSTAGRAM_API_URL}/${igAccountId}/messages?access_token=${pageAccessToken}`;

    const body = {
      recipient: { id: recipientPsid },
      message: { text: message },
    };

    try {
      await this.fetchWithCircuitBreaker(url, {
        method: 'POST',
        body: JSON.stringify(body),
        headers: { 'Content-Type': 'application/json' },
      });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Envia media via Instagram Direct
   */
  async sendMediaMessage(
    igAccountId: string,
    recipientPsid: string,
    mediaUrl: string,
    mediaType: 'image' | 'video',
    pageAccessToken: string,
  ): Promise<boolean> {
    const url = `${INSTAGRAM_API_URL}/${igAccountId}/messages?access_token=${pageAccessToken}`;

    const body = {
      recipient: { id: recipientPsid },
      message: {
        attachment: {
          type: mediaType,
          payload: { url: mediaUrl },
        },
      },
    };

    try {
      await this.fetchWithCircuitBreaker(url, {
        method: 'POST',
        body: JSON.stringify(body),
        headers: { 'Content-Type': 'application/json' },
      });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Obtém perfil do contato Instagram
   */
  async getSenderProfile(
    igAccountId: string,
    senderPsid: string,
    pageAccessToken: string,
  ): Promise<{ name: string; profile_pic: string } | null> {
    try {
      const url = `${INSTAGRAM_API_URL}/${senderPsid}?fields=username,name,profile_pic&access_token=${pageAccessToken}`;
      const response = await this.fetchWithCircuitBreaker(url, {});
      const data = response as { username?: string; name?: string; profile_pic?: string };

      if (data.username) {
        return {
          name: data.name || data.username,
          profile_pic: data.profile_pic || '',
        };
      }
      return null;
    } catch {
      return null;
    }
  }

  // ============================================================
  // Helpers
  // ============================================================

  private async fetchWithCircuitBreaker(url: string, options: RequestInit): Promise<unknown> {
    const breaker = circuitBreakers['instagram'] || null;

    if (breaker) {
      return breaker.execute(async () => {
        const response = await fetch(url, {
          ...options,
          signal: AbortSignal.timeout(10000),
        });

        if (!response.ok) {
          throw new Error(`Instagram API error: ${response.status}`);
        }

        return response.json();
      });
    }

    const response = await fetch(url, {
      ...options,
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      throw new Error(`Instagram API error: ${response.status}`);
    }

    return response.json();
  }

  /**
   * Salva mensagem normalizada no D1
   */
  private async saveMessage(
    c: HonoContext,
    tenantId: string,
    channelId: string,
    msg: NormalizedIncomingMessage,
  ): Promise<void> {
    const db = c.env.DB;
    const now = new Date().toISOString();
    const conversationId = msg.conversation_id;
    const contactPlatformId = msg.sender.platform_id;
    const contactName = msg.sender.name || null;

    const existingConv = await db
      .prepare(
        `SELECT id FROM conversations
         WHERE tenant_id = ? AND external_conversation_id = ?`,
      )
      .bind(tenantId, conversationId)
      .first<{ id: string }>();

    let convId: string;
    if (!existingConv) {
      convId = crypto.randomUUID();
      await db
        .prepare(
          `INSERT INTO conversations
           (id, tenant_id, channel_id, contact_id, contact_type, status,
            channel_type, external_conversation_id, contact_platform_id,
            contact_name, last_message_at, created_at)
           VALUES (?, ?, ?, ?, 'client', 'open',
                   'instagram', ?, ?, ?, ?, ?)`,
        )
        .bind(
          convId,
          tenantId,
          channelId,
          contactPlatformId,
          conversationId,
          contactPlatformId,
          contactName,
          now,
          now,
        )
        .run();
    } else {
      convId = existingConv.id;
      await db
        .prepare(`UPDATE conversations SET last_message_at = ? WHERE id = ?`)
        .bind(now, convId)
        .run();
    }

    const messageId = crypto.randomUUID();
    await db
      .prepare(
        `INSERT INTO omnichannel_messages
         (id, tenant_id, conversation_id, sender_type, sender_id, content,
          message_type, media_url, external_id, channel_type, channel_message_id,
          sender_platform, raw_payload, is_forwarded, reply_to_message_id,
          metadata, status, created_at)
         VALUES (?, ?, ?, 'contact', ?, ?,
                 ?, ?, ?, 'instagram', ?,
                 'instagram', ?, ?, ?,
                 ?, 'sent', ?)`,
      )
      .bind(
        messageId,
        tenantId,
        convId,
        contactPlatformId,
        msg.text || '',
        msg.message_type,
        msg.media_url || null,
        msg.message_id,
        msg.channel_message_id || null,
        JSON.stringify(msg.raw_payload),
        msg.is_forwarded ? 1 : 0,
        msg.reply_to_message_id || null,
        JSON.stringify(msg.channel_metadata),
        now,
      )
      .run();
  }
}
