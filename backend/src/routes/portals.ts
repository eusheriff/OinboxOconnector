import { Hono } from 'hono';
import { Bindings } from '../types';

const portals = new Hono<{ Bindings: Bindings }>();

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

portals.get('/feed/:tenantId.xml', async (c) => {
    const tenantId = c.req.param('tenantId');
    const env = c.env;

    // TODO: Verify if tenant exists and is active (optional, for security)

    console.log(`[Portals] Generating feed for tenant ${tenantId}`);

    try {
        // Fetch properties for this tenant that are marked for publishing
        const result = await env.DB.prepare(`
            SELECT * FROM properties 
            WHERE tenant_id = ? AND publish_to_portals = 1
        `).bind(tenantId).all();

        const properties = result.results as any[];

        // Start building XML
        // Standard: VivaReal/Zap Group
        let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
        xml += '<ListingDataFeed xmlns="http://www.vivareal.com/schemas/1.0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.vivareal.com/schemas/1.0  http://xml.vivareal.com/v1.0/listing.xsd">\n';
        
        xml += '  <Header>\n';
        xml += `    <PublishDate>${new Date().toISOString()}</PublishDate>\n`;
        xml += '    <Provider>Oinbox</Provider>\n';
        xml += '  </Header>\n';
        xml += '  <Listings>\n';

        for (const prop of properties) {
            xml += '    <Listing>\n';
            xml += `      <ListingID>${prop.id}</ListingID>\n`;
            xml += `      <Title>${escapeXml(prop.title)}</Title>\n`;
            xml += `      <TransactionType>${prop.listing_type === 'rent' ? 'Rent' : 'Sale'}</TransactionType>\n`;
            
            // Map location (Simplificado, ideal seria ter campos separados)
            // Assumimos que location vem no formato "Rua, Num, Bairro, Cidade" ou similar, 
            // mas como é texto livre, vamos colocar tudo em Address por enquanto ou tentar parsear simples
            const addressParts = (prop.location || '').split(',').map((p: string) => p.trim());
            const city = addressParts.length > 3 ? addressParts[3] : (addressParts.length > 2 ? addressParts[addressParts.length -1] : 'Desconhecida');
            const neighborhood = addressParts.length > 2 ? addressParts[2] : (addressParts.length > 1 ? addressParts[1] : '');

            xml += '      <Location displayAddress="All">\n';
            xml += '        <Country abbreviation="BR">Brasil</Country>\n';
            xml += '        <State abbreviation="SP">São Paulo</State>\n'; // TODO: Extrair do endereço ou novo campo
            xml += `        <City>${escapeXml(city)}</City>\n`;
            xml += `        <Neighborhood>${escapeXml(neighborhood)}</Neighborhood>\n`;
            xml += `        <Address>${escapeXml(prop.location)}</Address>\n`;
            xml += '      </Location>\n';

            xml += '      <Details>\n';
            xml += '        <PropertyType>Unit</PropertyType>\n'; // Default Unit, could be mapped
            xml += `        <Description>${escapeXml(prop.description || prop.title)}</Description>\n`;
            xml += `        <ListPrice currency="BRL">${prop.price || 0}</ListPrice>\n`;
            if (prop.condo_value) xml += `        <CondoFee currency="BRL">${prop.condo_value}</CondoFee>\n`;
            if (prop.iptu_value) xml += `        <PropertyTax currency="BRL">${prop.iptu_value}</PropertyTax>\n`;
            
            if (prop.area) xml += `        <LivingArea unit="square metres">${prop.area}</LivingArea>\n`;
            if (prop.bedrooms) xml += `        <Bedrooms>${prop.bedrooms}</Bedrooms>\n`;
            if (prop.bathrooms) xml += `        <Bathrooms>${prop.bathrooms}</Bathrooms>\n`;
            if (prop.garage) xml += `        <Garage>${prop.garage}</Garage>\n`;
            if (prop.suites) xml += `        <Suites>${prop.suites}</Suites>\n`;
            
            // Features as JSON -> XML Features
            try {
                const feats = JSON.parse(prop.features || '[]');
                if (Array.isArray(feats) && feats.length > 0) {
                     xml += '        <Features>\n';
                     feats.forEach(f => {
                         xml += `          <Feature>${escapeXml(f)}</Feature>\n`;
                     });
                     xml += '        </Features>\n';
                }
            } catch (e) { /* ignore JSON error */ }

            xml += '      </Details>\n';

            // Media
            if (prop.image_url) {
                xml += '      <Media>\n';
                xml += `        <Item medium="image" caption="Principal">${escapeXml(prop.image_url)}</Item>\n`;
                xml += '      </Media>\n';
            }
            
            if (prop.portal_url) {
                 xml += `      <PortalURL>${escapeXml(prop.portal_url)}</PortalURL>\n`;
            }

            xml += '    </Listing>\n';
        }

        xml += '  </Listings>\n';
        xml += '</ListingDataFeed>';

        return c.body(xml, 200, {
            'Content-Type': 'application/xml; charset=utf-8',
            'Cache-Control': 'public, max-age=1800' // Cache por 30 min no Cloudflare
        });

    } catch (error: any) {
        console.error('Error generating feed:', error);
        return c.text('Error generating feed', 500);
    }
});

export default portals;
