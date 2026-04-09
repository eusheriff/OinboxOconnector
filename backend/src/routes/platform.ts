import { Hono } from 'hono';
import { Bindings, Variables } from '../bindings';

const platform = new Hono<{ Bindings: Bindings; Variables: Variables }>();

platform.get('/broadcasts', async (c) => {
  const logger = c.get('logger');
  try {
    // Return empty array if table doesn't exist yet or error occurs, to prevent crash
    const { results } = await c.env.DB.prepare(
      'SELECT * FROM broadcasts ORDER BY created_at DESC',
    ).all();
    return c.json(results || []);
  } catch (error) {
    await logger?.error('Error fetching broadcasts', { error });
    // Return empty array on error to be safe
    return c.json([]);
  }
});

export default platform;
