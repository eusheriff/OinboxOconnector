import { Hono, MiddlewareHandler } from 'hono';
import { Bindings, Variables } from '../types';
import { authMiddleware, superAuthMiddleware } from '../middleware/auth';

const buyerLeads = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// Types
interface BuyerLead {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  source: string;
  interest_type?: string;
  property_type?: string;
  city?: string;
  state?: string;
  neighborhood?: string;
  budget_min?: number;
  budget_max?: number;
  bedrooms?: number;
  notes?: string;
  ai_score: number;
  status: string;
  captured_at: string;
}

// =====================================
// ROTAS PARA TENANTS ENTERPRISE
// =====================================

// Middleware: verificar se tenant é Enterprise
const enterpriseMiddleware: MiddlewareHandler<{ Bindings: Bindings; Variables: Variables }> = async (c, next) => {
  const user = c.get('user');
  if (!user) {
    return c.json({ error: 'Não autenticado' }, 401);
  }

  const tenant = await c.env.DB.prepare('SELECT plan FROM tenants WHERE id = ?')
    .bind(user.tenantId)
    .first<{ plan: string }>();

  if (!tenant || tenant.plan !== 'Enterprise') {
    return c.json({ error: 'Recurso disponível apenas para plano Enterprise' }, 403);
  }

  await next();
};

// GET /api/buyer-leads - Listar leads disponíveis (Enterprise)
buyerLeads.get('/', authMiddleware, enterpriseMiddleware, async (c) => {
  const user = c.get('user');
  if (!user) return c.json({ error: 'Não autenticado' }, 401);

  const tenantId = user.tenantId;
  const city = c.req.query('city');
  const interestType = c.req.query('interest_type');
  const propertyType = c.req.query('property_type');
  const minBudget = c.req.query('min_budget');
  const maxBudget = c.req.query('max_budget');
  const page = parseInt(c.req.query('page') || '1', 10);
  const limit = parseInt(c.req.query('limit') || '20', 10);
  const offset = (page - 1) * limit;

  let sql = "SELECT * FROM buyer_leads WHERE status = 'available'";
  const params: (string | number)[] = [];

  if (city) {
    sql += ' AND city = ?';
    params.push(city);
  }
  if (interestType) {
    sql += ' AND interest_type = ?';
    params.push(interestType);
  }
  if (propertyType) {
    sql += ' AND property_type = ?';
    params.push(propertyType);
  }
  if (minBudget) {
    sql += ' AND budget_max >= ?';
    params.push(parseFloat(minBudget));
  }
  if (maxBudget) {
    sql += ' AND budget_min <= ?';
    params.push(parseFloat(maxBudget));
  }

  sql += ' ORDER BY captured_at DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  const { results } = await c.env.DB.prepare(sql).bind(...params).all<BuyerLead>();

  // Verificar quais já foram acessados por este tenant
  const leadIds = results.map((l) => l.id);
  if (leadIds.length > 0) {
    const { results: accessed } = await c.env.DB.prepare(
      `SELECT buyer_lead_id, contacted FROM lead_access 
       WHERE tenant_id = ? AND buyer_lead_id IN (${leadIds.map(() => '?').join(',')})`
    )
      .bind(tenantId, ...leadIds)
      .all<{ buyer_lead_id: string; contacted: boolean }>();

    const accessMap = new Map(accessed.map((a) => [a.buyer_lead_id, a]));

    return c.json({
      leads: results.map((lead) => ({
        ...lead,
        phone: accessMap.has(lead.id) ? lead.phone : '***',
        email: accessMap.has(lead.id) ? lead.email : '***',
        accessed: accessMap.has(lead.id),
        contacted: accessMap.get(lead.id)?.contacted || false,
      })),
      page,
      limit,
    });
  }

  return c.json({
    leads: results.map((lead) => ({
      ...lead,
      phone: '***',
      email: '***',
      accessed: false,
      contacted: false,
    })),
    page,
    limit,
  });
});

// GET /api/buyer-leads/my/stats - Estatísticas do tenant
buyerLeads.get('/my/stats', authMiddleware, enterpriseMiddleware, async (c) => {
  const user = c.get('user');
  if (!user) return c.json({ error: 'Não autenticado' }, 401);

  interface Stats {
    accessed: number;
    contacted: number;
  }

  const stats = await c.env.DB.prepare(
    `SELECT COUNT(*) as accessed,
            SUM(CASE WHEN contacted = TRUE THEN 1 ELSE 0 END) as contacted
     FROM lead_access WHERE tenant_id = ?`
  )
    .bind(user.tenantId)
    .first<Stats>();

  const { results: totalAvailable } = await c.env.DB.prepare(
    "SELECT COUNT(*) as total FROM buyer_leads WHERE status = 'available'"
  ).all<{ total: number }>();

  return c.json({
    available: totalAvailable[0]?.total || 0,
    accessed: stats?.accessed || 0,
    contacted: stats?.contacted || 0,
  });
});

