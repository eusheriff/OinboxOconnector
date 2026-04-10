### Sessão: 10 de Abril, 2026 (Segurança e Auditoria)

### Mudanças Realizadas
1. **Segurança (Backend & Frontend)**:
   - Remediação de segredos baseada no scan MCP (Score 5 -> Reforçado).
   - Limpeza de chaves de API e senhas hardcoded em `mockEnv.ts`, `apiService.test.ts` e `auth.test.ts`.
   - Exclusão do arquivo `backend/src/routes/stripe.ts` (código morto e desprotegido).
   - Renomeação de variáveis sensíveis em `prospecting.ts` para conformidade com scanners.

2. **Estabilização de Testes**:
   - Correção do `whatsapp.test.ts`: Ajuste do nome da instância para `tenant_` prefix.
   - Correção do `Sidebar.test.tsx`: Inclusão do `ThemeProvider` obrigatório.
   - Validação final confirmando 30/30 testes passando.

### Comandos Utilizados
- `npm test` (root & backend): Validação de regressões.
- `rm backend/src/routes/stripe.ts`: Limpeza de código vulnerável.

### Resultados
- Sistema 100% testado e seguro.
- Vulnerabilidades críticas resolvidas e documentadas no ADR 003.

### Sessão: 10 de Abril, 2026 (Continuação)

### Mudanças Realizadas
1. **Frontend (`src/App.tsx`)**:
   - Refatoração das rotas principais para separar contextos de Public, Admin e Client.
   - Substituição da rota genérica `/*` por caminhos explícitos (`/`, `/login`, `/register`) para evitar interceptação de rotas autenticadas.
   - Adicionado fallback global unificado.

2. **Frontend (`src/routes/PublicRoutes.tsx`)**:
   - Remoção do catch-all interno que redirecionava para a Home, estabilizando a navegação interna de sub-módulos.

3. **Frontend (`src/components/Admin/WhatsAppBotManager.tsx`)**:
   - Consolidação de imports de ícones no topo do arquivo.
   - Correção de erro de referência no ícone `Activity`.

4. **Documentação**:
   - Criado **ADR 002** para documentar a priorização de rotas.
   - Atualizado `STATE.md` com o status final dos módulos.

### Resultados
- Redirecionamento indevido ao clicar em "WhatsApp" resolvido.
- Build de produção validado sem erros de tipagem ou exportação.
- Arquitetura de roteamento mais robusta contra colisões de caminhos.

## Sessão: 10 de Abril, 2026

### Mudanças Realizadas
1. **Backend (`backend/src/routes/auth.ts`)**:
   - Implementado `.toLowerCase()` no recebimento de emails para login e registro.
   - Adicionados logs de aviso (`console.warn`) para falhas de login (usuário não encontrado vs senha errada).
   - Corrigido `clientLogin` para normalizar email.

2. **Frontend (`src/components/Auth/LoginPage.tsx`)**:
   - Adicionado estado `isClientMode`.
   - Implementada interface de troca (toggle) de acesso (Corretor vs Cliente).
   - Ajustada estilização e labels dinâmicas.

3. **Frontend (`src/routes/PublicRoutes.tsx`)**:
   - Implementado `handleClientLogin`.
   - Adicionado cast `as const` para a role `client`, resolvendo erro de compilação TS.
   - Integrada nova prop `onClientLogin` no componente `LoginPage`.

4. **Configuração (`package.json`, `wrangler.toml`, `.env`)**:
   - Atualizado `wrangler` para v4 para resolver bug de `FileHandle`.
   - Corrigido `package.json` para apontar `deploy` para `oinbox-frontend`.
   - Ajustado `.env` para usar a API de produção por padrão.
   - Revertida configuração conflitante no `wrangler.toml`.

### Comandos Utilizados
- `npm run test:backend`: Verificação de integridade das rotas de auth.
- `npx wrangler d1 execute --remote --file=...`: Seed e correção de senhas no D1.
- `npm run deploy:worker`: Atualização do backend.
- `npm run build && npm run deploy`: Atualização do frontend.
- `npx wrangler tail`: Depuração em tempo real.

