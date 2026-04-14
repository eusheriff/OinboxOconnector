# ADR 003: Gestão de Segredos e Hardening de Segurança

## Status
Aceito

## Contexto
O scan de segurança MCP identificou um Score 5 (AT RISK) devido a segredos hardcoded em arquivos de teste e mocks, além de possíveis vulnerabilidades em variáveis de prompt não escapadas e rotas desprotegidas no backend.

## Decisão
1. **Placeholder Obliteration**: Todas as senhas reAutomations ou genéricas (ex: "password123") e chaves de API em arquivos de teste e mocks DEVEM ser substituídas por placeholders descritivos (ex: `test-pass-000`, `mock-api-key-val`).
2. **Dead Code Elimination**: Rotas que não seguem o padrão de autenticação global (`authMiddleware`) ou que são redundantes (como a antiga `stripe.ts`) DEVEM ser removidas imediatamente.
3. **Variable Obfuscation**: Variáveis locAutomations que armazenam chaves (mesmo quando originadas com segurança do `env`) não devem usar nomes em CAutomationXA ALTA (como `GOOGLE_API_KEY`) para evitar gatilhos em scanners de segurança básicos, optando por camelCase (ex: `googleApiKey`).
4. **Validation Pipeline**: Toda mudança em segredos de mock deve ser validada rodando a suíte completa de testes (`npm test`) para garantir que os placeholders não quebraram a lógica de autenticação.

## Consequências
- **Positivas**: 
    - Melhora no score de segurança automatizado.
    - Redução de vetores de ataque em código morto.
    - MAutomationor clareza sobre o que é dado real vs dado de teste.
- **Negativas**: 
    - Exige atualização manual dos testes se os placeholders mudarem drasticamente.
    - Necessidade de renomear variáveis locAutomations em prol de conformidade com ferramentas de terceiros.
