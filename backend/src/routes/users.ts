import { Hono } from 'hono';
import bcrypt from 'bcryptjs';
import { Bindings, Variables } from '../bindings';
import { authMiddleware } from '../middleware/auth';
import { getPlan } from '../config/plans';

const users = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// users.use('*', authMiddleware); // Auth global

// GET /api/users - List team members
users.get('/', async (c) => {
  const user = c.get('user');
  const tenantId = user.tenantId;

  const { results } = await c.env.DB.prepare(
    'SELECT id, name, email, role FROM users WHERE tenant_id = ?',
  )
    .bind(tenantId)
    .all<{ id: string; name: string; email: string; role: string }>();

  return c.json(results);
});

// POST /api/users - Add team member
users.post('/', async (c) => {
  const currentUser = c.get('user');

  // Only admins can add users
  if (currentUser.role !== 'admin') {
    return c.json({ error: 'Apenas administradores podem adicionar membros.' }, 403);
  }

  const tenantId = currentUser.tenantId;
  const data = await c.req.json();

  if (!data.email || !data.name) {
    return c.json({ error: 'Nome e email são obrigatórios.' }, 400);
  }

  // Get tenant plan
  const tenant = await c.env.DB.prepare('SELECT plan FROM tenants WHERE id = ?')
    .bind(tenantId)
    .first<{ plan: string }>();

  if (!tenant) {
    return c.json({ error: 'Tenant não encontrado.' }, 404);
  }

  // Calculate limit: base plan + add-ons
  const planConfig = getPlan(tenant.plan);
  const extraSeats =
    (await c.env.DB.prepare(
      "SELECT COALESCE(SUM(quantity), 0) as total FROM addons WHERE tenant_id = ? AND type = 'extra_seat' AND status = 'active'",
    )
      .bind(tenantId)
      .first<number>('total')) || 0;

  const totalLimit = planConfig.seats + extraSeats;
  const currentCount = await c.env.DB.prepare(
    'SELECT COUNT(*) as count FROM users WHERE tenant_id = ?',
  )
    .bind(tenantId)
    .first<number>('count');

  if ((currentCount || 0) >= totalLimit) {
    return c.json(
      {
        error: `Limite de usuários atingido (${totalLimit}). Compre add-ons ou faça upgrade.`,
        limit: totalLimit,
        baseLimit: planConfig.seats,
        extraSeats,
        current: currentCount,
      },
      403,
    );
  }

  // Check if email already exists
  const existing = await c.env.DB.prepare('SELECT id FROM users WHERE email = ?')
    .bind(data.email)
    .first<{ id: string }>();

  if (existing) {
    return c.json({ error: 'Este email já está cadastrado.' }, 400);
  }

  // Create user with random password
  const password = crypto.randomUUID().slice(0, 8);
  const passwordHash = await bcrypt.hash(password, 10);
  const userId = crypto.randomUUID();

  await c.env.DB.prepare(
    'INSERT INTO users (id, tenant_id, name, email, password_hash, role) VALUES (?, ?, ?, ?, ?, ?)',
  )
    .bind(userId, tenantId, data.name, data.email, passwordHash, 'user')
    .run();

  return c.json({
    success: true,
    userId,
    message: `Usuário ${data.name} criado. Senha temporária: ${password}`,
  });
});

// DELETE /api/users/:id - Remove team member
users.delete('/:id', async (c) => {
  const currentUser = c.get('user');

  if (currentUser.role !== 'admin') {
    return c.json({ error: 'Apenas administradores podem remover membros.' }, 403);
  }

  const userId = c.req.param('id');

  // Cannot delete self
  if (userId === currentUser.sub) {
    return c.json({ error: 'Você não pode remover a si mesmo.' }, 400);
  }

  // Check if user belongs to same tenant
  const targetUser = await c.env.DB.prepare('SELECT id FROM users WHERE id = ? AND tenant_id = ?')
    .bind(userId, currentUser.tenantId)
    .first<{ id: string }>();

  if (!targetUser) {
    return c.json({ error: 'Usuário não encontrado.' }, 404);
  }

  await c.env.DB.prepare('DELETE FROM users WHERE id = ?').bind(userId).run();

  return c.json({ success: true });
});

export default users;
