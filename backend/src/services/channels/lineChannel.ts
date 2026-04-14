/**
 * LineChannelService - Line Messaging API + Webhook
 *
 * Line usa Channel Secret + Channel Access Token (não OAuth tradicional).
 * Fluxo:
 * 1. User cria Channel no Line Developers Console
 * 2. Channel Secret + Access Token salvos no D1
 * 3. Webhook URL configurado no Line Console
 * 4. Webhook recebe mensagens � NormalizerService � Inbox
 */

import { HonoContext } from '../../bindings';
import { ChannelRepository } from '../channelRepository';
import { normalizer, NormalizedIncomingMessage } from '../normalizerService';
import { createDatadogLogger } from '../../utils/datadog';
import { circuitBreakers } from '../../utils/circuitBreaker';

const LINE_API_URL = 'https://api.line.me/v2/bot';
const LINE_OAUTH_URL = 'https://api.line.me/oauth2/v2.1/token';

export class LineChannelService {
  constructor(private channelRepo: ChannelRepository) {}

  /**
   * Valida formato do Channel Secret
   */
  validateChannelSecret(secret: string): boolean {
    return secret.length > 0;
  }

  /**
   * Obtém Channel Access Token via Client Credentials
   */
  async getChannelAccessToken(
    channelId: string,
    channelSecret: string,
  ): Promise<{
    access_token: string;
    expires_in: number;
    token_type: string;
  } | null> {
    try {
      const response = await this.fetchWithCircuitBreaker(LINE_OAUTH_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: channelId,
          client_secret: channelSecret,
        }).toString(),
      });

      const data = response as {
        access_token?: string;
        expires_in?: number;
        token_type?: string;
        error?: string;
        error_description?: string;
      };

      if (data.error) {
        throw new Error(`Line OAuth error: ${data.error_description}`);
      }

      if (data.access_token) {
        return {
          access_token: data.access_token,
          expires_in: data.expires_in || 2592000, // 30 dias
          token_type: data.token_type || 'Bearer',
        };
      }

      return null;
    } catch {
      return null;
    }
  }

  /**
   * Obtém informações do bot
   */
  async getBotInfo(accessToken: string): Promise<{
    userId: string;
    basicId: string;
    premiumId?: string;
    displayName: string;
    pictureUrl?: string;
  } | null> {
    try {
      const url = `${LINE_API_URL}/info`;
      const response = await this.fetchWithCircuitBreaker(url, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      const data = response as {
        userId?: string;
        basicId?: string;
        premiumId?: string;
        displayName?: string;
        pictureUrl?: string;
      };

      if (data.userId) {
        return {
          userId: data.userId,
          basicId: data.basicId!,
          premiumId: data.premiumId,
          displayName: data.displayName || 'Bot',
          pictureUrl: data.pictureUrl,
        };
      }

      return null;
    } catch {
      return null;
    }
  }

  /**
   * Processa webhook do Line
   */
  async handleWebhook(c: HonoContext, tenantId: string, channelId: string, channelSecret: string) {
    const logger = createDatadogLogger(c.env);

    // Validar assinatura do webhook
    const isValid = await this.verifyWebhookSignature(c, channelSecret);
    if (!isValid) {
      return c.json({ error: 'Invalid signature' }, 401);
    }

    const body = await c.req.json();

    try {
      await logger?.info('[Line Webhook] Received message', {
        tenantId,
        channelId,
        eventCount: body.events?.length || 0,
      });

      const result = normalizer.normalize('line', body);

      if (result.skip) {
        return c.json({ status: 'ok' }, 200);
      }

      if (!result.success || !result.message) {
        await logger?.error('[Line Webhook] Normalization failed', {
          error: result.error,
        });
        return c.json({ status: 'error', message: result.error }, 400);
      }

      const normalizedMsg = result.message;

      await this.saveMessage(c, tenantId, channelId, normalizedMsg);

      await this.channelRepo.incrementMetric(tenantId, 'line', 'messages_received_today');

      await logger?.info('[Line Webhook] Message saved', {
        messageId: normalizedMsg.message_id,
      });

      return c.json({ status: 'ok' }, 200);
    } catch (error) {
      await logger?.error('[Line Webhook] Error processing', {
        error: error instanceof Error ? error.message : String(error),
      });

      await this.channelRepo.incrementCounter(tenantId, 'line', 'webhook_failures');
      return c.json({ status: 'error' }, 500);
    }
  }

  /**
   * Verifica assinatura do webhook Line
   */
  private async verifyWebhookSignature(c: HonoContext, channelSecret: string): Promise<boolean> {
    const body = await c.req.text();
    const signature = c.req.header('X-Line-Signature');

    if (!signature) {
      return false;
    }

    // Line usa HMAC-SHA256 para assinar o body
    // Em Cloudflare Workers, usar SubtleCrypto
    try {
      const encoder = new TextEncoder();
      const key = await crypto.subtle.importKey(
        'raw',
        encoder.encode(channelSecret),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign'],
      );

      const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(body));
      const calculatedSig = btoa(String.fromCharCode(...new Uint8Array(sig)));

      return calculatedSig === signature;
    } catch {
      return false;
    }
  }

  /**
   * Envia mensagem de texto via Line
   */
  async sendMessage(accessToken: string, replyToken: string, message: string): Promise<boolean> {
    try {
      const url = `${LINE_API_URL}/message/reply`;
      const response = await this.fetchWithCircuitBreaker(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          replyToken,
          messages: [{ type: 'text', text: message }],
        }),
      });

      const data = response as Record<string, unknown>;
      return !data.error;
    } catch {
      return false;
    }
  }

  /**
   * Envia push message via Line (sem reply token)
   */
  async pushMessage(accessToken: string, userId: string, message: string): Promise<boolean> {
    try {
      const url = `${LINE_API_URL}/message/push`;
      const response = await this.fetchWithCircuitBreaker(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          to: userId,
          messages: [{ type: 'text', text: message }],
        }),
      });

      const data = response as Record<string, unknown>;
      return !data.error;
    } catch {
      return false;
    }
  }

  /**
   * Envia imagem via Line
   */
  async sendImage(accessToken: string, replyToken: string, imageUrl: string): Promise<boolean> {
    try {
      const url = `${LINE_API_URL}/message/reply`;
      const response = await this.fetchWithCircuitBreaker(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          replyToken,
          messages: [
            {
              type: 'image',
              originalContentUrl: imageUrl,
              previewImageUrl: imageUrl,
            },
          ],
        }),
      });

      const data = response as Record<string, unknown>;
      return !data.error;
    } catch {
      return false;
    }
  }

  // ============================================================
  // Helpers
  // ============================================================

  private async fetchWithCircuitBreaker(url: string, options: RequestInit): Promise<unknown> {
    const breaker = circuitBreakers['line'] || null;

    if (breaker) {
      return breaker.execute(async () => {
        const response = await fetch(url, {
          ...options,
          signal: AbortSignal.timeout(10000),
        });

        if (!response.ok) {
          throw new Error(`Line API error: ${response.status}`);
        }

        return response.json();
      });
    }

    const response = await fetch(url, {
      ...options,
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      throw new Error(`Line API error: ${response.status}`);
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
                   'line', ?, ?, ?, ?, ?)`,
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
                 ?, ?, ?, 'line', ?,
                 'line', ?, ?, ?,
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
