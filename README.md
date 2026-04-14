# Oconnector - Omnichannel Infrastructure for Real Estate Operations

Oconnector is a high-performance, multi-tenant omnichannel infrastructure designed to centralize and automate real estate workflows. Built on a serverless edge-native stack, it provides a unified data layer for communications, property management, and lead orchestration.

## Technical Architecture

The platform leverages the Cloudflare ecosystem for scalability, low latency, and strong data isolation.

| Layer | Component | Specification |
|-------|-----------|---------------|
| **Compute** | Cloudflare Workers | Serverless execution at the edge via Hono framework |
| **Relational Data** | Cloudflare D1 | Multi-tenant SQLite engine with strict schema enforcement |
| **Object Storage** | Cloudflare R2 | S3-compatible blob storage for documents and assets |
| **Integration Layer** | Adapter Pattern | Unified interface for 3rd-party APIs (WhatsApp, Email, Portals) |
| **Front-end** | Unified UI | React 18, TypeScript, and Vite-optimized delivery |

## Data Model and Security

### Multi-tenant Isolation
The data architecture implements a rigorous multi-tenant strategy. Every relational entity is bound to a `tenant_id`, enforced at the middleware level to prevent cross-tenant data leakage.

### Relational Schema
The database (Cloudflare D1) consists of ~35 tables, supporting complex real estate operations:
- **Tenant Management:** Subscriptions, quotas, and feature flags.
- **Communication Hub:** Unified message history across multiple channels.
- **CRM and Lead Ops:** Pipeline management with event-driven data enrichment.
- **Property Engine:** Publication state tracking across various listing platforms.

### Security Standards
- **Authentication:** JWT-based access control with asymmetric signing.
- **Data Integrity:** Foreign key enforcement in the SQLite engine.
- **Confidentiality:** Industry-standard hashing for sensitive credentials.
- **Secrets Management:** Environment-isolated encrypted bindings.

## Core Data Flows

### Omnichannel Ingestion
External events (Incoming WhatsApp, IMAP, or Portal Leads) are ingested via dedicated webhooks, normalized into a canonical message format, and persisted in the unified communication table.

### Data Enrichment Engine
The platform includes an automated processing layer that analyzes incoming unstructured data to populate CRM fields, perform lead scoring, and generate metadata for property descriptions.

### Multi-Platform Synchronization
A centralized publication engine handles state synchronization between the core D1 database and external real estate portals (OLX, Zap, VivaReal) using an adapter-based synchronization logic.

## Project Structure

```
Oconnector/
|-- backend/                  # Serverless Compute Layer (Hono)
|   |-- src/
|   |   |-- routes/           # RESTful API modules
|   |   |-- services/         # Core business logic and adapters
|   |   |-- middleware/       # Auth, Logging, Tenant Enforcement
|   |   `-- bindings.ts       # Infrastructure type definitions
|   |-- migrations/           # Incremental schema evolution
|   `-- schema.sql            # Master D1 relational schema
|-- src/                      # Client Application (React)
|-- shared/types/             # Isomorphic TypeScript definitions
|-- wrangler.toml             # Infrastructure-as-code configuration
`-- vite.config.ts            # Frontend build pipeline
```

## Infrastructure Management

### Prerequisites
- Node.js 20+
- Cloudflare Account (Workers, D1, R2)

### Database Setup
```bash
# Initialize relational storage
wrangler d1 execute Oconnector-db --file=./backend/schema.sql --local
```

### Local Development
```bash
# Backend orchestration
npm run dev:backend

# Frontend application
npm run dev
```

## Monitoring and Observability
The platform implements structured logging and telemetry for API latency, exception tracking, and infrastructure health via external observability adapters.
