# Portal Adapters � Publicação Multi-Plataforma

## Visão Geral

Este diretório implementa o **Adapter Pattern** para publicação de imóveis em portais externos (OLX, Zap Imóveis, VivaReal, Facebook Marketplace). Cada portal tem seu próprio adapter que implementa a interface `BasePortal`.

## Arquitetura

```
PortalRegistry (factory)
  ��� ZapVivaRealPortal   � Feed XML (imóveis marcados com publish_to_portals = 1)
  ��� OlxPortal           � API Key ou Feed XML
  ��� FacebookMarketplacePortal � Graph API (Page Access Token)
```

## Como Funciona

### Fluxo de Publicação

1. Tenant configura credenciais do portal em `portal_configs` (tabela D1)
2. Tenant seleciona imóveis e portais desejados (bulk publish)
3. `PortalRegistry.publishToPortals()` itera sobre os portais selecionados
4. Para cada portal:
   - Busca configuração em `portal_configs`
   - Busca dados do imóvel em `properties`
   - Chama `adapter.publish(property, config, env)`
   - Cria registro em `property_publications` com status e external_id

### Fluxo de Remoção

1. Chama `adapter.remove(externalId, config, env)`
2. Cada adapter implementa a lógica específica de remoção
3. Para Zap/VivaReal: marca `publish_to_portals = 0`
4. Para Facebook: DELETE na Graph API

## Contract do Adapter

Todo adapter deve implementar a interface `BasePortal`:

| Método | Descrição |
|--------|-----------|
| `getPortalId()` | ID único (ex: `'olx'`, `'zap_viva'`, `'facebook_marketplace'`) |
| `getPortalName()` | Nome amigável (ex: `'OLX Imóveis'`) |
| `publish(property, config, env)` | Publicar imóvel. Retorna `PortalPublishResponse` |
| `remove(externalId, config, env)` | Remover imóvel publicado |
| `update(externalId, property, config, env)` | Atualizar imóvel existente |
| `validateCredentials(config, env)` | Validar se credenciais estão corretas |

### Dados do Imóvel (`PropertyData`)

```typescript
{
  id: string;
  tenant_id: string;
  title: string;
  description?: string;
  price: number;
  location: string;
  listing_type: 'sale' | 'rent';
  images: string[];          // URLs das imagens
  features: string[];        // Array de features
  bedrooms?: number;
  bathrooms?: number;
  suites?: number;
  garage?: number;
  area?: number;
  total_area?: number;
  condo_value?: number;
  iptu_value?: number;
}
```

### Configuração do Portal (`PortalConfigData`)

```typescript
{
  id: string;
  tenant_id: string;
  portal_id: string;
  enabled: boolean;
  auth_data?: Record<string, any>;  // Credenciais (API key, access token, etc.)
  xml_url?: string;                 // URL do feed XML (para portais que suportam)
  webhook_url?: string;             // URL do webhook (para portais que usam webhook)
}
```

## Portais Implementados

### ZapVivaRealPortal (`zap_viva`)

- **Método:** Feed XML
- **Credenciais:** Nenhuma específica � requer apenas tenant válido
- **Como funciona:** Marca o imóvel com `publish_to_portals = 1`. O feed XML é gerado automaticamente em `GET /api/portals/feed/{tenantId}.xml`. O Zap/VivaReal consume o feed periodicamente.
- **Limitação atual:** O feed XML endpoint precisa ser implementado nas routes de portais (ver `routes/portals.ts`).

### OlxPortal (`olx`)

- **Método:** API Key ou Feed XML
- **Credenciais:** `auth_data.api_key` OU `xml_url` configurado
- **Como funciona:**
  - Se `xml_url` está configurado: marca imóvel para publicação no feed
  - Se `api_key` está configurado: simula chamada de API (implementação real necessária para produção)
- **Limitação atual:** A chamada real à API OLX está simulada � precisa implementar com credenciais reais da OLX.

### FacebookMarketplacePortal (`facebook_marketplace`)

