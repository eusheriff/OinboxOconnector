import { Context, Next } from 'hono';
import { createDatadogLogger } from '../utils/datadog';

/**
 * Middleware global de erro para capturar todas as exceções não tratadas
 */
export const errorLoggingMiddleware = async (c: Context, next: Next) => {
  const startTime = Date.now();
  const logger = createDatadogLogger(c.env);

  try {
    await next();

    // Log de requisições bem-sucedidas
    const duration = Date.now() - startTime;
    const status = c.res.status;

    if (status >= 400) {
      await logger?.warn('HTTP error response', {
        method: c.req.method,
        path: c.req.path,
        status,
        duration_ms: duration,
        user_agent: c.req.header('user-agent'),
        origin: c.req.header('origin'),
      });

      await logger?.metric('oinbox.http.error', 1, [
        'status:' + status,
        'method:' + c.req.method,
        'path:' + c.req.path,
      ]);
    }
  } catch (error: any) {
    const duration = Date.now() - startTime;

    // Log detalhado de erro
    await logger?.error('Unhandled exception in request', {
      method: c.req.method,
      path: c.req.path,
      error: error.message,
      stack: error.stack,
      duration_ms: duration,
      headers: Object.fromEntries(c.req.raw.headers.entries()),
    });

    await logger?.metric('oinbox.exception.unhandled', 1, [
      'method:' + c.req.method,
      'path:' + c.req.path,
      'error:' + (error.name || 'unknown'),
    ]);

    // Re-throw para que o Hono possa lidar normalmente
    throw error;
  }
};

/**
 * Middleware de logging de requisições (para todas as rotas)
 */
export const requestLoggingMiddleware = async (c: Context, next: Next) => {
  const startTime = Date.now();
  const logger = createDatadogLogger(c.env);

  const requestId = crypto.randomUUID();
  c.set('requestId', requestId);
  c.set('logger', logger);

  await logger?.info('Request started', {
    request_id: requestId,
    method: c.req.method,
    path: c.req.path,
    user_agent: c.req.header('user-agent'),
    origin: c.req.header('origin'),
  });

  await next();

  const duration = Date.now() - startTime;

  await logger?.info('Request completed', {
    request_id: requestId,
    method: c.req.method,
    path: c.req.path,
    status: c.res.status,
    duration_ms: duration,
  });

  await logger?.metric('oinbox.http.request.duration', duration, [
    'method:' + c.req.method,
    'status:' + c.res.status,
    'path:' + c.req.path,
  ]);
};
