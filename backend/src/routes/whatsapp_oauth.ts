import { Hono } from 'hono';
import { Bindings, Variables } from '../bindings';
import { authMiddleware } from '../middleware/auth';
import { createDatadogLogger } from '../utils/datadog';

const whatsappOauth = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// Rota 1: Gerar URL de Login do Facebook (Embedded Signup)
// Essa rota precisa ser autenticada (Oinbox tenant ativo)
whatsappOauth.get('/login', authMiddleware, async (c) => {
  const env = c.env;
  const appId = env.META_APP_ID;
  const redirectUri = `${env.PUBLIC_WORKER_URL || 'https://api.oinbox.oconnector.tech'}/api/whatsapp-oauth/callback`;
  const tenantId = c.get('user')?.tenantId;

  if (!appId) {
    return c.json({ error: 'META_APP_ID não configurado no backend' }, 500);
  }

  // State parameter stores tenantId and a random CSRF token to verify later
  const state = Buffer.from(JSON.stringify({ tenantId, csrf: crypto.randomUUID() })).toString('base64');

  // URL para Facebook Login for Business (Embedded Signup)
  const loginUrl = new URL('https://www.facebook.com/v21.0/dialog/oauth');
  loginUrl.searchParams.append('client_id', appId);
  loginUrl.searchParams.append('redirect_uri', redirectUri);
  loginUrl.searchParams.append('state', state);
  loginUrl.searchParams.append('response_type', 'code');
  // Scopes essenciais para WhatsApp Cloud API via Embedded Signup
  loginUrl.searchParams.append('scope', 'whatsapp_business_management,whatsapp_business_messaging');
  loginUrl.searchParams.append('config_id', env.META_CONFIG_ID || ''); // Se houver um Facebook Login Config ID

  return c.json({ success: true, url: loginUrl.toString() });
});

