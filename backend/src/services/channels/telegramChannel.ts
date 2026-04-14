/**
 * TelegramChannelService - Telegram Bot API + Webhook
 *
 * Telegram usa Bot Token (não OAuth).
 * Fluxo:
 * 1. User cria bot via @BotFather � recebe token
 * 2. Token salvo no D1
 * 3. setWebhook API registra URL de webhook
 * 4. Webhook recebe mensagens � NormalizerService � Inbox
 */

import { HonoContext } from '../../bindings';
import { ChannelRepository } from '../channelRepository';
import { normalizer, NormalizedIncomingMessage } from '../normalizerService';
import { createDatadogLogger } from '../../utils/datadog';
import { circuitBreakers } from '../../utils/circuitBreaker';

const TELEGRAM_API_URL = 'https://api.telegram.org/bot';

export class TelegramChannelService {
  constructor(private channelRepo: ChannelRepository) {}

  /**
   * Valida formato do bot token
   */
  validateBotToken(token: string): boolean {
    // Formato: 123456789:ABCdefGHIjklMNOpqrsTUVwxyz
    return /^\d+:[A-Za-z0-9_-]{35,}$/.test(token);
  }

  /**
   * Obtém informações do bot via getMe
   */
  async getBotInfo(botToken: string): Promise<{
    id: number;
    username: string;
    first_name: string;
    is_bot: boolean;
  } | null> {
    try {
      const url = `${TELEGRAM_API_URL}${botToken}/getMe`;
      const response = await this.fetchWithCircuitBreaker(url, {});
      const data = response as {
        ok?: boolean;
        result?: { id: number; username: string; first_name: string; is_bot: boolean };
      };

      if (data.ok && data.result) {
        return data.result;
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Registra webhook via setWebhook
   */
  async registerWebhook(botToken: string, webhookUrl: string): Promise<boolean> {
    try {
      const url = `${TELEGRAM_API_URL}${botToken}/setWebhook`;
      const response = await this.fetchWithCircuitBreaker(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: webhookUrl,
          allowed_updates: ['message', 'edited_message', 'channel_post'],
        }),
      });

      const data = response as { ok?: boolean };
      return data.ok === true;
    } catch {
      return false;
    }
  }

  /**
   * Remove webhook (para desconectar)
   */
  async deleteWebhook(botToken: string): Promise<boolean> {
    try {
      const url = `${TELEGRAM_API_URL}${botToken}/deleteWebhook`;
      const response = await this.fetchWithCircuitBreaker(url, {
        method: 'POST',
      });

      const data = response as { ok?: boolean };
      return data.ok === true;
    } catch {
      return false;
    }
  }

  /**
   * Obtém informações do webhook atual
   */
  async getWebhookInfo(botToken: string): Promise<{
    url: string;
    has_custom_certificate: boolean;
    pending_update_count: number;
    last_error_date?: number;
    last_error_message?: string;
  } | null> {
    try {
      const url = `${TELEGRAM_API_URL}${botToken}/getWebhookInfo`;
      const response = await this.fetchWithCircuitBreaker(url, {});
      const data = response as { ok?: boolean; result?: Record<string, unknown> };

      if (data.ok && data.result) {
        return data.result as {
          url: string;
          has_custom_certificate: boolean;
          pending_update_count: number;
          last_error_date?: number;
          last_error_message?: string;
        };
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Processa webhook do Telegram
   */
  async handleWebhook(c: HonoContext, tenantId: string, channelId: string) {
    const logger = createDatadogLogger(c.env);
    const body = await c.req.json();

    try {
      await logger?.info('[Telegram Webhook] Received message', {
        tenantId,
        channelId,
        hasMessage: !!body.message,
      });

      const result = normalizer.normalize('telegram', body);

      if (result.skip) {
        return c.json({ status: 'ok' }, 200);
      }

      if (!result.success || !result.message) {
        await logger?.error('[Telegram Webhook] Normalization failed', {
          error: result.error,
        });
        return c.json({ status: 'error', message: result.error }, 400);
      }

      const normalizedMsg = result.message;

      await this.saveMessage(c, tenantId, channelId, normalizedMsg);

      await this.channelRepo.incrementMetric(tenantId, 'telegram', 'messages_received_today');

      await logger?.info('[Telegram Webhook] Message saved', {
        messageId: normalizedMsg.message_id,
        chatId: normalizedMsg.sender.platform_id,
      });

      return c.json({ status: 'ok' }, 200);
    } catch (error) {
      await logger?.error('[Telegram Webhook] Error processing', {
        error: error instanceof Error ? error.message : String(error),
      });

      await this.channelRepo.incrementCounter(tenantId, 'telegram', 'webhook_failures');
      return c.json({ status: 'error' }, 500);
    }
  }

  /**
   * Envia mensagem via Telegram Bot API
   */
  async sendMessage(
    botToken: string,
    chatId: number | string,
    message: string,
  ): Promise<number | null> {
    try {
      const url = `${TELEGRAM_API_URL}${botToken}/sendMessage`;
      const response = await this.fetchWithCircuitBreaker(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: message,
          parse_mode: 'HTML',
        }),
      });

      const data = response as { ok?: boolean; result?: { message_id: number } };
      return data.ok && data.result ? data.result.message_id : null;
    } catch {
      return null;
    }
  }

