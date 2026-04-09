import { Hono } from 'hono';
import { Bindings } from '../bindings';

const app = new Hono<{ Bindings: Bindings }>();

// GET /api/admin/prospects - Listar prospects salvos
app.get('/', async (c) => {
  try {
    const prospects = await c.env.DB.prepare(
      'SELECT * FROM prospects ORDER BY created_at DESC',
    ).all();
    return c.json(prospects.results);
  } catch (error) {
    return c.json({ error: 'Falha ao buscar prospects' }, 500);
  }
});

// POST /api/admin/prospects - Salvar novo lead
app.post('/', async (c) => {
  const body = await c.req.json();
  const id = crypto.randomUUID();

  try {
    await c.env.DB.prepare(
      `INSERT INTO prospects (id, google_place_id, name, address, phone, rating, website, status, ai_analysis)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
      .bind(
        id,
        body.google_place_id || null,
        body.name,
        body.address || '',
        body.phone || '',
        body.rating || 0,
        body.website || '',
        'New',
        body.ai_analysis || null,
      )
      .run();

    return c.json({ success: true, id });
  } catch (error) {
    console.error(error);
    return c.json({ error: 'Falha ao salvar prospect' }, 500);
  }
});

// POST /api/admin/prospects/search - Buscar no Google Places (REAL)
app.post('/search', async (c) => {
  const { query } = await c.req.json();

  if (!query) {
    return c.json({ error: 'Query is required' }, 400);
  }

  const GOOGLE_API_KEY = c.env.GOOGLE_PLACES_API_KEY;
  if (!GOOGLE_API_KEY) {
    return c.json({ error: 'Google Places API Key not configured' }, 500);
  }

  try {
    const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&key=${GOOGLE_API_KEY}`;

    const response = await fetch(url);
    const data: any = await response.json();

    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      console.error('Google API Error:', data);
      throw new Error(`Google API Error: ${data.status}`);
    }

    // Normalizar resultados
    const results = (data.results || []).map((place: any) => ({
      place_id: place.place_id,
      name: place.name,
      address: place.formatted_address,
      rating: place.rating,
      user_ratings_total: place.user_ratings_total,
      geometry: place.geometry,
      icon: place.icon,
      formatted_phone_number: null, // Text Search não retorna telefone direto, precisaria de Place Details
      website: null, // Place Details necessario para website
    }));

    return c.json({ results, status: data.status });
  } catch (error) {
    console.error('Search error:', error);
    return c.json({ error: 'Failed to fetch places' }, 500);
  }
});

// POST /api/admin/prospects/analyze - Gerar Pitch com IA
app.post('/analyze', async (c) => {
  const { id } = await c.req.json();
  const AGENT_HUB_URL = 'https://agent-hub.oconnector.tech/api/skill/generate-pitch';

  try {
    const lead = await c.env.DB.prepare('SELECT * FROM prospects WHERE id = ?')
      .bind(id)
      .first<any>();
    if (!lead) return c.json({ error: 'Lead not found' }, 404);

    const hubRes = await fetch(AGENT_HUB_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lead }),
    });

    const hubData = (await hubRes.json()) as any;
    const pitch =
      hubData.result?.response ||
      hubData.response ||
      `Olá ${lead.name}, gostaria de apresentar o OInbox. Posso te mandar um vídeo?`;

    await c.env.DB.prepare('UPDATE prospects SET ai_pitch = ?, ai_analysis = ? WHERE id = ?')
      .bind(pitch, 'Pitch Generated', id)
      .run();

    return c.json({ success: true, pitch });
  } catch (error) {
    console.error('Analyze Error:', error);
    return c.json({ error: 'Failed to analyze lead' }, 500);
  }
});

// POST /api/admin/prospects/invite - Enviar Convite (Simulação/Mock do Envio)
app.post('/invite', async (c) => {
  const { id } = await c.req.json();

  try {
    const lead = await c.env.DB.prepare('SELECT * FROM prospects WHERE id = ?')
      .bind(id)
      .first<any>();
    if (!lead) return c.json({ error: 'Lead not found' }, 404);

    if (!lead.ai_pitch) {
      return c.json({ error: 'Generate pitch first' }, 400);
    }

    // TODO: Integrar com Evolution API Real quando credenciais estiverem validadas
    // await whatsappService.sendText(lead.phone, lead.ai_pitch);

    // Log replaced by structured logger or removed for prod
    // console.log(`[MOCK EMAIL/ZAP] Sending to ${lead.name}: ${lead.ai_pitch}`);

    await c.env.DB.prepare(
      "UPDATE prospects SET status = 'Contacted', last_contact_at = ? WHERE id = ?",
    )
      .bind(new Date().toISOString(), id)
      .run();

    return c.json({ success: true, status: 'Contacted' });
  } catch (error) {
    return c.json({ error: 'Invite failed' }, 500);
  }
});

export default app;
