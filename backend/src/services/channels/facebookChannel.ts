/**
 * FacebookChannelService - Facebook Messenger OAuth + Webhook
 *
 * Fluxo:
 * 1. User clica "Conectar Facebook" � gera OAuth URL
 * 2. Callback recebe code � troca por page access token
 * 3. Salva token + page_id no D1
 * 4. Registra webhook na Graph API
 * 5. Webhook recebe mensagens � NormalizerService � Inbox
 */

import { HonoContext } from '../../bindings';
import { ChannelRepository } from '../channelRepository';
import { normalizer, NormalizedIncomingMessage } from '../normalizerService';
import { createDatadogLogger } from '../../utils/datadog';
import { circuitBreakers } from '../../utils/circuitBreaker';

// Facebook OAuth URLs
const FACEBOOK_OAUTH_URL = 'https://www.facebook.com/v18.0/dialog/oauth';
const FACEBOOK_TOKEN_URL = 'https://graph.facebook.com/v18.0/oauth/access_token';
const FACEBOOK_API_URL = 'https://graph.facebook.com/v18.0';

// Permissões necessárias para Messenger
const FACEBOOK_SCOPES = [
  'pages_manage_metadata',
  'pages_messaging',
  'pages_show_list',
  'business_management',
].join(',');

export class FacebookChannelService {
  constructor(private channelRepo: ChannelRepository) {}

