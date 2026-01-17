import { Hono } from 'hono';
import { Bindings, Variables } from '../types';
import { superAuthMiddleware } from '../middleware/auth';

const leads = new Hono<{ Bindings: Bindings; Variables: Variables }>();

leads.use('*', superAuthMiddleware);

// Types para leads
interface Lead {
  id: string;
  google_place_id?: string;
  name: string;
  type?: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  rating?: number;
  reviews_count: number;
  score: number;
  status: string;
  source: string;
  captured_at: string;
  notes?: string;
}

// POST /api/leads/maintenance/clean-phones - Rotina de limpeza de telefones antigos
leads.post('/maintenance/clean-phones', async (c) => {
  try {
    // 1. Buscar todos os leads com telefone que contenham caracteres não numéricos (exceto null)
    // D1/SQLite não tem REGEX nativo fácil no WHERE, então pegamos os suspeitos com LIKE ou todos e filtramos no código
    const { results } = await c.env.DB.prepare(
        "SELECT id, phone FROM leads WHERE phone IS NOT NULL AND (phone LIKE '%(%' OR phone LIKE '%-%' OR phone LIKE '% %')"
    ).all<Lead>();

    let updatedCount = 0;

    for (const lead of results) {
       if (!lead.phone) continue;
       
       const cleanPhone = lead.phone.replace(/\D/g, '');
       
       if (cleanPhone !== lead.phone) {
           await c.env.DB.prepare('UPDATE leads SET phone = ? WHERE id = ?')
               .bind(cleanPhone, lead.id)
               .run();
           updatedCount++;
       }
    }

    return c.json({ success: true, message: `Telefones higienizados: ${updatedCount}`, totalScanned: results.length });

  } catch (error) {
    console.error('Clean Phones Error:', error);
    return c.json({ error: 'Falha na rotina de limpeza' }, 500);
  }
});

// GET /api/leads - Listar leads com filtros
leads.get('/', async (c) => {
  const status = c.req.query('status');
  const minScore = c.req.query('minScore');
  const search = c.req.query('search');
  const limit = parseInt(c.req.query('limit') || '50', 10);
  const offset = parseInt(c.req.query('offset') || '0', 10);

  let sql = 'SELECT * FROM leads WHERE 1=1';
  const params: (string | number)[] = [];

  if (status) {
    sql += ' AND status = ?';
    params.push(status);
  }

  if (minScore) {
    sql += ' AND score >= ?';
    params.push(parseInt(minScore, 10));
  }

  if (search) {
    sql += ' AND (name LIKE ? OR phone LIKE ? OR email LIKE ?)';
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }

  sql += ' ORDER BY captured_at DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  const { results } = await c.env.DB.prepare(sql).bind(...params).all<Lead>();

  // Count total for pagination
  let countSql = 'SELECT COUNT(*) as total FROM leads WHERE 1=1';
  const countParams: (string | number)[] = [];

  if (status) {
    countSql += ' AND status = ?';
    countParams.push(status);
  }

  if (minScore) {
    countSql += ' AND score >= ?';
    countParams.push(parseInt(minScore, 10));
  }

  if (search) {
    countSql += ' AND (name LIKE ? OR phone LIKE ? OR email LIKE ?)';
    countParams.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }

  const total = await c.env.DB.prepare(countSql).bind(...countParams).first<number>('total');

  return c.json({
    leads: results,
    pagination: {
      total: total || 0,
      limit,
      offset,
      hasMore: offset + results.length < (total || 0),
    },
  });
});

