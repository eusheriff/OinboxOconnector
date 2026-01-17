import { DatabaseBinding } from '../types';

// Limites diários (com margem de segurança de ~10%)
const DAILY_LIMITS = {
  'gemini-flash': 1400, // Google limit: 1500
  'gemini-pro': 45, // Google limit: 50
  'cloudflare-ai': 9000, // Cloudflare limit: 10000
} as const;

type AIModel = keyof typeof DAILY_LIMITS;

interface RateLimitResult {
  allowed: boolean;
  count: number;
  limit: number;
  remaining: number;
  model: AIModel;
}

/**
 * Obtém a data atual no formato YYYY-MM-DD (UTC)
 */
function getTodayUTC(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * Verifica e incrementa o contador de rate limit
 * @returns RateLimitResult com status e contagens
 */
export async function checkAndIncrementRateLimit(
  db: DatabaseBinding,
  tenantId: string,
  model: AIModel,
): Promise<RateLimitResult> {
  const today = getTodayUTC();
  const limit = DAILY_LIMITS[model];

  // Buscar ou criar registro para hoje
  const existing = await db
    .prepare(`SELECT count FROM ai_rate_limits WHERE tenant_id = ? AND model = ? AND date = ?`)
    .bind(tenantId, model, today)
    .first<{ count: number }>();

  const currentCount = existing?.count || 0;
  const allowed = currentCount < limit;

  if (allowed) {
    // Incrementar contador (upsert)
    await db
      .prepare(
        `
      INSERT INTO ai_rate_limits (tenant_id, model, date, count) 
      VALUES (?, ?, ?, 1)
      ON CONFLICT (tenant_id, model, date) 
      DO UPDATE SET count = count + 1
    `,
      )
      .bind(tenantId, model, today)
      .run();
  }

  return {
    allowed,
    count: currentCount + (allowed ? 1 : 0),
    limit,
    remaining: Math.max(0, limit - currentCount - (allowed ? 1 : 0)),
    model,
  };
}

/**
 * Obtém contadores atuais sem incrementar
 */
export async function getRateLimitStatus(
  db: DatabaseBinding,
  tenantId: string,
): Promise<Record<AIModel, RateLimitResult>> {
  const today = getTodayUTC();

  const results = await db
    .prepare(
      `
    SELECT model, count FROM ai_rate_limits 
    WHERE tenant_id = ? AND date = ?
  `,
    )
    .bind(tenantId, today)
    .all<{ model: string; count: number }>();

  const counts: Record<string, number> = {};
  results.results.forEach((r) => {
    counts[r.model] = r.count;
  });

  return {
    'gemini-flash': {
      allowed: (counts['gemini-flash'] || 0) < DAILY_LIMITS['gemini-flash'],
      count: counts['gemini-flash'] || 0,
      limit: DAILY_LIMITS['gemini-flash'],
      remaining: DAILY_LIMITS['gemini-flash'] - (counts['gemini-flash'] || 0),
      model: 'gemini-flash',
    },
    'gemini-pro': {
      allowed: (counts['gemini-pro'] || 0) < DAILY_LIMITS['gemini-pro'],
      count: counts['gemini-pro'] || 0,
      limit: DAILY_LIMITS['gemini-pro'],
      remaining: DAILY_LIMITS['gemini-pro'] - (counts['gemini-pro'] || 0),
      model: 'gemini-pro',
    },
    'cloudflare-ai': {
      allowed: (counts['cloudflare-ai'] || 0) < DAILY_LIMITS['cloudflare-ai'],
      count: counts['cloudflare-ai'] || 0,
      limit: DAILY_LIMITS['cloudflare-ai'],
      remaining: DAILY_LIMITS['cloudflare-ai'] - (counts['cloudflare-ai'] || 0),
      model: 'cloudflare-ai',
    },
  };
}

/**
 * Limpa registros antigos (mais de 7 dias)
 */
export async function cleanupOldRateLimits(db: DatabaseBinding): Promise<number> {
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const cutoffDate = weekAgo.toISOString().split('T')[0];

  const result = await db
    .prepare(`DELETE FROM ai_rate_limits WHERE date < ?`)
    .bind(cutoffDate)
    .run<{ meta: { changes: number } }>();

  return result.meta.changes || 0;
}
