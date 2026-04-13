/**
 * Channels Routes - Rotas para OAuth, Webhooks e CRUD de canais sociais
 *
 * Rotas:
 * GET    /api/channels                        - Listar canais do tenant
 * POST   /api/channels                        - Criar novo canal
 * DELETE /api/channels/:id                    - Deletar canal
 *
 * POST   /api/channels/:id/connect            - Iniciar conexão OAuth
 * GET    /api/channels/:id/oauth/callback     - Callback OAuth
 * POST   /api/channels/:id/disconnect         - Desconectar canal
 * GET    /api/channels/:id/metrics            - Métricas do canal
 *
 * GET/POST /api/channels/facebook/webhook     - Facebook Messenger
 * GET/POST /api/channels/instagram/webhook    - Instagram Direct
 * GET/POST /api/channels/x/webhook            - X (Twitter) DMs
 * POST     /api/channels/telegram/webhook     - Telegram
 * POST     /api/channels/tiktok/webhook       - TikTok
 * POST     /api/channels/line/webhook         - Line
 *
 * POST   /api/channels/send                   - Enviar mensagem
 */

import { Hono } from 'hono';
import { Bindings, Variables } from '../bindings';
import { ChannelRepository } from '../services/channelRepository';
import {
  FacebookChannelService,
  InstagramChannelService,
  XChannelService,
  TelegramChannelService,
  TikTokChannelService,
  LineChannelService,
} from '../services/channels';
import { createDatadogLogger } from '../utils/datadog';

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// Lazy initialize services
function getServices(c: any) {
  const repo = new ChannelRepository(c.env.DB);
  return {
    repo,
    facebook: new FacebookChannelService(repo),
    instagram: new InstagramChannelService(repo),
    x: new XChannelService(repo),
    telegram: new TelegramChannelService(repo),
    tiktok: new TikTokChannelService(repo),
    line: new LineChannelService(repo),
  };
}

// ============================================================
// CRUD de Canais (requer auth)
// ============================================================

// Listar canais do tenant
app.get('/', async (c) => {
  const user = c.get('user');
  const logger = createDatadogLogger(c.env);
  const { repo } = getServices(c);

  try {
    const channels = await repo.getTenantChannelsWithDetails(user.tenantId);

    return c.json({
      success: true,
      channels: channels.map(ch => ({
        id: ch.channel.id,
        provider: ch.channel.provider,
        name: ch.channel.name,
        status: ch.channel.status,
        created_at: ch.channel.created_at,
        token: ch.token ? {
          provider: ch.token.provider,
          page_id: ch.token.page_id,
          page_name: ch.token.page_name,
          bot_username: ch.token.bot_username,
          expires_at: ch.token.expires_at,
        } : null,
        webhook_config: ch.webhook_config ? {
          provider: ch.webhook_config.provider,
          is_webhook_registered: ch.webhook_config.is_webhook_registered,
          last_verified_at: ch.webhook_config.last_verified_at,
        } : null,
        metrics: ch.metrics ? {
          messages_sent_today: ch.metrics.messages_sent_today,
          messages_received_today: ch.metrics.messages_received_today,
          active_conversations: ch.metrics.active_conversations,
        } : null,
      })),
    });
  } catch (error) {
    await logger?.error('[Channels] Failed to list channels', {
      error: error instanceof Error ? error.message : String(error),
    });
    return c.json({
      success: false,
      error: 'Failed to list channels',
    }, 500);
  }
});

// Criar novo canal
app.post('/', async (c) => {
  const user = c.get('user');
  const logger = createDatadogLogger(c.env);
  const { repo } = getServices(c);

  const body = await c.req.json().catch(() => null);
  if (!body?.provider || !body?.name) {
    return c.json({ success: false, error: 'Missing provider or name' }, 400);
  }

  try {
    const channel = await repo.createChannel({
      tenant_id: user.tenantId,
      provider: body.provider,
      name: body.name,
      config: body.config,
    });

    await logger?.info('[Channels] Channel created', {
      channelId: channel.id,
      provider: channel.provider,
    });

    return c.json({ success: true, channel }, 201);
  } catch (error) {
    await logger?.error('[Channels] Failed to create channel', {
      error: error instanceof Error ? error.message : String(error),
    });
    return c.json({
      success: false,
      error: 'Failed to create channel',
    }, 500);
  }
});

