import { D1Database } from '@cloudflare/workers-types';

interface LogActionParams {
  db: D1Database;
  userId: string;
  action: string;
  details: Record<string, unknown> | null;
  ipAddress?: string | null;
}

export async function logAction({
  db,
  userId,
  action,
  details,
  ipAddress = null,
}: LogActionParams) {
  const id = crypto.randomUUID();
  await db
    .prepare(
      'INSERT INTO audit_logs (id, user_id, action, details, ip_address) VALUES (?, ?, ?, ?, ?)',
    )
    .bind(id, userId, action, JSON.stringify(details), ipAddress)
    .run();
}
