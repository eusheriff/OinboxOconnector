import { Bindings } from '../../bindings';
import {
  PropertyPublication,
  PublicationStatus,
  PortalPublishResponse,
} from '../../../../shared/types';

/**
 * Dados do imóvel para publicação
 */
export interface PropertyData {
  id: string;
  tenant_id: string;
  title: string;
  description?: string;
  price: number;
  location: string;
  listing_type: 'sale' | 'rent';
  images: string[];
  features: string[];
  bedrooms?: number;
  bathrooms?: number;
  suites?: number;
  garage?: number;
  area?: number;
  total_area?: number;
  condo_value?: number;
  iptu_value?: number;
}

/**
 * Configuração do portal no banco de dados
 */
export interface PortalConfigData {
  id: string;
  tenant_id: string;
  portal_id: string;
  enabled: boolean;
  auth_data?: Record<string, any>;
  xml_url?: string;
  webhook_url?: string;
}

/**
 * Interface base que todos os adaptadores de portais devem implementar
 */
export interface BasePortalAdapter {
  /**
   * ID único do portal (ex: 'zap', 'olx', 'facebook')
   */
  getPortalId(): string;

  /**
   * Nome amigável do portal
   */
  getPortalName(): string;

  /**
   * Publicar um imóvel no portal
   * @param property Dados do imóvel
   * @param config Configuração do portal (com credenciais)
   * @param env Environment do Cloudflare
   */
  publish(
    property: PropertyData,
    config: PortalConfigData,
    env: Bindings,
  ): Promise<PortalPublishResponse>;

  /**
   * Remover um imóvel do portal
   */
  remove(
    externalId: string,
    config: PortalConfigData,
    env: Bindings,
  ): Promise<{ success: boolean; error?: string }>;

  /**
   * Atualizar um imóvel já publicado
   */
  update(
    externalId: string,
    property: PropertyData,
    config: PortalConfigData,
    env: Bindings,
  ): Promise<PortalPublishResponse>;

  /**
   * Validar se as credenciais estão corretas
   */
  validateCredentials(config: PortalConfigData, env: Bindings): Promise<boolean>;
}

/**
 * Classe abstrata que fornece implementação base comum
 */
export abstract class BasePortal implements BasePortalAdapter {
  abstract getPortalId(): string;
  abstract getPortalName(): string;

  abstract publish(
    property: PropertyData,
    config: PortalConfigData,
    env: Bindings,
  ): Promise<PortalPublishResponse>;

  abstract remove(
    externalId: string,
    config: PortalConfigData,
    env: Bindings,
  ): Promise<{ success: boolean; error?: string }>;

  abstract update(
    externalId: string,
    property: PropertyData,
    config: PortalConfigData,
    env: Bindings,
  ): Promise<PortalPublishResponse>;

  abstract validateCredentials(config: PortalConfigData, env: Bindings): Promise<boolean>;

  /**
   * Helper para criar registro de publicação no banco
   */
  protected async createPublicationRecord(
    propertyId: string,
    tenantId: string,
    portalId: string,
    status: PublicationStatus,
    env: Bindings,
    options?: {
      externalId?: string;
      externalUrl?: string;
      errorMessage?: string;
    },
  ): Promise<PropertyPublication> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    await env.DB.prepare(
      `INSERT INTO property_publications (
        id, property_id, tenant_id, portal_id, status, 
        external_id, external_url, error_message, 
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
      .bind(
        id,
        propertyId,
        tenantId,
        portalId,
        status,
        options?.externalId || null,
        options?.externalUrl || null,
        options?.errorMessage || null,
        now,
        now,
      )
      .run();

    return {
      id,
      property_id: propertyId,
      tenant_id: tenantId,
      portal_id: portalId,
      status,
      external_id: options?.externalId,
      external_url: options?.externalUrl,
      error_message: options?.errorMessage,
      created_at: now,
      updated_at: now,
    };
  }

  /**
   * Helper para atualizar registro de publicação
   */
  protected async updatePublicationRecord(
    publicationId: string,
    env: Bindings,
    options: {
      status?: PublicationStatus;
      externalId?: string;
      externalUrl?: string;
      errorMessage?: string;
    },
  ): Promise<void> {
    const now = new Date().toISOString();
    const updates: string[] = ['updated_at = ?'];
    const values: any[] = [now];

    if (options.status !== undefined) {
      updates.push('status = ?');
      values.push(options.status);
    }
    if (options.externalId !== undefined) {
      updates.push('external_id = ?');
      values.push(options.externalId);
    }
    if (options.externalUrl !== undefined) {
      updates.push('external_url = ?');
      values.push(options.externalUrl);
    }
    if (options.errorMessage !== undefined) {
      updates.push('error_message = ?');
      values.push(options.errorMessage);
    }

    values.push(publicationId);

    await env.DB.prepare(`UPDATE property_publications SET ${updates.join(', ')} WHERE id = ?`)
      .bind(...values)
      .run();
  }

  /**
   * Helper para fazer request HTTP com tratamento de erro
   */
  protected async fetchWithRetry(
    url: string,
    options: RequestInit,
    maxRetries = 3,
  ): Promise<Response> {
    let lastError: Error | null = null;

    for (let i = 0; i < maxRetries; i++) {
      try {
        const response = await fetch(url, {
          ...options,
          headers: {
            'Content-Type': 'application/json',
            ...options.headers,
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        return response;
      } catch (error) {
        lastError = error as Error;
        // Espera exponencial: 1s, 2s, 4s
        if (i < maxRetries - 1) {
          await new Promise((resolve) => setTimeout(resolve, Math.pow(2, i) * 1000));
        }
      }
    }

    throw lastError || new Error('Failed after retries');
  }
}