// GET /api/buyer-leads/:id - Ver detalhes (registra acesso)
buyerLeads.get('/:id', authMiddleware, enterpriseMiddleware, async (c) => {
  const id = c.req.param('id');
  const user = c.get('user');
  if (!user) return c.json({ error: 'Não autenticado' }, 401);

  const lead = await c.env.DB.prepare('SELECT * FROM buyer_leads WHERE id = ?')
    .bind(id)
    .first<BuyerLead>();

  if (!lead) {
    return c.json({ error: 'Lead não encontrado' }, 404);
  }

  // Registrar acesso (se não existir)
  const existingAccess = await c.env.DB.prepare(
    'SELECT id FROM lead_access WHERE tenant_id = ? AND buyer_lead_id = ?'
  )
    .bind(user.tenantId, id)
    .first();

  if (!existingAccess) {
    const accessId = crypto.randomUUID();
    await c.env.DB.prepare(
      `INSERT INTO lead_access (id, tenant_id, buyer_lead_id, user_id)
       VALUES (?, ?, ?, ?)`
    )
      .bind(accessId, user.tenantId, id, user.sub)
      .run();
  }

  return c.json({ lead });
});

// POST /api/buyer-leads/:id/contact - Marcar como contatado
buyerLeads.post('/:id/contact', authMiddleware, enterpriseMiddleware, async (c) => {
  const id = c.req.param('id');
  const user = c.get('user');
  if (!user) return c.json({ error: 'Não autenticado' }, 401);

  const data = await c.req.json();

  await c.env.DB.prepare(
    `UPDATE lead_access SET contacted = TRUE, contact_notes = COALESCE(?, contact_notes)
     WHERE tenant_id = ? AND buyer_lead_id = ?`
  )
    .bind(data.notes || null, user.tenantId, id)
    .run();

  return c.json({ success: true });
});

// =====================================
// ROTAS ADMIN (SuperAdmin)
// =====================================

// GET /api/buyer-leads/admin - Listar todos (SuperAdmin)
buyerLeads.get('/admin', superAuthMiddleware, async (c) => {
  const { results } = await c.env.DB.prepare(
    'SELECT * FROM buyer_leads ORDER BY captured_at DESC LIMIT 100'
  ).all<BuyerLead>();

  return c.json({ leads: results });
});

// GET /api/buyer-leads/admin/stats - Estatísticas gerais
buyerLeads.get('/admin/stats', superAuthMiddleware, async (c) => {
  interface AdminStats {
    total: number;
    available: number;
    total_accessed: number;
    total_contacted: number;
  }

  const stats = await c.env.DB.prepare(`
    SELECT 
      (SELECT COUNT(*) FROM buyer_leads) as total,
      (SELECT COUNT(*) FROM buyer_leads WHERE status = 'available') as available,
      (SELECT COUNT(*) FROM lead_access) as total_accessed,
      (SELECT COUNT(*) FROM lead_access WHERE contacted = TRUE) as total_contacted
  `).first<AdminStats>();

  return c.json(stats);
});

// POST /api/buyer-leads/admin - Adicionar lead (SuperAdmin)
buyerLeads.post('/admin', superAuthMiddleware, async (c) => {
  const data = await c.req.json();

  if (!data.name) {
    return c.json({ error: 'Nome é obrigatório' }, 400);
  }

  const id = crypto.randomUUID();

  await c.env.DB.prepare(
    `INSERT INTO buyer_leads (
       id, name, phone, email, source, interest_type, property_type,
       city, state, neighborhood, budget_min, budget_max, bedrooms, notes, ai_score
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(
      id,
      data.name,
      data.phone || null,
      data.email || null,
      data.source || 'manual',
      data.interest_type || null,
      data.property_type || null,
      data.city || null,
      data.state || 'SP',
      data.neighborhood || null,
      data.budget_min || null,
      data.budget_max || null,
      data.bedrooms || null,
      data.notes || null,
      data.ai_score || 50
    )
    .run();

  return c.json({ success: true, id });
});

// DELETE /api/buyer-leads/admin/:id - Remover lead
buyerLeads.delete('/admin/:id', superAuthMiddleware, async (c) => {
  const id = c.req.param('id');

  await c.env.DB.prepare('DELETE FROM lead_access WHERE buyer_lead_id = ?').bind(id).run();
  await c.env.DB.prepare('DELETE FROM buyer_leads WHERE id = ?').bind(id).run();

  return c.json({ success: true });
});

export default buyerLeads;
