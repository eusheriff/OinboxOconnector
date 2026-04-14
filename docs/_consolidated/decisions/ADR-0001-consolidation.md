# ADR-0001: Consolidação de Tipos e Documentação

**Data**: 2026-01-17  
**Status**: Aceito  
**Contexto**: O projeto Oconnector cresceu e apresenta divergências entre definições de tipos no Frontend e Backend, além de documentação dispersa.

## Decisão

1. **Unificação de Tipos**: Utlizar `shared/types/index.ts` como a "Single Source of Truth" para entidades de domínio (User, Client, Lead, Property, etc.).
   - O Frontend deve importar de `@shared/types`.
   - O Backend deve importar de `../../shared/types`.
   - Tipos específicos de UI ou Infraestrutura permanecem em seus respectivos diretórios.

2. **Estrutura de Documentação**: Centralizar todo conhecimento em `docs/_consolidated/` com a taxonomia:
   - `00_overview`, `01_architecture`, `02_runbooks`, `03_api`, `04_audit`, `decisions`, `99_archive`.

## Consequências

- **Positivas**: Elimina bugs de contrato entre front/back; facilita onboarding; reduz dívida técnica.
- **Negativas**: Exige refatoração imediata de imports em ~40 arquivos.

## Compliance

Novos desenvolvimentos devem seguir esta estrutura. PRs que introduzam tipos duplicados ou docs na rAutomationz devem ser rejeitados.
