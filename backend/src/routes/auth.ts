import { Hono } from 'hono';
import { SignJWT } from 'jose';
import bcrypt from 'bcryptjs';
import { Bindings, Variables } from '../types';
import { sendEmail } from '../utils/email';

const auth = new Hono<{ Bindings: Bindings; Variables: Variables }>();

auth.post('/login', async (c) => {
  const env = c.env;
  if (!env.JWT_SECRET) {
    return c.json({ error: 'Server configuration error' }, 500);
  }
  const jwtSecret = new TextEncoder().encode(env.JWT_SECRET);

  const { email, password } = await c.req.json();

  // Query no D1 com Join para pegar dados do Tenant
  const user = await env.DB.prepare(`
    SELECT users.*, tenants.plan, tenants.trial_ends_at 
    FROM users 
    JOIN tenants ON users.tenant_id = tenants.id 
    WHERE users.email = ?
  `).bind(email).first<{
    id: string;
    tenant_id: string;
    role: string;
    name: string;
    email: string;
    password_hash: string;
    plan: string;
    trial_ends_at: string;
  }>();

  if (!user) {
    return c.json({ error: 'Credenciais inválidas' }, 401);
  }

  // Verifica senha (suporta legado texto plano ou bcrypt)
  let isValid = false;
  if (user.password_hash.startsWith('$2')) {
    isValid = await bcrypt.compare(password, user.password_hash);
  } else {
    isValid = user.password_hash === password; // Fallback legado
  }

  if (!isValid) {
    return c.json({ error: 'Credenciais inválidas' }, 401);
  }

  // Gera JWT
  const token = await new SignJWT({
    sub: user.id,
    tenantId: user.tenant_id,
    role: user.role,
    name: user.name,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(jwtSecret);

  return c.json({
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
    tenantId: user.tenant_id,
    token: token,
    // Add trial info for frontend gate
    trialEndsAt: user.trial_ends_at, 
    plan: user.plan,
  });
});

auth.post('/register', async (c) => {
  const env = c.env;
  const data = await c.req.json();

  // 1. Check if email exists
  const existingUser = await env.DB.prepare('SELECT id FROM users WHERE email = ?')
    .bind(data.email)
    .first<{ id: string }>();
  if (existingUser) {
    return c.json({ error: 'Este email já está cadastrado.' }, 400);
  }

  // 2. Anti-Fraud: Check trial fingerprint
  const fingerprint = await env.DB.prepare(
    'SELECT id FROM trial_fingerprints WHERE email = ? OR phone = ? OR device_id = ?'
  ).bind(data.email, data.phone || '', data.deviceId || '').first<{ id: string }>();

  if (fingerprint) {
    return c.json({
      error: 'Este dispositivo/email/telefone já utilizou o período de teste. Faça upgrade para continuar.',
      code: 'TRIAL_USED',
    }, 403);
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
    `INSERT INTO tenants (id, name, owner_name, email, phone, plan, status, joined_at, trial_ends_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
      new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(), // trial_ends_at = NOW + 14 days
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
    'INSERT INTO trial_fingerprints (id, email, phone, device_id, tenant_id) VALUES (?, ?, ?, ?, ?)'
  ).bind(crypto.randomUUID(), data.email, data.phone || null, data.deviceId || null, tenantId).run();

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
      '<p>Você tem <strong>14 dias</strong> de acesso completo para testar.</p>' +
      '<p>Acesse seu painel agora mesmo e comece a vender mais.</p>',
  );

  return c.json({ success: true, tenantId, userId, trialDays: 14 });
});

auth.post('/client/login', async (c) => {
  const env = c.env;
  if (!env.JWT_SECRET) {
    return c.json({ error: 'Server configuration error' }, 500);
  }
  const jwtSecret = new TextEncoder().encode(env.JWT_SECRET);
  const { email, password } = await c.req.json();

  // Busca cliente
  const client = await env.DB.prepare('SELECT * FROM clients WHERE email = ?').bind(email).first<{
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
  const token = await new SignJWT({
    sub: client.id,
    tenantId: client.tenant_id,
    role: 'client',
    name: client.name,
    email: client.email,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(jwtSecret);

  return c.json({
    user: { id: client.id, name: client.name, email: client.email, role: 'client' },
    tenantId: client.tenant_id,
    token: token,
  });
});

export default auth;
