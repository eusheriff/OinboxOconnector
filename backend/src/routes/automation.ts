import { Hono } from 'hono';
import { Bindings, Variables } from '../bindings';
import { getRateLimitStatus, cleanupOldRateLimits } from '../utils/aiRateLimiter';
import { callGemma } from '../services/automationService';

const automationRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// PUBLIC ENDPOINT para chatbot da landing page (sem autenticação)
automationRoutes.post('/public-chat', async (c) => {
  const startTime = Date.now();
  const logger = c.get('logger');

  try {
    const { prompt, systemPrompt, session_id } = await c.req.json();

    await logger?.info('Public chat request received', {
      session_id,
      prompt_length: prompt.length,
      has_system_prompt: !!systemPrompt,
    });

    // 1. Buscar conhecimento público da base RAG
    const { results } = await c.env.DB.prepare(
      "SELECT content FROM knowledge_base WHERE tenant_id = 'public'",
    ).all<{ content: string }>();

    const knowledge = results.map((r) => r.content).join('\n\n');

    // 2. Montar prompt completo com contexto RAG
    const fullPrompt =
      (systemPrompt || 'Você é a IA do Oconnector.') +
      '\n\nBase de conhecimento:\n' +
      knowledge +
      '\n\nPergunta do usuário: ' +
      prompt;

    // 3. Chamar Gemma 4 via Engine
    const EngineUrl = c.env.LOCAL_ENGINE_URL || 'http://localhost:11434';
    const response = await callGemma(EngineUrl, fullPrompt);

    const duration = Date.now() - startTime;

    await logger?.info('Public chat request completed', {
      session_id,
      provider: 'Engine',
      model: 'gemma4:e2b',
      duration_ms: duration,
      response_length: response.length,
    });

    await logger?.metric('Oconnector.ai.public_chat.duration', duration, ['provider:Engine']);
    await logger?.metric('Oconnector.ai.public_chat.success', 1, ['provider:Engine']);

    return c.json({ text: response });
  } catch (error: unknown) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    await logger?.error('Public chat error', {
      error: errorMessage,
      duration_ms: duration,
    });

    await logger?.metric('Oconnector.ai.public_chat.error', 1, ['error_type:unknown']);

    return c.json(
      { error: 'Erro ao processar solicitação de IA. Tente novamente mais tarde.' },
      500,
    );
  }
});

// automationRoutes.use('*', authMiddleware); // Auth global

// Endpoint para verificar status dos limites
automationRoutes.get('/limits', async (c) => {
  const user = c.get('user');
  const status = await getRateLimitStatus(c.env.DB, user.tenantId);
  return c.json(status);
});

automationRoutes.get('/knowledge', async (c) => {
  const user = c.get('user');
  const { results } = await c.env.DB.prepare(
    'SELECT * FROM knowledge_base WHERE tenant_id = ? ORDER BY created_at DESC',
  )
    .bind(user.tenantId)
    .all();
  return c.json(results);
});

automationRoutes.post('/knowledge', async (c) => {
  const user = c.get('user');
  const { content, category } = await c.req.json();

  await c.env.DB.prepare(
    'INSERT INTO knowledge_base (tenant_id, content, category) VALUES (?, ?, ?)',
  )
    .bind(user.tenantId, content, category || 'general')
    .run();

  return c.json({ success: true });
});

automationRoutes.post('/generate', async (c) => {
  const user = c.get('user');
  const { prompt, context, systemPrompt } = await c.req.json();

  // 1. Buscar contexto na base de conhecimento (RAG simples)
  const { results } = await c.env.DB.prepare(
    'SELECT content FROM knowledge_base WHERE tenant_id = ?',
  )
    .bind(user.tenantId)
    .all<{ content: string }>();

  const knowledge = results.map((r) => r.content).join('\n');

  const fullSystemPrompt =
    (systemPrompt || 'Você é um assistente virtual imobiliário.') +
    '\nUse o seguinte conhecimento:\n' +
    knowledge;

  const fullPrompt =
    'Contexto da conversa: ' + JSON.stringify(context || {}) + '\n\n' + 'Usuário: ' + prompt;

  // 2. Chamar Gemma 4 via Engine
  const EngineUrl = c.env.LOCAL_ENGINE_URL || 'http://localhost:11434';
  const response = await callGemma(EngineUrl, fullPrompt, fullSystemPrompt);

  return c.json({
    text: response,
    _meta: {
      model: 'gemma4:e2b',
      provider: 'Engine',
    },
  });
});

automationRoutes.post('/chat', async (c) => {
  const user = c.get('user');
  const { message, history } = await c.req.json();
  const logger = c.get('logger');

  try {
    // Recuperar contexto do banco
    const { results } = await c.env.DB.prepare(
      'SELECT content FROM knowledge_base WHERE tenant_id = ?',
    )
      .bind(user.tenantId)
      .all<{ content: string }>();
    const knowledge = results.map((r) => r.content).join('\n');

    const systemPrompt =
      'Você é um assistente útil para imobiliárias. Use este conhecimento: ' + knowledge;

    const fullPrompt = message + '\n\nHistórico: ' + JSON.stringify(history || []);

    // Chamar Gemma 4 via Engine
    const EngineUrl = c.env.LOCAL_ENGINE_URL || 'http://localhost:11434';
    const reply = await callGemma(EngineUrl, fullPrompt, systemPrompt);

    if (!reply) {
      return c.json({ error: 'Não consegui processar sua solicitação.' }, 500);
    }

    return c.json({
      reply,
      _meta: { model: 'gemma4:e2b', provider: 'Engine' },
    });
  } catch (e) {
    logger?.error('AI Chat Error', { error: e });
    return c.json({ error: 'Erro ao processar IA' }, 500);
  }
});

// Endpoint para cleanup (pode ser chamado por cron)
automationRoutes.post('/cleanup', async (c) => {
  const deleted = await cleanupOldRateLimits(c.env.DB);
  return c.json({ deleted, message: `Cleaned up ${deleted} old rate limit records` });
});

export { automationRoutes };
