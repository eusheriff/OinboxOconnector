/**
 * XChannelService - X (Twitter) DM OAuth + Webhook
 *
 * X usa OAuth 1.0a para autorização e Account Activity API para webhooks.
 * Fluxo:
 * 1. OAuth 1.0a (3-legged) � access_token + access_token_secret
 * 2. Registrar webhook via Account Activity API
 * 3. Webhook recebe DMs � NormalizerService � Inbox
 */

import { HonoContext } from '../../bindings';
import { ChannelRepository } from '../channelRepository';
import { normalizer, NormalizedIncomingMessage } from '../normalizerService';
import { createDatadogLogger } from '../../utils/datadog';
import { circuitBreakers } from '../../utils/circuitBreaker';

const X_API_URL = 'https://api.twitter.com/2';
const X_ACCOUNT_ACTIVITY_URL = 'https://api.twitter.com/1.1/account_activity/all';

export class XChannelService {
  constructor(private channelRepo: ChannelRepository) {}

  /**
   * Gera URL de OAuth 1.0a (3-legged)
   * Nota: OAuth 1.0a requer assinatura HMAC-SHA1
   * Implementação simplificada - em produção usar lib como oauth-1.0a
   */
  getOAuthUrl(consumerKey: string, callbackUrl: string, state: string): string {
    // Passo 1: Obter request token
    // Em produção, isso é feito via backend com assinatura OAuth 1.0a
    return `https://api.twitter.com/oauth/authorize?oauth_token=PENDING_REQUEST_TOKEN&state=${state}`;
  }

  /**
   * Troca OAuth code por access token (simulado)
   * Em produção: usar oauth_token + oauth_verifier para obter access_token
   */
  async exchangeCodeForToken(
    _oauthToken: string,
    _oauthVerifier: string,
  ): Promise<{
    access_token: string;
    access_token_secret: string;
    user_id: string;
    screen_name: string;
  } | null> {
    // OAuth 1.0a é complexo para implementar manualmente
    // Recomenda-se usar uma biblioteca como oauth-sign ou simple-oauth1
    throw new Error('OAuth 1.0a requires external library - use oauth-1.0a package');
  }

  /**
   * Registra webhook na Account Activity API
   */
  async registerWebhook(
    consumerKey: string,
    consumerSecret: string,
    accessToken: string,
    accessTokenSecret: string,
    webhookUrl: string,
  ): Promise<boolean> {
    try {
      // Primeiro, registrar URL do webhook
      const registerUrl = `${X_ACCOUNT_ACTIVITY_URL}/webhooks.json?url=${encodeURIComponent(webhookUrl)}`;

      // Nota: Account Activity API precisa de assinatura OAuth 1.0a
      // Isso é um placeholder - em produção usar biblioteca OAuth 1.0a
      const response = await this.fetchWithOAuth1(
        registerUrl,
        'POST',
        {},
        consumerKey,
        consumerSecret,
        accessToken,
        accessTokenSecret,
      );

      const data = response as { webhook_url?: string; id?: string };
      if (data.webhook_url) {
        // Segundo, subscrever ao ambiente
        const subscribeUrl = `${X_ACCOUNT_ACTIVITY_URL}/subscriptions.json`;
        await this.fetchWithOAuth1(
          subscribeUrl,
          'POST',
          {},
          consumerKey,
          consumerSecret,
          accessToken,
          accessTokenSecret,
        );

        return true;
      }

      return false;
    } catch {
      return false;
    }
  }

  /**
   * Processa webhook de DMs do X
   */
  async handleWebhook(c: HonoContext, tenantId: string, channelId: string) {
    const logger = createDatadogLogger(c.env);
    const body = await c.req.json();

    // CRC validation (Challenge Response Check)
    if (body.crc_token) {
      // X envia crc_token para verificar o webhook
      // Responder com HMAC-SHA256 assinado
      return this.handleCrcCheck(c, body.crc_token);
    }

    try {
      await logger?.info('[X Webhook] Received DM', {
        tenantId,
        channelId,
      });

      const result = normalizer.normalize('x', body);

      if (result.skip) {
        return c.json({ status: 'ok' }, 200);
      }

      if (!result.success || !result.message) {
        await logger?.error('[X Webhook] Normalization failed', {
          error: result.error,
        });
        return c.json({ status: 'error', message: result.error }, 400);
      }

      const normalizedMsg = result.message;

      await this.saveMessage(c, tenantId, channelId, normalizedMsg);

      await this.channelRepo.incrementMetric(tenantId, 'x', 'messages_received_today');

      await logger?.info('[X Webhook] DM saved', {
        messageId: normalizedMsg.message_id,
      });

      return c.json({ status: 'ok' }, 200);
    } catch (error) {
      await logger?.error('[X Webhook] Error processing', {
        error: error instanceof Error ? error.message : String(error),
      });

      await this.channelRepo.incrementCounter(tenantId, 'x', 'webhook_failures');
      return c.json({ status: 'error' }, 500);
    }
  }

  private handleCrcCheck(c: HonoContext, crcToken: string) {
    // Em produção: assinar crc_token com HMAC-SHA256 usando consumer_secret
    // Por agora, apenas retornar ok
    const responseToken = 'PLACEHOLDER_RESPONSE_TOKEN';
    return c.json({ response_token: responseToken }, 200);
  }

  /**
   * Envia DM via X API
   */
  async sendDirectMessage(
    consumerKey: string,
    consumerSecret: string,
    accessToken: string,
    accessTokenSecret: string,
    recipientId: string,
    message: string,
  ): Promise<boolean> {
    const url = `${X_API_URL}/direct_messages/events`;

    const body = {
      event: {
        type: 'message_create',
        message_create: {
          target: { recipient_id: recipientId },
          message_data: { text: message },
        },
      },
    };

    try {
      await this.fetchWithOAuth1(
        url,
        'POST',
        body,
        consumerKey,
        consumerSecret,
        accessToken,
        accessTokenSecret,
      );
      return true;
    } catch {
      return false;
    }
  }

  // ============================================================
  // Helpers
  // ============================================================

  /**
   * Fetch com assinatura OAuth 1.0a (placeholder)
   * Em produção: implementar OAuth 1.0a HMAC-SHA1 signing
   */
  private async fetchWithOAuth1(
    url: string,
    method: string,
    body: unknown,
    _consumerKey: string,
    _consumerSecret: string,
    _accessToken: string,
    _accessTokenSecret: string,
  ): Promise<unknown> {
    // OAuth 1.0a signing requer:
    // 1. Criar base string (method + url + params)
    // 2. Assinar com HMAC-SHA1
    // 3. Adicionar Authorization header
    // Usar biblioteca oauth-1.0a ou similar

    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        // 'Authorization': oauth1Header, // Em produção
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      throw new Error(`X API error: ${response.status}`);
    }

    return response.json();
  }

  private async fetchWithCircuitBreaker(url: string, options: RequestInit): Promise<unknown> {
    const breaker = circuitBreakers['x'] || null;

    if (breaker) {
      return breaker.execute(async () => {
        const response = await fetch(url, {
          ...options,
          signal: AbortSignal.timeout(10000),
        });

        if (!response.ok) {
          throw new Error(`X API error: ${response.status}`);
        }

        return response.json();
      });
    }

    const response = await fetch(url, {
      ...options,
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      throw new Error(`X API error: ${response.status}`);
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
                   'x', ?, ?, ?, ?, ?)`,
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
                 ?, ?, ?, 'x', ?,
                 'x', ?, ?, ?,
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
