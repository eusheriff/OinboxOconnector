import { Hono } from 'hono';
import { Bindings, Variables } from '../bindings';
import { authMiddleware } from '../middleware/auth';
import { createDatadogLogger } from '../utils/datadog';

const cannedResponses = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// Apply Auth
cannedResponses.use('/*', authMiddleware);

export interface CannedResponse {
  id: string;
  tenant_id: string;
  shortcut: string;
  content: string;
  created_at: string;
}

// Listar Respostas Rápidas
cannedResponses.get('/', async (c) => {
  const env = c.env;
  const user = c.get('user');
  const tenantId = user?.tenantId;
  const logger = c.get('logger') || createDatadogLogger(env);

  try {
    const results = await env.DB.prepare(
      'SELECT id, shortcut, content, created_at FROM canned_responses WHERE tenant_id = ? ORDER BY shortcut ASC',
    )
      .bind(tenantId)
      .all<CannedResponse>();

    return c.json({ success: true, cannedResponses: results.results });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    await logger?.error('[CannedResponses] Ler Erro', { error: errorMessage });
    return c.json({ success: false, error: errorMessage }, 500);
  }
});

// Criar Resposta Rápida
cannedResponses.post('/', async (c) => {
  const env = c.env;
  const user = c.get('user');
  const tenantId = user?.tenantId;
  const logger = c.get('logger') || createDatadogLogger(env);

  try {
    const { shortcut, content } = await c.req.json();

    if (!shortcut || !content) {
      return c.json({ success: false, error: 'Shortcut e content obrigatórios' }, 400);
    }

    const cleanShortcut = shortcut.startsWith('/') ? shortcut : `/${shortcut}`;
    const newId = crypto.randomUUID();

    await env.DB.prepare(
      'INSERT INTO canned_responses (id, tenant_id, shortcut, content) VALUES (?, ?, ?, ?)',
    )
      .bind(newId, tenantId, cleanShortcut, content)
      .run();

    return c.json({
      success: true,
      cannedResponse: { id: newId, tenant_id: tenantId, shortcut: cleanShortcut, content },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes('UNIQUE constraint')) {
      return c.json({ success: false, error: 'Este atalho já existe.' }, 409);
    }
    await logger?.error('[CannedResponses] Criar Erro', { error: errorMessage });
    return c.json({ success: false, error: errorMessage }, 500);
  }
});

// Deletar Resposta Rápida
cannedResponses.delete('/:id', async (c) => {
  const env = c.env;
  const user = c.get('user');
  const tenantId = user?.tenantId;
  const id = c.req.param('id');
  const logger = c.get('logger') || createDatadogLogger(env);

  try {
    const result = await env.DB.prepare(
      'DELETE FROM canned_responses WHERE id = ? AND tenant_id = ?',
    )
      .bind(id, tenantId)
      .run();

    if (result.meta.changes === 0) {
      return c.json({ success: false, error: 'Não encontrado' }, 404);
    }

    return c.json({ success: true });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    await logger?.error('[CannedResponses] Deletar Erro', { error: errorMessage });
    return c.json({ success: false, error: errorMessage }, 500);
  }
});

export default cannedResponses;
