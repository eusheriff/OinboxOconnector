import { DatabaseBinding } from '../bindings';

// Limites diários (com margem de segurança de ~10%)
const DAILY_LIMITS = {
  'openai': 9000, // OpenAI limit (adjust as needed)
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
    'openai': {
      allowed: (counts['openai'] || 0) < DAILY_LIMITS['openai'],
      count: counts['openai'] || 0,
      limit: DAILY_LIMITS['openai'],
      remaining: DAILY_LIMITS['openai'] - (counts['openai'] || 0),
      model: 'openai',
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
