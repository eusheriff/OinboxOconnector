import { Hono } from 'hono';
import { authMiddleware } from '../middleware/auth';
import { Bindings, Variables } from '../types';
import { checkAndIncrementRateLimit, getRateLimitStatus, cleanupOldRateLimits } from '../utils/rateLimiter';

const aiRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// PUBLIC ENDPOINT para chatbot da landing page (sem autenticação)
aiRoutes.post('/public-chat', async (c) => {
    try {
        const { prompt, systemPrompt, session_id } = await c.req.json();

        // 1. Buscar conhecimento público da base RAG
        const { results } = await c.env.DB.prepare("SELECT content FROM knowledge_base WHERE tenant_id = 'public'")
            .all();

        const knowledge = results.map((r: any) => r.content).join('\n\n');

        // 2. Montar prompt completo com contexto RAG
        const fullPrompt = `${systemPrompt || 'Você é a IA do Oinbox.'}\n\nBase de conhecimento:\n${knowledge}\n\nPergunta do usuário: ${prompt}`;

        // 3. Chamar Gemini Flash diretamente
        let response = await callGeminiFlash(c.env.API_KEY, fullPrompt);

        // Fallback para Cloudflare AI se Gemini falhar (retornar vazio)
        if (!response) {
            console.warn('Gemini Flash returned empty, falling back to Cloudflare AI');
            response = await callCloudflareAI(c.env.AI, fullPrompt);
        }

        return c.json({ text: response });
    } catch (error: any) {
        console.error('Public chat error:', error);
        return c.json({ error: 'Erro ao processar solicitação de IA. Tente novamente mais tarde.' }, 500);
    }
});

aiRoutes.use('*', authMiddleware);

// Endpoint para verificar status dos limites
aiRoutes.get('/limits', async (c) => {
    const user = c.get('user');
    const status = await getRateLimitStatus(c.env.DB, user.tenantId);
    return c.json(status);
});

aiRoutes.get('/knowledge', async (c) => {
    const user = c.get('user');
    const { results } = await c.env.DB.prepare("SELECT * FROM knowledge_base WHERE tenant_id = ? ORDER BY created_at DESC")
        .bind(user.tenantId)
        .all();
    return c.json(results);
});

aiRoutes.post('/knowledge', async (c) => {
    const user = c.get('user');
    const { content, category } = await c.req.json();

    await c.env.DB.prepare("INSERT INTO knowledge_base (tenant_id, content, category) VALUES (?, ?, ?)")
        .bind(user.tenantId, content, category || 'general')
        .run();

    return c.json({ success: true });
});

/**
 * Chama Gemini Flash com rate limiting e fallback
 */
async function callGeminiFlash(apiKey: string, prompt: string): Promise<string> {
    const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ role: 'user', parts: [{ text: prompt }] }]
            })
        }
    );
    const data: any = await response.json();
    console.log('Gemini Flash Response:', JSON.stringify(data, null, 2));
    if (data.error) {
        console.error('Gemini API Error:', data.error);
    }
    return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

/**
 * Chama Gemini Pro com rate limiting e fallback
 */
async function callGeminiPro(apiKey: string, prompt: string): Promise<string> {
    const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ role: 'user', parts: [{ text: prompt }] }]
            })
        }
    );
    const data: any = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

/**
 * Chama Cloudflare AI (fallback gratuito)
 */
async function callCloudflareAI(ai: any, prompt: string): Promise<string> {
    const response = await ai.run('@cf/meta/llama-3.1-8b-instruct', {
        prompt: prompt,
        max_tokens: 1024
    });
    return response.response || '';
}

