

import { Bindings, DatabaseBinding } from '../types'; // Check types import
import { sendWhatsAppMessage } from './whatsappService';
import { createDatadogLogger, DatadogLogger } from '../utils/datadog';

interface Lead {
  id: string;
  tenant_id: string;
  name: string;
  phone?: string;
  status: string;
  follow_up_count: number;
}

interface User {
  id: string;
  name: string;
  email: string;
}

export const distributeLead = async (
    db: DatabaseBinding, 
    leadId: string, 
    tenantId: string, 
    logger: DatadogLogger | null
) => {
  try {
    // 1. Get all users for the tenant
    const { results: users } = await db.prepare(
      'SELECT id, name, email FROM users WHERE tenant_id = ?'
    ).bind(tenantId).all<User>();

    if (!users || users.length === 0) {
      await logger?.warn('No users found for distribution', { tenantId });
      return;
    }

    // 2. Simple Round Robin (Random for MVP) - TODO: Implement proper RR with state
    const assignedUser = users[Math.floor(Math.random() * users.length)];

    // 3. Assign lead
    await db.prepare(
      "UPDATE leads SET assigned_to = ?, stage = 'distributed' WHERE id = ?"
    ).bind(assignedUser.id, leadId).run();

    await logger?.info('Lead distributed', { leadId, assignedTo: assignedUser.email });

    // 4. Notify User (placeholder for email/internal notification)
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    await logger?.error('Error distributing lead', { error: errorMessage });
  }
};


export const processFollowUps = async (env: Bindings) => {
  const logger = createDatadogLogger(env);
  await logger?.info('Starting Follow-up Cron');

  try {
    // 1. Find leads needing follow-up
    // Criteria: status='new' OR 'contacted', no response yet, and time passed > next_follow_up_at
    // For MVP: Let's simpler. Leads created > 30min ago, status='new', follow_up_count=0
    
    // Strategy:
    // Attempt 1: 30 min after capture
    // Attempt 2: 24 hours after capture
    
    // We will use a simplified query for the "30 min check"
    const now = new Date();
    const thirtyMinAgo = new Date(now.getTime() - 30 * 60000).toISOString();
    
    const { results: leadsToFollowUp } = await env.DB.prepare(`
      SELECT * FROM leads 
      WHERE status = 'new' 
      AND (assigned_to IS NULL OR assigned_to = '') 
      AND follow_up_count = 0 
      AND captured_at < ? 
      LIMIT 10
    `).bind(thirtyMinAgo).all<Lead>();

    for (const lead of leadsToFollowUp) {
       if (lead.phone && lead.tenant_id) {
           const message = `Olá ${lead.name}, tudo bem? Sou da imobiliária e vi seu interesse. Podemos conversar agora?`;
           
           await sendWhatsAppMessage(env, lead.tenant_id, lead.phone, message);
           
           // Update lead state
           await env.DB.prepare(`
             UPDATE leads 
             SET follow_up_count = follow_up_count + 1, 
                 last_interaction_at = CURRENT_TIMESTAMP,
                 notes = notes || '\n[Auto] Follow-up 1 sent'
             WHERE id = ?
           `).bind(lead.id).run();
           
           await logger?.info('Sent Follow-up 1', { leadId: lead.id });
       }
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    await logger?.error('Error in Follow-up Cron', { error: errorMessage });
  }
};