// GET /api/leads/stats - Estatísticas do funil
leads.get('/stats', async (c) => {
  interface LeadStats {
    total: number;
    new_count: number;
    qualified_count: number;
    contacted_count: number;
    responded_count: number;
    converted_count: number;
    rejected_count: number;
    avg_score: number;
  }

  const stats = await c.env.DB.prepare(`
    SELECT 
      COUNT(*) as total,
      SUM(CASE WHEN status = 'new' THEN 1 ELSE 0 END) as new_count,
      SUM(CASE WHEN status = 'qualified' THEN 1 ELSE 0 END) as qualified_count,
      SUM(CASE WHEN status = 'contacted' THEN 1 ELSE 0 END) as contacted_count,
      SUM(CASE WHEN status = 'responded' THEN 1 ELSE 0 END) as responded_count,
      SUM(CASE WHEN status = 'converted' THEN 1 ELSE 0 END) as converted_count,
      SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected_count,
      AVG(score) as avg_score
    FROM leads
  `).first<LeadStats>();

  return c.json({
    funnel: {
      new: stats?.new_count || 0,
      qualified: stats?.qualified_count || 0,
      contacted: stats?.contacted_count || 0,
      responded: stats?.responded_count || 0,
      converted: stats?.converted_count || 0,
      rejected: stats?.rejected_count || 0,
    },
    total: stats?.total || 0,
    avgScore: Math.round(stats?.avg_score || 0),
  });
});

// GET /api/leads/:id - Detalhes do lead
leads.get('/:id', async (c) => {
  const id = c.req.param('id');
  const lead = await c.env.DB.prepare('SELECT * FROM leads WHERE id = ?').bind(id).first<Lead>();

  if (!lead) {
    return c.json({ error: 'Lead não encontrado' }, 404);
  }

  // Buscar mensagens da campanha se existirem
  const { results: messages } = await c.env.DB.prepare(
    'SELECT * FROM campaign_messages WHERE lead_id = ? ORDER BY sent_at DESC'
  )
    .bind(id)
    .all();

  return c.json({ lead, messages });
});

// PUT /api/leads/:id - Atualizar lead
leads.put('/:id', async (c) => {
  const id = c.req.param('id');
  
  interface LeadUpdate {
      status?: string;
      score?: number;
      notes?: string;
      email?: string;
      phone?: string;
      assigned_to?: string;
      [key: string]: string | number | undefined; // Fallback for loop
  }
  
  const data = await c.req.json<LeadUpdate>();

  const allowedFields = ['status', 'score', 'notes', 'email', 'phone', 'assigned_to'];
  const updates: string[] = [];
  const params: (string | number)[] = [];

  for (const field of allowedFields) {
    if (data[field] !== undefined) {
      updates.push(`${field} = ?`);
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      params.push(data[field]!);
    }
  }

  // Atualizar timestamps baseado no status
  if (data.status === 'qualified') {
    updates.push('qualified_at = CURRENT_TIMESTAMP');
  } else if (data.status === 'contacted') {
    updates.push('contacted_at = CURRENT_TIMESTAMP');
  } else if (data.status === 'responded') {
    updates.push('responded_at = CURRENT_TIMESTAMP');
  } else if (data.status === 'converted') {
    updates.push('converted_at = CURRENT_TIMESTAMP');
  }

  if (updates.length === 0) {
    return c.json({ error: 'Nenhum campo válido para atualizar' }, 400);
  }

  params.push(id);
  await c.env.DB.prepare(`UPDATE leads SET ${updates.join(', ')} WHERE id = ?`)
    .bind(...params)
    .run();

  return c.json({ success: true });
});

// DELETE /api/leads/:id - Remover lead
leads.delete('/:id', async (c) => {
  const id = c.req.param('id');
  await c.env.DB.prepare('DELETE FROM campaign_messages WHERE lead_id = ?').bind(id).run();
  await c.env.DB.prepare('DELETE FROM leads WHERE id = ?').bind(id).run();
  return c.json({ success: true });
});

