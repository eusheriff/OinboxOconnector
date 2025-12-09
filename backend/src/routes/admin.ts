import { Hono } from 'hono';
import { SignJWT } from 'jose';
import bcrypt from 'bcryptjs';
import { Bindings, Variables } from '../types';
import { authMiddleware } from '../middleware/auth';

const admin = new Hono<{ Bindings: Bindings; Variables: Variables }>();

admin.use('*', authMiddleware);

admin.get('/tenants', async (c) => {
    const { results } = await c.env.DB.prepare("SELECT * FROM tenants ORDER BY joined_at DESC").all();
    return c.json(results);
});

admin.post('/tenants', async (c) => {
    const data = await c.req.json();

    if (!data.name || !data.email || !data.owner_name) {
        return c.json({ error: "Nome da empresa, email e nome do responsável são obrigatórios." }, 400);
    }

    const existingUser = await c.env.DB.prepare("SELECT id FROM users WHERE email = ?").bind(data.email).first();
    if (existingUser) {
        return c.json({ error: "Este email já está cadastrado." }, 400);
    }

    const password = data.password || '123456';
    const passwordHash = await bcrypt.hash(password, 10);

    const tenantId = crypto.randomUUID();
    await c.env.DB.prepare(
        "INSERT INTO tenants (id, name, owner_name, email, plan, status, joined_at, subscription_end, balance, discount_plan) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    ).bind(
        tenantId,
        data.name,
        data.owner_name,
        data.email,
        data.plan || 'Trial',
        data.status || 'Active',
        new Date().toISOString(),
        data.subscription_end || null,
        data.balance || 0,
        data.discount_plan || 0
    ).run();

    const userId = crypto.randomUUID();
    await c.env.DB.prepare(
        "INSERT INTO users (id, tenant_id, name, email, password_hash, role) VALUES (?, ?, ?, ?, ?, ?)"
    ).bind(userId, tenantId, data.owner_name, data.email, passwordHash, 'admin')
        .run();

    return c.json({ success: true, tenantId, userId, message: "Inquilino criado com sucesso." });
});

admin.delete('/tenants/:id', async (c) => {
    const tenantId = c.req.param('id');
    await c.env.DB.prepare("DELETE FROM tenants WHERE id = ?").bind(tenantId).run();
    await c.env.DB.prepare("DELETE FROM users WHERE tenant_id = ?").bind(tenantId).run();
    await c.env.DB.prepare("DELETE FROM clients WHERE tenant_id = ?").bind(tenantId).run();
    await c.env.DB.prepare("DELETE FROM properties WHERE tenant_id = ?").bind(tenantId).run();
    return c.json({ success: true });
});

admin.put('/tenants/:id', async (c) => {
    const tenantId = c.req.param('id');
    const { name, owner_name, email, plan, status, subscription_end, balance, discount_plan } = await c.req.json();

    await c.env.DB.prepare(`
        UPDATE tenants 
        SET name = ?, owner_name = ?, email = ?, plan = ?, status = ?, subscription_end = ?, balance = ?, discount_plan = ?
        WHERE id = ?
    `).bind(name, owner_name, email, plan, status, subscription_end, balance, discount_plan, tenantId).run();

    return c.json({ success: true });
});

admin.post('/tenants/:id/password', async (c) => {
    const tenantId = c.req.param('id');
    const data = await c.req.json();
    const action = data.action;

    const user: any = await c.env.DB.prepare("SELECT id FROM users WHERE tenant_id = ? LIMIT 1").bind(tenantId).first();

    if (!user) {
        return c.json({ error: "Usuário admin não encontrado para este inquilino." }, 404);
    }

    if (action === 'delete') {
        await c.env.DB.prepare("UPDATE users SET password_hash = 'DISABLED' WHERE id = ?").bind(user.id).run();
        return c.json({ success: true, message: "Senha removida com sucesso." });
    }

    if (action === 'create') {
        const newPassword = data.password;
        if (!newPassword) {
            return c.json({ error: "Senha é obrigatória para criação." }, 400);
        }
        const passwordHash = await bcrypt.hash(newPassword, 10);
        await c.env.DB.prepare("UPDATE users SET password_hash = ? WHERE id = ?").bind(passwordHash, user.id).run();
        return c.json({ success: true, message: "Senha atualizada com sucesso." });
    }

    return c.json({ error: "Ação inválida." }, 400);
});

