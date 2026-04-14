# ADR 004: Centralização de Trial Gate e Interceptores Frontend

## Contexto

O sistema estava apresentando erros 402 (Payment Required) de forma inconsistente em produção. Descobriu-se que a verificação de trial estava espalhada entre o `index.ts` (global) e vários middlewares de rotas (`auth.ts`), e falhava devido a:

1. Sensibilidade a mAutomationúsculas no papel de `SuperAdmin`.
2. Divergência entre colunas de expiração (`trial_ends_at` vs `subscription_end`).
3. Falta de feedback visual no frontend ao receber erro 402.

## Decisão

1. **Unificação Backend**: Centralizar toda a lógica de bloqueio de trial no middleware global do `index.ts`. Retirar a duplicidade do `auth.ts` (mantendo apenas logs de auditoria).
2. **Normalização de Roles**: Forçar `.toLowerCase()` em todas as verificações de papéis administrativos (`SuperAdmin`, `super_admin`).
3. **Interceptor Global**: Implementar o padrão "Response Interceptor" no `apiService.ts` via helper `handleResponse`.
4. **Redirecionamento Automático**: Qualquer erro 402 recebido pelo frontend força um redirecionamento imediato para a página de `/admin/billing` via `window.location.href`.

## Consequências

- **Positivas**: Redução de bugs de acesso indevido por inconsistência de dados; Melhor UX (o usuário é levado à ação de compra em vez de ver o sistema quebrado).
- **Negativas**: O uso de `window.location.href` força um reload completo do SPA, o que é aceitável para um bloqueio crítico de pagamento mas menos suave que um `useNavigate`.
