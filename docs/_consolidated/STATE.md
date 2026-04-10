# Projeto Oinbox - Estado Atual

## Resumo Executivo
Resolvida a crise de acesso em produção ("402 Payment Required") através da extensão de trial no banco D1 e implementação de interceptor robusto no frontend. O roteamento foi unificado para SPA e a segurança foi auditada e reforçada contra credenciais hardcoded.

## Estado por Módulo

### Backend (Worker - Cloudflare)
- **Autenticação**: Emails normalizados. JWT fortalecido no mock.
- **Segurança**: Rota órfã `stripe.ts` removida; variáveis sensíveis renomeadas.
- **WhatsApp**: Endpoints estáveis e validados por testes (100% PASS).

### Frontend (React - Vite/Pages)
- **Roteamento**: Estabilizado.
- **Segurança**: Credenciais de teste removidas e substituídas por placeholders.

### Documentação (Fumadocs - Pages)
- **Status**: Live sob [https://646eeab5.oinbox-docs.pages.dev](https://646eeab5.oinbox-docs.pages.dev).
- **Arquitetura**: Next.js 16 com manual file mapping para estabilidade de build.

## Decisões Fixas
- **Normalização de Email**: Todos os emails DEVEM ser minúsculos.
- **Prioridade de Rota**: Rotas autenticadas têm precedência.
- **Gestão de Segredos**: Proibido o uso de senhas reais ou chaves de API em arquivos `.test.ts`.
- **Deploy de Docs**: Utilizar exportação estática e Wrangler CLI para garantir bypass de permissões locais.

## Próximos 3 Passos
1. Refinar a renderização MDX das subpáginas (atualmente em fallback visual).
2. Configurar o domínio customizado `docs.oinbox.oconnector.tech` no Cloudflare.
3. Integrar links da documentação no Sidebar do Dashboard principal.

## Riscos Identificados
- **Incompatibilidade de Versões**: Conflitos entre Fumadocs v14 e v16 requerem manutenção manual do `source.ts`.
- **Permissões de Cache (EPERM)**: Restrições no diretório `.npm/_cacache` impedem atualizações limpas de pacotes via CLI.
