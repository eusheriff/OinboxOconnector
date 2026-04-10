import { Hono } from 'hono';
import { Bindings, Variables } from '../bindings';
import { authMiddleware } from '../middleware/auth';
import { calculateCommission, getAgentDashboard } from '../services/financeService';

const finance = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// finance.use('/*', authMiddleware); // Auth global em index.ts

/**
 * GET /api/finance/dashboard
 * Return commission summary and history for the logged in agent.
 */
finance.get('/dashboard', async (c) => {
  const user = c.get('user');
  const tenantId = user.tenantId;
  const agentId = user.sub; // The user ID is the agent ID

  try {
    const dashboard = await getAgentDashboard(c.env, tenantId, agentId);
    return c.json(dashboard);
  } catch (e: any) {
    console.error('Finance Dashboard Error:', e);
    return c.json({ error: 'Failed to load dashboard' }, 500);
  }
});

/**
 * POST /api/finance/calculate
 * Calculate commission for a specific contract.
 * Body: { contract_id }
 */
finance.post('/calculate', async (c) => {
  const user = c.get('user');
  const tenantId = user.tenantId;
  const { contract_id, agent_id } = await c.req.json();

  if (!contract_id) {
    return c.json({ error: 'contract_id is required' }, 400);
  }

  // Allow passing agent_id (Admin override) or default to current user (if agent is closing deal)
  const targetAgentId = agent_id || user.sub;

  try {
    const result = await calculateCommission(c.env, tenantId, contract_id, targetAgentId);
    return c.json({ success: true, commission: result });
  } catch (e: any) {
    return c.json({ error: e.message || 'Failed to calculate commission' }, 500);
  }
});

export default finance;
