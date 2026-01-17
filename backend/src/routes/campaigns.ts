import { Hono } from 'hono';
import { Bindings, Variables } from '../types';
import { superAuthMiddleware } from '../middleware/auth';

const campaigns = new Hono<{ Bindings: Bindings; Variables: Variables }>();

campaigns.use('*', superAuthMiddleware);

// Types
interface Campaign {
  id: string;
  name: string;
  description?: string;
  status: string;
  message_template: string;
  variables?: string;
  target_status: string;
  min_score: number;
  max_score: number;
  total_leads: number;
  sent_count: number;
  delivered_count: number;
  read_count: number;
  replied_count: number;
  failed_count: number;
  created_at: string;
}

// GET /api/campaigns - Listar campanhas
campaigns.get('/', async (c) => {
  const status = c.req.query('status');

  let sql = 'SELECT * FROM campaigns';
  const params: string[] = [];

  if (status) {
    sql += ' WHERE status = ?';
    params.push(status);
  }

  sql += ' ORDER BY created_at DESC';

  const { results } = await c.env.DB.prepare(sql).bind(...params).all<Campaign>();

  return c.json({ campaigns: results });
});

// GET /api/campaigns/:id - Detalhes da campanha
campaigns.get('/:id', async (c) => {
  const id = c.req.param('id');

  const campaign = await c.env.DB.prepare('SELECT * FROM campaigns WHERE id = ?')
    .bind(id)
    .first<Campaign>();

  if (!campaign) {
    return c.json({ error: 'Campanha não encontrada' }, 404);
  }

  // Buscar mensagens
  const { results: messages } = await c.env.DB.prepare(`
    SELECT cm.*, l.name as lead_name, l.phone as lead_phone
    FROM campaign_messages cm
    JOIN leads l ON cm.lead_id = l.id
    WHERE cm.campaign_id = ?
    ORDER BY cm.sent_at DESC
    LIMIT 100
  `)
    .bind(id)
    .all();

  return c.json({ campaign, messages });
});

// POST /api/campaigns - Criar campanha
campaigns.post('/', async (c) => {
  const data = await c.req.json();

  if (!data.name || !data.message_template) {
    return c.json({ error: 'Nome e template de mensagem são obrigatórios' }, 400);
  }

  const id = crypto.randomUUID();

  await c.env.DB.prepare(`
    INSERT INTO campaigns (
      id, name, description, status, message_template, variables,
      target_status, min_score, max_score, send_delay_seconds, max_daily_sends
    ) VALUES (?, ?, ?, 'draft', ?, ?, ?, ?, ?, ?, ?)
  `)
    .bind(
      id,
      data.name,
      data.description || null,
      data.message_template,
      JSON.stringify(data.variables || []),
      data.target_status || 'qualified',
      data.min_score || 0,
      data.max_score || 100,
      data.send_delay_seconds || 30,
      data.max_daily_sends || 100
    )
    .run();

  return c.json({ success: true, id });
});

// PUT /api/campaigns/:id - Atualizar campanha
campaigns.put('/:id', async (c) => {
  const id = c.req.param('id');
  const data = await c.req.json();

  const campaign = await c.env.DB.prepare('SELECT status FROM campaigns WHERE id = ?')
    .bind(id)
    .first<{ status: string }>();

  if (!campaign) {
    return c.json({ error: 'Campanha não encontrada' }, 404);
  }

  if (campaign.status !== 'draft') {
    return c.json({ error: 'Apenas campanhas em rascunho podem ser editadas' }, 400);
  }

  await c.env.DB.prepare(`
    UPDATE campaigns SET
      name = COALESCE(?, name),
      description = COALESCE(?, description),
      message_template = COALESCE(?, message_template),
      variables = COALESCE(?, variables),
      target_status = COALESCE(?, target_status),
      min_score = COALESCE(?, min_score),
      max_score = COALESCE(?, max_score)
    WHERE id = ?
  `)
    .bind(
      data.name || null,
      data.description || null,
      data.message_template || null,
      data.variables ? JSON.stringify(data.variables) : null,
      data.target_status || null,
      data.min_score ?? null,
      data.max_score ?? null,
      id
    )
    .run();

  return c.json({ success: true });
});

