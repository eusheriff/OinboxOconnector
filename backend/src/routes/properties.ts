import { Hono } from 'hono';
import { Bindings, Variables } from '../types';
import { authMiddleware } from '../middleware/auth';

const properties = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// Middleware de Auth para todas as rotas
properties.use('/*', authMiddleware);

properties.get('/', async (c) => {
    const user = c.get('user');
    const tenantId = user.tenantId;

    const { results } = await c.env.DB.prepare("SELECT * FROM properties WHERE tenant_id = ? ORDER BY created_at DESC")
        .bind(tenantId)
        .all();

    const formatted = results.map((p: any) => ({
        ...p,
        features: p.features ? JSON.parse(p.features) : []
    }));

    return c.json(formatted);
});

properties.get('/:id', async (c) => {
    const user = c.get('user');
    const tenantId = user.tenantId;
    const propertyId = c.req.param('id');

    const property: any = await c.env.DB.prepare(
        "SELECT * FROM properties WHERE id = ? AND tenant_id = ?"
    ).bind(propertyId, tenantId).first();

    if (!property) {
        return c.json({ error: "Property not found" }, 404);
    }

    const formatted = {
        ...property,
        features: property.features ? JSON.parse(property.features) : []
    };

    return c.json(formatted);
});

properties.post('/', async (c) => {
    const user = c.get('user');
    const tenantId = user.tenantId;
    const data = await c.req.json();
    const id = crypto.randomUUID();

    await c.env.DB.prepare(`
        INSERT INTO properties (
            id, tenant_id, title, price, location, image_url, listing_type, features,
            description, bedrooms, bathrooms, suites, garage, area, total_area, 
            condo_value, iptu_value, publish_to_portals, portal_url
        ) VALUES (
            ?, ?, ?, ?, ?, ?, ?, ?,
            ?, ?, ?, ?, ?, ?, ?, 
            ?, ?, ?, ?
        )
    `).bind(
        id, tenantId, data.title, data.price, data.location, data.image_url, data.listing_type, JSON.stringify(data.features || []),
        data.description, data.bedrooms || 0, data.bathrooms || 0, data.suites || 0, data.garage || 0, data.area || 0, data.total_area || 0,
        data.condo_value || 0, data.iptu_value || 0, data.publish_to_portals ? 1 : 0, data.portal_url
    ).run();

    return c.json({ success: true, id });
});

properties.delete('/:id', async (c) => {
    const user = c.get('user');
    const tenantId = user.tenantId;
    const propertyId = c.req.param('id');

    await c.env.DB.prepare("DELETE FROM properties WHERE id = ? AND tenant_id = ?")
        .bind(propertyId, tenantId)
        .run();

    return c.json({ success: true });
});

properties.post('/upload-image', async (c) => {
    const body = await c.req.parseBody();
    const file = body['file'];

    if (!file || !(file instanceof File)) {
        return c.json({ error: "No file uploaded" }, 400);
    }

    const key = crypto.randomUUID();
    await c.env.IMAGES.put(key, file, {
        httpMetadata: { contentType: file.type }
    });

    // Construct public URL
    const url = new URL(c.req.url);
    const imageUrl = `${url.origin}/api/images/${key}`;

    return c.json({ url: imageUrl });
});

properties.post('/generate-description', async (c) => {
    const { features, type, location } = await c.req.json();

    const prompt = `
      Crie uma descrição vendedora e atraente para um anúncio de imóvel (Zap Imóveis / OLX).
      
      DADOS DO IMÓVEL:
      - Tipo: ${type}
      - Localização: ${location}
      - Detalhes: ${JSON.stringify(features)}
      
      REGRAS:
      - Use emojis.
      - Destaque os pontos fortes.
      - Use gatilhos de escassez ("Últimas unidades", "Oportunidade").
      - Chamada para ação no final (Agendar visita).
      - Formato: Título chamativo + Corpo do texto.
    `;

    const apiKey = c.env.API_KEY;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    try {
        const geminiResp = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }]
            })
        });
        const data: any = await geminiResp.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

        return c.json({ description: text });
    } catch (e) {
        return c.json({ error: "Failed to generate description" }, 500);
    }
});

export default properties;
