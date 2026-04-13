import { Hono } from 'hono';
import { Bindings, Variables } from '../bindings';
import { superAuthMiddleware } from '../middleware/auth';

const places = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// places.use('*', superAuthMiddleware); - REMOVIDO para permitir acesso tenant admin

// Types para Google Places API
interface PlaceResult {
  place_id: string;
  name: string;
  formatted_address?: string;
  formatted_phone_number?: string;
  international_phone_number?: string;
  website?: string;
  rating?: number;
  user_ratings_total?: number;
  types?: string[];
  business_status?: string;
}

interface GooglePlacesResponse {
  results?: PlaceResult[];
  result?: PlaceResult;
  status: string;
  error_message?: string;
  next_page_token?: string;
}

// Helper to check quota
const getMonthlyUsage = async (db: any) => {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const result = await db
    .prepare('SELECT COUNT(*) as count FROM search_history WHERE executed_at >= ?')
    .bind(startOfMonth)
    .first();

  return result?.count || 0;
};

// GET /api/places/usage - Retorna uso mensal e limite
places.get('/usage', async (c) => {
  try {
    const limit = parseInt(c.env.PLACES_MONTHLY_LIMIT || '100', 10);
    const used = await getMonthlyUsage(c.env.DB);

    return c.json({
      used,
      limit,
      remaining: Math.max(0, limit - used),
      resetDate: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toISOString(),
    });
  } catch (error: any) {
    console.error('Usage API Error:', error);
    return c.json({ error: error.message || 'Failed to fetch usage' }, 500);
  }
});

// POST /api/places/search - Buscar PMEs via Google Places
places.post('/search', async (c) => {
  try {
    const { query, location, radius = 10000, type = 'real_estate_agency' } = await c.req.json();

    // 1. Verificar Quota/Rate Limit
    const limit = parseInt(c.env.PLACES_MONTHLY_LIMIT || '100', 10);
    const used = await getMonthlyUsage(c.env.DB);

    if (used >= limit) {
      return c.json(
        {
          error: `Limite mensal de buscas atingido (${used}/${limit}). Contate o administrador.`,
          quotaExceeded: true,
        },
        429,
      );
    }

    if (!query) {
      return c.json({ error: 'Query é obrigatória' }, 400);
    }

    const apiKey = c.env.GOOGLE_PLACES_API_KEY;
    if (!apiKey) {
      return c.json({ error: 'GOOGLE_PLACES_API_KEY não configurada' }, 500);
    }

    // Construir URL da Text Search API
    const params = new URLSearchParams({
      query: `${query} ${type}`,
      key: apiKey,
    });

    // Se location é um nome de lugar, fazer geocoding para obter coordenadas
    if (location) {
      // Verificar se já é coordenada (formato: "lat,lng")
      const coordPattern = /^-?\d+\.?\d*,-?\d+\.?\d*$/;
      let coords = location;

      if (!coordPattern.test(location)) {
        // É um nome de lugar, fazer geocoding
        const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(location)}&key=${apiKey}`;
        const geocodeRes = await fetch(geocodeUrl);
        const geocodeData = (await geocodeRes.json()) as {
          status: string;
          results: Array<{ geometry: { location: { lat: number; lng: number } } }>;
        };

        if (geocodeData.status === 'OK' && geocodeData.results.length > 0) {
          const { lat, lng } = geocodeData.results[0].geometry.location;
          coords = `${lat},${lng}`;
          console.log(`[Geocode] "${location}" -> ${coords}`);
        } else {
          console.warn(`[Geocode] Failed for "${location}": ${geocodeData.status}`);
          // Continuar sem location bias se geocode falhar
          coords = '';
        }
      }

      if (coords) {
        params.append('location', coords);
        params.append('radius', radius.toString());
      }
    }

    const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?${params}`;

    const response = await fetch(url);
    const data = (await response.json()) as GooglePlacesResponse;

    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      return c.json({ error: data.error_message || `Google Places error: ${data.status}` }, 500);
    }

    // Salvar histórico de busca
    const searchId = crypto.randomUUID();
    await c.env.DB.prepare(
      `INSERT INTO search_history (id, query, location, radius_km, place_type, results_count, status, executed_at) 
       VALUES (?, ?, ?, ?, ?, ?, 'completed', ?)`,
    )
      .bind(
        searchId,
        query,
        location || null,
        Math.round(radius / 1000),
        type,
        data.results?.length || 0,
        new Date().toISOString(),
      )
      .run();

    return c.json({
      results: data.results || [],
      nextPageToken: data.next_page_token,
      searchId,
      usage: { used: used + 1, limit },
    });
  } catch (error: any) {
    console.error('Search Route Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return c.json({ error: `Falha na busca (Backend): ${errorMessage}` }, 500);
  }
});

// GET /api/places/details/:placeId - Detalhes de um local
places.get('/details/:placeId', async (c) => {
  const placeId = c.req.param('placeId');

  const apiKey = c.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    return c.json({ error: 'GOOGLE_PLACES_API_KEY não configurada' }, 500);
  }

  const params = new URLSearchParams({
    place_id: placeId,
    key: apiKey,
    fields:
      'place_id,name,formatted_address,formatted_phone_number,international_phone_number,website,rating,user_ratings_total,types,business_status',
  });

  const url = `https://maps.googleapis.com/maps/api/place/details/json?${params}`;

  try {
    const response = await fetch(url);
    const data = (await response.json()) as GooglePlacesResponse;

    if (data.status !== 'OK') {
      return c.json({ error: data.error_message || `Google Places error: ${data.status}` }, 500);
    }

    return c.json({ result: data.result });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return c.json({ error: `Falha ao buscar detalhes: ${errorMessage}` }, 500);
  }
});

