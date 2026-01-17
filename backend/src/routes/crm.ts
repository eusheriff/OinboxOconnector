import { Hono } from 'hono';
import bcrypt from 'bcryptjs';
import { Bindings, Variables } from '../types';
import { authMiddleware } from '../middleware/auth';

const crm = new Hono<{ Bindings: Bindings; Variables: Variables }>();

crm.use('*', authMiddleware);

crm.get('/clients', async (c) => {
  const user = c.get('user');
  const tenantId = user.tenantId;

  const { results } = await c.env.DB.prepare(
    'SELECT * FROM clients WHERE tenant_id = ? ORDER BY created_at DESC',
  )
    .bind(tenantId)
    .all();

  return c.json(results);
});

crm.post('/clients', async (c) => {
  const user = c.get('user');
  const tenantId = user.tenantId;
  const data = await c.req.json();
  const id = crypto.randomUUID();

  // Default password: genera random or use provided
  const password = data.password || crypto.randomUUID().slice(0, 8);
  const passwordHash = await bcrypt.hash(password, 10);

  await c.env.DB.prepare(
    'INSERT INTO clients (id, tenant_id, name, email, phone, status, budget, password_hash) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
  )
    .bind(
      id,
      tenantId,
      data.name,
      data.email,
      data.phone,
      data.status || 'Novo',
      data.budget,
      passwordHash,
    )
    .run();

  return c.json({ success: true, id });
});

crm.post('/clients/:id/analyze', async (c) => {
  const user = c.get('user');
  const tenantId = user.tenantId;
  const clientId = c.req.param('id');
  const logger = c.get('logger');

  // 1. Fetch Client and Chat History
  const clientData = await c.env.DB.prepare('SELECT * FROM clients WHERE id = ? AND tenant_id = ?')
    .bind(clientId, tenantId)
    .first();
  if (!clientData) return c.json({ error: 'Client not found' }, 404);

  const history = await c.env.DB.prepare(
    'SELECT role, content FROM messages WHERE client_id = ? ORDER BY created_at ASC LIMIT 50',
  )
    .bind(clientId)
    .all<{ role: string; content: string }>();

  if (!history.results || history.results.length === 0) {
    return c.json({ error: 'No interaction history to analyze' }, 400);
  }

  // 2. Construct Prompt
  const conversation = history.results.map((m) => m.role + ': ' + m.content).join('\n');
  const prompt =
    'Analise a seguinte conversa entre um corretor (ou IA) e um cliente imobiliário.\n\n' +
    'CONVERSA:\n' +
    conversation +
    '\n\n' +
    'TAREFA:\n' +
    '1. Atribua uma nota de 0 a 100 para a probabilidade de compra deste cliente (Lead Score).\n' +
    '2. Escreva um resumo curto (max 2 frases) sobre o perfil e urgência dele.\n\n' +
    'SAÍDA JSON (apenas JSON):\n' +
    '{ "score": 85, "summary": "Cliente busca 3 quartos urgente, tem crédito aprovado." }';

  // 3. Call Gemini
  const apiKey = c.env.API_KEY;
  const url =
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=' +
    apiKey;

  try {
    const geminiResp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
      }),
    });
    const data: any = await geminiResp.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

    // Clean markdown code blocks if present
    const jsonStr = text
      .replace(/```json/g, '')
      .replace(/```/g, '')
      .trim();
    const result = JSON.parse(jsonStr);

    // 4. Update Database
    await c.env.DB.prepare('UPDATE clients SET score = ?, ai_summary = ? WHERE id = ?')
      .bind(result.score, result.summary, clientId)
      .run();

    return c.json(result);
  } catch (e: any) {
    await logger?.error('Lead Scoring Error', { error: e.message });
    return c.json({ error: 'Analysis failed' }, 500);
  }
});

export default crm;
