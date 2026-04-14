import { BasePortal, PropertyData, PortalConfigData } from './base-portal';
import { Bindings } from '../../bindings';
import { PortalPublishResponse, PublicationStatus } from '../../../../shared/types';

/**
 * Adapter para Facebook Marketplace
 * Usa a Graph API do Facebook para criar listagens de imóveis
 */
export class FacebookMarketplacePortal extends BasePortal {
  private readonly FB_API_BASE = 'https://graph.facebook.com/v18.0';

  getPortalId(): string {
    return 'facebook_marketplace';
  }

  getPortalName(): string {
    return 'Facebook Marketplace';
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
      const authData = config.auth_data;
      if (!authData?.access_token || !authData?.page_id) {
        throw new Error(
          'Facebook Marketplace requer Page ID e Access Token. Configure nas integrações.',
        );
      }

      const accessToken = authData.access_token;
      const pageId = authData.page_id;

      // Preparar dados para Facebook Marketplace
      // Facebook usa o formato de Product Catalog
      const listingData = {
        name: property.title,
        description: property.description || property.title,
        price: property.price.toString(),
        currency: 'BRL',
        category: 'real_estate',
        property_type: this.mapPropertyType(property),
        listing_type: property.listing_type === 'sale' ? 'for_sale' : 'for_rent',
        location: property.location,
        images: property.images,
        // Campos adicionais para imóveis
        bedrooms: property.bedrooms?.toString(),
        bathrooms: property.bathrooms?.toString(),
        area: property.area?.toString(),
        features: property.features.join(', '),
      };

      // Criar listagem no Facebook Marketplace via Graph API
      // POST /{page-id}/listings
      const response = await this.fetchWithRetry(`${this.FB_API_BASE}/${pageId}/listings`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(listingData),
      });

      const result: any = await response.json();
      const externalId = result.id;
      const externalUrl = `https://www.facebook.com/marketplace/item/${externalId}`;

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
      const authData = config.auth_data;
      if (!authData?.access_token) {
        throw new Error('Access Token não configurado');
      }

      // Deletar listagem do Facebook
      // DELETE /{listing-id}
      await this.fetchWithRetry(`${this.FB_API_BASE}/${externalId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${authData.access_token}`,
        },
      });

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
    const publication = await this.createPublicationRecord(
      property.id,
      property.tenant_id,
      this.getPortalId(),
      PublicationStatus.PUBLISHING,
      env,
    );

    try {
      const authData = config.auth_data;
      if (!authData?.access_token) {
        throw new Error('Access Token não configurado');
      }

      const listingData = {
        name: property.title,
        description: property.description || property.title,
        price: property.price.toString(),
        currency: 'BRL',
        location: property.location,
        images: property.images,
        bedrooms: property.bedrooms?.toString(),
        bathrooms: property.bathrooms?.toString(),
        area: property.area?.toString(),
      };

      // Atualizar listagem existente
      // POST /{listing-id}
      await this.fetchWithRetry(`${this.FB_API_BASE}/${externalId}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${authData.access_token}`,
        },
        body: JSON.stringify(listingData),
      });

      const externalUrl = `https://www.facebook.com/marketplace/item/${externalId}`;

      await this.updatePublicationRecord(publication.id, env, {
        status: PublicationStatus.PUBLISHED,
        externalUrl,
      });

      return {
        success: true,
        publication_id: publication.id,
        status: PublicationStatus.PUBLISHED,
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

  async validateCredentials(config: PortalConfigData, env: Bindings): Promise<boolean> {
    const authData = config.auth_data;
    if (!authData?.access_token || !authData?.page_id) {
      return false;
    }

    try {
      // Validar token verificando a página
      const response = await this.fetchWithRetry(
        `${this.FB_API_BASE}/${authData.page_id}?access_token=${authData.access_token}`,
        {
          method: 'GET',
        },
      );

      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Mapear tipo de propriedade para o formato do Facebook
   */
  private mapPropertyType(property: PropertyData): string {
    const typeMap: Record<string, string> = {
      Apartamento: 'apartment',
      Casa: 'house',
      Terreno: 'lot',
      Comercial: 'commercial',
      Cobertura: 'penthouse',
      Studio: 'studio',
    };

    // Tentar extrair tipo do título ou usar padrão
    for (const [key, value] of Object.entries(typeMap)) {
      if (property.title.toLowerCase().includes(key.toLowerCase())) {
        return value;
      }
    }

    return 'other';
  }
}
