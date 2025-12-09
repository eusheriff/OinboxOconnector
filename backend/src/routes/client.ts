import { Hono } from 'hono';
import { Bindings, Variables } from '../types';
import { authMiddleware } from '../middleware/auth';

const client = new Hono<{ Bindings: Bindings; Variables: Variables }>();

client.use('*', authMiddleware);

client.get('/dashboard', async (c) => {
    const user = c.get('user');
    const tenantId = user.tenantId;
    const clientId = user.sub;

    // Dados do Cliente
    const clientData: any = await c.env.DB.prepare("SELECT * FROM clients WHERE id = ?").bind(clientId).first();

    // Imóveis Favoritos (Simulação - futuramente criar tabela favorites)
    // Por enquanto, retorna imóveis sugeridos baseados no budget
    let suggestedProperties: any[] = [];
    if (clientData.budget) {
        const { results } = await c.env.DB.prepare(
            "SELECT * FROM properties WHERE tenant_id = ? AND price <= ? ORDER BY price DESC LIMIT 5"
        ).bind(tenantId, clientData.budget * 1.2).all();
        suggestedProperties = results.map((p: any) => ({ ...p, features: p.features ? JSON.parse(p.features) : [] }));
    }

    // Mensagens recentes
    const { results: messages } = await c.env.DB.prepare(
        "SELECT * FROM messages WHERE client_id = ? ORDER BY created_at DESC LIMIT 10"
    ).bind(clientId).all();

    return c.json({
        client: clientData,
        suggestedProperties,
        messages
    });
});

export default client;
