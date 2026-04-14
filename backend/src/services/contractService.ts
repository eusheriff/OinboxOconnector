import { Bindings } from '../bindings';

interface ContractData {
  tenant: { name: string; owner_name: string; email: string };
  client: { name: string; email: string; rg?: string; cpf?: string; address?: string };
  property: { title: string; address: string; price: number; type: string };
  date: string;
}

export function getTemplate(type: 'sale' | 'rent'): string {
  if (type === 'sale') {
    return `
            <h1>CONTRATO DE COMPRA E VENDA</h1>
            <p>Pelo presente instrumento particular, as partes abaixo assinam:</p>
            <h3>VENDEDOR (Intermediado por):</h3>
            <p><strong>{{tenant_name}}</strong>, representada por {{owner_name}}.</p>
            <h3>COMPRADOR:</h3>
            <p><strong>{{client_name}}</strong>, CPF {{client_cpf}}.</p>
            <h3>OBJETO:</h3>
            <p>O im√≥vel situado em: {{property_address}}.</p>
            <h3>PRE√O:</h3>
            <p>O valor acordado √© de <strong>R$ {{property_price}}</strong>.</p>
            <br>
            <p>Data: {{date}}</p>
            <br>
            <p>__________________________</p>
            <p>Assinatura do Comprador</p>
        `;
  }
  // Rent
  return `
        <h1>CONTRATO DE LOCA√√O</h1>
        <p>Pelo presente instrumento particular, as partes assinam:</p>
        <h3>LOCADOR (Administrado por):</h3>
        <p><strong>{{tenant_name}}</strong>.</p>
        <h3>LOCAT√RIO:</h3>
        <p><strong>{{client_name}}</strong>.</p>
        <h3>OBJETO:</h3>
        <p>O im√≥vel situado em: {{property_address}}.</p>
        <h3>ALUGUEL:</h3>
        <p>O valor mensal √© de <strong>R$ {{property_price}}</strong>.</p>
        <br>
        <p>Data: {{date}}</p>
    `;
}

export async function generateContractHtml(
  env: Bindings,
  contractId: string,
  tenantId: string,
  propertyId: string,
  clientId: string,
  type: 'sale' | 'rent',
) {
  // 1. Fetch Data
  const tenant = await env.DB.prepare('SELECT name, owner_name, email FROM tenants WHERE id = ?')
    .bind(tenantId)
    .first<any>();
  const client = await env.DB.prepare('SELECT name, email, budget FROM clients WHERE id = ?')
    .bind(clientId)
    .first<any>();
  const property = await env.DB.prepare(
    'SELECT title, location, price, listing_type FROM properties WHERE id = ?',
  )
    .bind(propertyId)
    .first<any>();

  if (!tenant || !client || !property) {
    throw new Error('Dados incompletos para gerar contrato.');
  }

  // 2. Prepare Data
  const today = new Date().toLocaleDateString('pt-BR');
  const price = property.price?.toLocaleString('pt-BR', { minimumFractionDigits: 2 });

  // 3. Load Template
  let html = getTemplate(type);

  // 4. Replace Placeholders
  const replacements: Record<string, string> = {
    '{{tenant_name}}': tenant.name,
    '{{owner_name}}': tenant.owner_name || 'Representante Legal',
    '{{client_name}}': client.name,
    '{{client_cpf}}': '000.000.000-00', // Mock if not in DB
    '{{property_address}}': property.location,
    '{{property_price}}': price,
    '{{date}}': today,
  };

  for (const [key, value] of Object.entries(replacements)) {
    html = html.replace(new RegExp(key, 'g'), value);
  }

  // 5. Store Draft
  await env.DB.prepare(
    `
        INSERT INTO contracts (id, tenant_id, property_id, client_id, status, content_html, type)
        VALUES (?, ?, ?, ?, 'Draft', ?, ?)
        ON CONFLICT(id) DO UPDATE SET content_html = ?, updated_at = CURRENT_TIMESTAMP
    `,
  )
    .bind(contractId, tenantId, propertyId, clientId, html, type, html)
    .run();

  return html;
}
