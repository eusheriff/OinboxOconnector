import { Hono } from 'hono';
import { Bindings, Variables } from '../types';
import { authMiddleware } from '../middleware/auth';
import { getPlan } from '../config/plans';

const properties = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// Middleware de Auth para todas as rotas
properties.use('/*', authMiddleware);

properties.get('/', async (c) => {
  const user = c.get('user');
  const tenantId = user.tenantId;

  const { results } = await c.env.DB.prepare(
    'SELECT * FROM properties WHERE tenant_id = ? ORDER BY created_at DESC',
  )
    .bind(tenantId)
    .all();

  const formatted = results.map((p) => {
    const prop = p as Record<string, unknown>;
    return {
      ...prop,
      features: prop.features ? JSON.parse(prop.features as string) : [],
    };
  });

  return c.json(formatted);
});

properties.get('/:id', async (c) => {
  const user = c.get('user');
  const tenantId = user.tenantId;
  const propertyId = c.req.param('id');

  const property = (await c.env.DB.prepare(
    'SELECT * FROM properties WHERE id = ? AND tenant_id = ?',
  )
    .bind(propertyId, tenantId)
    .first()) as Record<string, unknown> | null;

  if (!property) {
    return c.json({ error: 'Property not found' }, 404);
  }

  // Track view (UPSERT)
  const today = new Date().toISOString().split('T')[0];
  try {
    await c.env.DB.prepare(`
      INSERT INTO property_daily_stats (property_id, tenant_id, date, views)
      VALUES (?, ?, ?, 1)
      ON CONFLICT(property_id, date) DO UPDATE SET views = views + 1
    `)
    .bind(propertyId, tenantId, today)
    .run();
  } catch (e) {
    // Ignore stats errors to not block main flow
    console.error('Error tracking property view:', e);
  }

  const formatted = {
    ...property,
    features: property.features ? JSON.parse(property.features as string) : [],
  };

  return c.json(formatted);
});

properties.post('/', async (c) => {
  const user = c.get('user');
  const tenantId = user.tenantId;
  const data = await c.req.json();

  // Check property limit based on plan
  const tenant = await c.env.DB.prepare('SELECT plan FROM tenants WHERE id = ?')
    .bind(tenantId)
    .first<{ plan: string }>();
  
  if (tenant) {
    const planConfig = getPlan(tenant.plan);
    const currentCount = await c.env.DB.prepare(
      'SELECT COUNT(*) as count FROM properties WHERE tenant_id = ?'
    ).bind(tenantId).first<number>('count');

    if ((currentCount || 0) >= planConfig.properties) {
      return c.json({
        error: `Limite de ${planConfig.properties} imóveis atingido. Faça upgrade do seu plano.`,
        limit: planConfig.properties,
        current: currentCount,
      }, 403);
    }
  }

  const id = crypto.randomUUID();

  await c.env.DB.prepare(
    `
        INSERT INTO properties (
            id, tenant_id, title, price, location, image_url, listing_type, features,
            description, bedrooms, bathrooms, suites, garage, area, total_area, 
            condo_value, iptu_value, publish_to_portals, portal_url
        ) VALUES (
            ?, ?, ?, ?, ?, ?, ?, ?,
            ?, ?, ?, ?, ?, ?, ?, 
            ?, ?, ?, ?
        )
    `,
  )
    .bind(
      id,
      tenantId,
      data.title,
      data.price,
      data.location,
      data.image_url,
      data.listing_type,
      JSON.stringify(data.features || []),
      data.description,
      data.bedrooms || 0,
      data.bathrooms || 0,
      data.suites || 0,
      data.garage || 0,
      data.area || 0,
      data.total_area || 0,
      data.condo_value || 0,
      data.iptu_value || 0,
      data.publish_to_portals ? 1 : 0,
      data.portal_url,
    )
    .run();


  // Trigger Match Reverso (Background)
  c.executionCtx.waitUntil(
    (async () => {
        try {
            // 1. Get Agent Phone
            const agent = await c.env.DB.prepare('SELECT phone FROM users WHERE id = ?').bind(user.sub).first<{ phone: string }>();
            
            // 2. Run Match
            if (agent?.phone) {
                const { findMatches } = await import('../services/matchService');
                await findMatches(c.env, data, tenantId, agent.phone);
            }
        } catch (e) {
            console.error('Error in Match Reverso trigger:', e);
        }
    })()
  );

  return c.json({ success: true, id });
});

properties.delete('/:id', async (c) => {
  const user = c.get('user');
  const tenantId = user.tenantId;
  const propertyId = c.req.param('id');

  await c.env.DB.prepare('DELETE FROM properties WHERE id = ? AND tenant_id = ?')
    .bind(propertyId, tenantId)
    .run();

  return c.json({ success: true });
});

properties.post('/upload-image', async (c) => {
  if (!c.env.IMAGES) {
    return c.json({ error: 'Image storage not configured' }, 500);
  }

  const body = await c.req.parseBody();
  const file = body['file'];

  if (!file || !(file instanceof File)) {
    return c.json({ error: 'No file uploaded' }, 400);
  }

  const key = crypto.randomUUID();
  try {
    await c.env.IMAGES.put(key, file.stream());
  } catch (error) {
    // Assuming the user intended to add error handling for image processing
    // and provided an Express-like response that needs to be adapted to Hono.
    return c.json({ error: 'Erro ao analisar imagens' }, 500);
  }

  // Construct public URL
  const url = new URL(c.req.url);
  const imageUrl = url.origin + '/api/images/' + key;

  return c.json({ url: imageUrl });
});

properties.post('/generate-description', async (c) => {
  const { features, type, location } = await c.req.json();

  const prompt =
    'Crie uma descrição vendedora e atraente para um anúncio de imóvel (Zap Imóveis / OLX).\n\n' +
    'DADOS DO IMÓVEL:\n' +
    '- Tipo: ' +
    type +
    '\n' +
    '- Localização: ' +
    location +
    '\n' +
    '- Detalhes: ' +
    JSON.stringify(features) +
    '\n\n' +
    'REGRAS:\n' +
    '- Use emojis.\n' +
    '- Destaque os pontos fortes.\n' +
    '- Use gatilhos de escassez ("Últimas unidades", "Oportunidade").\n' +
    '- Chamada para ação no final (Agendar visita).\n' +
    '- Formato: Título chamativo + Corpo do texto.';

  const apiKey = c.env.API_KEY;
  const url =
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=' +
    apiKey;

  try {
    const geminiResp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
      }),
    });
    const data: any = await geminiResp.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

    return c.json({ description: text });
  } catch (e) {
    return c.json({ error: 'Failed to generate description' }, 500);
  }
});

export default properties;