// POST /api/campaigns/:id/start - Iniciar campanha
campaigns.post('/:id/start', async (c) => {
  const id = c.req.param('id');

  const campaign = await c.env.DB.prepare('SELECT * FROM campaigns WHERE id = ?')
    .bind(id)
    .first<Campaign>();

  if (!campaign) {
    return c.json({ error: 'Campanha não encontrada' }, 404);
  }

  if (campaign.status !== 'draft' && campaign.status !== 'paused') {
    return c.json({ error: 'Campanha já está ativa ou finalizada' }, 400);
  }

  // Buscar leads que atendem aos critérios
  const { results: leads } = await c.env.DB.prepare(`
    SELECT id, name, phone FROM leads 
    WHERE status = ? 
    AND score >= ? 
    AND score <= ?
    AND phone IS NOT NULL
    AND id NOT IN (SELECT lead_id FROM campaign_messages WHERE campaign_id = ?)
  `)
    .bind(campaign.target_status, campaign.min_score, campaign.max_score, id)
    .all<{ id: string; name: string; phone: string }>();

  // Criar mensagens para cada lead
  for (const lead of leads) {
    const messageId = crypto.randomUUID();
    
    // Renderizar template com variáveis
    let messageContent = campaign.message_template;
    messageContent = messageContent.replace(/\{\{nome\}\}/g, lead.name);
    messageContent = messageContent.replace(/\{\{empresa\}\}/g, lead.name);

    await c.env.DB.prepare(`
      INSERT INTO campaign_messages (id, campaign_id, lead_id, message_content, status, queued_at)
      VALUES (?, ?, ?, ?, 'queued', CURRENT_TIMESTAMP)
    `)
      .bind(messageId, id, lead.id, messageContent)
      .run();
  }

  // Atualizar status da campanha
  await c.env.DB.prepare(`
    UPDATE campaigns SET 
      status = 'active', 
      started_at = CURRENT_TIMESTAMP,
      total_leads = ?
    WHERE id = ?
  `)
    .bind(leads.length, id)
    .run();

  return c.json({
    success: true,
    message: `Campanha iniciada com ${leads.length} leads`,
    leadsCount: leads.length,
  });
});

// POST /api/campaigns/:id/pause - Pausar campanha
campaigns.post('/:id/pause', async (c) => {
  const id = c.req.param('id');

  await c.env.DB.prepare(`
    UPDATE campaigns SET status = 'paused', paused_at = CURRENT_TIMESTAMP
    WHERE id = ? AND status = 'active'
  `)
    .bind(id)
    .run();

  return c.json({ success: true });
});

// GET /api/campaigns/:id/stats - Estatísticas detalhadas
campaigns.get('/:id/stats', async (c) => {
  const id = c.req.param('id');

  interface CampaignStats {
    total: number;
    queued: number;
    sent: number;
    delivered: number;
    read_count: number;
    replied: number;
    failed: number;
  }

  const stats = await c.env.DB.prepare(`
    SELECT 
      COUNT(*) as total,
      SUM(CASE WHEN status = 'queued' THEN 1 ELSE 0 END) as queued,
      SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) as sent,
      SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END) as delivered,
      SUM(CASE WHEN status = 'read' THEN 1 ELSE 0 END) as read_count,
      SUM(CASE WHEN status = 'replied' THEN 1 ELSE 0 END) as replied,
      SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed
    FROM campaign_messages
    WHERE campaign_id = ?
  `)
    .bind(id)
    .first<CampaignStats>();

  // Taxa de conversão
  const total = stats?.total || 0;
  const replied = stats?.replied || 0;
  const conversionRate = total > 0 ? Math.round((replied / total) * 100) : 0;

  return c.json({
    total: stats?.total || 0,
    queued: stats?.queued || 0,
    sent: stats?.sent || 0,
    delivered: stats?.delivered || 0,
    read_count: stats?.read_count || 0,
    replied: stats?.replied || 0,
    failed: stats?.failed || 0,
    conversionRate,
  });
});

// DELETE /api/campaigns/:id - Deletar campanha
campaigns.delete('/:id', async (c) => {
  const id = c.req.param('id');

  // Deletar mensagens primeiro (FK)
  await c.env.DB.prepare('DELETE FROM campaign_messages WHERE campaign_id = ?').bind(id).run();
  await c.env.DB.prepare('DELETE FROM campaigns WHERE id = ?').bind(id).run();

  return c.json({ success: true });
});

export default campaigns;
