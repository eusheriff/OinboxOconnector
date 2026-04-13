/**
 * ChannelRepository - CRUD de canais sociais, tokens OAuth e métricas
 *
 * Gerencia:
 * - channels (tabela principal)
 * - channel_oauth_tokens (tokens de acesso)
 * - channel_webhook_configs (configuração de webhooks)
 * - channel_metrics (métricas por tenant/provider)
 */

import { DatabaseBinding } from '../bindings';
import {
  SocialChannelConfig,
  ChannelOAuthToken,
  ChannelWebhookConfig,
  ChannelMetrics,
  ChannelConnectionStatus,
  ChannelProvider,
} from '../../../shared/types';

export interface CreateChannelInput {
  tenant_id: string;
  provider: ChannelProvider;
  name: string;
  config?: Record<string, unknown>;
}

export interface UpdateChannelStatusInput {
  channel_id: string;
  tenant_id: string;
  status: ChannelConnectionStatus;
}

export interface SaveOAuthTokenInput {
  channel_id: string;
  provider: string;
  access_token?: string;
  refresh_token?: string;
  token_type?: string;
  expires_at?: string;
  page_id?: string;
  page_name?: string;
  bot_username?: string;
  account_id?: string;
  raw_token_response?: string;
}

export interface SaveWebhookConfigInput {
  channel_id: string;
  provider: string;
  webhook_url?: string;
  verify_token?: string;
  webhook_id?: string;
  app_id?: string;
  app_secret?: string;
  is_webhook_registered?: boolean;
  last_verified_at?: string;
}

export interface TokenRefreshQueueEntry {
  id: string;
  channel_id: string;
  provider: string;
  token_id: string;
  status: string;
  retry_count: number;
  error_message?: string;
}

export class ChannelRepository {
  constructor(private db: DatabaseBinding) {}

  // ============================================================
  // Channels
  // ============================================================

  async createChannel(input: CreateChannelInput): Promise<SocialChannelConfig> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    await this.db
      .prepare(
        `INSERT INTO channels (id, tenant_id, provider, name, config, status, created_at)
         VALUES (?, ?, ?, ?, ?, 'active', ?)`,
      )
      .bind(
        id,
        input.tenant_id,
        input.provider,
        input.name,
        input.config ? JSON.stringify(input.config) : null,
        now,
      )
      .run();

