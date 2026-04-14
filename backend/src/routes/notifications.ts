import { Hono } from 'hono';
import { Bindings, Variables } from '../bindings';
import { authMiddleware } from '../middleware/auth';

const notifications = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// Aplicar auth em todas as rotas
// notifications.use('/*', authMiddleware); // Auth global em index.ts

// GET /api/notifications â Listar notificaÃ§Ãµes nÃ£o lidas do tenant
notifications.get('/', async (c) => {
  const user = c.get('user');
  const tenantId = user.tenantId;
  const unreadOnly = c.req.query('unread') === 'true';

  let query = 'SELECT * FROM notifications WHERE tenant_id = ?';
  const params: (string | number | boolean)[] = [tenantId];

  if (unreadOnly) {
    query += ' AND is_read = FALSE';
  }

  query += ' ORDER BY created_at DESC LIMIT 100';

  const results = await c.env.DB.prepare(query)
    .bind(...params)
    .all();

  return c.json({ notifications: results.results });
});

// GET /api/notifications/:id â Detalhe de uma notificaÃ§Ã£o
notifications.get('/:id', async (c) => {
  const user = c.get('user');
  const id = c.req.param('id');

  const notification = await c.env.DB.prepare(
    'SELECT * FROM notifications WHERE id = ? AND tenant_id = ?',
  )
    .bind(id, user.tenantId)
    .first();

  if (!notification) {
    return c.json({ error: 'Not found' }, 404);
  }

  return c.json({ notification });
});

// PATCH /api/notifications/:id/read â Marcar como lida
notifications.patch('/:id/read', async (c) => {
  const user = c.get('user');
  const id = c.req.param('id');

  await c.env.DB.prepare('UPDATE notifications SET is_read = TRUE WHERE id = ? AND tenant_id = ?')
    .bind(id, user.tenantId)
    .run();

  return c.json({ success: true });
});

// PATCH /api/notifications/read-all â Marcar todas como lidas
notifications.patch('/read-all', async (c) => {
  const user = c.get('user');

  await c.env.DB.prepare(
    'UPDATE notifications SET is_read = TRUE WHERE tenant_id = ? AND is_read = FALSE',
  )
    .bind(user.tenantId)
    .run();

  return c.json({ success: true });
});

// DELETE /api/notifications/:id â Remover notificaÃ§Ã£o
notifications.delete('/:id', async (c) => {
  const user = c.get('user');
  const id = c.req.param('id');

  await c.env.DB.prepare('DELETE FROM notifications WHERE id = ? AND tenant_id = ?')
    .bind(id, user.tenantId)
    .run();

  return c.json({ success: true });
});

export default notifications;
