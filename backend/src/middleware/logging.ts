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

    const headers: Record<string, string> = {};
    c.req.raw.headers.forEach((v, k) => (headers[k] = v));

    // Log detalhado de erro
    await logger?.error('Unhandled exception in request', {
      method: c.req.method,
      path: c.req.path,
      error: error.message,
      stack: error.stack,
      duration_ms: duration,
      headers: headers,
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

  // Correlation ID: Propagate or Generate
  const correlationId = c.req.header('x-correlation-id') || crypto.randomUUID();
  c.set('correlationId', correlationId);
  c.set('logger', logger);

  // Response Header for traceability
  c.res.headers.set('X-Correlation-ID', correlationId);

  const logData = {
    correlation_id: correlationId,
    method: c.req.method,
    path: c.req.path,
    user_agent: c.req.header('user-agent'),
    origin: c.req.header('origin'),
  };

  // Log Start
  if (logger) {
    await logger.info('Request started', logData);
  } else {
    // Local dev fallback
    console.log(JSON.stringify({ level: 'info', message: 'Request started', ...logData }));
  }

  await next();

  const duration = Date.now() - startTime;
  const status = c.res.status;

  const responseLogData = {
    ...logData,
    status,
    duration_ms: duration,
  };

  // Log End
  if (logger) {
    await logger.info('Request completed', responseLogData);
    await logger.metric('oinbox.http.request.duration', duration, [
      'method:' + c.req.method,
      'status:' + status,
      'path:' + c.req.path,
    ]);
  } else {
    console.log(
      JSON.stringify({ level: 'info', message: 'Request completed', ...responseLogData }),
    );
  }
};
