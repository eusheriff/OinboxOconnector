# Plano de Implementação: Euimob SaaS Evolution

## Objetivo
Separar a dashboard do Super Admin da dashboard do Cliente (Tenant), refatorar o backend monolítico para uma arquitetura modular usando Hono, implementar roteamento real no frontend e tornar a base de conhecimento da IA dinâmica.

## User Review Required
> [!IMPORTANT]
> **Mudança de Framework Backend:** Migração de `worker.js` puro para o framework **Hono**. Isso simplifica o roteamento e middlewares.
> **Roteamento Frontend:** Adoção de `react-router-dom`. A navegação deixará de ser baseada em estado (`currentView`) e passará a ser baseada em URLs (`/app/crm`, `/admin/tenants`).

## Proposed Changes

### 1. Backend Refactoring (Cloudflare Workers + Hono)
Modularizar o arquivo `backend/worker.js` em múltiplos arquivos organizados por domínio.

#### [NEW] `backend/src/index.ts` (Entry Point)
- Configuração do Hono app.
- Middlewares globais (CORS, Auth).
- Montagem das rotas (`/api/auth`, `/api/admin`, `/api/clients`, etc.).

#### [NEW] `backend/src/routes/auth.ts`
- Login, Register, Verify Token.

#### [NEW] `backend/src/routes/admin.ts`
- Rotas exclusivas do Super Admin (Listar Tenants, Stats Globais).

#### [NEW] `backend/src/routes/ai.ts`
- Lógica de IA, Rate Limiting, RAG dinâmico.

#### [NEW] `backend/src/routes/billing.ts`
- Stripe Webhooks e Checkout.

#### [MODIFY] `backend/schema.sql`
- Adicionar tabela `knowledge_base` para contexto dinâmico da IA.

### 2. Frontend Evolution (React Router)

#### [MODIFY] `package.json`
- Adicionar `react-router-dom` e `hono` (no backend).

#### [MODIFY] `src/App.tsx`
- Substituir lógica de estado por `RouterProvider`.
- Definir rotas protegidas.

#### [NEW] `src/layouts/ClientLayout.tsx`
- Layout padrão para imobiliárias (Sidebar, Header).

#### [NEW] `src/layouts/AdminLayout.tsx`
- Layout exclusivo para Super Admin (sem sidebar de CRM, foco em gestão).

#### [NEW] `src/pages/admin/AdminDashboard.tsx`
- Dashboard principal do Super Admin.

#### [NEW] `src/pages/admin/TenantsList.tsx`
- Listagem e gestão de inquilinos.

### 3. Dynamic Configuration & AI

#### [MODIFY] `wrangler.toml`
- Adicionar variáveis de ambiente para planos Stripe.

## Verification Plan

### Automated Tests
- Testar rotas da API isoladamente.
- Verificar renderização das rotas do frontend.

### Manual Verification
1. **Fluxo Super Admin:**
   - Login como admin -> Redirecionamento para `/admin`.
   - Visualizar lista de tenants e métricas globais.
   - Tentar acessar rotas de cliente (deve falhar ou redirecionar).
2. **Fluxo Cliente:**
   - Login como cliente -> Redirecionamento para `/app`.
   - Navegar entre CRM, Inbox, Imóveis (URLs devem mudar).
   - Tentar acessar `/admin` (deve ser bloqueado).
3. **IA:**
   - Inserir conhecimento no banco.
   - Perguntar à IA e verificar se ela usa o novo contexto.
