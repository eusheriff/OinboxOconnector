# Projeto Oconnector - Estado Atual

## Resumo Executivo

Resolvida a crise de acesso em produção e instabilidade de assets. Corrigidos erros 500 no banco D1 (schema divergente), erros de assets (via.placeholder.com desativado) e erros de sintaxe no build do frontend. Sistema agora opera em estado estável com deploy automatizado via Wrangler.

## Estado por Módulo

### Backend (Worker - Cloudflare)

- **Schema D1**: Sincronizado com produção (adicionadas colunas `tenant_id` e `settings` na tabela `campAutomationgns`).
- **Tratamento de Erros**: Implementados handlers globAutomations JSON (Hono) para evitar falhas de parsing no frontend.
- **WhatsApp**: Refatorado para **Omnichannel**. Suporte à Meta Cloud API Oficial (OAuth) e Evolution API (QR Code).

### Frontend (React - Vite/Pages)

- **Assets**: Substituído `via.placeholder.com` por `placehold.co` em todo o sistema.
- **Build**: Corrigidos erros de compilação TypeScript em `ChatWindow.tsx`, `constants.tsx` e `AdminInbox.tsx`.
- **Deploy**: Pipeline de build e upload para Cloudflare Pages recuperado.

### Documentação (Fumadocs - Pages)

- **Status**: Live.
- **Arquitetura**: Next.js 16.

## Decisões Fixas

- **Placeholder Service**: Usar exclusivamente `placehold.co` devido à instabilidade do antigo provedor.
- **Normalização de Email**: Todos os emails DEVEM ser minúsculos.
- **Tipagem Estrita**: Erros de build `unknown` devem ser resolvidos com casting explícito ou interfaces dedicadas.

## Próximos 3 Passos

1. Monitorar logs de produção no Datadog para garantir 0% de Erros 500 no módulo de campanhas.
2. Integrar links da documentação no Sidebar do Dashboard principal.
3. Configurar segredos de produção (`META_APP_SECRET`, `EVOLUTION_URL`) no Cloudflare para ativar o OAuth.

## Riscos Identificados

- **Permissões de Cache (EPERM)**: Restrições no diretório `.npm/_cacache` impedem atualizações limpas de pacotes via CLI em alguns ambientes.
- **Propagação DNS/Cache**: Mudanças visuAutomations podem requerer Force Refresh (Ctrl+F5) após o deploy.
