
/**
 * OConnector Backend - Cloudflare Worker
 * 
 * Este código deve ser implantado no Cloudflare Workers.
 * Ele protege suas chaves de API (Stripe e Cloudflare Images) do frontend.
 * 
 * Variáveis de Ambiente necessárias (no Dashboard da Cloudflare ou wrangler.toml):
 * - STRIPE_SECRET_KEY: (rk_live_...)
 * - CF_API_TOKEN: (Seu token da Cloudflare)
 * - CF_ACCOUNT_ID: (Seu ID de conta Cloudflare)
 * - ALLOWED_ORIGIN: (Ex: https://oconnector.tech ou * para dev)
 */

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    // Configuração CORS
    const corsHeaders = {
      "Access-Control-Allow-Origin": env.ALLOWED_ORIGIN || "*",
      "Access-Control-Allow-Methods": "GET, HEAD, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    };

    // Handle Preflight (OPTIONS)
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      // Rota 1: Upload de Imagem para Cloudflare Images
      if (url.pathname === "/api/upload-image" && request.method === "POST") {
        return await handleImageUpload(request, env, corsHeaders);
      }

      // Rota 2: Criar Checkout Stripe
      if (url.pathname === "/api/create-checkout" && request.method === "POST") {
        return await handleStripeCheckout(request, env, corsHeaders);
      }

      return new Response("Not Found", { status: 404, headers: corsHeaders });

    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }
  },
};

async function handleImageUpload(request, env, corsHeaders) {
  const formData = await request.formData();
  const file = formData.get("file");

  if (!file) {
    throw new Error("Nenhum arquivo enviado.");
  }

  // Prepara o upload direto para a API da Cloudflare
  const cfFormData = new FormData();
  cfFormData.append("file", file);

  const uploadResp = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${env.CF_ACCOUNT_ID}/images/v1`,
    {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${env.CF_API_TOKEN}`,
        // Não setar Content-Type aqui, o fetch seta multipart/form-data automaticamente com boundary
      },
      body: cfFormData,
    }
  );

  const result = await uploadResp.json();

  if (!result.success) {
    throw new Error("Falha no Cloudflare Images: " + JSON.stringify(result.errors));
  }

  // Retorna a URL pública da imagem (variante 'public' ou custom)
  // Ajuste conforme suas variantes configuradas no dashboard
  const imageUrl = result.result.variants[0]; 

  return new Response(JSON.stringify({ url: imageUrl }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function handleStripeCheckout(request, env, corsHeaders) {
  const { planName, cycle } = await request.json();

  // Mapeamento de Preços (Idealmente estaria no env ou banco)
  // Substitua pelos Price IDs reais do seu Dashboard Stripe (price_...)
  const PRICES = {
    'Autônomo': { monthly: 'price_auto_monthly_id', yearly: 'price_auto_yearly_id' },
    'Business': { monthly: 'price_biz_monthly_id', yearly: 'price_biz_yearly_id' },
  };

  const priceId = PRICES[planName]?.[cycle];

  if (!priceId) {
    throw new Error("Plano ou ciclo inválido.");
  }

  // Chamada à API do Stripe para criar Sessão
  const stripeResp = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${env.STRIPE_SECRET_KEY}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      "success_url": `${env.ALLOWED_ORIGIN}/?success=true`,
      "cancel_url": `${env.ALLOWED_ORIGIN}/?canceled=true`,
      "line_items[0][price]": priceId,
      "line_items[0][quantity]": "1",
      "mode": "subscription",
    }),
  });

  const session = await stripeResp.json();

  if (session.error) {
    throw new Error(session.error.message);
  }

  return new Response(JSON.stringify({ url: session.url }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
