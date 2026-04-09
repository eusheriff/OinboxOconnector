import { Bindings } from '../../bindings';
import { BasePortal } from './base-portal';
import { ZapVivaRealPortal } from './zap-vivareal';
import { OlxPortal } from './olx';
import { FacebookMarketplacePortal } from './facebook';

/**
 * Registry de todos os portais disponíveis
 */
export class PortalRegistry {
  private static adapters: Map<string, BasePortal> = new Map();

  /**
   * Registrar um novo adapter
   */
  static register(adapter: BasePortal): void {
    this.adapters.set(adapter.getPortalId(), adapter);
  }

  /**
   * Obter adapter por ID
   */
  static get(portalId: string): BasePortal | undefined {
    return this.adapters.get(portalId);
  }

  /**
   * Obter todos os adapters registrados
   */
  static getAll(): BasePortal[] {
    return Array.from(this.adapters.values());
  }

  /**
   * Obter informações de todos os portais disponíveis
   */
  static getAvailablePortals(): Array<{
    id: string;
    name: string;
    supported: boolean;
  }> {
    return this.getAll().map((adapter) => ({
      id: adapter.getPortalId(),
      name: adapter.getPortalName(),
      supported: true,
    }));
  }

  /**
   * Publicar em múltiplos portais
   */
  static async publishToPortals(
    propertyId: string,
    tenantId: string,
    portalIds: string[],
    env: Bindings,
  ): Promise<{
    total: number;
    successful: number;
    failed: number;
    results: Array<{
      portalId: string;
      success: boolean;
      error?: string;
    }>;
  }> {
    const results: Array<{ portalId: string; success: boolean; error?: string }> = [];
    let successful = 0;
    let failed = 0;

    for (const portalId of portalIds) {
      const adapter = this.get(portalId);
      if (!adapter) {
        results.push({
          portalId,
          success: false,
          error: `Portal "${portalId}" não está registrado`,
        });
        failed++;
        continue;
      }

      try {
        // Buscar configuração do portal
        const config = await env.DB.prepare(
          `SELECT * FROM portal_configs WHERE tenant_id = ? AND portal_id = ?`,
        )
          .bind(tenantId, portalId)
          .first<any>();

        if (!config) {
          results.push({
            portalId,
            success: false,
            error: `Portal "${portalId}" não está configurado para este tenant`,
          });
          failed++;
          continue;
        }

        // Buscar dados do imóvel
        const property = await env.DB.prepare(
          `SELECT * FROM properties WHERE id = ? AND tenant_id = ?`,
        )
          .bind(propertyId, tenantId)
          .first<any>();

        if (!property) {
          results.push({
            portalId,
            success: false,
            error: `Imóvel "${propertyId}" não encontrado`,
          });
          failed++;
          continue;
        }

        // Parse das features se for string JSON
        const propertyData = {
          ...property,
          features: property.features ? JSON.parse(property.features) : [],
          images: property.image_url ? [property.image_url] : [],
        };

        // Publicar
        const result = await adapter.publish(propertyData, config, env);

        if (result.success) {
          successful++;
        } else {
          failed++;
        }

        results.push({
          portalId,
          success: result.success,
          error: result.error,
        });
      } catch (error) {
        failed++;
        results.push({
          portalId,
          success: false,
          error: (error as Error).message,
        });
      }
    }

    return {
      total: portalIds.length,
      successful,
      failed,
      results,
    };
  }
}

// Registrar todos os portais disponíveis
PortalRegistry.register(new ZapVivaRealPortal());
PortalRegistry.register(new OlxPortal());
PortalRegistry.register(new FacebookMarketplacePortal());
