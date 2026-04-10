import { Hono } from 'hono';
import { Bindings, Variables } from '../bindings';
import { createDatadogLogger } from '../utils/datadog';
import { apiService } from '../services/apiService';
import { authMiddleware } from '../middleware/auth';
import { PortalRegistry } from '../services/portals';

const portals = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// Helper to escape XML special characters
const escapeXml = (unsafe: string | null | undefined): string => {
  if (!unsafe) return '';
  return String(unsafe)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
};

// Rota pública para feed XML (não precisa de auth)
portals.get('/feed/:tenantId.xml', async (c) => {
  const tenantId = c.req.param('tenantId');
  const env = c.env;
  const logger = createDatadogLogger(env);

  // Fetch tenant details
  const tenant = await env.DB.prepare(
    'SELECT name, email, website_url, logo_url FROM tenants WHERE id = ?',
  ) // Assuming columns exist, if not, fallback to basic
    .bind(tenantId)
    .first<{ name: string; email: string; website_url?: string; logo_url?: string }>();

  await logger?.info(`[Portals] Generating feed`, { tenantId, tenantName: tenant?.name });

  try {
    // Fetch properties for this tenant that are marked for publishing
    const result = await env.DB.prepare(
      `
            SELECT * FROM properties 
            WHERE tenant_id = ? AND publish_to_portals = 1
        `,
    )
      .bind(tenantId)
      .all();

    const properties = result.results as any[];

    // Start building XML
    // Standard: VivaReal/Zap Group
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml +=
      '<ListingDataFeed xmlns="http://www.vivareal.com/schemas/1.0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.vivareal.com/schemas/1.0  http://xml.vivareal.com/v1.0/listing.xsd">\n';

    xml += '  <Header>\n';
    xml += '    <PublishDate>' + new Date().toISOString() + '</PublishDate>\n';
    xml += '    <Provider>Oinbox</Provider>\n';
    if (tenant) {
      xml += '    <ContactInfo>\n';
      xml += '      <Name>' + escapeXml(tenant.name) + '</Name>\n';
      xml += '      <Email>' + escapeXml(tenant.email) + '</Email>\n';
      if (tenant.website_url)
        xml += '      <Website>' + escapeXml(tenant.website_url) + '</Website>\n';
      if (tenant.logo_url) xml += '      <Logo>' + escapeXml(tenant.logo_url) + '</Logo>\n';
      xml += '    </ContactInfo>\n';
    }
    xml += '  </Header>\n';
    xml += '  <Listings>\n';

    for (const prop of properties) {
      xml += '    <Listing>\n';
      xml += '      <ListingID>' + prop.id + '</ListingID>\n';
      xml += '      <Title>' + escapeXml(prop.title) + '</Title>\n';
      xml +=
        '      <TransactionType>' +
        (prop.listing_type === 'rent' ? 'Rent' : 'Sale') +
        '</TransactionType>\n';

      // Map location (Simplificado, ideal seria ter campos separados)
      // Assumimos que location vem no formato "Rua, Num, Bairro, Cidade" ou similar,
      // mas como é texto livre, vamos colocar tudo em Address por enquanto ou tentar parsear simples
      const addressParts = (prop.location || '').split(',').map((p: string) => p.trim());
      const city =
        addressParts.length > 3
          ? addressParts[3]
          : addressParts.length > 2
            ? addressParts[addressParts.length - 1]
            : 'Desconhecida';
      const neighborhood =
        addressParts.length > 2 ? addressParts[2] : addressParts.length > 1 ? addressParts[1] : '';

      xml += '      <Location displayAddress="All">\n';
      xml += '        <Country abbreviation="BR">Brasil</Country>\n';
      xml += '        <State abbreviation="SP">São Paulo</State>\n'; // TODO: Extrair do endereço ou novo campo
      xml += '        <City>' + escapeXml(city) + '</City>\n';
      xml += '        <Neighborhood>' + escapeXml(neighborhood) + '</Neighborhood>\n';
      xml += '        <Address>' + escapeXml(prop.location) + '</Address>\n';
      xml += '      </Location>\n';

      xml += '      <Details>\n';
      xml += '        <PropertyType>Unit</PropertyType>\n'; // Default Unit, could be mapped
      xml +=
        '        <Description>' + escapeXml(prop.description || prop.title) + '</Description>\n';
      xml += '        <ListPrice currency="BRL">' + (prop.price || 0) + '</ListPrice>\n';
      if (prop.condo_value)
        xml += '        <CondoFee currency="BRL">' + prop.condo_value + '</CondoFee>\n';
      if (prop.iptu_value)
        xml += '        <PropertyTax currency="BRL">' + prop.iptu_value + '</PropertyTax>\n';

      if (prop.area)
        xml += '        <LivingArea unit="square metres">' + prop.area + '</LivingArea>\n';
      if (prop.bedrooms) xml += '        <Bedrooms>' + prop.bedrooms + '</Bedrooms>\n';
      if (prop.bathrooms) xml += '        <Bathrooms>' + prop.bathrooms + '</Bathrooms>\n';
      if (prop.garage) xml += '        <Garage>' + prop.garage + '</Garage>\n';
      if (prop.suites) xml += '        <Suites>' + prop.suites + '</Suites>\n';

      // Features as JSON -> XML Features
      try {
        const feats = JSON.parse(prop.features || '[]');
        if (Array.isArray(feats) && feats.length > 0) {
          xml += '        <Features>\n';
          feats.forEach((f) => {
            xml += '          <Feature>' + escapeXml(f) + '</Feature>\n';
          });
          xml += '        </Features>\n';
        }
      } catch (e) {
        /* ignore JSON error */
      }

      xml += '      </Details>\n';

      // Media
      if (prop.image_url) {
        xml += '      <Media>\n';
        xml +=
          '        <Item medium="image" caption="Principal">' +
          escapeXml(prop.image_url) +
          '</Item>\n';
        xml += '      </Media>\n';
      }

      if (prop.portal_url) {
        xml += '      <PortalURL>' + escapeXml(prop.portal_url) + '</PortalURL>\n';
      }

      xml += '    </Listing>\n';
    }

    xml += '  </Listings>\n';
    xml += '</ListingDataFeed>';

    return c.body(xml, 200, {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=1800', // Cache por 30 min no Cloudflare
    });
  } catch (err: unknown) {
    if ((err as { code?: string }).code === 'P2025') {
      await logger?.warn('[Portals] Portal not found for tenantId: ' + tenantId, { error: err });
      return c.json({ error: 'Portal não encontrado' }, 404);
    }
    console.error(`Erro ao gerar feed:`, err);
    return c.json({ error: 'Erro na integração', details: String(err) }, 500);
  }
});