- **Método:** Facebook Graph API v18.0
- **Credenciais:** `auth_data.access_token` + `auth_data.page_id`
- **Como funciona:** POST em `/{page-id}/listings` na Graph API
- **Retry:** Usa `fetchWithRetry` com backoff exponencial (3 tentativas)
- **Limitação atual:** Requer Page Access Token com permissão `pages_manage_listings`. Token expira e precisa de refresh.

## Helpers Disponíveis

A classe abstrata `BasePortal` fornece helpers:

| Helper | Uso |
|--------|-----|
| `createPublicationRecord(...)` | Cria registro em `property_publications` |
| `updatePublicationRecord(...)` | Atualiza registro existente |
| `fetchWithRetry(url, options, maxRetries)` | HTTP request com retry exponencial (3x por padrão) |

## Como Adicionar um Novo Portal

1. Crie um novo arquivo: `backend/src/services/portals/novo-portal.ts`

```typescript
import { BasePortal, PropertyData, PortalConfigData } from './base-portal';
import { Bindings } from '../../bindings';
import { PortalPublishResponse, PublicationStatus } from '../../../../shared/types';

export class NovoPortal extends BasePortal {
  getPortalId(): string {
    return 'novo_portal';  // ID único, snake_case
  }

  getPortalName(): string {
    return 'Novo Portal';  // Nome amigável
  }

  async publish(property: PropertyData, config: PortalConfigData, env: Bindings): Promise<PortalPublishResponse> {
    const publication = await this.createPublicationRecord(
      property.id, property.tenant_id, this.getPortalId(),
      PublicationStatus.PUBLISHING, env,
    );

    try {
      // 1. Validar credenciais
      // 2. Chamar API do portal
      // 3. Extrair external_id e external_url
      // 4. Atualizar publication record
      // 5. Retornar PortalPublishResponse
    } catch (error) {
      await this.updatePublicationRecord(publication.id, env, {
        status: PublicationStatus.FAILED,
        errorMessage: (error as Error).message,
      });
      return { success: false, publication_id: publication.id, status: PublicationStatus.FAILED, error: (error as Error).message };
    }
  }

  async remove(externalId: string, config: PortalConfigData, env: Bindings): Promise<{ success: boolean; error?: string }> {
    // Implementar remoção
  }

  async update(externalId: string, property: PropertyData, config: PortalConfigData, env: Bindings): Promise<PortalPublishResponse> {
    // Implementar atualização (geralmente delega para publish)
  }

  async validateCredentials(config: PortalConfigData, env: Bindings): Promise<boolean> {
    // Validar credenciais
  }
}
```

2. Registre o adapter em `index.ts`:

```typescript
import { NovoPortal } from './novo-portal';
PortalRegistry.register(new NovoPortal());
```

3. Adicione o portal ao enum `Platform` em `shared/types/index.ts`
4. Adicione as credenciais esperadas no frontend (componente de configuração de portal)

## Tabelas Envolvidas

| Tabela | Uso |
|--------|-----|
| `portal_configs` | Configurações de credenciais por tenant |
| `properties` | Dados dos imóveis |
| `property_publications` | Histórico de publicações (status, external_id, erros) |

## Status de Implementação

| Portal | Publish | Remove | Update | Validate | API Real |
|--------|---------|--------|--------|----------|----------|
| Zap/VivaReal | � | � | � | � | N/A (feed XML) |
| OLX | � | � | � | � | �� Simulada |
| Facebook Marketplace | � | � | � | � | � (Graph API) |

## Notas

- **Não há chamadas de API real ao OLX** � a implementação atual simula a publicação. Para produção, é necessário integrar com a API oficial da OLX Imóveis.
- **Feed XML do Zap/VivaReal** � o endpoint `GET /api/portals/feed/{tenantId}.xml` precisa existir para que o feed seja consumido pelos portais.
- **Token do Facebook expira** � implementar refresh de token é necessário para operação contínua.
