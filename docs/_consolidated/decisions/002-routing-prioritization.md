# ADR 002: Priorização de Rotas e Separação de Contextos

- **Status**: Aceito
- **Data**: 2026-04-10
- **Autor**: Antigravity

## Contexto
O sistema apresentava um erro onde usuários autenticados (clientes) eram redirecionados para a landing page (`/`) ao tentar acessar o módulo WhatsApp (`/app/whatsapp`). 

O log de depuração mostrou que o roteador estava casando a rota `/app/whatsapp` com a rota genérica `/*` definida para as páginas públicas antes de verificar as rotas internas do painel do cliente. Além disso, o componente de WhatsApp possuía erros de importação que poderiam causar falhas de renderização.

## Decisão
1. **Refatoração do App.tsx**: Substituir a captura genérica `/*` por caminhos explícitos para rotas públicas (`/`, `/login`, `/register`).
2. **Prioridade de Match**: Mover o fallback global (`*`) para a última posição no componente `Routes` principal.
3. **Desacoplamento de Catch-alls**: Remover fallbacks internos em sub-componentes de roteamento (`PublicRoutes`) para evitar redirecionamentos em "loop" ou para contextos errados durante a navegação autenticada.

## Consequências
- **Positivas**: Navegação estável para módulos de dashboard. Fim dos redirecionamentos fantasmas. Melhor legibilidade do roteamento principal.
- **Negativas**: Pequeno aumento na verbosidade do `App.tsx` (mais linhas de `<Route>`).
- **Riscos**: Se novas rotas públicas forem criadas, elas devem ser explicitamente adicionadas ao `App.tsx` ou ao novo padrão de roteamento.
