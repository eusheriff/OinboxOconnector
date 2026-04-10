import { Hono } from 'hono';
import bcrypt from 'bcryptjs';
import { Bindings, Variables } from '../bindings';
import { sendEmail } from '../utils/email';
import { generateJWT, verifyJWT } from '../services/tokenService';
import { rateLimiter } from '../middleware/rateLimiter';

const auth = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// Rate limiting: 20 tentativas de login por minuto por IP (fail-close para proteger contra força bruta)
auth.post('/login', rateLimiter(20, true), async (c) => {
  const env = c.env;
  if (!env.JWT_SECRET) {
    return c.json({ error: 'Server configuration error' }, 500);
  }

  const { email, password } = await c.req.json();
  const cleanEmail = email?.trim().toLowerCase() || '';
  const cleanPassword = password?.trim() || '';

  console.log(`[Login Attempt] Email: '${cleanEmail}' (normalized) | Password Length: ${cleanPassword.length}`);

  // Health check do DB antes da query principal
  try {
    await env.DB.prepare('SELECT 1').first();
  } catch (dbError) {
    console.error(`[Login Critical] D1 Database unreachable:`, dbError);
    return c.json({ error: 'Erro de conexão com o banco de dados' }, 500);
  }

  // Query no D1 com Join para pegar dados do Tenant
  let user;
  try {
    user = await env.DB.prepare(
      `
      SELECT users.*, tenants.plan, tenants.subscription_end, tenants.trial_ends_at 
      FROM users 
      JOIN tenants ON users.tenant_id = tenants.id 
      WHERE users.email = ?
    `,
    )
      .bind(cleanEmail)
      .first<{
        id: string;
        tenant_id: string;
        role: string;
        name: string;
        email: string;
        password_hash: string;
        plan: string;
        subscription_end: string | null;
        trial_ends_at: string | null;
      }>();
  } catch (queryError) {
    console.error(`[Login Error] Query failed:`, queryError);
    return c.json({ error: 'Erro ao consultar banco de dados' }, 500);
  }

  if (!user) {
    console.warn(`[Login Failed] User not found for email: '${cleanEmail}'. Check if user exists in D1 database.`);
    return c.json({ error: `Usuário não encontrado: ${cleanEmail}` }, 401);
  }

  // Verifica senha com bcrypt
  let isValid = false;
  try {
    isValid = await bcrypt.compare(cleanPassword, user.password_hash);
  } catch (bcryptError) {
    console.error(`[Login Error] Bcrypt comparison failed:`, bcryptError);
    return c.json({ error: 'Erro interno na verificação de senha' }, 500);
  }

  console.log(`[Login Check] User found: ${user.id} | IsValid: ${isValid} | Role: ${user.role}`);

  if (!isValid) {
    console.warn(`[Login Failed] Invalid password for user: ${user.id} (${cleanEmail})`);
    return c.json({ error: 'Credenciais inválidas: senha incorreta' }, 401);
  }

  // Gera JWT
  const token = await generateJWT(
    {
      sub: user.id,
      tenantId: user.tenant_id,
      role: user.role,
      name: user.name,
    },
    env.JWT_SECRET,
  );

  return c.json({
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
    tenantId: user.tenant_id,
    token: token,
    trialEndsAt: user.subscription_end || user.trial_ends_at,
    plan: user.plan,
  });
});

