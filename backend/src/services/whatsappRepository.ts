import { D1Database } from '@cloudflare/workers-types';

export interface WhatsAppMessage {
  id: string;
  tenant_id: string;
  remote_jid: string;
  message_id?: string;
  content: string;
  media_url?: string;
  direction: 'inbound' | 'outbound';
  status: string;
  created_at: string;
}

export class WhatsAppRepository {
  constructor(private db: D1Database) {}

  async findTenantByUserId(userId: string): Promise<string | null> {
    const user = await this.db
      .prepare('SELECT tenant_id FROM users WHERE id = ?')
      .bind(userId)
      .first<{ tenant_id: string }>();
    return user ? user.tenant_id : null;
  }

  async findLeadByPhone(
    tenantId: string,
    phone: string,
  ): Promise<{ id: string; assigned_to: string } | null> {
    return await this.db
      .prepare(
        "SELECT id, assigned_to FROM leads WHERE tenant_id = ? AND phone LIKE '%' || ? || '%'",
      )
      .bind(tenantId, phone)
      .first<{ id: string; assigned_to: string }>();
  }

  async saveMessage(msg: WhatsAppMessage): Promise<void> {
    await this.db
      .prepare(
        `INSERT INTO whatsapp_messages (id, tenant_id, remote_jid, message_id, content, media_url, direction, status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        msg.id,
        msg.tenant_id,
        msg.remote_jid,
        msg.message_id || null,
        msg.content,
        msg.media_url || null,
        msg.direction,
        msg.status,
        msg.created_at,
      )
      .run();
  }

  async getMessagesHistory(tenantId: string, remoteJid: string, limit: number = 10) {
    const results = await this.db
      .prepare(
        `SELECT direction, content FROM whatsapp_messages 
         WHERE tenant_id = ? AND remote_jid = ? 
         ORDER BY created_at DESC LIMIT ?`,
      )
      .bind(tenantId, remoteJid, limit)
      .all<{ direction: string; content: string }>();

    return results.results.reverse().map((m) => ({
      role: m.direction === 'inbound' ? 'user' : 'assistant',
      content: m.content,
    }));
  }

  async getRawMessages(
    tenantId: string,
    remoteJid?: string,
    limit: number = 50,
  ): Promise<WhatsAppMessage[]> {
    let query = 'SELECT * FROM whatsapp_messages WHERE tenant_id = ?';
    const params: (string | number)[] = [tenantId];

    if (remoteJid) {
      query += ' AND remote_jid = ?';
      params.push(remoteJid);
    }

    query += ' ORDER BY created_at DESC LIMIT ?';
    params.push(limit);

    const result = await this.db
      .prepare(query)
      .bind(...params)
      .all<WhatsAppMessage>();

    return result.results;
  }

  async getKnowledgeBase(tenantId: string): Promise<string> {
    const kbResults = await this.db
      .prepare('SELECT content FROM knowledge_base WHERE tenant_id = ?')
      .bind(tenantId)
      .all<{ content: string }>();
    return kbResults.results.map((r) => r.content).join('\n');
  }
}