admin.post('/tenants/:id/impersonate', async (c) => {
    const tenantId = c.req.param('id');
    const user: any = await c.env.DB.prepare("SELECT * FROM users WHERE tenant_id = ? LIMIT 1").bind(tenantId).first();

    if (!user) {
        return c.json({ error: "Usuário não encontrado para este inquilino." }, 404);
    }

    if (!c.env.JWT_SECRET) {
        return c.json({ error: "Server configuration error" }, 500);
    }
    const jwtSecret = new TextEncoder().encode(c.env.JWT_SECRET);

    const token = await new SignJWT({
        sub: user.id,
        tenantId: user.tenant_id,
        role: user.role,
        name: user.name
    })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('1h')
        .sign(jwtSecret);

    return c.json({
        user: { id: user.id, name: user.name, email: user.email, role: user.role, tenant_id: user.tenant_id },
        token: token
    });
});

admin.get('/stats', async (c) => {
    const totalTenants = await c.env.DB.prepare("SELECT COUNT(*) as count FROM tenants").first('count');
    const activeTenants = await c.env.DB.prepare("SELECT COUNT(*) as count FROM tenants WHERE status = 'Active'").first('count');
    const totalRevenue = await c.env.DB.prepare("SELECT SUM(CASE WHEN plan = 'Pro' THEN 500 WHEN plan = 'Basic' THEN 200 ELSE 0 END) as total FROM tenants").first('total');

    return c.json({
        totalTenants,
        activeTenants,
        mrr: totalRevenue || 0
    });
});

// Mock Routes
admin.get('/ai-usage', (c) => c.json({ usage: 1500, limit: 5000, cost: 15.50 }));
admin.get('/ai-config', (c) => c.json({ model: "gpt-4", temperature: 0.7, maxTokens: 2048 }));
admin.get('/whatsapp-status', (c) => c.json({ status: "connected", battery: 85, phone: "+5511999999999" }));
admin.get('/audit-logs', (c) => c.json([
    { id: 1, action: "Login", user: "Admin", timestamp: new Date().toISOString() },
    { id: 2, action: "Update Tenant", user: "Admin", timestamp: new Date().toISOString() }
]));
admin.get('/finance-stats', (c) => c.json({ mrr: 5000, active_subs: 50, churn: 2.5 }));
admin.get('/features', (c) => c.json([
    { id: 1, name: "Beta Dashboard", enabled: true },
    { id: 2, name: "New AI Model", enabled: false }
]));
admin.get('/broadcasts', (c) => c.json([
    { id: 1, message: "System Maintenance at midnight", active: true }
]));
admin.get('/ai-analytics', (c) => c.json({ sentiment_score: 0.8, messages_processed: 1200 }));
admin.get('/health-check', async (c) => {
    const start = performance.now();
    let dbStatus = 'healthy';
    let dbLatency = 0;

    try {
        // Teste real de conectividade com D1
        const queryStart = performance.now();
        await c.env.DB.prepare("SELECT 1").first();
        dbLatency = Math.round(performance.now() - queryStart);
    } catch (e) {
        console.error("Health Check DB Fail:", e);
        dbStatus = 'down';
    }

    const apiLatency = Math.round(performance.now() - start);

    return c.json({
        status: dbStatus === 'healthy' ? 'healthy' : 'degraded',
        uptime: process.uptime ? process.uptime() : 0, // Fallback se uptime não disponível
        timestamp: new Date().toISOString(),
        services: {
            database: { status: dbStatus === 'healthy' ? 'connected' : 'error', latency: `${dbLatency}ms` },
            api: { status: 'online', latency: `${apiLatency}ms` },
            storage: { status: 'standby' } // R2 ainda não implementado ativamente
        }
    });
});
admin.get('/subscriptions', (c) => c.json([
    { id: 1, tenant: "Test Imob", plan: "Pro", status: "Active" }
]));
admin.get('/billing-plans', (c) => c.json([
    { id: "basic", name: "Basic", price: 99, features: ["1 User", "100 Leads"] },
    { id: "pro", name: "Pro", price: 199, features: ["5 Users", "Unlimited Leads"] },
    { id: "enterprise", name: "Enterprise", price: 499, features: ["Unlimited Users", "Custom Integrations"] }
]));

export default admin;