    return {
      id,
      tenant_id: input.tenant_id,
      provider: input.provider,
      name: input.name,
      status: 'connecting',
      config: input.config,
      created_at: now,
    };
  }

  async getChannelById(channelId: string): Promise<SocialChannelConfig | null> {
    return await this.db
      .prepare('SELECT * FROM channels WHERE id = ?')
      .bind(channelId)
      .first<SocialChannelConfig>();
  }

  async getChannelByTenantAndProvider(
    tenantId: string,
    provider: ChannelProvider,
  ): Promise<SocialChannelConfig | null> {
    return await this.db
      .prepare('SELECT * FROM channels WHERE tenant_id = ? AND provider = ?')
      .bind(tenantId, provider)
      .first<SocialChannelConfig>();
  }

  async getChannelsByTenant(tenantId: string): Promise<SocialChannelConfig[]> {
    const result = await this.db
      .prepare('SELECT * FROM channels WHERE tenant_id = ? ORDER BY created_at DESC')
      .bind(tenantId)
      .all<SocialChannelConfig>();
    return result.results || [];
  }

  async updateChannelStatus(
    channelId: string,
    status: ChannelConnectionStatus,
  ): Promise<void> {
    await this.db
      .prepare('UPDATE channels SET status = ? WHERE id = ?')
      .bind(status, channelId)
      .run();
  }

  async updateChannelConfig(
    channelId: string,
    config: Record<string, unknown>,
  ): Promise<void> {
    await this.db
      .prepare('UPDATE channels SET config = ? WHERE id = ?')
      .bind(JSON.stringify(config), channelId)
      .run();
  }

  async deleteChannel(channelId: string, tenantId: string): Promise<boolean> {
    const result = await this.db
      .prepare('DELETE FROM channels WHERE id = ? AND tenant_id = ?')
      .bind(channelId, tenantId)
      .run();
    return (result.meta?.changes || 0) > 0;
  }

  // ============================================================
  // OAuth Tokens
  // ============================================================

  async saveOAuthToken(input: SaveOAuthTokenInput): Promise<ChannelOAuthToken> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    await this.db
      .prepare(
        `INSERT INTO channel_oauth_tokens
         (id, channel_id, provider, access_token, refresh_token, token_type,
          expires_at, page_id, page_name, bot_username, account_id, raw_token_response,
          created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(channel_id, provider) DO UPDATE SET
           access_token = excluded.access_token,
           refresh_token = excluded.refresh_token,
           token_type = excluded.token_type,
           expires_at = excluded.expires_at,
           page_id = excluded.page_id,
           page_name = excluded.page_name,
           bot_username = excluded.bot_username,
           account_id = excluded.account_id,
           raw_token_response = excluded.raw_token_response,
           updated_at = ?`,
      )
      .bind(
        id,
        input.channel_id,
        input.provider,
        input.access_token || null,
        input.refresh_token || null,
        input.token_type || 'Bearer',
        input.expires_at || null,
        input.page_id || null,
        input.page_name || null,
        input.bot_username || null,
        input.account_id || null,
        input.raw_token_response || null,
        now,
        now,
        now,
      )
      .run();

    return {
      id,
      channel_id: input.channel_id,
      provider: input.provider as ChannelOAuthToken['provider'],
      access_token: input.access_token,
      refresh_token: input.refresh_token,
      token_type: input.token_type || 'Bearer',
      expires_at: input.expires_at,
      page_id: input.page_id,
      page_name: input.page_name,
      bot_username: input.bot_username,
      account_id: input.account_id,
      created_at: now,
      updated_at: now,
    };
  }

  async getOAuthToken(
    channelId: string,
    provider: string,
  ): Promise<ChannelOAuthToken | null> {
    return await this.db
      .prepare('SELECT * FROM channel_oauth_tokens WHERE channel_id = ? AND provider = ?')
      .bind(channelId, provider)
      .first<ChannelOAuthToken>();
  }

  async getValidToken(
    channelId: string,
    provider: string,
  ): Promise<ChannelOAuthToken | null> {
    const token = await this.db
      .prepare(
        `SELECT * FROM channel_oauth_tokens
         WHERE channel_id = ? AND provider = ?
         AND (expires_at IS NULL OR expires_at > datetime('now'))
         AND access_token IS NOT NULL`,
      )
      .bind(channelId, provider)
      .first<ChannelOAuthToken>();
    return token;
  }

  async getExpiringTokens(minutesAhead = 30): Promise<ChannelOAuthToken[]> {
    const result = await this.db
      .prepare(
        `SELECT * FROM channel_oauth_tokens
         WHERE expires_at IS NOT NULL
         AND expires_at < datetime('now', ? || ' minutes')
         AND expires_at > datetime('now')
         AND refresh_token IS NOT NULL
         ORDER BY expires_at ASC`,
      )
      .bind(`+${minutesAhead}`)
      .all<ChannelOAuthToken>();
    return result.results || [];
  }

  async deleteOAuthToken(channelId: string, provider: string): Promise<void> {
    await this.db
      .prepare('DELETE FROM channel_oauth_tokens WHERE channel_id = ? AND provider = ?')
      .bind(channelId, provider)
      .run();
  }

  // ============================================================
  // Webhook Configs
  // ============================================================

  async saveWebhookConfig(input: SaveWebhookConfigInput): Promise<ChannelWebhookConfig> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    await this.db
      .prepare(
        `INSERT INTO channel_webhook_configs
         (id, channel_id, provider, webhook_url, verify_token, webhook_id, app_id, app_secret,
          is_webhook_registered, last_verified_at, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(channel_id, provider) DO UPDATE SET
           webhook_url = excluded.webhook_url,
           verify_token = excluded.verify_token,
           webhook_id = excluded.webhook_id,
           app_id = excluded.app_id,
           app_secret = excluded.app_secret,
           is_webhook_registered = excluded.is_webhook_registered,
           last_verified_at = excluded.last_verified_at,
           updated_at = ?`,
      )
      .bind(
        id,
        input.channel_id,
        input.provider,
        input.webhook_url || null,
        input.verify_token || null,
        input.webhook_id || null,
        input.app_id || null,
        input.app_secret || null,
        input.is_webhook_registered ? 1 : 0,
        input.last_verified_at || null,
        now,
        now,
        now,
      )
      .run();

    return {
      id,
      channel_id: input.channel_id,
      provider: input.provider as ChannelWebhookConfig['provider'],
      webhook_url: input.webhook_url,
      verify_token: input.verify_token,
      webhook_id: input.webhook_id,
      app_id: input.app_id,
      is_webhook_registered: input.is_webhook_registered || false,
      last_verified_at: input.last_verified_at,
    };
  }

  async getWebhookConfig(
    channelId: string,
    provider: string,
  ): Promise<ChannelWebhookConfig | null> {
    return await this.db
      .prepare('SELECT * FROM channel_webhook_configs WHERE channel_id = ? AND provider = ?')
      .bind(channelId, provider)
      .first<ChannelWebhookConfig>();
  }

  async getWebhookConfigsByChannel(channelId: string): Promise<ChannelWebhookConfig[]> {
    const result = await this.db
      .prepare('SELECT * FROM channel_webhook_configs WHERE channel_id = ?')
      .bind(channelId)
      .all<ChannelWebhookConfig>();
    return result.results || [];
  }

  async updateWebhookRegistrationStatus(
    channelId: string,
    provider: string,
    isRegistered: boolean,
  ): Promise<void> {
    await this.db
      .prepare(
        `UPDATE channel_webhook_configs
         SET is_webhook_registered = ?, last_verified_at = datetime('now')
         WHERE channel_id = ? AND provider = ?`,
      )
      .bind(isRegistered ? 1 : 0, channelId, provider)
      .run();
  }

  // ============================================================
  // Metrics
  // ============================================================

  async incrementMetric(
    tenantId: string,
    provider: ChannelProvider,
    field: 'messages_sent_today' | 'messages_received_today',
  ): Promise<void> {
    const now = new Date().toISOString();

    await this.db
      .prepare(
        `INSERT INTO channel_metrics
         (id, tenant_id, provider, ${field}, last_reset_at, updated_at)
         VALUES (?, ?, ?, 1, ?, ?)
         ON CONFLICT(tenant_id, provider) DO UPDATE SET
           ${field} = ${field} + 1,
           updated_at = ?`,
      )
      .bind(crypto.randomUUID(), tenantId, provider, now, now, now)
      .run();
  }

  async incrementCounter(
    tenantId: string,
    provider: ChannelProvider,
    field: 'rate_limit_hits' | 'webhook_failures' | 'active_conversations',
  ): Promise<void> {
    const now = new Date().toISOString();

    await this.db
      .prepare(
        `INSERT INTO channel_metrics
         (id, tenant_id, provider, ${field}, last_reset_at, updated_at)
         VALUES (?, ?, ?, 1, ?, ?)
         ON CONFLICT(tenant_id, provider) DO UPDATE SET
           ${field} = ${field} + 1,
           updated_at = ?`,
      )
      .bind(crypto.randomUUID(), tenantId, provider, now, now, now)
      .run();
  }

  async getMetrics(
    tenantId: string,
    provider: ChannelProvider,
  ): Promise<ChannelMetrics | null> {
    return await this.db
      .prepare('SELECT * FROM channel_metrics WHERE tenant_id = ? AND provider = ?')
      .bind(tenantId, provider)
      .first<ChannelMetrics>();
  }

  async getAllMetrics(tenantId: string): Promise<ChannelMetrics[]> {
    const result = await this.db
      .prepare('SELECT * FROM channel_metrics WHERE tenant_id = ?')
      .bind(tenantId)
      .all<ChannelMetrics>();
    return result.results || [];
  }

  async resetDailyMetrics(tenantId?: string): Promise<void> {
    const now = new Date().toISOString();

    if (tenantId) {
      await this.db
        .prepare(
          `UPDATE channel_metrics
           SET messages_sent_today = 0, messages_received_today = 0,
               last_reset_at = ?, updated_at = ?
           WHERE tenant_id = ?`,
        )
        .bind(now, now, tenantId)
        .run();
    } else {
      await this.db
        .prepare(
          `UPDATE channel_metrics
           SET messages_sent_today = 0, messages_received_today = 0,
               last_reset_at = ?, updated_at = ?`,
        )
        .bind(now, now)
        .run();
    }
  }

  // ============================================================
  // Token Refresh Queue
  // ============================================================

  async addToTokenRefreshQueue(
    channelId: string,
    provider: string,
    tokenId: string,
  ): Promise<void> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    await this.db
      .prepare(
        `INSERT INTO token_refresh_queue
         (id, channel_id, provider, token_id, status, scheduled_at, created_at)
         VALUES (?, ?, ?, ?, 'pending', ?, ?)`,
      )
      .bind(id, channelId, provider, tokenId, now, now)
      .run();
  }

  async getPendingTokenRefreshJobs(
    limit = 50,
  ): Promise<TokenRefreshQueueEntry[]> {
    const result = await this.db
      .prepare(
        `SELECT * FROM token_refresh_queue
         WHERE status = 'pending' AND scheduled_at <= datetime('now')
         AND retry_count < max_retries
         ORDER BY scheduled_at ASC
         LIMIT ?`,
      )
      .bind(limit)
      .all<TokenRefreshQueueEntry>();
    return result.results || [];
  }

  async updateTokenRefreshJob(
    jobId: string,
    status: 'processing' | 'success' | 'failed',
    errorMessage?: string,
  ): Promise<void> {
    const now = new Date().toISOString();

    if (status === 'processing') {
      await this.db
        .prepare(
          `UPDATE token_refresh_queue
           SET status = ?, processed_at = ?
           WHERE id = ?`,
        )
        .bind(status, now, jobId)
        .run();
    } else if (status === 'success') {
      await this.db
        .prepare(
          `UPDATE token_refresh_queue
           SET status = ?, processed_at = ?
           WHERE id = ?`,
        )
        .bind(status, now, jobId)
        .run();
    } else {
      // failed - increment retry_count
      await this.db
        .prepare(
          `UPDATE token_refresh_queue
           SET status = 'pending', retry_count = retry_count + 1,
               error_message = ?, scheduled_at = datetime('now', '+5 minutes')
           WHERE id = ?`,
        )
        .bind(errorMessage || 'Unknown error', jobId)
        .run();
    }
  }

  // ============================================================
  // Full Channel Info (join com token + webhook config + metrics)
  // ============================================================

  async getFullChannelInfo(
    channelId: string,
  ): Promise<{
    channel: SocialChannelConfig;
    token: Partial<ChannelOAuthToken> | null;
    webhook_config: Partial<ChannelWebhookConfig> | null;
  } | null> {
    const channel = await this.getChannelById(channelId);
    if (!channel) return null;

    const token = await this.db
      .prepare(
        `SELECT id, provider, token_type, expires_at, page_id, page_name,
                bot_username, account_id, created_at, updated_at
         FROM channel_oauth_tokens WHERE channel_id = ?`,
      )
      .bind(channelId)
      .first<Partial<ChannelOAuthToken>>();

    const webhookConfig = await this.db
      .prepare(
        `SELECT id, provider, webhook_url, webhook_id, app_id,
                is_webhook_registered, last_verified_at
         FROM channel_webhook_configs WHERE channel_id = ?`,
      )
      .bind(channelId)
      .first<Partial<ChannelWebhookConfig>>();

    return {
      channel,
      token: token || null,
      webhook_config: webhookConfig || null,
    };
  }

  async getTenantChannelsWithDetails(
    tenantId: string,
  ): Promise<
    Array<{
      channel: SocialChannelConfig;
      token: Partial<ChannelOAuthToken> | null;
      webhook_config: Partial<ChannelWebhookConfig> | null;
      metrics: Partial<ChannelMetrics> | null;
    }>
  > {
    const channels = await this.getChannelsByTenant(tenantId);
    const results = [];

    for (const channel of channels) {
      const token = await this.db
        .prepare(
          `SELECT id, provider, token_type, expires_at, page_id, page_name,
                  bot_username, account_id, created_at, updated_at
           FROM channel_oauth_tokens WHERE channel_id = ?`,
        )
        .bind(channel.id)
        .first<Partial<ChannelOAuthToken>>();

      const webhookConfig = await this.db
        .prepare(
          `SELECT id, provider, webhook_url, webhook_id, app_id,
                  is_webhook_registered, last_verified_at
           FROM channel_webhook_configs WHERE channel_id = ?`,
        )
        .bind(channel.id)
        .first<Partial<ChannelWebhookConfig>>();

      const metrics = await this.getMetrics(tenantId, channel.provider);

      results.push({
        channel,
        token: token || null,
        webhook_config: webhookConfig || null,
        metrics: metrics || null,
      });
    }

    return results;
  }
}
