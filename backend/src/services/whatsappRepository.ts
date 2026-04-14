import { D1Database } from '@cloudflare/workers-types';

export interface OmniMessagePayload {
  id: string;
  tenant_id: string;
  remote_jid: string;
  message_id?: string;
  content: string;
  media_url?: string | null;
  direction: 'inbound' | 'outbound';
  status: string;
  message_type?: string;
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

  // Obter ou criar Conversation Omni
  async getOrCreateOmniConversation(
    tenantId: string,
    remoteJid: string,
    leadId?: string,
  ): Promise<{ id: string; status: string }> {
    // 1. Encontra/Cria o Channel do WhatsApp
    const channelName = 'WhatsApp Business';
    let channelId = await this.db
      .prepare("SELECT id FROM channels WHERE tenant_id = ? AND provider = 'whatsapp'")
      .bind(tenantId)
      .first<{ id: string }>();

    if (!channelId) {
      const newChannelId = crypto.randomUUID();
      await this.db
        .prepare(
          "INSERT INTO channels (id, tenant_id, provider, name) VALUES (?, ?, 'whatsapp', ?)",
        )
        .bind(newChannelId, tenantId, channelName)
        .run();
      channelId = { id: newChannelId };
    }

    const contactId = leadId || remoteJid; // Fallback para remote_jid caso lead não exista

    // 2. Busca conversa ativa
    let conversation = await this.db
      .prepare(
        "SELECT id, status FROM conversations WHERE tenant_id = ? AND channel_id = ? AND contact_id = ? AND status != 'resolved'",
      )
      .bind(tenantId, channelId.id, contactId)
      .first<{ id: string; status: string }>();

    if (!conversation) {
      const newConvId = crypto.randomUUID();
      await this.db
        .prepare(
          "INSERT INTO conversations (id, tenant_id, channel_id, contact_id, status) VALUES (?, ?, ?, ?, 'bot')",
        )
        .bind(newConvId, tenantId, channelId.id, contactId)
        .run();
      conversation = { id: newConvId, status: 'bot' };
    } else {
      // Atualiza last action
      await this.db
        .prepare('UPDATE conversations SET last_message_at = CURRENT_TIMESTAMP WHERE id = ?')
        .bind(conversation.id)
        .run();
    }

    return conversation;
  }

  async saveMessage(msg: OmniMessagePayload): Promise<void> {
    // Extrai Lead ID se existir
    const phoneClean = msg.remote_jid.replace('@s.whatsapp.net', '');
    const lead = await this.findLeadByPhone(msg.tenant_id, phoneClean);
    const conversation = await this.getOrCreateOmniConversation(
      msg.tenant_id,
      msg.remote_jid,
      lead?.id,
    );

    const senderType = msg.direction === 'inbound' ? 'contact' : 'bot'; // Por padrão assumimos bot/agent se outbound

    await this.db
      .prepare(
        `INSERT INTO omnichannel_messages (id, tenant_id, conversation_id, sender_type, sender_id, content, message_type, media_url, external_id, status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        msg.id,
        msg.tenant_id,
        conversation.id,
        senderType,
        senderType === 'contact' ? lead?.id || msg.remote_jid : null,
        msg.content,
        msg.message_type || 'text',
        msg.media_url || null,
        msg.message_id || null,
        msg.status,
        msg.created_at,
      )
      .run();
  }

  async getMessagesHistory(tenantId: string, remoteJid: string, limit: number = 10) {
    const phoneClean = remoteJid.replace('@s.whatsapp.net', '');
    const lead = await this.findLeadByPhone(tenantId, phoneClean);
    const contactId = lead?.id || remoteJid;

    // Acha TODAS as conversas desse contact relativas a esse tenant
    const results = await this.db
      .prepare(
        `SELECT m.sender_type, m.content 
         FROM omnichannel_messages m
         JOIN conversations c ON m.conversation_id = c.id
         WHERE m.tenant_id = ? AND c.contact_id = ?
         ORDER BY m.created_at DESC LIMIT ?`,
      )
      .bind(tenantId, contactId, limit)
      .all<{ sender_type: string; content: string }>();

    return results.results.reverse().map((m) => ({
      role: m.sender_type === 'contact' ? 'user' : 'assistant',
      content: m.content,
    }));
  }

  async getRawMessages(tenantId: string, remoteJid?: string, limit: number = 50): Promise<any[]> {
    let query = `
        SELECT m.*, c.channel_id 
        FROM omnichannel_messages m 
        JOIN conversations c ON m.conversation_id = c.id 
        WHERE m.tenant_id = ?`;

    const params: (string | number)[] = [tenantId];

    if (remoteJid) {
      // Como o remoteJid poderia ser o contact_id ou estar atrelado a um lead... precisamos de join
      const phoneClean = remoteJid.replace('@s.whatsapp.net', '');
      const lead = await this.findLeadByPhone(tenantId, phoneClean);
      const contactId = lead?.id || remoteJid;

      query += ' AND c.contact_id = ?';
      params.push(contactId);
    }

    query += ' ORDER BY m.created_at DESC LIMIT ?';
    params.push(limit);

    const result = await this.db
      .prepare(query)
      .bind(...params)
      .all();

    return result.results;
  }

  async getKnowledgeBase(tenantId: string): Promise<string> {
    const kbResults = await this.db
      .prepare('SELECT content FROM knowledge_base WHERE tenant_id = ?')
      .bind(tenantId)
      .all<{ content: string }>();
    return kbResults.results.map((r) => r.content).join('\\n');
  }

  // --- OMNICHANNEL INBOX ---

  async getConversations(tenantId: string): Promise<any[]> {
    // Busca conversas ativas com dados básicos e última mensagem
    const results = await this.db
      .prepare(
        `
        SELECT 
          c.id, 
          c.contact_id, 
          c.status,
          c.assigned_to,
          c.last_message_at,
          ch.provider as platform,
          COALESCE(l.name, c.contact_id) as contact_name,
          l.avatar as contact_avatar,
          (SELECT content FROM omnichannel_messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message,
          (SELECT COUNT(*) FROM omnichannel_messages WHERE conversation_id = c.id AND status = 'delivered' AND sender_type = 'contact') as unread_count
        FROM conversations c
        JOIN channels ch ON c.channel_id = ch.id
        LEFT JOIN leads l ON c.contact_id = l.id
        WHERE c.tenant_id = ? AND c.status != 'resolved'
        ORDER BY c.last_message_at DESC
      `,
      )
      .bind(tenantId)
      .all();

    return results.results;
  }

  async updateConversationStatus(
    conversationId: string,
    status: 'bot' | 'open' | 'resolved',
    assignedTo?: string,
  ): Promise<void> {
    if (assignedTo) {
      await this.db
        .prepare('UPDATE conversations SET status = ?, assigned_to = ? WHERE id = ?')
        .bind(status, assignedTo, conversationId)
        .run();
    } else {
      await this.db
        .prepare('UPDATE conversations SET status = ? WHERE id = ?')
        .bind(status, conversationId)
        .run();
    }
  }

  async getConversationMessages(conversationId: string, limit: number = 50): Promise<any[]> {
    const results = await this.db
      .prepare(
        `
        SELECT * FROM omnichannel_messages 
        WHERE conversation_id = ? 
        ORDER BY created_at ASC 
        LIMIT ?
      `,
      )
      .bind(conversationId, limit)
      .all();
    return results.results;
  }
}
