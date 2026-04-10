# Autenticação e Autorização

> Fluxo de auth, middlewares, tenant isolation e trial gate.

---

## 1. Visão Geral

O backend usa **JWT (JSON Web Tokens)** via biblioteca `jose` para autenticação. O token é gerado no login e enviado no header `Authorization: Bearer <token>` em todas as requisições subsequentes.

## 2. Fluxo de Login

```
POST /api/auth/login { email, password }
  → Buscar usuário + tenant no D1 (JOIN)
  → Verificar senha com bcrypt
  → Gerar JWT com payload:
    {
      sub: user.id,
      tenantId: user.tenant_id,
      role: user.role,
      name: user.name,
      email: user.email
    }
  → Retornar { token, user }
```

## 3. Middleware de Autenticação

### 3.1 Middleware Global (`index.ts`)

Executado em **todas as rotas** antes dos middlewares específicos:

```
Request → Global Auth Middleware
  → Pular se rota pública (/api/auth, /api/health, webhooks)
  → Verificar JWT via jose.jwtVerify()
  → Popular c.set('user', { sub, tenantId, role, name, email })
  → next()
```

**Rotas públicas (skip de auth):**
- `/api/auth/*` — login, register, forgot password
- `/api/health` — health check
- `/api/whatsapp/webhook` — webhook da Evolution API
- `/api/portals/feed/*` — XML feed de portais
- `/api/evolution/webhook` — webhook da Evolution API

### 3.2 Auth Middleware (`middleware/auth.ts`)

Este middleware **não é usado globalmente** no momento. Sua responsabilidade adicional ao global é o **Trial/Subscription Gate**:

```
authMiddleware → jwtVerify() + trial/subscription check
  → Se SuperAdmin: pular gate
  → Se tenant: verificar trial_ends_at e stripe_subscription_id
  → Se trial expirado e sem subscription: retornar 402
```

**⚠️ Nota importante:** Atualmente o middleware global em `index.ts` já faz JWT verification inline, mas **não aplica o trial gate**. O `authMiddleware` com trial gate existe mas não está sendo aplicado globalmente — ele é importado mas seu uso depende de cada rota individualmente.

**Gap identificado:** Rotas protegidas pelo global auth mas sem trial gate podem ser acessadas por tenants com trial expirado.

## 4. Tenant Enforcement

Após o auth, o `tenantEnforcementMiddleware` valida que o usuário pertence ao tenant da requisição:

```
tenantEnforcementMiddleware
  → Ler c.get('user').tenantId
  → Comparar com tenant_id da requisição (path param ou body)
  → Se mismatch: retornar 403 Forbidden
```

Aplicado a todas as rotas de `/api/admin/*`, `/api/crm/*`, `/api/properties/*`, etc.

## 5. Role-Based Access

### 5.1 Super Admin

```typescript
superAuthMiddleware → authMiddleware → checar role === 'SuperAdmin'
  → Se não for: 403 Forbidden
```

Rotas protegidas: `/api/admin/*` (gestão de tenants, billing, etc.)

### 5.2 Role Factory

```typescript
requireRole('admin', 'user')  // factory que gera middleware por role
```

## 6. Estrutura de JWT

```json
{
  "sub": "user-uuid",
  "tenantId": "tenant-uuid",
  "role": "admin | user | SuperAdmin | super_admin",
  "name": "Nome do Usuário",
  "email": "user@exemplo.com",
  "iat": 1712000000,
  "exp": 1712086400
}
```

## 7. Trial / Subscription Gate

```
SuperAdmin → acesso liberado

Tenant normal:
  → hasActiveSub = stripe_subscription_id != null
  → isTrialActive = trial_ends_at > now
  → Se ambos falsos: 402 Payment Required
    { "error": "Período de teste expirado", "code": "TRIAL_EXPIRED" }
```

## 8. Rate Limiting

| Rota | Limite | Modo |
|------|--------|------|
| `POST /api/auth/login` | 20 req/min | **fail-close** (bloqueia se D1 falhar) |
| Demais rotas | 10 req/min | fail-open (permite se D1 falhar) |

## 9. Segurança

| Item | Implementação |
|------|--------------|
| Senhas | bcryptjs (hash) |
| JWT | `jose` com secret via `wrangler secret put` |
| CORS | Allow-list explícita (localhost + domínios oconnector.tech) |
| Rate Limiting | D1-based sliding window por IP |
| Tenant Isolation | Middleware + `tenant_id` em todas as tabelas |

## 10. Gap de Autenticação (Conhecido)

**Problema:** O middleware global em `index.ts` faz JWT verification mas **não aplica o trial gate**. O `authMiddleware` em `middleware/auth.ts` aplica o trial gate mas não está sendo usado como middleware global.

**Impacto:** Tenants com trial expirado podem acessar rotas protegidas pelo global auth.

**Correção planejada:** Mover o trial gate para o middleware global ou usar `authMiddleware` como middleware global substituindo o JWT verification inline.

---

## 11. Arquivos Relacionados

| Arquivo | Responsabilidade |
|---------|-----------------|
| `backend/src/index.ts` (linhas 68-105) | Global auth middleware |
| `backend/src/middleware/auth.ts` | JWT + trial gate + role factory |
| `backend/src/middleware/tenantEnforcement.ts` | Tenant isolation |
| `backend/src/services/tokenService.ts` | Geração e verificação de JWT |
| `backend/src/routes/auth.ts` | Login, register, etc. |