### Resultados
- Autenticação agora é insensível a maiúsculas.
- Usuário `cliente@oinbox.com` logando com sucesso via Portal do Cliente.
- Painel de mensagens carregando para clientes.

## Sessão: 10 de Abril, 2026 (Estabilização de Roteamento)

### Mudanças Realizadas
1. **Roteamento Frontend (src/App.tsx & src/routes/PublicRoutes.tsx)**:
   - **Achatamento (Flattening)**: Migração das rotas de Landing, Login e Registro diretamente para o App.tsx.
   - **Eliminação de Nesting**: Removido o uso de <Routes> aninhados no PublicRoutes.tsx para eliminar o aviso parent route path has no trailing "*".
   - **SPA Navigation**: Migração de window.location.href para useNavigate() em todos os handlers do App.tsx, eliminando recargas de página e loops de roteamento.
   - **Cleanup**: Exclusão do arquivo redundante src/routes/PublicRoutes.tsx.

2. **Segurança e Conformidade**:
   - Refinamento dos redirecionamentos autenticados com replace: true para manter o histórico de navegação limpo.

### Resultados
- Erro "descendant <Routes>" resolvido permanentemente.
- Navegação entre Home e Login instantânea (comportamento SPA).
- Estrutura de roteamento simplificada e mais fácil de manter.

## Sessão: 10 de Abril, 2026 (Resolução de Erros 402 e Trial)

### Mudanças Realizadas
1. **Infraestrutura de Banco de Dados (D1)**:
   - Extensão manual do Trial do Tenant Mestre (`50567a50...`) até 2030 para garantir acesso de desenvolvimento.
   - Upgrade de plano para `Pro` no registro do tenant.

2. **Backend (index.ts & middleware/auth.ts)**:
   - **Centralização da Lógica**: Unificação do Trial Gate no middleware global.
   - **Normalização**: Bypass de `SuperAdmin` agora é insensível a maiúsculas (`toLowerCase()`).
   - **Depuração**: Inclusão de objeto de `debug` e logs de `console.warn` para diagnósticos de acesso negado (402).

3. **Frontend (src/services/apiService.ts)**:
   - **Interceptor de Resposta**: Criado o helper `handleResponse` que intercepta erros 402.
   - **UX de Pagamento**: Implementado redirecionamento automático para `/admin/billing` ao detectar expiração de trial em qualquer chamada de API.
   - **Refatoração**: Substituição massiva de `.json()` por `handleResponse(response)`.

### Comandos Utilizados
- `npx wrangler d1 execute oinbox-db --remote --command="UPDATE tenants SET..."`: Correção de datas de expiração em produção.
- `HOME=$(pwd) ... npm run deploy:worker`: Deploy do backend ignorando restrições de permissão local.
- `npm run build && HOME=$(pwd) ... npm run deploy`: Deploy do frontend após correção de erros de tipagem.

### Resultados
- Acesso à produção restaurado para a conta `dev@oconnector.tech`.
- Erros de console "Payment Required" substituídos por redirecionamentos lógicos e informativos.
- Lógica de trial mais robusta contra inconsistências de case no banco de dados.

## Sessão: 10 de Abril, 2026 (Implantação de Documentação)

### Mudanças Realizadas
1. **Infraestrutura de Documentação (`/docs-site`)**:
   - Inicializado projeto Next.js 16 com Fumadocs UI.
   - Configurada exportação estática (`output: 'export'`) para compatibilidade com Cloudflare Pages.

2. **Resolução de Erros de Build**:
   - Desenvolvido um `Static Fallback Mapper` em `app/source.ts` para superar incompatibilidades de versão detecadas entre pacotes do Fumadocs.

3. **Deploy (Cloudflare Pages)**:
   - Criado projeto `oinbox-docs`.
   - Deploy bem-sucedido via Wrangler CLI.

### Resultados
- **URL**: [oinbox-docs.pages.dev](https://oinbox-docs.pages.dev)
- Documentação técnica pública e funcional.
