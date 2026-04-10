import { Hono } from 'hono';
import { Bindings, Variables } from '../bindings';
import { authMiddleware } from '../middleware/auth';
import { getPlan } from '../config/plans';
import { generatePropertyDescription } from '../services/aiService';

const properties = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// Middleware de Auth para todas as rotas
// properties.use('/*', authMiddleware); // Auth global em index.ts

properties.get('/', async (c) => {
  const user = c.get('user');
  const tenantId = user.tenantId;

  const page = parseInt(c.req.query('page') || '1', 10);
  const limit = parseInt(c.req.query('limit') || '50', 10);
  const offset = (page - 1) * limit;

  const [propertiesResult, countResult] = await Promise.all([
    c.env.DB.prepare(
      'SELECT id, title, price, location, bedrooms, bathrooms, area, listing_type, status, images, features, created_at FROM properties WHERE tenant_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?',
    )
      .bind(tenantId, limit, offset)
      .all(),
    c.env.DB.prepare('SELECT COUNT(*) as total FROM properties WHERE tenant_id = ?')
      .bind(tenantId)
      .first<{ total: number }>(),
  ]);

  const total = countResult?.total ?? 0;
  const hasMore = offset + propertiesResult.results.length < total;

  const formatted = propertiesResult.results.map((p) => {
    const prop = p as Record<string, unknown>;
    return {
      ...prop,
      features: prop.features ? JSON.parse(prop.features as string) : [],
    };
  });

  return c.json({ items: formatted, total, page, pageSize: limit, hasMore });
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
    await c.env.DB.prepare(
      `
      INSERT INTO property_daily_stats (property_id, tenant_id, date, views)
      VALUES (?, ?, ?, 1)
      ON CONFLICT(property_id, date) DO UPDATE SET views = views + 1
    `,
    )
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
      'SELECT COUNT(*) as count FROM properties WHERE tenant_id = ?',
    )
      .bind(tenantId)
      .first<number>('count');

    if ((currentCount || 0) >= planConfig.properties) {
      return c.json(
        {
          error: `Limite de ${planConfig.properties} imóveis atingido. Faça upgrade do seu plano.`,
          limit: planConfig.properties,
          current: currentCount,
        },
        403,
      );
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
        const agent = await c.env.DB.prepare('SELECT phone FROM users WHERE id = ?')
          .bind(user.sub)
          .first<{ phone: string }>();

        // 2. Run Match
        if (agent?.phone) {
          const { findMatches } = await import('../services/matchService');
          await findMatches(c.env, data, tenantId, agent.phone);
        }
      } catch (e) {
        console.error('Error in Match Reverso trigger:', e);
      }
    })(),
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

  try {
    const description = await generatePropertyDescription(c.env, { features, type, location });
    return c.json({ description });
  } catch (e) {
    return c.json({ error: 'Failed to generate description' }, 500);
  }
});

export default properties;