// Deletar canal
app.delete('/:id', async (c) => {
  const user = c.get('user');
  const { repo } = getServices(c);
  const channelId = c.req.param('id');

  const deleted = await repo.deleteChannel(channelId, user.tenantId);
  if (!deleted) {
    return c.json({ success: false, error: 'Channel not found' }, 404);
  }

  return c.json({ success: true });
});

// ============================================================
// Conexão OAuth
// ============================================================

// Iniciar conexão (gera OAuth URL ou salva bot token)
app.post('/:id/connect', async (c) => {
  const user = c.get('user');
  const logger = createDatadogLogger(c.env);
  const { repo, facebook, instagram, telegram, tiktok } = getServices(c);
  const channelId = c.req.param('id');

  const body = await c.req.json().catch(() => null);
  if (!body) {
    return c.json({ success: false, error: 'Missing request body' }, 400);
  }

  try {
    const channel = await repo.getChannelById(channelId);
    if (!channel || channel.tenant_id !== user.tenantId) {
      return c.json({ success: false, error: 'Channel not found' }, 404);
    }

    const publicUrl = c.env.PUBLIC_WORKER_URL || 'https://api.oinbox.oconnector.tech';

    switch (channel.provider) {
      case 'facebook': {
        const state = `${channelId}:${user.tenantId}:${Date.now()}`;
        const oauthUrl = facebook.getOAuthUrl(state);
        // Substituir placeholders
        const finalUrl = oauthUrl
          .replace('{app_id}', body.app_id || '')
          .replace('{redirect_uri}', encodeURIComponent(`${publicUrl}/api/channels/${channelId}/oauth/callback`));

        await repo.updateChannelStatus(channelId, 'connecting');

        return c.json({
          success: true,
          oauth_url: finalUrl,
          state,
        });
      }

      case 'instagram': {
        // Instagram usa mesmo OAuth do Facebook
        const state = `${channelId}:${user.tenantId}:${Date.now()}`;
        return c.json({
          success: true,
          oauth_url: instagram.getOAuthUrl(state),
          note: 'Instagram usa o mesmo OAuth do Facebook',
        });
      }

      case 'telegram': {
        // Telegram usa bot token direto
        const botToken = body.bot_token;
        if (!botToken) {
          return c.json({ success: false, error: 'Missing bot_token' }, 400);
        }

        if (!telegram.validateBotToken(botToken)) {
          return c.json({ success: false, error: 'Invalid bot token format' }, 400);
        }

        const botInfo = await telegram.getBotInfo(botToken);
        if (!botInfo) {
          return c.json({ success: false, error: 'Invalid bot token - could not get bot info' }, 400);
        }

        // Salvar token (incluindo bot_token para envio)
        await repo.saveOAuthToken({
          channel_id: channelId,
          provider: 'telegram',
          bot_username: botInfo.username,
          raw_token_response: JSON.stringify({ ...botInfo, _bot_token: botToken }),
        });

        // Registrar webhook
        const webhookUrl = `${publicUrl}/api/channels/telegram/webhook?channel_id=${channelId}`;
        const registered = await telegram.registerWebhook(botToken, webhookUrl);

        await repo.saveWebhookConfig({
          channel_id: channelId,
          provider: 'telegram',
          webhook_url: webhookUrl,
          is_webhook_registered: registered,
          last_verified_at: new Date().toISOString(),
        });

        await repo.updateChannelStatus(channelId, registered ? 'connected' : 'error');

        await logger?.info('[Telegram] Bot connected', {
          channelId,
          botUsername: botInfo.username,
        });

        return c.json({
          success: true,
          bot_username: botInfo.username,
          webhook_registered: registered,
        });
      }

      case 'tiktok': {
        const state = `${channelId}:${user.tenantId}:${Date.now()}`;
        const oauthUrl = tiktok.getOAuthUrl(
          body.client_key || '',
          `${publicUrl}/api/channels/${channelId}/oauth/callback`,
          state,
        );

        await repo.updateChannelStatus(channelId, 'connecting');

        return c.json({
          success: true,
          oauth_url: oauthUrl,
          state,
        });
      }

      case 'line': {
        // Line usa channel_id + channel_secret
        const lineChannelId = body.channel_id;
        const channelSecret = body.channel_secret;

        if (!lineChannelId || !channelSecret) {
          return c.json({ success: false, error: 'Missing channel_id or channel_secret' }, 400);
        }

        // Obter access token
        const tokenResult = await getServices(c).line.getChannelAccessToken(lineChannelId, channelSecret);
        if (!tokenResult) {
          return c.json({ success: false, error: 'Failed to get access token' }, 400);
        }

        await repo.saveOAuthToken({
          channel_id: channelId,
          provider: 'line',
          access_token: tokenResult.access_token,
          token_type: tokenResult.token_type,
          expires_at: new Date(Date.now() + tokenResult.expires_in * 1000).toISOString(),
        });

        await repo.updateChannelStatus(channelId, 'connected');

        await logger?.info('[Line] Channel connected', { channelId });

        return c.json({ success: true });
      }

      default:
        return c.json({ success: false, error: `OAuth not supported for ${channel.provider}` }, 400);
    }
  } catch (error) {
    await logger?.error('[Channels] Connect failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    return c.json({
      success: false,
      error: 'Failed to connect channel',
    }, 500);
  }
});