  /**
   * Envia foto via Telegram
   */
  async sendPhoto(
    botToken: string,
    chatId: number | string,
    photoUrl: string,
    caption?: string,
  ): Promise<number | null> {
    try {
      const url = `${TELEGRAM_API_URL}${botToken}/sendPhoto`;
      const response = await this.fetchWithCircuitBreaker(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          photo: photoUrl,
          caption: caption || '',
        }),
      });

      const data = response as { ok?: boolean; result?: { message_id: number } };
      return data.ok && data.result ? data.result.message_id : null;
    } catch {
      return null;
    }
  }

  /**
   * Envia documento via Telegram
   */
  async sendDocument(
    botToken: string,
    chatId: number | string,
    documentUrl: string,
    caption?: string,
  ): Promise<number | null> {
    try {
      const url = `${TELEGRAM_API_URL}${botToken}/sendDocument`;
      const response = await this.fetchWithCircuitBreaker(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          document: documentUrl,
          caption: caption || '',
        }),
      });

      const data = response as { ok?: boolean; result?: { message_id: number } };
      return data.ok && data.result ? data.result.message_id : null;
    } catch {
      return null;
    }
  }

  /**
   * Envia audio via Telegram
   */
  async sendAudio(
    botToken: string,
    chatId: number | string,
    audioUrl: string,
    caption?: string,
  ): Promise<number | null> {
    try {
      const url = `${TELEGRAM_API_URL}${botToken}/sendAudio`;
      const response = await this.fetchWithCircuitBreaker(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          audio: audioUrl,
          caption: caption || '',
        }),
      });

      const data = response as { ok?: boolean; result?: { message_id: number } };
      return data.ok && data.result ? data.result.message_id : null;
    } catch {
      return null;
    }
  }

  /**
   * Faz download de arquivo do Telegram
   */
  async getFileUrl(botToken: string, fileId: string): Promise<string | null> {
    try {
      const url = `${TELEGRAM_API_URL}${botToken}/getFile?file_id=${fileId}`;
      const response = await this.fetchWithCircuitBreaker(url, {});
      const data = response as {
        ok?: boolean;
        result?: { file_path: string; file_size: number };
      };

      if (data.ok && data.result) {
        return `https://api.telegram.org/file/bot${botToken}/${data.result.file_path}`;
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
    const breaker = circuitBreakers['telegram'] || null;

    if (breaker) {
      return breaker.execute(async () => {
        const response = await fetch(url, {
          ...options,
          signal: AbortSignal.timeout(10000),
        });

        if (!response.ok) {
          throw new Error(`Telegram API error: ${response.status}`);
        }

        return response.json();
      });
    }

    const response = await fetch(url, {
      ...options,
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      throw new Error(`Telegram API error: ${response.status}`);
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
                   'telegram', ?, ?, ?, ?, ?)`,
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

    // Para media do Telegram, converter file_id para URL real
    const finalMediaUrl = msg.media_url;
    const token = await this.channelRepo.getOAuthToken(channelId, 'telegram');
    if (token?.bot_username && finalMediaUrl && !finalMediaUrl.startsWith('http')) {
      // � um file_id do Telegram, precisa converter
      // Isso seria feito async em background
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
                 ?, ?, ?, 'telegram', ?,
                 'telegram', ?, ?, ?,
                 ?, 'sent', ?)`,
      )
      .bind(
        messageId,
        tenantId,
        convId,
        contactPlatformId,
        msg.text || '',
        msg.message_type,
        finalMediaUrl || null,
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
