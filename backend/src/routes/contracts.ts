import { Hono } from 'hono';
import { Bindings, Variables } from '../bindings';
import { authMiddleware } from '../middleware/auth';
import { generateContractHtml } from '../services/contractService';

const contracts = new Hono<{ Bindings: Bindings; Variables: Variables }>();

contracts.use('/*', authMiddleware);

/**
 * POST /api/contracts/generate
 * Body: { property_id, client_id, type }
 */
contracts.post('/generate', async (c) => {
  const user = c.get('user');
  const tenantId = user.tenantId;
  const { property_id, client_id, type } = await c.req.json();

  if (!property_id || !client_id || !type) {
    return c.json({ error: 'Missing required fields' }, 400);
  }

  const validTypes = ['sale', 'rent'];
  if (!validTypes.includes(type)) {
    return c.json({ error: 'Invalid contract type' }, 400);
  }

  try {
    const contractId = crypto.randomUUID();
    const html = await generateContractHtml(
      c.env,
      contractId,
      tenantId,
      property_id,
      client_id,
      type as 'sale' | 'rent',
    );

    return c.json({
      success: true,
      contract_id: contractId,
      preview_html: html,
      status: 'Draft',
      action_url: `https://app.oinbox.com.br/contracts/${contractId}/sign`, // Mock URL
    });
  } catch (e: any) {
    console.error('Contract Generation Error:', e);
    return c.json({ error: e.message || 'Failed to generate contract' }, 500);
  }
});

export default contracts;
