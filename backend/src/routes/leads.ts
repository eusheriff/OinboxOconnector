import { Hono } from 'hono';
import { Bindings, Variables } from '../bindings';
import { Lead } from '../../../shared/types'; // Importando do Shared

const leads = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// Helper para mapear snake_case do BD para camelCase do Domain
function mapLeadFromDb(dbLead: any): Lead {
  return {
    ...dbLead,
    googlePlaceId: dbLead.google_place_id,
    reviewsCount: dbLead.reviews_count,
    capturedAt: dbLead.captured_at ? new Date(dbLead.captured_at) : new Date(), // Garantir Date object
    qualifiedAt: dbLead.qualified_at ? new Date(dbLead.qualified_at) : undefined,
    contactedAt: dbLead.contacted_at ? new Date(dbLead.contacted_at) : undefined,
    respondedAt: dbLead.responded_at ? new Date(dbLead.responded_at) : undefined,
    convertedAt: dbLead.converted_at ? new Date(dbLead.converted_at) : undefined,
    whatsappStatus: dbLead.whatsapp_status,
    lastMessageAt: dbLead.last_message_at ? new Date(dbLead.last_message_at) : undefined,
    assignedTo: dbLead.assigned_to,
    tenantId: dbLead.tenant_id,
  } as Lead;
}

// POST /api/leads/maintenance/clean-phones - Rotina de limpeza de telefones antigos
leads.post('/maintenance/clean-phones', async (c) => {
  try {
    const { results } = await c.env.DB.prepare(
      "SELECT id, phone FROM leads WHERE phone IS NOT NULL AND (phone LIKE '%(%' OR phone LIKE '%-%' OR phone LIKE '% %')",
    ).all<{ id: string; phone: string }>(); // Tipagem explícita aqui pois não é o objeto Lead completo

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

    return c.json({
      success: true,
      message: `Telefones higienizados: ${updatedCount}`,
      totalScanned: results.length,
    });
  } catch (error) {
    console.error('Clean Phones Error:', error);
    return c.json({ error: 'Falha na rotina de limpeza' }, 500);
  }
});

// GET /api/leads - Listar leads com filtros
leads.get('/', async (c) => {
  try {
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

    // Usamos any aqui porque o retorno do banco é snake_case
    const { results } = await c.env.DB.prepare(sql)
      .bind(...params)
      .all<any>();

    // Mapeamos para o tipo correto do domínio
    const mappedLeads = results.map(mapLeadFromDb);

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

    const total = await c.env.DB.prepare(countSql)
      .bind(...countParams)
      .first<number>('total');

    return c.json({
      leads: mappedLeads,
      pagination: {
        total: total || 0,
        limit,
        offset,
        hasMore: offset + mappedLeads.length < (total || 0),
      },
    });
  } catch (error: any) {
    console.error('Leads List Error:', error);
    return c.json({ error: error.message || 'Failed to list leads' }, 500);
  }
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

  const stats = await c.env.DB.prepare(
    `
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
  `,
  ).first<LeadStats>();

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
  const dbLead = await c.env.DB.prepare('SELECT * FROM leads WHERE id = ?').bind(id).first<any>();

  if (!dbLead) {
    return c.json({ error: 'Lead não encontrado' }, 404);
  }

  const lead = mapLeadFromDb(dbLead);

  // Buscar mensagens da campanha se existirem
  const { results: messages } = await c.env.DB.prepare(
    'SELECT * FROM campaign_messages WHERE lead_id = ? ORDER BY sent_at DESC',
  )
    .bind(id)
    .all();

  return c.json({ lead, messages });
});

