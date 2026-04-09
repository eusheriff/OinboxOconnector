/**
 * Middleware para garantir foreign key enforcement no SQLite/D1
 * SQLite requer PRAGMA foreign_keys = ON em cada conexão
 */

import { MiddlewareHandler } from 'hono';
import { Bindings, Variables } from '../bindings';

export const foreignKeyMiddleware: MiddlewareHandler<{
  Bindings: Bindings;
  Variables: Variables;
}> = async (c, next) => {
  // Garante que foreign keys estão habilitadas nesta conexão
  if (c.env.DB) {
    try {
      await c.env.DB.prepare('PRAGMA foreign_keys = ON').run();
    } catch (error) {
      // Log silencioso - não bloqueante
      console.error('Failed to enable foreign keys:', error);
    }
  }
  await next();
};