aiRoutes.post('/generate', async (c) => {
    const user = c.get('user');
    const { prompt, context } = await c.req.json();

    // 1. Buscar contexto na base de conhecimento (RAG simples)
    const { results } = await c.env.DB.prepare("SELECT content FROM knowledge_base WHERE tenant_id = ?")
        .bind(user.tenantId)
        .all();

    const knowledge = results.map((r: any) => r.content).join('\n');

    const fullPrompt = `
    Você é um assistente virtual imobiliário.
    Use o seguinte conhecimento para responder:
    ${knowledge}

    Contexto da conversa: ${JSON.stringify(context)}
    
    Usuário: ${prompt}
  `;

    // 2. Verificar rate limit do Gemini Flash
    const geminiLimit = await checkAndIncrementRateLimit(c.env.DB, user.tenantId, 'gemini-flash');
    
    let response: string;
    let modelUsed: string;

    if (geminiLimit.allowed) {
        // Usar Gemini Flash
        try {
            response = await callGeminiFlash(c.env.API_KEY, fullPrompt);
            modelUsed = 'gemini-1.5-flash';
        } catch (e) {
            // Fallback para Cloudflare AI em caso de erro
            const cfLimit = await checkAndIncrementRateLimit(c.env.DB, user.tenantId, 'cloudflare-ai');
            if (cfLimit.allowed) {
                response = await callCloudflareAI(c.env.AI, fullPrompt);
                modelUsed = 'cloudflare-llama-3.1';
            } else {
                return c.json({ error: 'Limite de IA atingido para hoje' }, 429);
            }
        }
    } else {
        // Limite Gemini atingido, usar Cloudflare AI
        const cfLimit = await checkAndIncrementRateLimit(c.env.DB, user.tenantId, 'cloudflare-ai');
        if (cfLimit.allowed) {
            response = await callCloudflareAI(c.env.AI, fullPrompt);
            modelUsed = 'cloudflare-llama-3.1';
        } else {
            return c.json({ error: 'Limite de IA atingido para hoje' }, 429);
        }
    }

    return c.json({ 
        response,
        _meta: {
            model: modelUsed,
            geminiRemaining: geminiLimit.remaining,
        }
    });
});

aiRoutes.post('/chat', async (c) => {
    const user = c.get('user');
    const { message, history } = await c.req.json();

    try {
        // Recuperar contexto do banco
        const { results } = await c.env.DB.prepare("SELECT content FROM knowledge_base WHERE tenant_id = ?")
            .bind(user.tenantId)
            .all();
        const knowledge = results.map((r: any) => r.content).join('\n');

        const fullPrompt = `Você é um assistente útil para imobiliárias. Use este conhecimento: ${knowledge}\n\n${message}`;

        // Verificar rate limit do Gemini Pro (usado para chat)
        const geminiLimit = await checkAndIncrementRateLimit(c.env.DB, user.tenantId, 'gemini-pro');
        
        let reply: string;
        let modelUsed: string;

        if (geminiLimit.allowed) {
            try {
                reply = await callGeminiPro(c.env.API_KEY, fullPrompt);
                modelUsed = 'gemini-pro';
            } catch (e) {
                // Fallback
                const cfLimit = await checkAndIncrementRateLimit(c.env.DB, user.tenantId, 'cloudflare-ai');
                if (cfLimit.allowed) {
                    reply = await callCloudflareAI(c.env.AI, fullPrompt);
                    modelUsed = 'cloudflare-llama-3.1';
                } else {
                    return c.json({ error: 'Limite de IA atingido' }, 429);
                }
            }
        } else {
            // Fallback para Cloudflare AI
            const cfLimit = await checkAndIncrementRateLimit(c.env.DB, user.tenantId, 'cloudflare-ai');
            if (cfLimit.allowed) {
                reply = await callCloudflareAI(c.env.AI, fullPrompt);
                modelUsed = 'cloudflare-llama-3.1';
            } else {
                return c.json({ error: 'Limite de IA atingido' }, 429);
            }
        }

        if (!reply) {
            reply = "Desculpe, não consegui processar sua solicitação.";
        }

        return c.json({ 
            reply,
            _meta: { model: modelUsed }
        });
    } catch (e) {
        console.error('AI Chat Error:', e);
        return c.json({ error: "Erro ao processar IA" }, 500);
    }
});

// Endpoint para cleanup (pode ser chamado por cron)
aiRoutes.post('/cleanup', async (c) => {
    const deleted = await cleanupOldRateLimits(c.env.DB);
    return c.json({ deleted, message: `Cleaned up ${deleted} old rate limit records` });
});



export { aiRoutes };