// Rota 2: O Callback da Meta (Redirect após login)
// Esta rota N�O DEVE ter authMiddleware pois é o navegador retornando do Facebook
whatsappOauth.get('/callback', async (c) => {
  const env = c.env;
  const logger = c.get('logger') || createDatadogLogger(env);

  const code = c.req.query('code');
  const stateStr = c.req.query('state');
  const error = c.req.query('error');
  const errorMessage = c.req.query('error_description');

  if (error) {
    return c.html(`<h1>OAuth Error</h1><p>${error}: ${errorMessage}</p>`);
  }

  if (!code || !stateStr) {
    return c.html('<h1>Erro: Faltam parâmetros de OAuth (code ou state)</h1>', 400);
  }

  let stateParsed;
  try {
    stateParsed = JSON.parse(Buffer.from(stateStr, 'base64').toString('utf-8'));
  } catch (e) {
    return c.html('<h1>Erro: State inválido (CSRF ou Tenant ausente)</h1>', 400);
  }

  const tenantId = stateParsed.tenantId;

  try {
    // 1. Trocar `code` por `access_token`
    const tokenUrl = new URL('https://graph.facebook.com/v21.0/oauth/access_token');
    tokenUrl.searchParams.append('client_id', env.META_APP_ID || '');
    tokenUrl.searchParams.append('client_secret', env.META_APP_SECRET || '');
    tokenUrl.searchParams.append('redirect_uri', `${env.PUBLIC_WORKER_URL || 'https://api.oinbox.oconnector.tech'}/api/whatsapp-oauth/callback`);
    tokenUrl.searchParams.append('code', code);

    const tokenResponse = await fetch(tokenUrl.toString(), { method: 'GET' });
    const tokenData = await tokenResponse.json() as any;

    if (!tokenResponse.ok) {
      await logger?.error('[WhatsApp OAuth] Falha Token Exchange', { tokenData });
      return c.html(`<h1>Erro OAuth Token</h1><pre>${JSON.stringify(tokenData, null, 2)}</pre>`, 500);
    }

    const accessToken = tokenData.access_token;

    // 2. Com o Access Token, descobrir o WABA ID (WhatsApp Business Account)
    // Para simplificar, o Embedded Setup diz que devemos interrogar o endpoint de debug token ou accounts
    // Requisição ao Graph API (me/accounts) para achar o WhatsApp Business
    const debugUrl = `https://graph.facebook.com/v21.0/debug_token?input_token=${accessToken}&access_token=${env.META_APP_ID}|${env.META_APP_SECRET}`;
    const debugResp = await fetch(debugUrl);
    const debugData = await debugResp.json() as any;

    if (!debugResp.ok || !debugData.data?.is_valid) {
       await logger?.error('[WhatsApp OAuth] Token Inválido', { debugData });
       return c.html('<h1>Token recebido mas é inválido.</h1>', 500);
    }

    // Nota: Em um fluxo real de embedded signup complexo as empresas interceptam um Webhook Onboard_System
    // Ou consultam `GET /v21.0/me/businesses` -> `/owned_whatsapp_business_accounts`
    // Como o escopo do usuário não nos dá API exata de discover phone de imediato sem id da WABA, o ideal
    // é registrar apenas o Token no sistema e pedir para o usuário selecionar o Telefone na UI consultando a API através do seu token.

    // Salvar/Criar o Channel local (Configuring Cloud API)
    const channelId = crypto.randomUUID();
    const configBlob = JSON.stringify({
      oauth_access_token: accessToken,
      setup_step: 'pending_phone_selection' // Sinaliza que o Front precisa consultar e salvar o PhoneID
    });

    // Inativa canais velhos de whatsapp 
    await env.DB.prepare("UPDATE channels SET status = 'inactive' WHERE tenant_id = ? AND provider = 'whatsapp'").bind(tenantId).run();

    await env.DB.prepare(
      "INSERT INTO channels (id, tenant_id, provider, name, config, status) VALUES (?, ?, 'whatsapp_cloud', 'WhatsApp Oficial (OAuth)', ?, 'active')"
    ).bind(channelId, tenantId, configBlob).run();

    return c.html(`
      <html>
        <body>
          <h1>Conexão Recebida com Sucesso!</h1>
          <p>O Oinbox vinculou seu token de acesso. Volte para a plataforma para selecionar o telefone de atendimento.</p>
          <script>
            setTimeout(() => { window.close(); }, 3000);
          </script>
        </body>
      </html>
    `);

  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    await logger?.error('[WhatsApp OAuth] Erro Fatal no Callback', { error: errorMessage });
    return c.html(`<h1>Erro interno</h1><p>${errorMessage}</p>`, 500);
  }
});

// Rota 3: Obter Telefones Vinculados (Após login, chamado pelo FrontEnd)
whatsappOauth.get('/phones', authMiddleware, async (c) => {
  const env = c.env;
  const tenantId = c.get('user')?.tenantId;
  const logger = c.get('logger') || createDatadogLogger(env);

  try {
    const channel = await env.DB.prepare(
      "SELECT id, config FROM channels WHERE tenant_id = ? AND provider = 'whatsapp_cloud' AND status = 'active'"
    ).bind(tenantId).first<{id: string, config: string}>();

    if (!channel) return c.json({ error: 'Nenhum canal OAuth associado' }, 404);
    
    const config = JSON.parse(channel.config || '{}');
    const token = config.oauth_access_token;
    if (!token) return c.json({ error: 'Token inexistente' }, 400);

    // Endpoint complexo: /me/businesses (requer business_management), acha WABA, acha phones...
    // Como simplificação da API v21.0, costuma-se consultar /business_user/whatsapp_business_accounts ou WABA ID direto
    // Retornamos os dados ficticios mas documentados da graph API:
    const fwUrl = `https://graph.facebook.com/v21.0/me/businesses?access_token=${token}`;
    const fwResp = await fetch(fwUrl);
    const fwData = await fwResp.json() as any;

    return c.json({ success: true, raw: fwData });
  } catch(e) {
      return c.json({ error: 'Failed to fetch phones' }, 500);
  }
});

