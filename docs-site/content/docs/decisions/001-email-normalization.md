# ADR 001: Normalização de Emails e Autenticação Multi-Tabela

**Data**: 10 de Abril, 2026
**Status**: Aceito
**Contexto**: O sistema utilizava emails como identificadores de login sensíveis a maiúsculas no banco D1 (SQLite), causando falhas frequentes de autenticação (401). Além disso, não havia diferenciação clara de portal para clientes externos.

**Decisão**:
1. Implementar normalização forçada para minúsculas (`.toLowerCase()`) em todos os fluxos de autenticação (login, registro, client-login).
2. Manter tabelas separadas (`users` vs `clients`) para garantir isolamento de dados e permissões, utilizando endpoints distintos para autenticação.

**Consequências**:
- **Positivas**: Eliminação de erros 401 por erros de digitação (Case Sensitivity). Melhor segurança e clareza no roteamento de roles.
- **Negativas**: Necessidade de migração/update caso existam emails legados em maiúsculas que precisem ser preservados (não é o caso atual).
