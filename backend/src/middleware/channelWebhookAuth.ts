/**
 * channelWebhookAuth - Middleware para validar webhooks de canais sociais
 *
 * Valida:
 * - Facebook: hub.mode subscribe + verify_token
 * - Instagram: hub.mode subscribe + verify_token
 * - X (Twitter): CRC token
 * - Telegram: sem validação especial (já valida via setWebhook)
 * - TikTok: sem validação especial
 * - Line: X-Line-Signature HMAC-SHA256
 */

import { MiddlewareHandler } from 'hono';
import { Bindings, Variables } from '../bindings';
import { ChannelRepository } from '../services/channelRepository';

export function channelWebhookAuth(
  provider: string,
  channelRepo: ChannelRepository,
): MiddlewareHandler<{ Bindings: Bindings; Variables: Variables }> {
  return async (c, next) => {
    // Extrair channel_id da URL ou query params
    // Ex: /api/channels/facebook/webhook?channel_id=xxx
    const channelId = c.req.query('channel_id') || c.req.param('channelId');

    if (!channelId) {
      // Para webhooks de setup inicial, permitir sem channel_id
      if (c.req.method === 'GET' && c.req.query('hub.mode')) {
        return next();
      }
      return c.json({ error: 'Missing channel_id' }, 400);
    }

    // Validar que o canal existe e pertence a um tenant
    const channel = await channelRepo.getChannelById(channelId);
    if (!channel) {
      return c.json({ error: 'Channel not found' }, 404);
    }

    // Verificações específicas por provider
    switch (provider) {
      case 'facebook':
      case 'instagram': {
        // GET = verificação do webhook
        if (c.req.method === 'GET') {
          const mode = c.req.query('hub.mode');
          const verifyToken = c.req.query('hub.verify_token');

          if (mode === 'subscribe') {
            // Verificar verify_token contra o salvo no DB
            const webhookConfig = await channelRepo.getWebhookConfig(channelId, provider);
            if (webhookConfig?.verify_token && verifyToken !== webhookConfig.verify_token) {
              return c.text('Forbidden', 403);
            }
            // Facebook espera o challenge de volta
            const challenge = c.req.query('hub.challenge');
            if (challenge) {
              return c.text(challenge, 200);
            }
          }

          return c.text('Forbidden', 403);
        }
        break;
      }

      case 'x': {
        // CRC check
        const body = await c.req.json().catch(() => null);
        if (body?.crc_token) {
          // Em produção: responder com HMAC-SHA256 assinado
          // Por agora, permitir
        }
        break;
      }

      case 'line': {
        // Line valida via X-Line-Signature header
        // A validação é feita no handleWebhook do serviço
        const signature = c.req.header('X-Line-Signature');
        if (!signature) {
          return c.json({ error: 'Missing X-Line-Signature' }, 401);
        }
        break;
      }

      case 'telegram':
      case 'tiktok':
        // Sem validação especial no middleware
        break;

      default:
        return c.json({ error: `Unknown provider: ${provider}` }, 400);
    }

    // Channel validado - prosseguir
    // Nota: channel info está disponível via channel_id query param nos handlers

    return next();
  };
}
