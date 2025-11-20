
/**
 * OConnector Backend API - Cloudflare Worker
 * Conecta ao D1 Database e gerencia lógica de negócios.
 */

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    // Configuração CORS
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, x-tenant-id",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      // Verifica se o DB está vinculado (Evita erro 500 se rodar sem binding)
      if (!env.DB) {
          return new Response(JSON.stringify({ error: "Database binding not configured" }), { 
              status: 503, 
              headers: { ...corsHeaders, "Content-Type": "application/json" } 
          });
      }

      // --- ROTAS PÚBLICAS ---
      
      // Login
      if (url.pathname === "/api/auth/login" && request.method === "POST") {
        return await handleLogin(request, env, corsHeaders);
      }
      
      // Registro (Nova Rota)
      if (url.pathname === "/api/auth/register" && request.method === "POST") {
        return await handleRegister(request, env, corsHeaders);
      }

      // --- ROTAS PROTEGIDAS (Requer Tenant ID simulado ou Token) ---
      const tenantId = request.headers.get("x-tenant-id") || 'tenant-demo';

      // 1. Clientes (CRUD)
      if (url.pathname === "/api/clients") {
        if (request.method === "GET") return await getClients(env, tenantId, corsHeaders);
        if (request.method === "POST") return await createClient(request, env, tenantId, corsHeaders);
      }

      // 2. Imóveis (CRUD)
      if (url.pathname === "/api/properties") {
        if (request.method === "GET") return await getProperties(env, tenantId, corsHeaders);
        if (request.method === "POST") return await createProperty(request, env, tenantId, corsHeaders);
        if (request.method === "DELETE") return await deleteProperty(request, env, corsHeaders);
      }

      // 3. Dashboard Stats
      if (url.pathname === "/api/dashboard/stats" && request.method === "GET") {
        return await getDashboardStats(env, tenantId, corsHeaders);
      }

      // --- INTEGRAÇÕES EXTERNAS ---
      if (url.pathname === "/api/upload-image" && request.method === "POST") {
        return await handleImageUpload(request, env, corsHeaders);
      }
      if (url.pathname === "/api/create-checkout" && request.method === "POST") {
        return await handleStripeCheckout(request, env, corsHeaders);
      }

      return new Response(JSON.stringify({ error: "Not Found" }), { status: 404, headers: corsHeaders });

    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }
  },
};

// --- HANDLERS DE BANCO DE DADOS (D1) ---

async function handleLogin(request, env, corsHeaders) {
  const { email, password } = await request.json();
  
  // Query no D1
  const user = await env.DB.prepare("SELECT * FROM users WHERE email = ? AND password_hash = ?")
    .bind(email, password)
    .first();

  if (!user) {
    return new Response(JSON.stringify({ error: "Credenciais inválidas" }), { status: 401, headers: corsHeaders });
  }

  return new Response(JSON.stringify({
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
    tenantId: user.tenant_id,
    token: "fake-jwt-token-for-demo" 
  }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

async function handleRegister(request, env, corsHeaders) {
  const data = await request.json();
  
  // 1. Check if email exists
  const existingUser = await env.DB.prepare("SELECT id FROM users WHERE email = ?").bind(data.email).first();
  if (existingUser) {
      return new Response(JSON.stringify({ error: "Este email já está cadastrado." }), { status: 400, headers: corsHeaders });
  }

  // 2. Create Tenant (Imobiliária)
  const tenantId = crypto.randomUUID();
  await env.DB.prepare(
      "INSERT INTO tenants (id, name, owner_name, email, plan, status, joined_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
  ).bind(tenantId, data.companyName, data.name, data.email, data.plan || 'Trial', 'Active', new Date().toISOString())
  .run();

  // 3. Create User
  const userId = crypto.randomUUID();
  await env.DB.prepare(
      "INSERT INTO users (id, tenant_id, name, email, password_hash, role) VALUES (?, ?, ?, ?, ?, ?)"
  ).bind(userId, tenantId, data.name, data.email, data.password, 'admin')
  .run();

  return new Response(JSON.stringify({ success: true, tenantId, userId }), { 
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
  });
}

async function getClients(env, tenantId, corsHeaders) {
  const { results } = await env.DB.prepare("SELECT * FROM clients WHERE tenant_id = ? ORDER BY created_at DESC")
    .bind(tenantId)
    .all();
  
  return new Response(JSON.stringify(results), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

async function createClient(request, env, tenantId, corsHeaders) {
  const data = await request.json();
  const id = crypto.randomUUID();
  
  await env.DB.prepare(
    "INSERT INTO clients (id, tenant_id, name, email, phone, status, budget) VALUES (?, ?, ?, ?, ?, ?, ?)"
  ).bind(id, tenantId, data.name, data.email, data.phone, data.status || 'Novo', data.budget)
   .run();

  return new Response(JSON.stringify({ success: true, id }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

async function getProperties(env, tenantId, corsHeaders) {
  const { results } = await env.DB.prepare("SELECT * FROM properties WHERE tenant_id = ? ORDER BY created_at DESC")
    .bind(tenantId)
    .all();
  
  const formatted = results.map(p => ({
    ...p,
    features: p.features ? JSON.parse(p.features) : []
  }));

  return new Response(JSON.stringify(formatted), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

async function createProperty(request, env, tenantId, corsHeaders) {
  const data = await request.json();
  const id = crypto.randomUUID();
  
  await env.DB.prepare(
    "INSERT INTO properties (id, tenant_id, title, price, location, image_url, listing_type, features) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
  ).bind(id, tenantId, data.title, data.price, data.location, data.image, data.listingType, JSON.stringify(data.features))
   .run();

  return new Response(JSON.stringify({ success: true, id }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

async function deleteProperty(request, env, corsHeaders) {
  const url = new URL(request.url);
  const id = url.searchParams.get('id');
  
  await env.DB.prepare("DELETE FROM properties WHERE id = ?").bind(id).run();
  
  return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

async function getDashboardStats(env, tenantId, corsHeaders) {
  const clientsCount = await env.DB.prepare("SELECT COUNT(*) as count FROM clients WHERE tenant_id = ?").bind(tenantId).first('count');
  const propertiesCount = await env.DB.prepare("SELECT COUNT(*) as count FROM properties WHERE tenant_id = ?").bind(tenantId).first('count');
  
  const vgv = 1500000; 

  return new Response(JSON.stringify({
    clients: clientsCount,
    properties: propertiesCount,
    vgv: vgv
  }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

async function handleImageUpload(request, env, corsHeaders) {
  return new Response(JSON.stringify({ url: "https://picsum.photos/800/600" }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function handleStripeCheckout(request, env, corsHeaders) {
  return new Response(JSON.stringify({ url: "https://checkout.stripe.com/pay/demo" }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