// POST /api/places/import - Importar resultados como leads
places.post('/import', async (c) => {
  try {
    const { places: placesToImport, searchQuery } = await c.req.json();

    if (!placesToImport || !Array.isArray(placesToImport)) {
      return c.json({ error: 'places deve ser um array' }, 400);
    }

    let imported = 0;
    let duplicates = 0;
    const leadIds: string[] = [];

    for (const place of placesToImport as PlaceResult[]) {
      // Verificar se já existe
      const existing = await c.env.DB.prepare('SELECT id FROM leads WHERE google_place_id = ?')
        .bind(place.place_id)
        .first();

      if (existing) {
        duplicates++;
        continue;
      }

      // Validar status operacional (Ignorar locais fechados permanentemente)
      if (
        place.business_status === 'CLOSED_PERMANENTLY' ||
        place.business_status === 'CLOSED_TEMPORARILY'
      ) {
        continue;
      }

      // Determinar tipo baseado nos types do Google
      let leadType = 'imobiliaria';
      if (place.types?.includes('real_estate_agency')) {
        leadType = 'imobiliaria';
      } else if (place.types?.includes('insurance_agency')) {
        leadType = 'corretor';
      }

      const leadId = crypto.randomUUID();

      await c.env.DB.prepare(
        `INSERT INTO leads (
          id, google_place_id, name, type, address, phone, website, rating, reviews_count,
          source, search_query, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'google_places', ?, 'new')`,
      )
        .bind(
          leadId,
          place.place_id,
          place.name,
          leadType,
          place.formatted_address || null,
          // Priorizar número internacional e limpar caracteres para uso no Bot (Evolution API)
          (place.international_phone_number || place.formatted_phone_number || '').replace(
            /\D/g,
            '',
          ) || null,
          // Google Places usa o campo 'website' para ambos: site oficial ou rede social (ex: Instagram/Facebook em PMEs)
          place.website || null,
          place.rating || null,
          place.user_ratings_total || 0,
          searchQuery || null,
        )
        .run();

      imported++;
      leadIds.push(leadId);
    }

    return c.json({
      success: true,
      imported,
      duplicates,
      total: placesToImport.length,
      leadIds,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Import] Error:', errorMessage);
    return c.json({ error: `Falha ao importar leads: ${errorMessage}` }, 500);
  }
});

// GET /api/places/history - Histórico de buscas
places.get('/history', async (c) => {
  const limit = parseInt(c.req.query('limit') || '20', 10);

  const { results } = await c.env.DB.prepare(
    'SELECT * FROM search_history ORDER BY executed_at DESC LIMIT ?',
  )
    .bind(limit)
    .all();

  return c.json({ history: results });
});

export default places;
