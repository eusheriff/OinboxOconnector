# Rate Limiter

## Visão Geral

O projeto possui **dois sistemas de rate limiting** independentes:

1. **Rate Limiter Genérico** (`middleware/rateLimiter.ts`) — middleware reutilizável baseado em D1
2. **AI Rate Limiter** (`utils/aiRateLimiter.ts`) — rate limiter específico para rotas de IA

## Rate Limiter Genérico

### Arquivo
`backend/src/middleware/rateLimiter.ts`

### Como Funciona

- **Estratégia:** Sliding window de 1 minuto por IP + rota
- **Storage:** Tabela `rate_limits` no D1 (SQLite)
- **Chave:** `rate_limit:{ip}:{rota}`

### Parâmetros

```typescript
rateLimiter(maxRequests: number = 10, failClose: boolean = false)
```

| Parâmetro | Default | Descrição |
|-----------|---------|-----------|
| `maxRequests` | 10 | Requests permitidos por janela de 1 minuto |
| `failClose` | false | Se `true`, bloqueia quando D1 está indisponível. Se `false`, permite passar |

### Modos de Falha

| Modo | Comportamento | Quando usar |
|------|--------------|-------------|
| **Fail-open** (`failClose: false`) | Permite request se D1 falhar | Rotas normais — não bloquear tráfego legítimo |
| **Fail-close** (`failClose: true`) | Retorna 503 se D1 falhar | Rotas de login — proteger contra força bruta |

### Onde é Aplicado (confirmado no código)

| Rota | Limite | Modo | Arquivo |
|------|--------|------|---------|
| `POST /api/auth/login` | 20 req/min | fail-close | `routes/auth.ts` |
| `POST /api/auth/register` | 3 req/min | fail-open | `routes/auth.ts` |
| `POST /api/auth/client/login` | 5 req/min | fail-open | `routes/auth.ts` |

### Onde NÃO é Aplicado

O README menciona "Rate limiting em rotas de login (5 req/min por IP)" — o valor real é **20 req/min** para login, não 5. O README está desatualizado.

### Tabela `rate_limits`

```sql
CREATE TABLE IF NOT EXISTS rate_limits (
    key TEXT PRIMARY KEY,
    count INTEGER DEFAULT 1,
    window_start INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### Limitações

1. **Sem cleanup automático** — registros expirados não são removidos. A tabela cresce indefinidamente.
2. **IP via headers** — usa `x-forwarded-for`, `x-real-ip`, ou `cf-connecting-ip`. Em dev local sem proxy, usa `'unknown'` (todos compartilham o mesmo limite).
3. **Sem rate limiting em rotas de API protegidas** — apenas rotas de auth têm rate limiter. Rotas como `/api/properties`, `/api/leads`, etc. não têm proteção.

## AI Rate Limiter

### Arquivo
`backend/src/utils/aiRateLimiter.ts`

### Funções Exportadas

| Função | Uso |
|--------|-----|
| `checkAndIncrementRateLimit(tenantId, provider, maxRequests)` | Verifica e incrementa. Retorna `true` se excedeu |
| `getRateLimitStatus(tenantId, provider)` | Retorna status atual (count, limit, remaining) |
| `cleanupOldRateLimits()` | Remove registros antigos |

### Onde é Aplicado

Confirmado em `routes/ai.ts` — rotas de IA têm rate limiting por tenant e por provider (gemini/ollama/cloudflare).

### Configuração

O limite é configurado via variável de ambiente `PLACES_MONTHLY_LIMIT` para Google Places. Para outros providers de IA, os limites são hardcodados no `aiRateLimiter.ts`.

## Recomendações

1. **Adicionar cleanup agendado** de `rate_limits` no Autopilot scheduler
2. **Estender rate limiter** para rotas críticas (WhatsApp send, campaigns)
3. **Atualizar README** com valores corretos (20 req/min para login, não 5)
4. **Adicionar rate limiting** por tenant em rotas de AI para evitar abuso
