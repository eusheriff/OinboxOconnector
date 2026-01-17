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
  const clientData = await c.env.DB.prepare('SELECT * FROM clients WHERE id = ?')
    .bind(clientId)
    .first<{ budget: number }>();

  if (!clientData) {
    return c.json({ error: 'Client not found' }, 404);
  }

  // Imóveis Favoritos (Simulação - futuramente criar tabela favorites)
  // Por enquanto, retorna imóveis sugeridos baseados no budget
  let suggestedProperties: Record<string, unknown>[] = [];
  if (clientData.budget) {
    const { results } = await c.env.DB.prepare(
      'SELECT * FROM properties WHERE tenant_id = ? AND price <= ? ORDER BY price DESC LIMIT 5',
    )
      .bind(tenantId, clientData.budget * 1.2)
      .all();
    suggestedProperties = results.map((p) => {
      const prop = p as Record<string, unknown>;
      return {
        ...prop,
        features: prop.features ? JSON.parse(prop.features as string) : [],
      };
    });
  }

  // Mensagens recentes
  const { results: messages } = await c.env.DB.prepare(
    'SELECT * FROM messages WHERE client_id = ? ORDER BY created_at DESC LIMIT 10',
  )
    .bind(clientId)
    .all();

  return c.json({
    client: clientData,
    suggestedProperties,
    messages,
  });
});

export default client;
