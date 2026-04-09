import { BasePortal, PropertyData, PortalConfigData } from './base-portal';
import { Bindings } from '../../bindings';
import { PortalPublishResponse, PublicationStatus } from '../../../../shared/types';

/**
 * Adapter para Zap Imóveis / VivaReal
 * Estes portais usam feed XML para sincronização
 */
export class ZapVivaRealPortal extends BasePortal {
  getPortalId(): string {
    return 'zap_viva';
  }

  getPortalName(): string {
    return 'Zap Imóveis / VivaReal';
  }

  async publish(
    property: PropertyData,
    config: PortalConfigData,
    env: Bindings,
  ): Promise<PortalPublishResponse> {
    const publication = await this.createPublicationRecord(
      property.id,
      property.tenant_id,
      this.getPortalId(),
      PublicationStatus.PUBLISHING,
      env,
    );

    try {
      // Zap/VivaReal usa feed XML, então a publicação é feita via atualização do feed
      // O feed é gerado automaticamente quando o imóvel é marcado com publish_to_portals = 1

      // Atualizar o imóvel para publicar no feed XML
      await env.DB.prepare(
        `UPDATE properties SET publish_to_portals = 1 WHERE id = ?`,
      )
        .bind(property.id)
        .run();

      // O feed XML estará disponível em: /api/portals/feed/{tenantId}.xml
      const baseUrl = 'https://api.oinbox.oconnector.tech';
      const feedUrl = `${baseUrl}/api/portals/feed/${property.tenant_id}.xml`;

      await this.updatePublicationRecord(publication.id, env, {
        status: PublicationStatus.PUBLISHED,
        externalUrl: feedUrl,
      });

      return {
        success: true,
        publication_id: publication.id,
        status: PublicationStatus.PUBLISHED,
        external_url: feedUrl,
      };
    } catch (error) {
      const errorMessage = (error as Error).message;

      await this.updatePublicationRecord(publication.id, env, {
        status: PublicationStatus.FAILED,
        errorMessage,
      });

      return {
        success: false,
        publication_id: publication.id,
        status: PublicationStatus.FAILED,
        error: errorMessage,
      };
    }
  }

  async remove(
    externalId: string,
    config: PortalConfigData,
    env: Bindings,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Para remover do Zap/VivaReal, marcamos o imóvel como não publicar
      await env.DB.prepare(
        `UPDATE properties SET publish_to_portals = 0 WHERE id = ?`,
      )
        .bind(externalId)
        .run();

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }

  async update(
    externalId: string,
    property: PropertyData,
    config: PortalConfigData,
    env: Bindings,
  ): Promise<PortalPublishResponse> {
    // Atualização é automática via feed XML
    return this.publish(property, config, env);
  }

  async validateCredentials(config: PortalConfigData, env: Bindings): Promise<boolean> {
    // Zap/VivaReal não requer credenciais específicas, apenas o tenant precisa existir
    const tenant = await env.DB.prepare(
      `SELECT id FROM tenants WHERE id = ?`,
    )
      .bind(config.tenant_id)
      .first();

    return !!tenant;
  }
}
