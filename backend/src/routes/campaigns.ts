import { Hono } from 'hono';
import { Bindings, Variables } from '../bindings';

const campaigns = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// Auth já é aplicado globalmente em index.ts

// Types matching DB Migration 0014
interface Campaign {
  id: string;
  name: string;
  description?: string;
  status: string; // active, paused, archived, draft
  type: string;
  settings: string; // JSON
  created_at: string;
  tenant_id: string;
}

// GET /api/campaigns - Listar campanhas
campaigns.get('/', async (c) => {
  const status = c.req.query('status');
  const user = c.get('user');
  const tenantId = user?.tenantId || 'default';

  let sql = 'SELECT * FROM campaigns WHERE tenant_id = ?';
  const params: string[] = [tenantId];

  if (status) {
    sql += ' AND status = ?';
    params.push(status);
  }

  sql += ' ORDER BY created_at DESC';

  const { results } = await c.env.DB.prepare(sql)
    .bind(...params)
    .all<Campaign>();

  // Parse settings JSON
  const mapped = results.map((cmp) => ({
    ...cmp,
    settings: cmp.settings ? JSON.parse(cmp.settings) : {},
  }));

  return c.json({ campaigns: mapped });
});

// GET /api/campaigns/:id - Detalhes da campanha
campaigns.get('/:id', async (c) => {
  const id = c.req.param('id');
  const user = c.get('user');
  const tenantId = user?.tenantId || 'default';

  const campaign = await c.env.DB.prepare('SELECT * FROM campaigns WHERE id = ? AND tenant_id = ?')
    .bind(id, tenantId)
    .first<Campaign>();

  if (!campaign) {
    return c.json({ error: 'Campanha não encontrada' }, 404);
  }

  // Estatísticas Real-time da tabela campaign_leads
  // Como campaign_leads tem tenant_id agora, podemos usar isso ou confiar no campaign_id
  // Por segurança, vamos verificar o tenant (embora campaign_id seja único, isolamento é bom)
  const stats = await c.env.DB.prepare(
    `
    SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN current_step > 0 THEN 1 ELSE 0 END) as engaged,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN status = 'stopped' THEN 1 ELSE 0 END) as responded
    FROM campaign_leads
    WHERE campaign_id = ? AND tenant_id = ?
  `,
  )
    .bind(id, tenantId)
    .first<any>();

  return c.json({
    campaign: {
      ...campaign,
      settings: campaign.settings ? JSON.parse(campaign.settings) : {},
    },
    stats,
  });
});

// POST /api/campaigns - Criar campanha
campaigns.post('/', async (c) => {
  const data = await c.req.json();
  const user = c.get('user');
  const tenantId = user?.tenantId || 'default';

  if (!data.name) {
    return c.json({ error: 'Nome é obrigatório' }, 400);
  }

  const id = crypto.randomUUID();

  // Default Settings for Autopilot
  const settings = {
    target_status: data.target_status || 'qualified',
    min_score: data.min_score || 50,
    steps: [
      { delay: 0, type: 'pitch', template: data.message_template || 'Olá {{name}}, tudo bem?' },
      { delay: 24, type: 'followup', template: 'Olá {{name}}, conseguiu ver minha mensagem?' },
    ],
  };

  await c.env.DB.prepare(
    `
    INSERT INTO campaigns (id, name, description, status, type, settings, tenant_id) 
    VALUES (?, ?, ?, 'draft', 'outreach', ?, ?)
  `,
  )
    .bind(id, data.name, data.description || null, JSON.stringify(settings), tenantId)
    .run();

  return c.json({ success: true, id });
});