// POST /api/leads/qualify - Qualificar leads em batch
leads.post('/qualify', async (c) => {
  interface QualifyBody {
      leadIds: string[];
  }
  const { leadIds } = await c.req.json<QualifyBody>();

  if (!leadIds || !Array.isArray(leadIds)) {
    return c.json({ error: 'leadIds deve ser um array' }, 400);
  }

  // Buscar regras de qualificação ativas
  const { results: rules } = await c.env.DB.prepare(
    'SELECT * FROM qualification_rules WHERE is_active = 1'
  ).all<{
    id: string;
    name: string;
    min_rating: number;
    min_reviews: number;
    weight: number;
  }>();

  let qualifiedCount = 0;

  for (const leadId of leadIds) {
    const lead = await c.env.DB.prepare('SELECT * FROM leads WHERE id = ?')
      .bind(leadId)
      .first<Lead>();

    if (!lead) continue;

    let score = 0;
    const breakdown: Record<string, number> = {};

    for (const rule of rules) {
      let ruleScore = 0;

      // Rating check
      if (rule.min_rating > 0 && lead.rating && lead.rating >= rule.min_rating) {
        ruleScore = rule.weight;
      }

      // Reviews check
      if (rule.min_reviews > 0 && lead.reviews_count >= rule.min_reviews) {
        ruleScore = rule.weight;
      }

      // Phone check
      if (rule.id === 'rule_phone' && lead.phone) {
        ruleScore = rule.weight;
      }

      // Website check
      if (rule.id === 'rule_website' && lead.website) {
        ruleScore = rule.weight;
      }

      if (ruleScore > 0) {
        breakdown[rule.id] = ruleScore;
        score += ruleScore;
      }
    }

    // Cap score at 100
    score = Math.min(score, 100);

    await c.env.DB.prepare(
      `UPDATE leads SET 
        score = ?, 
        score_breakdown = ?, 
        status = CASE WHEN ? >= 50 THEN 'qualified' ELSE status END,
        qualified_at = CASE WHEN ? >= 50 THEN CURRENT_TIMESTAMP ELSE qualified_at END
      WHERE id = ?`
    )
      .bind(score, JSON.stringify(breakdown), score, score, leadId)
      .run();

    if (score >= 50) qualifiedCount++;
  }

  return c.json({ success: true, qualifiedCount, totalProcessed: leadIds.length });
});

// POST /api/leads/:id/analyze - Gerar Pitch com IA
leads.post('/:id/analyze', async (c) => {
  const id = c.req.param('id');
  const GEMINI_KEY = c.env.GOOGLE_GEMINI_API_KEY;

  try {
    const lead = await c.env.DB.prepare('SELECT * FROM leads WHERE id = ?').bind(id).first<Lead>();
    if (!lead) return c.json({ error: 'Lead not found' }, 404);

    const { generateSalesPitch } = await import('../services/geminiService');
    const pitch = await generateSalesPitch(GEMINI_KEY || '', {
        name: lead.name,
        rating: lead.rating || 0,
        address: lead.address || ''
    });

    // Save pitch to notes for now (or a new column if we had one, but notes works for MVP)
    const newNotes = (lead.notes || '') + '\n\n[AI PITCH]: ' + pitch;

    await c.env.DB.prepare('UPDATE leads SET notes = ? WHERE id = ?')
        .bind(newNotes, id)
        .run();

    return c.json({ success: true, pitch });
  } catch (error) {
    console.error('Analyze Error:', error);
    return c.json({ error: 'Failed to analyze lead' }, 500);
  }
});

// POST /api/leads/:id/invite - Enviar Convite (Simulação/Mock do Envio)
leads.post('/:id/invite', async (c) => {
  const id = c.req.param('id');
  
  try {
    const lead = await c.env.DB.prepare('SELECT * FROM leads WHERE id = ?').bind(id).first<Lead>();
    if (!lead) return c.json({ error: 'Lead not found' }, 404);
    
    // Simulate sending
    await c.env.DB.prepare("UPDATE leads SET status = 'contacted', contacted_at = ? WHERE id = ?")
        .bind(new Date().toISOString(), id)
        .run();

    return c.json({ success: true, status: 'contacted' });
  } catch (error) {
    return c.json({ error: 'Invite failed' }, 500);
  }
});

export default leads;
