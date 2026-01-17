import { D1PreparedStatement, DatabaseBinding } from '../types';
import { FunctionDeclaration, SchemaType } from '@google/generative-ai';

export const TOOLS_SCHEMA: FunctionDeclaration[] = [
  {
    name: 'search_properties',
    description: 'Search for properties/real estate based on location, price, features, or type.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        location: {
          type: SchemaType.STRING,
          description: 'City, neighborhood or region (e.g. "Jardins", "SP", "São Paulo")',
        },
        min_price: {
          type: SchemaType.NUMBER,
          description: 'Minimum price in BRL',
        },
        max_price: {
          type: SchemaType.NUMBER,
          description: 'Maximum price in BRL',
        },
        bedrooms: {
          type: SchemaType.NUMBER,
          description: 'Minimum number of bedrooms',
        },
        type: {
          type: SchemaType.STRING,
          description: 'Type of property (e.g. "sale", "rent")',
        },
        features: {
          type: SchemaType.STRING,
          description: 'Keywords to search in features (e.g. "piscina", "varanda")',
        },
      },
      required: [],
    },
  },
  {
    name: 'get_market_stats',
    description: 'Get general market statistics and system status.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {},
    },
  },
  {
    name: 'register_lead',
    description: 'Register a new potential client (lead) in the CRM when they show clear interest.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        name: {
          type: SchemaType.STRING,
          description: 'Name of the client',
        },
        phone: {
          type: SchemaType.STRING,
          description: 'Phone number of the client',
        },
        budget: {
          type: SchemaType.NUMBER,
          description: 'Budget limit in BRL (optional)',
        },
        notes: {
          type: SchemaType.STRING,
          description: 'Summary of client interest (e.g. "Looking for 3 bedroom apartment in Jardins")',
        },
        property_id: {
            type: SchemaType.STRING,
            description: 'ID of the specific property the client is interested in (if applicable)',
        },
      },
      required: ['name', 'phone'],
    },
  },
];

// Types for Tool Arguments
interface SearchPropertiesArgs {
  location?: string;
  min_price?: number;
  max_price?: number;
  bedrooms?: number;
  type?: string;
  features?: string;
}

interface RegisterLeadArgs {
  name: string;
  phone: string;
  budget?: number;
  notes?: string;
  property_id?: string;
}

// Helper functions
async function searchProperties(db: DatabaseBinding, tenantId: string, args: SearchPropertiesArgs) {
  let query =
      'SELECT id, title, price, location, features, bedrooms, type FROM properties WHERE tenant_id = ?';
    const params: (string | number)[] = [tenantId];

    if (args.location) {
      query += ' AND location LIKE ?';
      params.push(`%${args.location}%`);
    }

    if (args.min_price) {
      query += ' AND price >= ?';
      params.push(args.min_price);
    }

    if (args.max_price) {
      query += ' AND price <= ?';
      params.push(args.max_price);
    }

    if (args.bedrooms) {
      query += ' AND bedrooms >= ?';
      params.push(args.bedrooms);
    }

    if (args.type) {
      query += ' AND listing_type = ?'; 
      params.push(args.type);
    }
    
    if (args.features) {
        query += ' AND features LIKE ?';
        params.push(`%${args.features}%`);
    }

    query += ' LIMIT 5';

    const stmt = db.prepare(query).bind(...params);
    const result = await stmt.all();
    return result.results;
}

async function getMarketStats(db: DatabaseBinding, tenantId: string) {
    const stats = await db
      .prepare('SELECT AVG(price) as avg_price, COUNT(*) as total FROM properties WHERE tenant_id = ?')
      .bind(tenantId)
      .first();
    return stats;
}


import { distributeLead } from '../services/leadOpsService';

async function registerLead(db: DatabaseBinding, tenantId: string, args: RegisterLeadArgs) {
    const id = crypto.randomUUID();
    
    // Check if table is 'leads' or 'clients'. Schema now has 'leads'.
    // NOTE: Previous code used 'clients'. I will switch to 'leads' to match new schema and logic.
    // If 'leads' table doesn't exist yet in prod, this might break until migration runs.
    // But since I updated schema.sql, I assume I am targeting 'leads'.
    // However, leads.ts was using 'leads' table too.
    
    await db.prepare(
        `INSERT INTO leads (id, tenant_id, name, phone, email, notes, score, status, source)
         VALUES (?, ?, ?, ?, ?, ?, 0, 'new', 'whatsapp_agent')`
    ).bind(
        id,
        tenantId,
        args.name,
        args.phone,
        null, // email
        args.notes || 'Lead capturado via WhatsApp',
    ).run();

    // Trigger Lead Distribution
    await distributeLead(db, id, tenantId, null);

    // Track lead count for specific property if provided (args.property_id)
    if (args.property_id) {
        const today = new Date().toISOString().split('T')[0];
        try {
            await db.prepare(`
                INSERT INTO property_daily_stats (property_id, tenant_id, date, leads_count)
                VALUES (?, ?, ?, 1)
                ON CONFLICT(property_id, date) DO UPDATE SET leads_count = leads_count + 1
            `)
            .bind(args.property_id, tenantId, today)
            .run();
        } catch (e) {
             // Silently ignore stats error
        }
    }

    return { success: true, message: `Lead ${args.name} cadastrado e distribuído! ID: ${id}` };
}


export async function executeTool(name: string, args: unknown, db: DatabaseBinding, tenantId: string) {
  switch (name) {
    case 'search_properties':
      return await searchProperties(db, tenantId, args as SearchPropertiesArgs);
    case 'get_market_stats':
      return await getMarketStats(db, tenantId);
    case 'register_lead':
      return await registerLead(db, tenantId, args as RegisterLeadArgs);
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}


