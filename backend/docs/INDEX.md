# Documentação Técnica � Oconnector Backend

�ndice de documentos técnicos do backend do Oconnector.

## Arquitetura e Design

| Documento                                                | Descrição                                                             |
| -------------------------------------------------------- | --------------------------------------------------------------------- |
| [Portal Adapters](src/services/portals/README.md)        | Adapter pattern para publicação multi-plataforma (OLX, Zap, Facebook) |
| [Human Handover](docs/human-handover.md)                 | Fluxo de silenciamento da IA quando corretor assume conversa          |
| [Autopilot Scheduler](src/services/autopilot/README.md)  | Cron job de automação de campanhas e follow-ups                       |
| [Trial Gate Duplication](docs/trial-gate-duplication.md) | Análise da duplicação do middleware de trial/subscription             |

## Middleware

| Documento                                                | Descrição                                |
| -------------------------------------------------------- | ---------------------------------------- |
| [Foreign Key Middleware](docs/foreign-key-middleware.md) | PRAGMA foreign_keys enforcement          |
| [Rate Limiter](docs/rate-limiter.md)                     | Rate limiting genérico + AI rate limiter |

## Feature Flags

| Documento                              | Descrição                                        |
| -------------------------------------- | ------------------------------------------------ |
| [Feature Flags](docs/feature-flags.md) | Sistema de feature flags (tabela, UI, endpoints) |

## Investigação

| Documento                                | Descrição                                                   |
| ---------------------------------------- | ----------------------------------------------------------- |
| [Open Questions](docs/open-questions.md) | Agent Hub, Client vs Lead, AI Providers, Backup D1, Staging |

## Arquivos de Referência

| Arquivo            | Descrição                                             |
| ------------------ | ----------------------------------------------------- |
| `schema.sql`       | Schema completo do banco de dados (~35 tabelas)       |
| `bindings.ts`      | Tipagens de environment bindings do Cloudflare Worker |
| `index.ts`         | Entry point do Worker, middleware stack, rotas        |
| `email-handler.ts` | Cloudflare Email Routing handler                      |
