import { Bindings } from './types';
import PostalMime from 'postal-mime';
import { createDatadogLogger } from './utils/datadog';
import { ExecutionContext } from '@cloudflare/workers-types';

interface EmailMessage {
  from: string;
  to: string;
  raw: ReadableStream;
}

export async function handleEmail(message: EmailMessage, env: Bindings, ctx: ExecutionContext) {
  const parser = new PostalMime();
  const email = await parser.parse(message.raw);
  const logger = createDatadogLogger(env);

  await logger?.info(`[Email Handler] Received email from: ${message.from} to: ${message.to}`);

  // 1. Identificar Tenant pelo "To"
  // Formato esperado: leads.TENANT_ID@oconnector.tech
  const recipientUser = message.to.split('@')[0]; // "leads.tenant_123"

  let tenantId: string | null = null;
  if (recipientUser.startsWith('leads.')) {
    tenantId = recipientUser.replace('leads.', '');
  } else {
    // Fallback ou rejeição
    await logger?.warn('[Email Handler] Invalid recipient format', { to: message.to });
    // Não rejeitamos o email para não bouncear, apenas logamos
    return;
  }

  // 2. Extrair dados do Lead (Regex Power)
  const subject = email.subject || '';
  const textBody = email.text || '';
  const htmlBody = email.html || '';
  const content = textBody + ' ' + htmlBody; // Busca em tudo

  let leadName = 'Interessado do Portal';
  let leadEmail = '';
  let leadPhone = '';
  let leadMessage = '';
  let source = 'Portal';

  // Identificar Origem
  if (message.from.includes('zap.com.br') || subject.toLowerCase().includes('zap'))
    source = 'Zap Imóveis';
  else if (message.from.includes('vivareal.com.br') || subject.toLowerCase().includes('viva'))
    source = 'VivaReal';
  else if (message.from.includes('olx.com.br') || subject.toLowerCase().includes('olx'))
    source = 'OLX';
  else if (message.from.includes('imovelweb.com.br')) source = 'ImovelWeb';

  // Regex Patterns (Simplificados para MVP - Ideal é refinar com exemplos reais de cada portal)

  // Nome: Geralmente "Nome: Fulano" ou "Lead: Fulano"
  const nameMatch = content.match(/(?:Nome|Name|Lead):\s*([^\n<]+)/i);
  if (nameMatch) leadName = nameMatch[1].trim();

  // Email: "Email: teste@teste.com"
  const emailMatch = content.match(
    /(?:Email|E-mail):\s*([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/i,
  );
  if (emailMatch) leadEmail = emailMatch[1].trim();
  else if (email.from) {
    // Se não achar no corpo, tenta pegar do sender se não for no-reply
    if (
      email.from &&
      typeof email.from !== 'string' &&
      email.from.address &&
      !email.from.address.includes('no-reply') &&
      !email.from.address.includes('nao-responda')
    ) {
      leadEmail = email.from.address;
    }
  }

  // Telefone: Padrões comuns
  const phoneMatch = content.match(
    /(?:Telefone|Tel|Celular|Whatsapp):\s*\(?(\d{2})\)?\s*(\d{4,5})-?(\d{4})/i,
  );
  if (phoneMatch) {
    leadPhone = `55${phoneMatch[1]}${phoneMatch[2]}${phoneMatch[3]}`;
  }

  // Mensagem
  const msgMatch = content.match(/(?:Mensagem|Message):\s*([^\n<]+)/i);
  if (msgMatch) leadMessage = msgMatch[1].trim();
  else leadMessage = `Olá, vim pelo anúncio no ${source}.`;

  await logger?.info(`[Email Handler] Extracted info`, { leadName, leadPhone, source });

  if (!leadPhone && !leadEmail) {
    await logger?.info('[Email Handler] No contact info found, skipping');
    return;
  }

  // 3. Salvar no Banco
  try {
    // Verificar se tenant existe
    const tenant = await env.DB.prepare('SELECT id FROM tenants WHERE id = ?')
      .bind(tenantId)
      .first<{ id: string }>();
    if (!tenant) {
      await logger?.warn(`[Email Handler] Tenant ${tenantId} not found`);
      return;
    }

    const clientId = crypto.randomUUID() as string;

    // Tentar encontrar cliente existente (Pelo email ou telefone)
    // Tentar encontrar cliente existente
    let existingClient: { id: string } | null = null;
    if (leadEmail) {
      existingClient = await env.DB.prepare(
        'SELECT * FROM clients WHERE tenant_id = ? AND email = ?',
      )
        .bind(tenantId, leadEmail)
        .first();
    }
    if (!existingClient && leadPhone) {
      existingClient = await env.DB.prepare(
        'SELECT * FROM clients WHERE tenant_id = ? AND phone = ?',
      )
        .bind(tenantId, leadPhone)
        .first();
    }

    let finalClientId = clientId;

    if (existingClient) {
      finalClientId = existingClient.id;
      await logger?.info(`[Email Handler] Client exists`, { clientId: finalClientId });
      // Update timestamp or status could happen here
    } else {
      // Create Client
      await env.DB.prepare(
        `
              INSERT INTO clients (id, tenant_id, name, email, phone, status, ai_summary)
              VALUES (?, ?, ?, ?, ?, 'Novo', ?)
          `,
      )
        .bind(
          clientId,
          tenantId,
          leadName,
          leadEmail || null,
          leadPhone || null,
          `Lead importado automaticamente via ${source} (Email).`,
        )
        .run();
      await logger?.info(`[Email Handler] Created client`, { clientId });
    }

    // Create Message in Inbox
    // Se tiver telefone, podemos tentar iniciar conversa whatsapp se tivermos permissão,
    // mas por segurança inserimos como mensagem 'received' na tabela 'whatsapp_messages' ou 'messages'
    // Para unificar, vamos inserir na 'messages' (Inbox Geral do CRM) E na 'whatsapp_messages' simulada para aparecer no chat

    if (leadPhone) {
      // Simulando entrada na tabela de whatsapp para aparecer na UI (hack de unificação)
      // Mas o ideal é usar a tabela 'messages' do CRM se a UI ler de lá,
      // Como a UI atual lê de 'whatsapp_messages' (baseado na refatoração anterior), vamos inserir lá.

      // Formatar JID
      const remoteJid = leadPhone + '@s.whatsapp.net';

      await env.DB.prepare(
        `
               INSERT INTO whatsapp_messages (id, tenant_id, remote_jid, content, direction, status, created_at)
               VALUES (?, ?, ?, ?, 'inbound', 'received', ?)
          `,
      )
        .bind(
          crypto.randomUUID(),
          tenantId,
          remoteJid,
          `${leadMessage} (Via ${source})`,
          new Date().toISOString(),
        )
        .run();
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    await logger?.error('[Email Handler] DB Error', { error: errorMessage });
  }
}
