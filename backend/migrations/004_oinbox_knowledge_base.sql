-- Populate Oinbox Knowledge Base for RAG
-- This content will be used by the AI chatbot to answer questions about the platform

-- General Platform Information
INSERT INTO knowledge_base (tenant_id, content, category) VALUES (
  'public',
  'O Oinbox é uma plataforma SaaS de gestão imobiliária com inteligência artificial. Centralizamos WhatsApp, Instagram e Emails em um único inbox unificado. Nossa IA qualifica leads automaticamente, responde perguntas e agenda visitas 24/7.',
  'platform_overview'
);

INSERT INTO knowledge_base (tenant_id, content, category) VALUES (
  'public',
  'Principais recursos: Inbox Unificado (WhatsApp, Instagram, Email), Marketing Studio (criação automática de artes), CRM Visual com Pipeline Kanban, Campanhas IA (disparos automáticos baseados em fit), Hub Financeiro (simulador de crédito), Jurídico Automático (geração de contratos), Voice-to-CRM, Visão Computacional e Agentes de IA.',
  'features'
);

-- Pricing Information
INSERT INTO knowledge_base (tenant_id, content, category) VALUES (
  'public',
  'Planos: Grátis (1 usuário, 50 leads, WhatsApp), Essencial R$59/mês (3 usuários, 200 leads, CRM), Crescimento R$149/mês (10 usuários, 1000 leads, Marketing Studio), Pro R$299/mês (ilimitado, Multi-tenant), Enterprise (preço customizado, API aberta, LLM exclusiva).',
  'pricing'
);

-- Technical Details
INSERT INTO knowledge_base (tenant_id, content, category) VALUES (
  'public',
  'Stack técnica: Frontend React + TypeScript, Backend Cloudflare Workers, Database Cloudflare D1, Storage R2, AI Google Gemini 1.5 + Cloudflare Workers AI (fallback), Evolution API para WhatsApp, Deploy via Cloudflare Pages.',
  'technical'
);

-- Value Proposition
INSERT INTO knowledge_base (tenant_id, content, category) VALUES (
  'public',
  'Economize mais de R$1.500/mês substituindo 5 ferramentas por 1: CRM (R$200), WhatsApp Bot (R$150), Email Marketing (R$100), Criação de Posts (R$1000), Sistema Imobiliário (R$300). Total: R$1.750 economizados quando usa Oinbox.',
  'value_proposition'
);

-- AI Capabilities
INSERT INTO knowledge_base (tenant_id, content, category) VALUES (
  'public',
  'Nossa IA usa Gemini 1.5 Flash/Pro com sistema RAG (Retrieval Augmented Generation). Limitamos requisições diárias (1400 Gemini Flash, 45 Gemini Pro) com fallback automático para Cloudflare AI (9000/dia). Rate limiting implementado para garantir operação 100% gratuita dentro dos limites.',
  'ai_capabilities'
);

-- Integration Details
INSERT INTO knowledge_base (tenant_id, content, category) VALUES (
  'public',
  'Integrações: Evolution API (WhatsApp via QR Code), Instagram Direct, Email IMAP/SMTP, Portais Imobiliários (ZAP, Viva Real, OLX), Google Maps, Stripe (pagamentos), Cloudflare (infraestrutura).',
  'integrations'
);

-- Support and Contact
INSERT INTO knowledge_base (tenant_id, content, category) VALUES (
  'public',
  'Desenvolvido por OConnector Technology. Site: https://oconnector.tech. Plataforma: https://oinbox.oconnector.tech. API Backend: https://api.oconnector.tech. Evolution API: http://evolution.oconnector.tech:8080. Suporte comercial: comercial@oconnector.tech',
  'contact'
);
