import { Context, Next } from 'hono';
import { Bindings, Variables } from '../bindings';

/**
 * Rate Limiter baseado em D1 para Cloudflare Workers.
 * Usa sliding window de 1 minuto por IP + rota.
 */

const WINDOW_MS = 60_000; // 1 minuto
const DEFAULT_MAX_REQUESTS = 10; // requests por janela

interface RateLimitEntry {
  count: number;
  window_start: number;
}

export const rateLimiter = (maxRequests: number = DEFAULT_MAX_REQUESTS) => {
  return async (c: Context<{ Bindings: Bindings; Variables: Variables }>, next: Next) => {
    const ip =
      c.req.header('x-forwarded-for') ||
      c.req.header('x-real-ip') ||
      c.req.raw.headers.get('cf-connecting-ip') ||
      'unknown';

    const route = c.req.path;
    const key = `rate_limit:${ip}:${route}`;
    const now = Date.now();

    try {
      // Verificar contador atual na janela
      const entry = await c.env.DB.prepare(
        'SELECT count, window_start FROM rate_limits WHERE key = ?',
      )
        .bind(key)
        .first<{ count: number; window_start: number }>();

      if (entry && entry.window_start > now - WINDOW_MS) {
        // Dentro da mesma janela
        if (entry.count >= maxRequests) {
          return c.json(
            {
              error: 'Too Many Requests',
              retry_after: Math.ceil((entry.window_start + WINDOW_MS - now) / 1000),
            },
            429,
          );
        }

        // Incrementar
        await c.env.DB.prepare('UPDATE rate_limits SET count = count + 1 WHERE key = ?')
          .bind(key)
          .run();
      } else {
        // Nova janela ou expirada
        await c.env.DB.prepare(
          'INSERT OR REPLACE INTO rate_limits (key, count, window_start, created_at) VALUES (?, 1, ?, ?)',
        )
          .bind(key, now, new Date().toISOString())
          .run();
      }
    } catch {
      // Se D1 falhar, permite passar (fail-open). Logar erro mas nao bloquear legítimo.
      console.warn('[RateLimiter] D1 unavailable, allowing request');
    }

    await next();
  };
};
