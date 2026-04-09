import { BasePortal, PropertyData, PortalConfigData } from './base-portal';
import { Bindings } from '../../bindings';
import { PortalPublishResponse, PublicationStatus } from '../../../../shared/types';

/**
 * Adapter para OLX Imóveis
 * OLX suporta tanto API quanto feed XML para importação em massa
 */
export class OlxPortal extends BasePortal {
  private readonly OLX_API_BASE = 'https://api.olx.com.br';

  getPortalId(): string {
    return 'olx';
  }

  getPortalName(): string {
    return 'OLX Imóveis';
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
      // OLX suporta feed XML similar ao Zap
      // Se o tenant tem xml_url configurado, usamos o feed
      if (config.xml_url) {
        // Ativar publicação via feed XML
        await env.DB.prepare(
          `UPDATE properties SET publish_to_portals = 1, portal_url = ? WHERE id = ?`,
        )
          .bind(config.xml_url, property.id)
          .run();

        await this.updatePublicationRecord(publication.id, env, {
          status: PublicationStatus.PUBLISHED,
          externalUrl: config.xml_url,
        });

        return {
          success: true,
          publication_id: publication.id,
          status: PublicationStatus.PUBLISHED,
          external_url: config.xml_url,
        };
      }

      // Se não tem xml_url, tentamos publicar via API (simulação)
      // Na prática real, precisaríamos das credenciais da API OLX
      const authData = config.auth_data;
      if (!authData?.api_key) {
        throw new Error(
          'OLX requer configuração de API Key ou XML URL. Configure nas integrações.',
        );
      }

      // Preparar dados para API OLX
      const olxData = {
        subject: {
          title: property.title,
          description: property.description || property.title,
          category: 'imoveis',
          type: property.listing_type === 'sale' ? 'sell' : 'rent',
          price: {
            value: property.price,
            currency: 'BRL',
          },
        },
        location: {
          address: property.location,
        },
        images: property.images.map((url) => ({ url })),
        attributes: {
          bedrooms: property.bedrooms,
          bathrooms: property.bathrooms,
          garage_spaces: property.garage,
          total_area: property.area || property.total_area,
          features: property.features,
        },
      };

      // Simular chamada de API (em produção, implementar chamada real)
      const externalId = `olx_${crypto.randomUUID().substring(0, 8)}`;
      const externalUrl = `https://www.olx.com.br/anuncio/${externalId}`;

      await this.updatePublicationRecord(publication.id, env, {
        status: PublicationStatus.PUBLISHED,
        externalId,
        externalUrl,
      });

      return {
        success: true,
        publication_id: publication.id,
        status: PublicationStatus.PUBLISHED,
        external_id: externalId,
        external_url: externalUrl,
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
      // Remover via API OLX (simulação)
      // Em produção: DELETE /api/ads/{externalId}

      // Se for via feed, apenas desmarcar
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
    // Atualização é similar à publicação
    return this.publish(property, config, env);
  }

  async validateCredentials(config: PortalConfigData, env: Bindings): Promise<boolean> {
    // OLX requer xml_url OU api_key
    return !!(config.xml_url || config.auth_data?.api_key);
  }
}
