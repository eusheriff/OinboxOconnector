import { Bindings } from '../bindings';

export const apiService = {
  validatePortalIntegration: async (env: Bindings, portal: string, tenantId: string) => {
    // Check if tenant exists
    const tenant = await env.DB.prepare('SELECT id FROM tenants WHERE id = ?')
      .bind(tenantId)
      .first();
    // In a real scenario, we would also check credentials for the specific portal
    return !!tenant;
  },
  generateXMLFeed: async (env: Bindings, portal: string, tenantId: string, xmlUrls: string[]) => {
    // Logic to save these XML URLs preference could be added here if we had a table for it
    return `https://api.oinbox.oconnector.tech/api/portals/feed/${tenantId}.xml`;
  },
  registerWebhook: async (env: Bindings, portal: string, tenantId: string, webhookUrl: string) => {
    // Save webhook URL (mocking persistence for now as we don't have a webhooks table for portals specifically)
    // Could save to platform_settings or a new table
    return 'webhook_' + crypto.randomUUID();
  },
  publishListing: async (env: Bindings, portal: string, tenantId: string, listingId: string) => {
    await env.DB.prepare(
      'UPDATE properties SET publish_to_portals = 1, portal_url = ? WHERE id = ? AND tenant_id = ?',
    )
      .bind(`https://portal-mock.com/${portal}/${listingId}`, listingId, tenantId)
      .run();
    return { status: 'published' };
  },
  removeListing: async (env: Bindings, portal: string, tenantId: string, listingId: string) => {
    await env.DB.prepare(
      'UPDATE properties SET publish_to_portals = 0, portal_url = NULL WHERE id = ? AND tenant_id = ?',
    )
      .bind(listingId, tenantId)
      .run();
    return { status: 'removed' };
  },
  syncListings: async (env: Bindings, portal: string, tenantId: string) => {
    // Count published properties
    const result = await env.DB.prepare(
      'SELECT COUNT(*) as count FROM properties WHERE tenant_id = ? AND publish_to_portals = 1',
    )
      .bind(tenantId)
      .first<{ count: number }>();
    return { synced: result?.count || 0, failed: 0 };
  },
};
