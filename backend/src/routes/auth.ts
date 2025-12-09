import { Hono } from 'hono';
import { SignJWT } from 'jose';
import bcrypt from 'bcryptjs';
import { Bindings, Variables } from '../types';
import { sendEmail } from '../utils/email';

const auth = new Hono<{ Bindings: Bindings; Variables: Variables }>();

auth.post('/login', async (c) => {
    const env = c.env;
    if (!env.JWT_SECRET) {
        return c.json({ error: "Server configuration error" }, 500);
    }
    const jwtSecret = new TextEncoder().encode(env.JWT_SECRET);

    const { email, password } = await c.req.json();

    // Query no D1
    const user: any = await env.DB.prepare("SELECT * FROM users WHERE email = ?")
        .bind(email)
        .first();

    if (!user) {
        return c.json({ error: "Credenciais inválidas" }, 401);
    }

    // Verifica senha (suporta legado texto plano ou bcrypt)
    let isValid = false;
    if (user.password_hash.startsWith('$2')) {
        isValid = await bcrypt.compare(password, user.password_hash);
    } else {
        isValid = user.password_hash === password; // Fallback legado
    }

    if (!isValid) {
        return c.json({ error: "Credenciais inválidas" }, 401);
    }

    // Gera JWT
    const token = await new SignJWT({
        sub: user.id,
        tenantId: user.tenant_id,
        role: user.role,
        name: user.name
    })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('24h')
        .sign(jwtSecret);

    return c.json({
        user: { id: user.id, name: user.name, email: user.email, role: user.role },
        tenantId: user.tenant_id,
        token: token
    });
});

auth.post('/register', async (c) => {
    const env = c.env;
    const data = await c.req.json();

    // 1. Check if email exists
    const existingUser = await env.DB.prepare("SELECT id FROM users WHERE email = ?").bind(data.email).first();
    if (existingUser) {
        return c.json({ error: "Este email já está cadastrado." }, 400);
    }

    // Hash password (or generate random if not provided)
    const password = data.password || crypto.randomUUID().slice(0, 8);
    const passwordHash = await bcrypt.hash(password, 10);

    // 2. Create Tenant (Imobiliária)
    const tenantId = crypto.randomUUID();
    await env.DB.prepare(
        "INSERT INTO tenants (id, name, owner_name, email, plan, status, joined_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
    ).bind(tenantId, data.companyName, data.name, data.email, data.plan || 'Trial', 'Active', new Date().toISOString())
        .run();

    // 3. Create User
    const userId = crypto.randomUUID();
    await env.DB.prepare(
        "INSERT INTO users (id, tenant_id, name, email, password_hash, role) VALUES (?, ?, ?, ?, ?, ?)"
    ).bind(userId, tenantId, data.name, data.email, passwordHash, 'admin')
        .run();

    // 4. Send Welcome Email
    await sendEmail(env, data.email, "Bem-vindo ao Euimob! 🚀", `
    <h1>Olá, ${data.name}!</h1>
    <p>Sua imobiliária <strong>${data.companyName}</strong> foi cadastrada com sucesso.</p>
    <p>Acesse seu painel agora mesmo e comece a vender mais.</p>
  `);

    return c.json({ success: true, tenantId, userId });
});

auth.post('/client/login', async (c) => {
    const env = c.env;
    if (!env.JWT_SECRET) {
        return c.json({ error: "Server configuration error" }, 500);
    }
    const jwtSecret = new TextEncoder().encode(env.JWT_SECRET);
    const { email, password } = await c.req.json();

    // Busca cliente
    const client: any = await env.DB.prepare("SELECT * FROM clients WHERE email = ?").bind(email).first();

    if (!client) {
        return c.json({ error: "Cliente não encontrado" }, 401);
    }

    // Verifica senha (se não tiver senha definida, falha)
    if (!client.password_hash) {
        return c.json({ error: "Acesso não configurado. Contate seu corretor." }, 401);
    }

    const isValid = await bcrypt.compare(password, client.password_hash);
    if (!isValid) {
        return c.json({ error: "Credenciais inválidas" }, 401);
    }

    // Atualiza last_login
    await env.DB.prepare("UPDATE clients SET last_login = CURRENT_TIMESTAMP WHERE id = ?").bind(client.id).run();

    // Gera JWT de Cliente
    const token = await new SignJWT({
        sub: client.id,
        tenantId: client.tenant_id,
        role: 'client',
        name: client.name,
        email: client.email
    })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('24h')
        .sign(jwtSecret);

    return c.json({
        user: { id: client.id, name: client.name, email: client.email, role: 'client' },
        tenantId: client.tenant_id,
        token: token
    });
});

export default auth;