// PUT /api/leads/:id - Atualizar lead
leads.put('/:id', async (c) => {
  const id = c.req.param('id');

  // Partial update using camelCase fields from frontend? Or snake_case?
  // Frontend sends camelCase usually if using shared types.
  // We need to map camelCase input to snake_case DB columns.

  interface LeadUpdate {
    status?: string;
    score?: number;
    notes?: string;
    email?: string;
    phone?: string;
    assignedTo?: string; // camelCase
    assigned_to?: string; // fallback snake_case
    [key: string]: string | number | undefined;
  }

  const data = await c.req.json<LeadUpdate>();

  const updates: string[] = [];
  const params: (string | number)[] = [];

  // Mapeamento de campos permitidos: Frontend (camel) -> DB (snake)
  const fieldMap: Record<string, string> = {
    status: 'status',
    score: 'score',
    notes: 'notes',
    email: 'email',
    phone: 'phone',
    assignedTo: 'assigned_to',
    assigned_to: 'assigned_to',
  };

  for (const [key, val] of Object.entries(data)) {
    if (fieldMap[key] && val !== undefined) {
      updates.push(`${fieldMap[key]} = ?`);
      params.push(val!);
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

  const AGENT_HUB_URL = 'https://agent-hub.oconnector.tech/api/skill/qualify-lead';

  // Buscar todos os leads de uma vez
  const placeholders = leadIds.map(() => '?').join(',');
  const { results: dbLeads } = await c.env.DB.prepare(
    `SELECT * FROM leads WHERE id IN (${placeholders})`,
  )
    .bind(...leadIds)
    .all();

  const leads = (dbLeads as any[]).map(mapLeadFromDb);

  // Processar em paralelo com limite de concorrência
  const MAX_CONCURRENT = 5;
  let qualifiedCount = 0;
  const errors: string[] = [];

  async function processLead(leadId: string, lead: any) {
    try {
      const hubRes = await fetch(AGENT_HUB_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lead }),
      });

      if (!hubRes.ok) {
        console.error(`[Qualify] Hub returned ${hubRes.status} for ${leadId}`);
        return false;
      }

      const hubData = (await hubRes.json()) as any;
      const responseText = hubData.result?.response || hubData.response || '';

      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.error(`[Qualify] Failed to parse Hub response for ${leadId}`);
        return false;
      }

      const analysis = JSON.parse(jsonMatch[0]) as {
        score: number;
        breakdown: Record<string, number>;
        recommendation: string;
        reason: string;
      };

      const score = Math.min(100, Math.max(0, analysis.score || 0));
      const isQualified = score >= 50 || analysis.recommendation === 'qualificado';

      await c.env.DB.prepare(
        `UPDATE leads SET
          score = ?,
          score_breakdown = ?,
          notes = COALESCE(notes, '') || ? ,
          status = CASE WHEN ? THEN 'qualified' ELSE status END,
          qualified_at = CASE WHEN ? THEN CURRENT_TIMESTAMP ELSE qualified_at END
        WHERE id = ?`,
      )
        .bind(
          score,
          JSON.stringify(analysis.breakdown),
          `\n[IA] ${analysis.reason}`,
          isQualified,
          isQualified,
          leadId,
        )
        .run();

      return isQualified;
    } catch (err) {
      console.error(`[Qualify] Error for ${leadId}:`, err);
      errors.push(leadId);
      return false;
    }
  }

  // Processar em lotes para evitar sobrecarga
  for (let i = 0; i < leads.length; i += MAX_CONCURRENT) {
    const batch = leads.slice(i, i + MAX_CONCURRENT);
    const ids = leadIds.slice(i, i + MAX_CONCURRENT);
    const results = await Promise.all(batch.map((lead, idx) => processLead(ids[idx], lead)));
    qualifiedCount += results.filter(Boolean).length;
  }

  return c.json({
    success: true,
    qualified: qualifiedCount,
    total: leadIds.length,
    errors: errors.length > 0 ? errors : undefined,
  });
});

// POST /api/leads/:id/analyze - Gerar Pitch com IA (via Agent Hub Skill)
leads.post('/:id/analyze', async (c) => {
  const id = c.req.param('id');
  const AGENT_HUB_URL = 'https://agent-hub.oconnector.tech/api/skill/generate-pitch';

  try {
    const dbLead = await c.env.DB.prepare('SELECT * FROM leads WHERE id = ?').bind(id).first<any>();
    if (!dbLead) return c.json({ error: 'Lead not found' }, 404);

    const lead = mapLeadFromDb(dbLead);

    // Chamar endpoint de skill dedicado no Agent Hub
    const hubRes = await fetch(AGENT_HUB_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lead }),
    });

    const hubData = (await hubRes.json()) as any;
    const pitch =
      hubData.result?.response ||
      hubData.response ||
      `Olá ${lead.name}, gostaria de apresentar o Oconnector. Posso te mandar um vídeo?`;

    // Save pitch to notes
    const newNotes = (lead.notes || '') + '\n\n[AI PITCH]: ' + pitch;

    await c.env.DB.prepare('UPDATE leads SET notes = ? WHERE id = ?').bind(newNotes, id).run();

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
    const dbLead = await c.env.DB.prepare('SELECT * FROM leads WHERE id = ?').bind(id).first<any>();
    if (!dbLead) return c.json({ error: 'Lead not found' }, 404);

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