auth.post('/register', rateLimiter(3), async (c) => {
  const env = c.env;
  const { email, ...rest } = await c.req.json();
  const normalizedEmail = email?.trim().toLowerCase();
  const data = { email: normalizedEmail, ...rest };

  // 1. Check if email exists
  const existingUser = await env.DB.prepare('SELECT id FROM users WHERE email = ?')
    .bind(normalizedEmail)
    .first<{ id: string }>();
  if (existingUser) {
    return c.json({ error: 'Este email já está cadastrado.' }, 400);
  }

  // 2. Anti-Fraud: Check trial fingerprint
  const fingerprint = await env.DB.prepare(
    'SELECT id FROM trial_fingerprints WHERE email = ? OR phone = ? OR device_id = ?',
  )
    .bind(data.email, data.phone || '', data.deviceId || '')
    .first<{ id: string }>();

  if (fingerprint) {
    return c.json(
      {
        error:
          'Este dispositivo/email/telefone já utilizou o período de teste. Faça upgrade para continuar.',
        code: 'TRIAL_USED',
      },
      403,
    );
  }

  // Hash password (or generate random if not provided)
  const password = data.password || crypto.randomUUID().slice(0, 8);
  const passwordHash = await bcrypt.hash(password, 10);

  // 3. Determine trial plan based on type
  const planType = data.planType || 'Corretor'; // 'Corretor' or 'Imobiliaria'
  const trialPlan = planType === 'Imobiliaria' ? 'TrialImobiliaria' : 'TrialCorretor';

  // 4. Create Tenant
  const tenantId = crypto.randomUUID();
  await env.DB.prepare(
    `INSERT INTO tenants (id, name, owner_name, email, phone, plan, status, joined_at, subscription_end) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      tenantId,
      data.companyName,
      data.name,
      data.email,
      data.phone, // Add phone
      trialPlan,
      'Active',
      new Date().toISOString(),
      new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // trial_ends_at = NOW + 30 days
    )
    .run();

  // 5. Create User
  const userId = crypto.randomUUID();
  await env.DB.prepare(
    `INSERT INTO users (id, tenant_id, name, email, phone, password_hash, role) VALUES (?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(userId, tenantId, data.name, data.email, data.phone, passwordHash, 'admin')
    .run();

  // 6. Save fingerprint for anti-fraud
  await env.DB.prepare(
    'INSERT INTO trial_fingerprints (id, email, phone, device_id, tenant_id) VALUES (?, ?, ?, ?, ?)',
  )
    .bind(crypto.randomUUID(), data.email, data.phone || null, data.deviceId || null, tenantId)
    .run();

  // 7. Send Welcome Email
  await sendEmail(
    env,
    data.email,
    'Bem-vindo ao Oinbox! 🚀',
    '<h1>Olá, ' +
      data.name +
      '!</h1>' +
      '<p>Sua imobiliária <strong>' +
      data.companyName +
      '</strong> foi cadastrada com sucesso.</p>' +
      '<p>Você tem <strong>30 dias</strong> de acesso completo para testar.</p>' +
      '<p>Acesse seu painel agora mesmo e comece a vender mais.</p>',
  );

  return c.json({ success: true, tenantId, userId, trialDays: 30 });
});

// GET /me - Validate Token & Get Profile
auth.get('/me', async (c) => {
  const env = c.env;
  if (!env.JWT_SECRET) return c.json({ error: 'Config Error' }, 500);

  const authHeader = c.req.header('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ error: 'Token não fornecido' }, 401);
  }

  const token = authHeader.split(' ')[1];

  try {
    const { payload } = await verifyJWT(token, env.JWT_SECRET);

    // Opcional: Buscar dados frescos do DB
    const user = await env.DB.prepare(
      'SELECT id, name, email, role, tenant_id FROM users WHERE id = ?',
    )
      .bind(payload.sub as string)
      .first<Record<string, unknown>>();

    if (!user) return c.json({ error: 'Usuário não encontrado' }, 401);

    return c.json({ user });
  } catch {
    return c.json({ error: 'Token inválido ou expirado' }, 401);
  }
});

auth.post('/client/login', rateLimiter(5), async (c) => {
  const env = c.env;
  if (!env.JWT_SECRET) {
    return c.json({ error: 'Server configuration error' }, 500);
  }
  const { email, password } = await c.req.json();
  const cleanEmail = email?.trim().toLowerCase() || '';

  // Busca cliente
  const client = await env.DB.prepare('SELECT * FROM clients WHERE email = ?').bind(cleanEmail).first<{
    id: string;
    tenant_id: string;
    name: string;
    email: string;
    password_hash: string | null;
  }>();

  if (!client) {
    return c.json({ error: 'Cliente não encontrado' }, 401);
  }

  // Verifica senha (se não tiver senha definida, falha)
  if (!client.password_hash) {
    return c.json({ error: 'Acesso não configurado. Contate seu corretor.' }, 401);
  }

  const isValid = await bcrypt.compare(password, client.password_hash);
  if (!isValid) {
    return c.json({ error: 'Credenciais inválidas' }, 401);
  }

  // Atualiza last_login
  await env.DB.prepare('UPDATE clients SET last_login = CURRENT_TIMESTAMP WHERE id = ?')
    .bind(client.id)
    .run();

  // Gera JWT de Cliente
  const token = await generateJWT(
    {
      sub: client.id,
      tenantId: client.tenant_id,
      role: 'client',
      name: client.name,
      email: client.email,
    },
    env.JWT_SECRET,
  );

  return c.json({
    user: { id: client.id, name: client.name, email: client.email, role: 'client' },
    tenantId: client.tenant_id,
    token: token,
  });
});

export default auth;