portals.post('/api/:tenantId', async (c) => {
  const tenantId = c.req.param('tenantId');
  const env = c.env;
  const logger = createDatadogLogger(env);

  await logger?.info(`[Portals API] Received request`, { tenantId });

  /* eslint-disable @typescript-eslint/no-explicit-any */
  const body = await c.req.json<{
    portal: string;
    action: string;
    xmlUrl?: string;
    webhookUrl?: string;
    listingId?: string;
  }>();
  /* eslint-enable @typescript-eslint/no-explicit-any */
  const { portal, action, xmlUrl, webhookUrl, listingId } = body;

  try {
    if (action === 'validate') {
      const isValid = await apiService.validatePortalIntegration(env, portal, tenantId);
      return c.json({ success: true, valid: isValid });
    }

    if (action === 'enable_xml') {
      if (!xmlUrl) return c.json({ error: 'XML URL is required' }, 400);
      const feedUrl = await apiService.generateXMLFeed(env, portal, tenantId, xmlUrl.split(','));
      return c.json({ success: true, feedUrl });
    }

    if (action === 'enable_webhook') {
      if (!webhookUrl) return c.json({ error: 'Webhook URL is required' }, 400);
      const id = await apiService.registerWebhook(env, portal, tenantId, webhookUrl);
      return c.json({ success: true, webhookId: id });
    }

    if (action === 'publish_listing') {
      if (!listingId) return c.json({ error: 'Listing ID is required' }, 400);
      const result = await apiService.publishListing(env, portal, tenantId, listingId);
      return c.json({ success: true, ...result });
    }

    if (action === 'remove_listing') {
      if (!listingId) return c.json({ error: 'Listing ID is required' }, 400);
      const result = await apiService.removeListing(env, portal, tenantId, listingId);
      return c.json({ success: true, ...result });
    }

    if (action === 'sync') {
      const stats = await apiService.syncListings(env, portal, tenantId);
      return c.json({ success: true, stats });
    }

    return c.json({ error: 'Invalid action' }, 400);
  } catch (err: unknown) {
    await logger?.error('[Portals API] Error processing action: ' + action, {
      tenantId,
      portal,
      error: err,
    });
    return c.json({ error: 'Failed to process request', details: String(err) }, 500);
  }
});