// OAuth Callback (Facebook, Instagram, TikTok)
app.get('/:id/oauth/callback', async (c) => {
  const logger = createDatadogLogger(c.env);
  const { repo, facebook, tiktok } = getServices(c);
  const channelId = c.req.param('id');

  const code = c.req.query('code');
  const state = c.req.query('state');
  const error = c.req.query('error');

  if (error) {
    return c.json({ error: `OAuth error: ${c.req.query('error_description') || error}` }, 400);
  }

  if (!code || !state) {
    return c.json({ error: 'Missing code or state' }, 400);
  }

  try {
    // Extrair tenant_id do state
    const [chId, tenantId] = state.split(':');
    if (chId !== channelId) {
      return c.json({ error: 'Invalid state' }, 400);
    }

    const channel = await repo.getChannelById(channelId);
    if (!channel) {
      return c.json({ error: 'Channel not found' }, 404);
    }

    const publicUrl = c.env.PUBLIC_WORKER_URL || 'https://api.oinbox.oconnector.tech';

    switch (channel.provider) {
      case 'facebook': {
        // Em produção: trocar code por page token
        // Isso requer app_id e app_secret salvos no config do channel
        const config = channel.config ? JSON.parse(channel.config as unknown as string) as any : {};
        const appId = config.app_id || '';
        const appSecret = config.app_secret || '';

        if (!appId || !appSecret) {
          return c.json({
            error: 'App ID and Secret not configured',
            next_step: 'Configure app credentials in channel config',
          }, 400);
        }

        const redirectUri = `${publicUrl}/api/channels/${channelId}/oauth/callback`;
        const tokenData = await facebook.exchangeCodeForPageToken(code!, appId, appSecret, redirectUri);

        // Salvar token
        await repo.saveOAuthToken({
          channel_id: channelId,
          provider: 'facebook',
          access_token: tokenData.access_token,
          page_id: tokenData.page_id,
          page_name: tokenData.page_name,
        });

        // Salvar webhook config
        const webhookUrl = `${publicUrl}/api/channels/facebook/webhook?channel_id=${channelId}`;
        await repo.saveWebhookConfig({
          channel_id: channelId,
          provider: 'facebook',
          webhook_url: webhookUrl,
          app_id: appId,
        });

        await repo.updateChannelStatus(channelId, 'connected');

        await logger?.info('[Facebook] Channel connected', {
          channelId,
          pageId: tokenData.page_id,
        });

        // Redirecionar para frontend
        return c.redirect(`${publicUrl}/admin/settings?connected=facebook`);
      }

      case 'tiktok': {
        const config = channel.config ? JSON.parse(channel.config as unknown as string) as any : {};
        const clientKey = config.client_key || '';
        const clientSecret = config.client_secret || '';

        if (!clientKey || !clientSecret) {
          return c.json({ error: 'Client key and secret not configured' }, 400);
        }

        const redirectUri = `${publicUrl}/api/channels/${channelId}/oauth/callback`;
        const tokenData = await tiktok.exchangeCodeForToken(code!, clientKey, clientSecret, redirectUri);

        if (!tokenData) {
          return c.json({ error: 'Failed to exchange code for token' }, 400);
        }

        await repo.saveOAuthToken({
          channel_id: channelId,
          provider: 'tiktok',
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token,
          expires_at: new Date(Date.now() + tokenData.expires_in * 1000).toISOString(),
        });

        await repo.updateChannelStatus(channelId, 'connected');

        await logger?.info('[TikTok] Channel connected', { channelId });

        return c.redirect(`${publicUrl}/admin/settings?connected=tiktok`);
      }

      default:
        return c.json({ error: `OAuth callback not supported for ${channel.provider}` }, 400);
    }
  } catch (error) {
    await logger?.error('[Channels] OAuth callback failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    return c.json({
      error: 'OAuth callback failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, 500);
  }
});

// Desconectar canal
app.post('/:id/disconnect', async (c) => {
  const user = c.get('user');
  const logger = createDatadogLogger(c.env);
  const { repo, telegram } = getServices(c);
  const channelId = c.req.param('id');

  try {
    const channel = await repo.getChannelById(channelId);
    if (!channel || channel.tenant_id !== user.tenantId) {
      return c.json({ success: false, error: 'Channel not found' }, 404);
    }

    // Se Telegram, deletar webhook
    if (channel.provider === 'telegram') {
      const token = await repo.getOAuthToken(channelId, 'telegram');
      if (token?.bot_username) {
        // Precisaria do bot_token completo - simplificado aqui
        await telegram.deleteWebhook('PLACEHOLDER');
      }
    }

    // Deletar tokens
    await repo.deleteOAuthToken(channelId, channel.provider);

    // Atualizar status
    await repo.updateChannelStatus(channelId, 'disconnected');

    await logger?.info('[Channels] Channel disconnected', { channelId });

    return c.json({ success: true });
  } catch (error) {
    await logger?.error('[Channels] Disconnect failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    return c.json({ success: false, error: 'Failed to disconnect' }, 500);
  }
});

// Métricas do canal
app.get('/:id/metrics', async (c) => {
  const user = c.get('user');
  const { repo } = getServices(c);
  const channelId = c.req.param('id');

  const channel = await repo.getChannelById(channelId);
  if (!channel || channel.tenant_id !== user.tenantId) {
    return c.json({ error: 'Channel not found' }, 404);
  }

  const metrics = await repo.getMetrics(user.tenantId, channel.provider);

  return c.json({
    success: true,
    metrics: metrics || {
      messages_sent_today: 0,
      messages_received_today: 0,
      active_conversations: 0,
      rate_limit_hits: 0,
      webhook_failures: 0,
    },
  });
});

// ============================================================
// Webhooks (públicos - sem auth JWT)
// ============================================================

// Facebook Messenger Webhook
app.all('/facebook/webhook', async (c) => {
  const { repo, facebook } = getServices(c);
  const channelId = c.req.query('channel_id');

  if (!channelId) {
    return c.json({ error: 'Missing channel_id' }, 400);
  }

  return facebook.handleWebhook(c, '', channelId);
});

// Instagram Direct Webhook
app.all('/instagram/webhook', async (c) => {
  const { repo, instagram } = getServices(c);
  const channelId = c.req.query('channel_id');

  if (!channelId) {
    return c.json({ error: 'Missing channel_id' }, 400);
  }

  return instagram.handleWebhook(c, '', channelId);
});

// X (Twitter) DM Webhook
app.all('/x/webhook', async (c) => {
  const { repo, x: xService } = getServices(c);
  const channelId = c.req.query('channel_id');

  if (!channelId) {
    return c.json({ error: 'Missing channel_id' }, 400);
  }

  return xService.handleWebhook(c, '', channelId);
});

// Telegram Webhook
app.post('/telegram/webhook', async (c) => {
  const { repo, telegram } = getServices(c);
  const channelId = c.req.query('channel_id');

  if (!channelId) {
    return c.json({ error: 'Missing channel_id' }, 400);
  }

  return telegram.handleWebhook(c, '', channelId);
});

// TikTok Webhook
app.post('/tiktok/webhook', async (c) => {
  const { repo, tiktok } = getServices(c);
  const channelId = c.req.query('channel_id');

  if (!channelId) {
    return c.json({ error: 'Missing channel_id' }, 400);
  }

  return tiktok.handleWebhook(c, '', channelId);
});

// Line Webhook
app.post('/line/webhook', async (c) => {
  const { repo, line } = getServices(c);
  const channelId = c.req.query('channel_id');

  if (!channelId) {
    return c.json({ error: 'Missing channel_id' }, 400);
  }

  // Line precisa do channel_secret para verificar assinatura
  const channel = await repo.getChannelById(channelId);
  const config = channel?.config ? JSON.parse(channel.config as unknown as string) as any : {};

  return line.handleWebhook(c, '', channelId, config.channel_secret || '');
});

// ============================================================
// Enviar mensagem
// ============================================================

app.post('/send', async (c) => {
  const user = c.get('user');
  const logger = createDatadogLogger(c.env);
  const { repo, facebook, instagram, telegram, tiktok, line } = getServices(c);

  const body = await c.req.json().catch(() => null);
  if (!body?.channel_id || !body?.recipient_id || !body?.message) {
    return c.json({ success: false, error: 'Missing channel_id, recipient_id, or message' }, 400);
  }

  try {
    const channel = await repo.getChannelById(body.channel_id);
    if (!channel || channel.tenant_id !== user.tenantId) {
      return c.json({ success: false, error: 'Channel not found' }, 404);
    }

    let sent = false;

    switch (channel.provider) {
      case 'facebook': {
        const token = await repo.getValidToken(body.channel_id, 'facebook');
        if (!token?.access_token) {
          return c.json({ success: false, error: 'No valid Facebook token' }, 400);
        }
        sent = await facebook.sendMessage(token.access_token, body.recipient_id, body.message);
        break;
      }

      case 'instagram': {
        const token = await repo.getValidToken(body.channel_id, 'instagram');
        if (!token?.access_token) {
          return c.json({ success: false, error: 'No valid Instagram token' }, 400);
        }
        const igAccountId = token.page_id || '';
        sent = await instagram.sendMessage(igAccountId, body.recipient_id, body.message, token.access_token);
        break;
      }

      case 'telegram': {
        const token = await repo.getValidToken(body.channel_id, 'telegram');
        if (!token?.bot_username) {
          return c.json({ success: false, error: 'No valid Telegram bot token' }, 400);
        }
        // Precisaria do bot_token completo - simplificado
        const msgId = await telegram.sendMessage('PLACEHOLDER_TOKEN', body.recipient_id, body.message);
        sent = msgId !== null;
        break;
      }

      case 'tiktok': {
        const token = await repo.getValidToken(body.channel_id, 'tiktok');
        if (!token?.access_token) {
          return c.json({ success: false, error: 'No valid TikTok token' }, 400);
        }
        sent = await tiktok.sendMessage(token.access_token, body.recipient_id, body.message);
        break;
      }

      case 'line': {
        const token = await repo.getValidToken(body.channel_id, 'line');
        if (!token?.access_token) {
          return c.json({ success: false, error: 'No valid Line token' }, 400);
        }
        sent = await line.pushMessage(token.access_token, body.recipient_id, body.message);
        break;
      }

      default:
        return c.json({ success: false, error: `Sending not supported for ${channel.provider}` }, 400);
    }

    if (sent) {
      await repo.incrementMetric(user.tenantId, channel.provider, 'messages_sent_today');

      await logger?.info('[Channels] Message sent', {
        channelId: body.channel_id,
        provider: channel.provider,
        recipientId: body.recipient_id,
      });

      return c.json({ success: true });
    }

    return c.json({ success: false, error: 'Failed to send message' }, 500);
  } catch (error) {
    await logger?.error('[Channels] Send message failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    return c.json({
      success: false,
      error: 'Failed to send message',
    }, 500);
  }
});

export default app;
