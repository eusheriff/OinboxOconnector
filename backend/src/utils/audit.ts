import { D1Database } from '@cloudflare/workers-types';

export async function logAction(db: D1Database, userId: string, action: string, details: any, ipAddress: string | null = null) {
    const id = crypto.randomUUID();
    await db.prepare(
        "INSERT INTO audit_logs (id, user_id, action, details, ip_address) VALUES (?, ?, ?, ?, ?)"
    ).bind(id, userId, action, JSON.stringify(details), ipAddress).run();
}