// ==========================================
// ROTAS DE PUBLICAÇÃO EM LOTE (COM AUTH)
// ==========================================

// Aplicar middleware de auth para todas as rotas abaixo
const portalsAuth = new Hono<{ Bindings: Bindings; Variables: Variables }>();
// Auth já é aplicado globalmente em index.ts
// portalsAuth.use('/*', authMiddleware);

// Publicação em lote - POST /api/portals/bulk-publish
portalsAuth.post('/bulk-publish', async (c) => {
  const user = c.get('user');
  const tenantId = user.tenantId;
  const env = c.env;
  const logger = createDatadogLogger(env);

  const body = await c.req.json<{
    property_id: string;
    portal_ids: string[];
  }>();

  const { property_id, portal_ids } = body;

  if (!property_id || !portal_ids || portal_ids.length === 0) {
    return c.json({ error: 'property_id e portal_ids são obrigatórios' }, 400);
  }

  await logger?.info('[Portals] Bulk publish requested', {
    tenantId,
    property_id,
    portal_ids,
  });

  try {
    const result = await PortalRegistry.publishToPortals(
      property_id,
      tenantId,
      portal_ids,
      env,
    );

    return c.json({
      success: true,
      total: result.total,
      successful: result.successful,
      failed: result.failed,
      results: result.results,
    });
  } catch (error) {
    await logger?.error('[Portals] Bulk publish failed', {
      tenantId,
      property_id,
      error,
    });

    return c.json({
      error: 'Falha ao publicar em lote',
      details: (error as Error).message,
    }, 500);
  }
});

// Obter status de publicações de um imóvel - GET /api/portals/publications/:propertyId
portalsAuth.get('/publications/:propertyId', async (c) => {
  const user = c.get('user');
  const tenantId = user.tenantId;
  const propertyId = c.req.param('propertyId');
  const env = c.env;

  try {
    const publications = await env.DB.prepare(
      `SELECT * FROM property_publications 
       WHERE property_id = ? AND tenant_id = ?
       ORDER BY created_at DESC`,
    )
      .bind(propertyId, tenantId)
      .all();

    return c.json({
      success: true,
      publications: publications.results || [],
    });
  } catch (error) {
    return c.json({
      error: 'Falha ao obter publicações',
      details: (error as Error).message,
    }, 500);
  }
});

