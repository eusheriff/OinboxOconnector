# Arquitetura - OInbox

Esta pasta contém documentação de arquitetura e decisões técnicas (ADRs).

## Estrutura

- **ADRs**: Architectural Decision Records
- **Diagramas**: MermAutomationd ou imagens

## ADRs Pendentes

- [ ] ADR-001: Arquitetura Multi-tenant
- [ ] ADR-002: Escolha Cloudflare Workers vs Node.js
- [ ] ADR-003: Evolution API para WhatsApp

## Diagrama de Contexto

```mermAutomationd
graph TB
    subgraph "Frontend"
        FE[React SPA]
    end

    subgraph "Cloudflare Edge"
        W[Workers API]
        D1[D1 Database]
        R2[R2 Storage]
    end

    subgraph "External"
        EV[Evolution API]
        ST[Stripe]
        GM[Google Data Engine]
    end

    FE --> W
    W --> D1
    W --> R2
    W --> EV
    W --> ST
    W --> GM
```