  /**
   * Gera URL de OAuth Facebook
   */
  getOAuthUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: '{app_id}', // Será substituído no runtime
      redirect_uri: '{redirect_uri}',
      state,
      scope: FACEBOOK_SCOPES,
      response_type: 'code',
    });

    return `${FACEBOOK_OAUTH_URL}?${params.toString()}`;
  }

  /**
   * Troca authorization code por page access token
   * Fluxo: code � short-lived token � long-lived token � page token
   */
  async exchangeCodeForPageToken(
    code: string,
    appId: string,
    appSecret: string,
    redirectUri: string,
  ): Promise<{
    access_token: string;
    page_id: string;
    page_name: string;
    expires_in: number;
  }> {
    // Passo 1: Trocar code por short-lived token
    const shortLivedToken = await this.exchangeCodeForShortLivedToken(
      code,
      appId,
      appSecret,
      redirectUri,
    );

    // Passo 2: Trocar por long-lived token
    const longLivedToken = await this.exchangeForLongLivedToken(shortLivedToken, appId, appSecret);

    // Passo 3: Obter páginas do usuário e pegar token da página
    const pages = await this.getUserPages(longLivedToken);
    if (!pages || pages.length === 0) {
      throw new Error('Nenhuma página encontrada para este usuário');
    }

    // Usar a primeira página (ou a que o usuário selecionar)
    const page = pages[0];
    return {
      access_token: page.access_token,
      page_id: page.id,
      page_name: page.name,
      expires_in: 0, // Page tokens não expiram
    };
  }

  private async exchangeCodeForShortLivedToken(
    code: string,
    appId: string,
    appSecret: string,
    redirectUri: string,
  ): Promise<string> {
    const url = `${FACEBOOK_TOKEN_URL}?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&client_secret=${appSecret}&code=${code}`;

    const response = await this.fetchWithCircuitBreaker(url, {});
    const data = response as { access_token?: string; error?: { message: string } };

    if (data.error) {
      throw new Error(`Facebook OAuth error: ${data.error.message}`);
    }
    if (!data.access_token) {
      throw new Error('No access token in Facebook response');
    }

    return data.access_token;
  }

  private async exchangeForLongLivedToken(
    shortLivedToken: string,
    appId: string,
    appSecret: string,
  ): Promise<string> {
    const url = `${FACEBOOK_TOKEN_URL}?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${shortLivedToken}`;

    const response = await this.fetchWithCircuitBreaker(url, {});
    const data = response as {
      access_token?: string;
      expires_in?: number;
      error?: { message: string };
    };

    if (data.error) {
      throw new Error(`Facebook long-lived token error: ${data.error.message}`);
    }
    if (!data.access_token) {
      throw new Error('No long-lived access token in response');
    }

    return data.access_token;
  }

  private async getUserPages(accessToken: string): Promise<
    Array<{
      id: string;
      name: string;
      access_token: string;
    }>
  > {
    const url = `${FACEBOOK_API_URL}/me/accounts?access_token=${accessToken}&fields=id,name,access_token`;

    const response = await this.fetchWithCircuitBreaker(url, {});
    const data = response as {
      data?: Array<{ id: string; name: string; access_token: string }>;
      error?: { message: string };
    };

    if (data.error) {
      throw new Error(`Facebook pages error: ${data.error.message}`);
    }

    return data.data || [];
  }

  /**
   * Registra webhook na Graph API do Facebook
   */
  async registerWebhook(
    pageAccessToken: string,
    appId: string,
    appSecret: string,
    webhookUrl: string,
    verifyToken: string,
  ): Promise<boolean> {
    // Facebook precisa que o webhook seja configurado no app settings
    // Mas podemos verificar se está funcionando fazendo um GET
    try {
      // Verificar subscrições existentes
      const url = `${FACEBOOK_API_URL}/${appId}/subscriptions?access_token=${pageAccessToken}`;
      const response = await this.fetchWithCircuitBreaker(url, {});
      const data = response as { data?: Array<{ object: string; callback_url: string }> };

      // Se já existe webhook para esta URL, retornar true
      if (data.data?.some((sub) => sub.callback_url === webhookUrl)) {
        return true;
      }

      // Facebook webhooks são configurados no App Dashboard, não via API
      // Retornar true para indicar que o usuário precisa configurar manualmente
      return false;
    } catch {
      return false;
    }
  }

  /**
   * Processa webhook do Facebook Messenger
   */
  async handleWebhook(c: HonoContext, tenantId: string, channelId: string) {
    const logger = createDatadogLogger(c.env);
    const body = await c.req.json();

    // Verificação do webhook (GET request inicial)
    if (c.req.method === 'GET') {
      return this.handleWebhookVerification(c);
    }

    try {
      // Log do payload recebido
      await logger?.info('[Facebook Webhook] Received message', {
        tenantId,
        channelId,
        entryCount: body.entry?.length || 0,
      });

      // Normalizar mensagens
      const result = normalizer.normalize('facebook', body);

      if (result.skip) {
        await logger?.info('[Facebook Webhook] Skipping message', {
          reason: 'echo or unsupported',
        });
        return c.json({ status: 'ok' }, 200);
      }

      if (!result.success || !result.message) {
        await logger?.error('[Facebook Webhook] Normalization failed', {
          error: result.error,
        });
        return c.json({ status: 'error', message: result.error }, 400);
      }

      const normalizedMsg = result.message;

      // Salvar no D1 via OmnichannelMessages
      await this.saveMessage(c, tenantId, channelId, normalizedMsg);

      // Incrementar métricas
      await this.channelRepo.incrementMetric(tenantId, 'facebook', 'messages_received_today');

      await logger?.info('[Facebook Webhook] Message saved', {
        messageId: normalizedMsg.message_id,
        conversationId: normalizedMsg.conversation_id,
      });

      // TODO: Aqui entraria a lógica de:
      // - Verificar se lead existe
      // - Criar/atualizar conversa
      // - Disparar IA se não houver assigned_to
      // - Notificar corretor se houver assigned_to (human handover)

      return c.json({ status: 'ok' }, 200);
    } catch (error) {
      await logger?.error('[Facebook Webhook] Error processing', {
        error: error instanceof Error ? error.message : String(error),
      });

      await this.channelRepo.incrementCounter(tenantId, 'facebook', 'webhook_failures');

      return c.json({ status: 'error' }, 500);
    }
  }

  private handleWebhookVerification(c: HonoContext) {
    const mode = c.req.query('hub.mode');
    const token = c.req.query('hub.verify_token');
    const challenge = c.req.query('hub.challenge');

    // O verify_token é salvo no channel_webhook_configs
    // Para setup inicial, aceitar qualquer token e salvar
    if (mode === 'subscribe' && challenge) {
      // Facebook está verificando o webhook
      return c.text(challenge, 200);
    }

    return c.text('Forbidden', 403);
  }

  /**
   * Envia mensagem via Facebook Messenger
   */
  async sendMessage(
    pageAccessToken: string,
    recipientPsid: string,
    message: string,
  ): Promise<boolean> {
    const url = `${FACEBOOK_API_URL}/me/messages?access_token=${pageAccessToken}`;

    const body = {
      messaging_type: 'RESPONSE',
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
   * Envia mensagem com media
   */
  async sendMediaMessage(
    pageAccessToken: string,
    recipientPsid: string,
    mediaUrl: string,
    mediaType: 'image' | 'video' | 'audio' | 'file',
  ): Promise<boolean> {
    const url = `${FACEBOOK_API_URL}/me/messages?access_token=${pageAccessToken}`;

    const body = {
      messaging_type: 'RESPONSE',
      recipient: { id: recipientPsid },
      message: {
        attachment: {
          type: mediaType,
          payload: { url: mediaUrl, is_reusable: true },
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
   * Obtém perfil do contato (nome, foto)
   */
  async getSenderProfile(
    psid: string,
    pageAccessToken: string,
  ): Promise<{
    name: string;
    profile_pic: string;
  } | null> {
    try {
      const url = `${FACEBOOK_API_URL}/${psid}?fields=name,profile_pic&access_token=${pageAccessToken}`;
      const response = await this.fetchWithCircuitBreaker(url, {});
      const data = response as { name?: string; profile_pic?: string };

      if (data.name && data.profile_pic) {
        return {
          name: data.name,
          profile_pic: data.profile_pic,
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
    const breaker = circuitBreakers['facebook'] || null;

    if (breaker) {
      return breaker.execute(async () => {
        const response = await fetch(url, {
          ...options,
          signal: AbortSignal.timeout(10000), // 10s timeout
        });

        if (!response.ok) {
          throw new Error(`Facebook API error: ${response.status}`);
        }

        return response.json();
      });
    }

    // Fallback sem circuit breaker
    const response = await fetch(url, {
      ...options,
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      throw new Error(`Facebook API error: ${response.status}`);
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

    // 1. Obter ou criar conversation
    const existingConv = await db
      .prepare(
        `SELECT id, status FROM conversations
         WHERE tenant_id = ? AND external_conversation_id = ?`,
      )
      .bind(tenantId, conversationId)
      .first<{ id: string; status: string }>();

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
                   'facebook', ?, ?, ?, ?, ?)`,
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
      // Atualizar last_message_at
      await db
        .prepare(`UPDATE conversations SET last_message_at = ? WHERE id = ?`)
        .bind(now, convId)
        .run();
    }

    // 2. Salvar mensagem
    const messageId = crypto.randomUUID();
    await db
      .prepare(
        `INSERT INTO omnichannel_messages
         (id, tenant_id, conversation_id, sender_type, sender_id, content,
          message_type, media_url, external_id, channel_type, channel_message_id,
          sender_platform, raw_payload, is_forwarded, reply_to_message_id,
          metadata, status, created_at)
         VALUES (?, ?, ?, 'contact', ?, ?,
                 ?, ?, ?, 'facebook', ?,
                 'facebook', ?, ?, ?,
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