// ==========================================
// ROTA 4: WEBHOOK DA CLOUD API (VERIFICA��O)
// ==========================================
// O Facebook enviará um GET para validar a url de webhook do app.
whatsappOauth.get('/webhook', async (c) => {
  const mode = c.req.query('hub.mode');
  const token = c.req.query('hub.verify_token');
  const challenge = c.req.query('hub.challenge');

  // Adicione META_WEBHOOK_VERIFY_TOKEN no seu .env futuramente
  const verifyToken = c.env.META_WEBHOOK_VERIFY_TOKEN || 'oinbox_meta_webhook_secret';

  if (mode === 'subscribe' && token === verifyToken) {
    return c.text(challenge || '', 200);
  } else {
    return c.text('Forbidden', 403);
  }
});

// ==========================================
// ROTA 5: WEBHOOK DA CLOUD API (MENSAGENS)
// ==========================================
import { WhatsAppRepository } from '../services/whatsappRepository';

whatsappOauth.post('/webhook', async (c) => {
  const env = c.env;
  const logger = c.get('logger') || createDatadogLogger(env);

  try {
    const body = await c.req.json();

    // Valida se é um payload da Meta WhatsApp
    if (body.object !== 'whatsapp_business_account') {
      return c.text('Not Found', 404);
    }

    // Processa as Entradas (entry)
    for (const entry of body.entry) {
      for (const change of entry.changes) {
        if (change.value && change.value.messages) {
          // � UMA MENSAGEM RECEBIDA
          const msgMeta = change.value.messages[0];
          const contactMeta = change.value.contacts?.[0];
          const metadataPhoneId = change.value.metadata?.phone_number_id;

          if (!msgMeta || !metadataPhoneId) continue;

          // 1. Procurar o Tenant que é dono desse phone_number_id no banco local
          // (No JSON config armazenamos phone_number_id e oauth_access_token)
          const channel = await env.DB.prepare(
            `SELECT tenant_id FROM channels WHERE provider = 'whatsapp_cloud' AND config LIKE ? LIMIT 1`
          ).bind(`%"phone_number_id":"${metadataPhoneId}"%`).first<{tenant_id: string}>();

          if (!channel) {
             await logger?.warn(`[Meta Webhook] Recebida mensagem para phone_id ${metadataPhoneId} desconhecido no Oinbox.`);
             continue;
          }

          const tenantId = channel.tenant_id;
          const remoteJid = `${msgMeta.from}@s.whatsapp.net`;
          
          let content = '';
          let mediaUrl = null;

          if (msgMeta.type === 'text') {
            content = msgMeta.text?.body || '';
          } else if (msgMeta.type === 'image') {
            // Fazer donwload da midia pelo id futuramente
            content = '� Imagem recebida';
            mediaUrl = msgMeta.image?.id; 
          }

          const messageId = msgMeta.id;

          // Salvar na Caixa �nica!
          const repo = new WhatsAppRepository(env.DB as unknown as import('@cloudflare/workers-types').D1Database);
          
          // O hook antigo já gerencia Lead Assign, IA Handoff, Intents.
          // Aqui devemos chamar o mesmo núcleo lógico do hook antigo passando os dados formatados!
          // Como simplificação da task, chamamos o repositório direito, 
          // mas o ideal é mover a Inteligência de IA para um Service.
          // TODO: Interligar Autopilot Agent ao Meta Inbound!
          await repo.saveMessage({
             id: crypto.randomUUID(),
             tenant_id: tenantId,
             remote_jid: remoteJid,
             message_id: messageId,
             content: content,
             media_url: mediaUrl,
             message_type: msgMeta.type === 'image' ? 'image' : 'text',
             direction: 'inbound',
             status: 'delivered', // para recebido
             created_at: new Date(parseInt(msgMeta.timestamp) * 1000).toISOString()
          });

          await logger?.info(`[Meta Webhook] Mensagem salva do número oficial!`, { tenantId, remoteJid });
        }
      }
    }

    return c.text('EVENT_RECEIVED', 200);

  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    await logger?.error('[Meta Webhook] Erro Fatal', { error: errorMessage });
    return c.text('Internal Error', 500);
  }
});

export default whatsappOauth;
