# Trial Gate � Duplicação de Middleware

## Problema Identificado

Existem **duas implementações** do Trial/Subscription Gate que verificam se o tenant pode acessar o sistema:

### 1. Middleware Global (`index.ts`, linha ~68-115)

Aplicado **globalmente** para todas as rotas (exceto paths públicas):

```typescript
app.use('/*', async (c, next) => {
  // ... JWT verify ...
  // TRIAL / SUBSCRIPTION GATE
  const tenant = await c.env.DB.prepare(
    'SELECT trial_ends_at, subscription_end, stripe_subscription_id, plan FROM tenants WHERE id = ?',
  ).bind(user.tenantId).first();

  if (!hasActiveSub && !isTrialActive) {
    return c.json({ error: 'Período de teste expirado...', code: 'TRIAL_EXPIRED' }, 402);
  }
});
```

### 2. Middleware `auth.ts` (`authMiddleware`, linha ~33-75)

Middleware reutilizável que pode ser aplicado por rota:

```typescript
export const authMiddleware = async (c, next) => {
  // ... JWT verify ...
  // TRIAL / SUBSCRIPTION GATE
  const tenant = await c.env.DB.prepare(
    'SELECT subscription_end, trial_ends_at, stripe_subscription_id, plan FROM tenants WHERE id = ?',
  ).bind(payload.tenantId).first();

  if (!hasActiveSub && !isTrialActive) {
    return c.json({ error: 'Período de teste expirado...', code: 'TRIAL_EXPIRED' }, 402);
  }
};
```

## Análise

### Ambos fazem a mesma coisa?

**Sim.** Ambos:
1. Verificam `subscription_end` e `trial_ends_at`
2. Checam `stripe_subscription_id` para assinatura ativa
3. Retornam 402 com a mesma mensagem de erro
4. Ignoram a verificação para `superadmin`/`super_admin`

### Diferenças sutis

| Aspecto | index.ts (global) | auth.ts (middleware) |
|---------|-------------------|---------------------|
| Ordem dos campos no SELECT | `trial_ends_at, subscription_end, ...` | `subscription_end, trial_ends_at, ...` |
| Variável de expiry | `expiryStr = subscription_end \|\| trial_ends_at` | `expiryStr = subscription_end \|\| trial_ends_at` |
| Lógica de check | `!hasActiveSub && !isTrialActive` | `!hasActiveSub && !isTrialActive` |

**Conclusão:** A lógica é idêntica. Apenas a ordem dos campos no SELECT difere (sem impacto funcional).

### Qual é efetivamente executado?

O middleware global em `index.ts` **N�O** usa `authMiddleware` � ele implementa a verificação inline. O middleware `auth.ts` **N�O** é aplicado globalmente em `index.ts` (o trial gate global é inline).

Porém, se alguma rota individual usar `authMiddleware` como middleware de rota (ex: `route.post('/x', authMiddleware, handler)`), o trial gate será executado **duas vezes** para essa rota:
1. Pelo middleware global
2. Pelo `authMiddleware`

### Verificação

No código analisado, **nenhuma rota usa `authMiddleware` individualmente** � todas as rotas são registradas sem middleware adicional (ex: `app.route('/api/auth', authRoutes)`). O trial gate de `auth.ts` pode ser executado apenas nas rotas internas de auth que o importam.

**Porém**, `authRoutes` (`/api/auth/login`, `/api/auth/register`, etc.) estão na lista de paths **públicos** do middleware global (skip para `/api/auth`). Portanto:
- Rotas de auth: **apenas** `authMiddleware` (se usado internamente)
- Rotas protegidas: **apenas** middleware global de `index.ts`

### Risco

**Baixo no estado atual.** Não há duplicação efetiva porque:
1. Rotas de auth são públicas no middleware global
2. Rotas protegidas não usam `authMiddleware` individualmente

**Risco futuro:** Se alguém adicionar `authMiddleware` a uma rota protegida, o trial gate será executado duas vezes (query desnecessária ao D1).

## Recomendação

1. **Consolidar o trial gate** em um único middleware exportável em `middleware/auth.ts`
2. **Remover a lógica inline** de `index.ts` e usar o middleware centralizado
3. **Documentar** que o trial gate é parte do auth middleware, não separado

### Exemplo de consolidação

```typescript
// middleware/auth.ts
export const globalAuthMiddleware = (c, next) => {
  // 1. JWT verify
  // 2. Trial/subscription gate
  // 3. next()
};

// index.ts
app.use('/*', globalAuthMiddleware); // substituindo o inline
```