// Obter configurações de portais do tenant - GET /api/portals/configs
portalsAuth.get('/configs', async (c) => {
  const user = c.get('user');
  const tenantId = user.tenantId;
  const env = c.env;

  try {
    const configs = await env.DB.prepare(
      `SELECT * FROM portal_configs WHERE tenant_id = ? ORDER BY portal_id`,
    )
      .bind(tenantId)
      .all();

    // Obter lista de todos os portais disponíveis
    const availablePortals = PortalRegistry.getAvailablePortals();

    return c.json({
      success: true,
      configs: configs.results || [],
      available_portals: availablePortals,
    });
  } catch (error) {
    return c.json({
      error: 'Falha ao obter configurações',
      details: (error as Error).message,
    }, 500);
  }
});

// Salvar configuração de portal - POST /api/portals/configs/:portalId
portalsAuth.post('/configs/:portalId', async (c) => {
  const user = c.get('user');
  const tenantId = user.tenantId;
  const portalId = c.req.param('portalId');
  const env = c.env;
  const logger = createDatadogLogger(env);

  const body = await c.req.json<{
    enabled?: boolean;
    auth_data?: Record<string, any>;
    xml_url?: string;
    webhook_url?: string;
  }>();

  try {
    // Verificar se configuração existe
    const existing = await env.DB.prepare(
      `SELECT id FROM portal_configs WHERE tenant_id = ? AND portal_id = ?`,
    )
      .bind(tenantId, portalId)
      .first();

    const id = existing ? (existing as any).id : crypto.randomUUID();
    const now = new Date().toISOString();

    if (existing) {
      // Atualizar configuração existente
      await env.DB.prepare(
        `UPDATE portal_configs 
         SET enabled = ?, auth_data = ?, xml_url = ?, webhook_url = ?, updated_at = ?
         WHERE id = ?`,
      )
        .bind(
          body.enabled ? 1 : 0,
          body.auth_data ? JSON.stringify(body.auth_data) : null,
          body.xml_url || null,
          body.webhook_url || null,
          now,
          id,
        )
        .run();
    } else {
      // Criar nova configuração
      await env.DB.prepare(
        `INSERT INTO portal_configs (id, tenant_id, portal_id, enabled, auth_data, xml_url, webhook_url, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
        .bind(
          id,
          tenantId,
          portalId,
          body.enabled ? 1 : 0,
          body.auth_data ? JSON.stringify(body.auth_data) : null,
          body.xml_url || null,
          body.webhook_url || null,
          now,
          now,
        )
        .run();
    }

    await logger?.info('[Portals] Config saved', {
      tenantId,
      portalId,
      enabled: body.enabled,
    });

    return c.json({ success: true, id });
  } catch (error) {
    await logger?.error('[Portals] Failed to save config', {
      tenantId,
      portalId,
      error,
    });

    return c.json({
      error: 'Falha ao salvar configuração',
      details: (error as Error).message,
    }, 500);
  }
});

// Validar credenciais de portal - POST /api/portals/validate/:portalId
portalsAuth.post('/validate/:portalId', async (c) => {
  const user = c.get('user');
  const tenantId = user.tenantId;
  const portalId = c.req.param('portalId');
  const env = c.env;

  try {
    const adapter = PortalRegistry.get(portalId);
    if (!adapter) {
      return c.json({ error: 'Portal não encontrado', valid: false }, 404);
    }

    const config = await env.DB.prepare(
      `SELECT * FROM portal_configs WHERE tenant_id = ? AND portal_id = ?`,
    )
      .bind(tenantId, portalId)
      .first<any>();

    if (!config) {
      return c.json({ error: 'Portal não configurado', valid: false }, 400);
    }

    // Parse auth_data se for string JSON
    if (typeof config.auth_data === 'string') {
      config.auth_data = JSON.parse(config.auth_data);
    }

    const isValid = await adapter.validateCredentials(config, env);

    return c.json({ success: true, valid: isValid });
  } catch (error) {
    return c.json({
      error: 'Falha ao validar credenciais',
      details: (error as Error).message,
      valid: false,
    }, 500);
  }
});

export default portals;
export { portalsAuth };
