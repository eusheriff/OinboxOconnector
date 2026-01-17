import { Hono } from 'hono';
import { Bindings, Variables } from '../types';
import { authMiddleware } from '../middleware/auth';
import { generateSocialKit } from '../services/marketingService';

const marketing = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// Auth required
marketing.use('/*', authMiddleware);

/**
 * POST /api/marketing/generate
 * Generate a Social Media Kit for a property.
 * Body: { property_id: string, tone?: 'professional' | 'fun' | 'urgent' }
 */
marketing.post('/generate', async (c) => {
    const user = c.get('user');
    const tenantId = user.tenantId;
    const { property_id, tone = 'professional' } = await c.req.json();

    if (!property_id) {
        return c.json({ error: 'property_id is required' }, 400);
    }

    // Fetch Property
    const property = await c.env.DB.prepare(
        'SELECT * FROM properties WHERE id = ? AND tenant_id = ?'
    )
    .bind(property_id, tenantId)
    .first<any>();

    if (!property) {
        return c.json({ error: 'Property not found' }, 404);
    }

    // Parse features if stored as JSON string
    if (typeof property.features === 'string') {
        try {
            property.features = JSON.parse(property.features);
        } catch {
            property.features = [];
        }
    }

    try {
        const kit = await generateSocialKit(c.env, property, tone);
        return c.json(kit);
    } catch (error: any) {
        return c.json({ error: 'Failed to generate marketing kit', details: error.message }, 500);
    }
});

export default marketing;
