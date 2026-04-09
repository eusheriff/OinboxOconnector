import { Hono } from 'hono';
import { Bindings, Variables } from '../bindings';
import { superAuthMiddleware } from '../middleware/auth';

const qualifications = new Hono<{ Bindings: Bindings; Variables: Variables }>();

qualifications.use('*', superAuthMiddleware);

// Types
interface QualificationRule {
  id: string;
  name: string;
  description?: string;
  min_rating: number;
  min_reviews: number;
  required_keywords?: string;
  excluded_keywords?: string;
  required_has_phone: boolean;
  required_has_website: boolean;
  weight: number;
  is_active: boolean;
}

// GET /api/qualifications - Listar regras
qualifications.get('/', async (c) => {
  const { results } = await c.env.DB.prepare(
    'SELECT * FROM qualification_rules ORDER BY weight DESC',
  ).all<QualificationRule>();

  return c.json({
    rules: results.map((r) => ({
      ...r,
      required_keywords: r.required_keywords ? JSON.parse(r.required_keywords) : [],
      excluded_keywords: r.excluded_keywords ? JSON.parse(r.excluded_keywords) : [],
    })),
  });
});

// GET /api/qualifications/:id - Detalhes da regra
qualifications.get('/:id', async (c) => {
  const id = c.req.param('id');

  const rule = await c.env.DB.prepare('SELECT * FROM qualification_rules WHERE id = ?')
    .bind(id)
    .first<QualificationRule>();

  if (!rule) {
    return c.json({ error: 'Regra não encontrada' }, 404);
  }

  return c.json({
    rule: {
      ...rule,
      required_keywords: rule.required_keywords ? JSON.parse(rule.required_keywords) : [],
      excluded_keywords: rule.excluded_keywords ? JSON.parse(rule.excluded_keywords) : [],
    },
  });
});

// POST /api/qualifications - Criar regra
qualifications.post('/', async (c) => {
  const data = await c.req.json();

  if (!data.name) {
    return c.json({ error: 'Nome é obrigatório' }, 400);
  }

  const id = crypto.randomUUID();

  await c.env.DB.prepare(
    `
    INSERT INTO qualification_rules (
      id, name, description, min_rating, min_reviews, 
      required_keywords, excluded_keywords, 
      required_has_phone, required_has_website, weight, is_active
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `,
  )
    .bind(
      id,
      data.name,
      data.description || null,
      data.min_rating || 0,
      data.min_reviews || 0,
      data.required_keywords ? JSON.stringify(data.required_keywords) : null,
      data.excluded_keywords ? JSON.stringify(data.excluded_keywords) : null,
      data.required_has_phone ?? true,
      data.required_has_website ?? false,
      data.weight || 10,
      data.is_active ?? true,
    )
    .run();

  return c.json({ success: true, id });
});

// PUT /api/qualifications/:id - Atualizar regra
qualifications.put('/:id', async (c) => {
  const id = c.req.param('id');
  const data = await c.req.json();

  await c.env.DB.prepare(
    `
    UPDATE qualification_rules SET
      name = COALESCE(?, name),
      description = COALESCE(?, description),
      min_rating = COALESCE(?, min_rating),
      min_reviews = COALESCE(?, min_reviews),
      required_keywords = COALESCE(?, required_keywords),
      excluded_keywords = COALESCE(?, excluded_keywords),
      required_has_phone = COALESCE(?, required_has_phone),
      required_has_website = COALESCE(?, required_has_website),
      weight = COALESCE(?, weight),
      is_active = COALESCE(?, is_active),
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `,
  )
    .bind(
      data.name || null,
      data.description || null,
      data.min_rating ?? null,
      data.min_reviews ?? null,
      data.required_keywords ? JSON.stringify(data.required_keywords) : null,
      data.excluded_keywords ? JSON.stringify(data.excluded_keywords) : null,
      data.required_has_phone ?? null,
      data.required_has_website ?? null,
      data.weight ?? null,
      data.is_active ?? null,
      id,
    )
    .run();

  return c.json({ success: true });
});

// DELETE /api/qualifications/:id - Deletar regra
qualifications.delete('/:id', async (c) => {
  const id = c.req.param('id');
  await c.env.DB.prepare('DELETE FROM qualification_rules WHERE id = ?').bind(id).run();
  return c.json({ success: true });
});

// POST /api/qualifications/:id/toggle - Ativar/desativar regra
qualifications.post('/:id/toggle', async (c) => {
  const id = c.req.param('id');

  await c.env.DB.prepare(
    `
    UPDATE qualification_rules SET 
      is_active = NOT is_active,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `,
  )
    .bind(id)
    .run();

  return c.json({ success: true });
});

// GET /api/qualifications/preview - Preview de quantos leads seriam qualificados
qualifications.get('/preview/count', async (c) => {
  const minScore = parseInt(c.req.query('minScore') || '50', 10);

  // Buscar regras ativas
  const { results: rules } = await c.env.DB.prepare(
    'SELECT * FROM qualification_rules WHERE is_active = 1',
  ).all<QualificationRule>();

  // Buscar leads não qualificados
  const { results: leads } = await c.env.DB.prepare(
    "SELECT * FROM leads WHERE status = 'new'",
  ).all<{
    id: string;
    rating: number;
    reviews_count: number;
    phone: string;
    website: string;
  }>();

  let wouldQualify = 0;

  for (const lead of leads) {
    let score = 0;

    for (const rule of rules) {
      // Rating
      if (rule.min_rating > 0 && lead.rating >= rule.min_rating) {
        score += rule.weight;
      }
      // Reviews
      if (rule.min_reviews > 0 && lead.reviews_count >= rule.min_reviews) {
        score += rule.weight;
      }
      // Phone
      if (rule.id === 'rule_phone' && lead.phone) {
        score += rule.weight;
      }
      // Website
      if (rule.id === 'rule_website' && lead.website) {
        score += rule.weight;
      }
    }

    if (Math.min(score, 100) >= minScore) {
      wouldQualify++;
    }
  }

  return c.json({
    totalNew: leads.length,
    wouldQualify,
    percentage: leads.length > 0 ? Math.round((wouldQualify / leads.length) * 100) : 0,
  });
});

export default qualifications;
