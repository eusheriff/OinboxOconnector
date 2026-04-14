/**
 * TikTokChannelService - TikTok Messaging API OAuth + Webhook
 *
 * Fluxo:
 * 1. OAuth 2.0 â access_token
 * 2. Webhook recebe mensagens â NormalizerService â Inbox
 */

import { HonoContext } from '../../bindings';
import { ChannelRepository } from '../channelRepository';
import { normalizer, NormalizedIncomingMessage } from '../normalizerService';
import { createDatadogLogger } from '../../utils/datadog';
import { circuitBreakers } from '../../utils/circuitBreaker';

const TIKTOK_OAUTH_URL = 'https://www.tiktok.com/v2/auth/authorize';
const TIKTOK_TOKEN_URL = 'https://open.tiktokapis.com/v2/oauth/token/';
const TIKTOK_API_URL = 'https://open.tiktokapis.com/v2';

export class TikTokChannelService {
  constructor(private channelRepo: ChannelRepository) {}

  /**
   * Gera URL de OAuth TikTok
   */
  getOAuthUrl(
    clientKey: string,
    redirectUri: string,
    state: string,
  ): string {
    const params = new URLSearchParams({
      client_key: clientKey,
      redirect_uri: redirectUri,
      state,
      scope: 'user.info.basic,imessage.send,imessage.receive',
      response_type: 'code',
    });

    return `${TIKTOK_OAUTH_URL}?${params.toString()}`;
  }

  /**
   * Troca authorization code por access token
   */
  async exchangeCodeForToken(
    code: string,
    clientKey: string,
    clientSecret: string,
    redirectUri: string,
  ): Promise<{
    access_token: string;
    refresh_token: string;
    open_id: string;
    expires_in: number;
  } | null> {
    try {
      const response = await this.fetchWithCircuitBreaker(TIKTOK_TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          redirect_uri: redirectUri,
          client_key: clientKey,
          client_secret: clientSecret,
        }).toString(),
      });

      const data = response as {
        data?: {
          open_id: string;
          access_token: string;
          refresh_token: string;
          expires_in: number;
        };
        error?: { code: string; message: string };
      };

      if (data.error) {
        throw new Error(`TikTok OAuth error: ${data.error.message}`);
      }

      if (data.data?.access_token) {
        return {
          access_token: data.data.access_token,
          refresh_token: data.data.refresh_token,
          open_id: data.data.open_id,
          expires_in: data.data.expires_in,
        };
      }

      return null;
    } catch {
      return null;
    }
  }

  /**
   * Refresh access token
   */
  async refreshToken(
    refreshToken: string,
    clientKey: string,
    clientSecret: string,
  ): Promise<{
    access_token: string;
    refresh_token: string;
    expires_in: number;
  } | null> {
    try {
      const response = await this.fetchWithCircuitBreaker(TIKTOK_TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
          client_key: clientKey,
          client_secret: clientSecret,
        }).toString(),
      });

      const data = response as {
        data?: {
          access_token: string;
          refresh_token: string;
          expires_in: number;
        };
      };

      if (data.data?.access_token) {
        return {
          access_token: data.data.access_token,
          refresh_token: data.data.refresh_token,
          expires_in: data.data.expires_in,
        };
      }

      return null;
    } catch {
      return null;
    }
  }

  /**
   * Processa webhook do TikTok
   */
  async handleWebhook(
    c: HonoContext,
    tenantId: string,
    channelId: string,
  ) {
    const logger = createDatadogLogger(c.env);
    const body = await c.req.json();

    try {
      await logger?.info('[TikTok Webhook] Received message', {
        tenantId,
        channelId,
      });

      const result = normalizer.normalize('tiktok', body);

      if (result.skip) {
        return c.json({ status: 'ok' }, 200);
      }

      if (!result.success || !result.message) {
        await logger?.error('[TikTok Webhook] Normalization failed', {
          error: result.error,
        });
        return c.json({ status: 'error', message: result.error }, 400);
      }

      const normalizedMsg = result.message;

      await this.saveMessage(c, tenantId, channelId, normalizedMsg);

      await this.channelRepo.incrementMetric(tenantId, 'tiktok', 'messages_received_today');

      await logger?.info('[TikTok Webhook] Message saved', {
        messageId: normalizedMsg.message_id,
      });

      return c.json({ status: 'ok' }, 200);
    } catch (error) {
      await logger?.error('[TikTok Webhook] Error processing', {
        error: error instanceof Error ? error.message : String(error),
      });

      await this.channelRepo.incrementCounter(tenantId, 'tiktok', 'webhook_failures');
      return c.json({ status: 'error' }, 500);
    }
  }

  /**
   * Envia mensagem via TikTok Messaging API
   */
  async sendMessage(
    accessToken: string,
    openId: string,
    message: string,
  ): Promise<boolean> {
    const url = `${TIKTOK_API_URL}/message/send/`;

    try {
      await this.fetchWithCircuitBreaker(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json; charset=UTF-8',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          content: message,
          sender: { open_id: openId },
          message_type: 'text',
        }),
      });
      return true;
    } catch {
      return false;
    }
  }

  // ============================================================
  // Helpers
  // ============================================================

  private async fetchWithCircuitBreaker(url: string, options: RequestInit): Promise<unknown> {
    const breaker = circuitBreakers['tiktok'] || null;

    if (breaker) {
      return breaker.execute(async () => {
        const response = await fetch(url, {
          ...options,
          signal: AbortSignal.timeout(10000),
        });

        if (!response.ok) {
          throw new Error(`TikTok API error: ${response.status}`);
        }

        return response.json();
      });
    }

    const response = await fetch(url, {
      ...options,
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      throw new Error(`TikTok API error: ${response.status}`);
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
                   'tiktok', ?, ?, ?, ?, ?)`,
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
                 ?, ?, ?, 'tiktok', ?,
                 'tiktok', ?, ?, ?,
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
