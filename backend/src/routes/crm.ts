import { Hono } from 'hono';
import bcrypt from 'bcryptjs';
import { Bindings, Variables } from '../bindings';
import { authMiddleware } from '../middleware/auth';
import { analyzeClientData } from '../services/aiService';

const crm = new Hono<{ Bindings: Bindings; Variables: Variables }>();

crm.use('*', authMiddleware);

crm.get('/clients', async (c) => {
  const user = c.get('user');
  const tenantId = user.tenantId;

  const page = parseInt(c.req.query('page') || '1', 10);
  const limit = parseInt(c.req.query('limit') || '50', 10);
  const offset = (page - 1) * limit;

  const [clientsResult, countResult] = await Promise.all([
    c.env.DB.prepare(
      'SELECT id, name, email, phone, status, temperature, lead_score, last_interaction, created_at FROM clients WHERE tenant_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?',
    )
      .bind(tenantId, limit, offset)
      .all(),
    c.env.DB.prepare('SELECT COUNT(*) as total FROM clients WHERE tenant_id = ?')
      .bind(tenantId)
      .first<{ total: number }>(),
  ]);

  const items = clientsResult.results;
  const total = countResult?.total ?? 0;
  const hasMore = offset + items.length < total;

  return c.json({ items, total, page, pageSize: limit, hasMore });
});

crm.post('/clients', async (c) => {
  const user = c.get('user');
  const tenantId = user.tenantId;
  const data = await c.req.json();
  const id = crypto.randomUUID();

  // Default password: genera random or use provided
  const password = data.password || crypto.randomUUID().slice(0, 8);
  const passwordHash = await bcrypt.hash(password, 10);

  await c.env.DB.prepare(
    'INSERT INTO clients (id, tenant_id, name, email, phone, status, budget, password_hash) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
  )
    .bind(
      id,
      tenantId,
      data.name,
      data.email,
      data.phone,
      data.status || 'Novo',
      data.budget,
      passwordHash,
    )
    .run();

  return c.json({ success: true, id });
});

crm.post('/clients/:id/analyze', async (c) => {
  const user = c.get('user');
  const tenantId = user.tenantId;
  const clientId = c.req.param('id');
  const logger = c.get('logger');

  // 1. Fetch Client and Chat History
  const clientData = await c.env.DB.prepare('SELECT * FROM clients WHERE id = ? AND tenant_id = ?')
    .bind(clientId, tenantId)
    .first();
  if (!clientData) return c.json({ error: 'Client not found' }, 404);

  const history = await c.env.DB.prepare(
    'SELECT role, content FROM messages WHERE client_id = ? ORDER BY created_at ASC LIMIT 50',
  )
    .bind(clientId)
    .all<{ role: string; content: string }>();

  if (!history.results || history.results.length === 0) {
    return c.json({ error: 'No interaction history to analyze' }, 400);
  }

  // 2. Construct conversation text
  const conversation = history.results.map((m) => m.role + ': ' + m.content).join('\n');

  // 3. Call Gemini via aiService
  try {
    const result = await analyzeClientData(c.env, conversation);

    // 4. Update Database
    await c.env.DB.prepare('UPDATE clients SET score = ?, ai_summary = ? WHERE id = ?')
      .bind(result.score, result.summary, clientId)
      .run();

    return c.json(result);
  } catch (e: any) {
    await logger?.error('Lead Scoring Error', { error: e.message });
    return c.json({ error: 'Analysis failed' }, 500);
  }
});

export default crm;