// PUT /api/campaigns/:id - Atualizar campanha
campaigns.put('/:id', async (c) => {
  const id = c.req.param('id');
  const data = await c.req.json();
  const user = c.get('user');
  const tenantId = user?.tenantId || 'default';

  const campaign = await c.env.DB.prepare('SELECT * FROM campaigns WHERE id = ? AND tenant_id = ?')
    .bind(id, tenantId)
    .first<Campaign>();

  if (!campaign) {
    return c.json({ error: 'Campanha não encontrada' }, 404);
  }

  const currentSettings = campaign.settings ? JSON.parse(campaign.settings) : {};
  const newSettings = { ...currentSettings, ...data.settings };

  await c.env.DB.prepare(
    `
    UPDATE campaigns SET
      name = COALESCE(?, name),
      description = COALESCE(?, description),
      status = COALESCE(?, status),
      settings = ?
    WHERE id = ? AND tenant_id = ?
  `,
  )
    .bind(
      data.name || null,
      data.description || null,
      data.status || null,
      JSON.stringify(newSettings),
      id,
      tenantId,
    )
    .run();

  return c.json({ success: true });
});

// POST /api/campaigns/:id/start - Iniciar campanha (Backfill Leads)
campaigns.post('/:id/start', async (c) => {
  const id = c.req.param('id');
  const user = c.get('user');
  const tenantId = user?.tenantId || 'default';

  const campaign = await c.env.DB.prepare('SELECT * FROM campaigns WHERE id = ? AND tenant_id = ?')
    .bind(id, tenantId)
    .first<Campaign>();

  if (!campaign) {
    return c.json({ error: 'Campanha não encontrada' }, 404);
  }

  const settings = campaign.settings ? JSON.parse(campaign.settings) : {};
  const targetStatus = settings.target_status || 'qualified';
  const minScore = settings.min_score || 0;

  // 1. Ativar Campanha
  await c.env.DB.prepare("UPDATE campaigns SET status = 'active' WHERE id = ? AND tenant_id = ?")
    .bind(id, tenantId)
    .run();

  // 2. Backfill: Encontrar leads que já deveriam estar na campanha mas não estão
  // IMPORTANTE: Filtrar leads pelo tenant_id também!
  const { results: leads } = await c.env.DB.prepare(
    `
    SELECT id FROM leads 
    WHERE status = ? 
    AND score >= ? 
    AND tenant_id = ?
    AND id NOT IN (SELECT lead_id FROM campaign_leads WHERE campaign_id = ?)
    LIMIT 500
  `,
  )
    .bind(targetStatus, minScore, tenantId, id)
    .all<{ id: string }>();

  if (leads.length > 0) {
    const stmt = c.env.DB.prepare(`
        INSERT INTO campaign_leads (id, campaign_id, lead_id, current_step, status, next_action_at, tenant_id)
        VALUES (?, ?, ?, 0, 'pending', CURRENT_TIMESTAMP, ?)
      `);

    const batch = leads.map((l) => stmt.bind(crypto.randomUUID(), id, l.id, tenantId));
    await (c.env.DB as any).batch(batch);
  }

  return c.json({
    success: true,
    message: `Campanha iniciada. ${leads.length} leads adicionados à fila.`,
    queued: leads.length,
  });
});

// DELETE /api/campaigns/:id - Deletar campanha
campaigns.delete('/:id', async (c) => {
  const id = c.req.param('id');
  const user = c.get('user');
  const tenantId = user?.tenantId || 'default';

  // Verificar propriedade
  const exists = await c.env.DB.prepare('SELECT id FROM campaigns WHERE id = ? AND tenant_id = ?')
    .bind(id, tenantId)
    .first();

  if (!exists) return c.json({ error: 'Campanha não encontrada' }, 404);

  // Deletar cascata (manual por falta de FK constraint ativa em D1 as vezes)
  await c.env.DB.prepare('DELETE FROM campaign_leads WHERE campaign_id = ?').bind(id).run();
  await c.env.DB.prepare('DELETE FROM campaign_messages WHERE campaign_id = ?').bind(id).run();
  await c.env.DB.prepare('DELETE FROM campaigns WHERE id = ?').bind(id).run();
  return c.json({ success: true });
});

export default campaigns;
