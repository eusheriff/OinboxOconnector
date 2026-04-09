# Oinbox — Omnichannel Platform for Real Estate

Oinbox é uma plataforma omnichannel com automação de vendas via IA, desenhada para centralizar a operação de corretores e imobiliárias. O core do produto é o **Inbox Unificado** (WhatsApp, Email, Portais) potencializado por Inteligência Artificial Generativa (Google Gemini + Agent Hub externo).

## 🚀 Stack Tecnológico

| Camada | Tecnologia |
|--------|-----------|
| **Frontend** | React 18, TypeScript, Tailwind CSS, shadcn/ui, Vite |
| **Backend** | Hono (Cloudflare Workers — serverless edge) |
| **Banco de Dados** | Cloudflare D1 (SQLite na edge) |
| **Storage** | Cloudflare R2 (imagens e contratos) |
| **WhatsApp** | Evolution API (BaileYS, self-hosted) — instância por tenant |
| **AI** | Google Gemini + Agent Hub externo (`agent-hub.oconnector.tech`) |
| **Billing** | Stripe |
| **Observabilidade** | Datadog (logs + métricas, região US5) |

---

## 📦 Funcionalidades

### Core: Inbox Omnichannel
- **WhatsApp** — Canal principal com instância dedicada por tenant (QR code individual)
- **Email** — Captura de leads de portais imobiliários (Zap, VivaReal, OLX) via Cloudflare Email Routing
- **Chat unificado** — Todas as conversas em uma única interface com perfil comportamental do cliente (IA)

### Automação de Vendas (IA)
- **Sales Specialist** — Análise de intenção da mensagem do lead e resposta automática
- **Flash Agent** — Respostas rápidas no chat simulando o corretor
- **Human Handover** — Quando um corretor é atribuído ao lead, a IA silencia e notifica o responsável
- **Visão Computacional** — Upload de foto do imóvel → IA detecta características e preenche o cadastro
- **Voice-to-CRM** — Transcrição de áudios de visita transformados em dados estruturados

### CRM e Operações
- **Lead Scoring** — Termômetro automático que pontua leads
- **Pipeline Visual** — Kanban (Novo, Visita, Proposta, Fechado)
- **Criação de Imóveis** — Formulário completo com upload de fotos (Cloudflare R2), análise de imagem por IA (Gemini), geração de descrição, seleção de portais e publicação em lote
- **Publicação Multi-Plataforma** — OLX, Zap Imóveis, VivaReal, Facebook Marketplace (adapter pattern, credenciais por tenant)
- **XML Feed** — Geração automática de feed XML para portais que usam integração XML (`GET /api/feed/{tenantId}.xml`)
- **Simulador Financeiro** — Parcelas SAC/Price com taxas de mercado
- **Gerador de Contratos** — PDFs automáticos
- **Campanhas** — Disparo em lote via WhatsApp com delay anti-bloqueio

### Publicação Multi-Plataforma
- Publish de imóveis em OLX, Zap Imóveis, VivaReal, Facebook (adapter pattern)

### Gestão SaaS (Super Admin)
- Multi-tenant com trial de 30 dias, billing via Stripe, feature flags

---

## 🛠️ Instalação e Configuração

### Pré-requisitos

- Node.js 20+
- Conta na Cloudflare (Workers + D1 + R2)
- Chave de API do Google AI Studio (Gemini)
- Evolution API self-hosted (para WhatsApp)

### Passo 1: Clone e Instalação

```bash
git clone https://github.com/seu-usuario/oinbox.git
cd oinbox
npm install
```

### Passo 2: Configuração de Ambiente

Crie um arquivo `.env` na raiz baseado no `.env.example`:

```bash
cp .env.example .env
```

Edite `.env` com suas credenciais. Segredos do backend devem ser configurados via Wrangler:

```bash
wrangler secret put JWT_SECRET
wrangler secret put STRIPE_SECRET_KEY
wrangler secret put STRIPE_WEBHOOK_SECRET
wrangler secret put EVOLUTION_API_KEY
wrangler secret put GOOGLE_PLACES_API_KEY
```

### Passo 3: Configurar Banco D1

```bash
npm install -g wrangler
wrangler login

# Criar banco de dados
wrangler d1 create oinbox-db

# Copiar o database_id retornado para wrangler.toml

# Executar schema
wrangler d1 execute oinbox-db --file=./backend/schema.sql --local
```

### Passo 4: Executar Localmente

Terminal 1 — Backend (Wrangler dev, porta 8787):
```bash
npm run dev:backend
```

Terminal 2 — Frontend (Vite, porta 5173 com proxy para /api):
```bash
npm run dev
```

Acesse `http://localhost:5173`.

---

## 📂 Estrutura do Projeto

```
oinbox/
├── backend/                  # Cloudflare Worker (Hono)
│   ├── src/
│   │   ├── routes/           # 22 módulos de rota (/api/auth, /api/whatsapp, etc.)
│   │   ├── services/         # Lógica de negócio (AI, WhatsApp, portais, billing)
│   │   ├── middleware/       # auth, logging, rateLimiter, foreignKey
│   │   ├── utils/            # datadog logger, circuit breaker, email
│   │   ├── bindings.ts       # Tipagens de env/bindings do Worker
│   │   ├── index.ts          # Entry point do Worker
│   │   └── email-handler.ts  # Cloudflare Email Routing handler
│   ├── migrations/           # Migrações D1 incrementais
│   ├── schema.sql            # Schema completo do banco (~35 tabelas)
│   ├── seed*.sql             # Seeds de dados para dev
│   └── tsconfig.json
├── src/                      # Frontend React
│   ├── components/           # UI: Inbox, CRM, Admin, AI, Marketing, etc.
│   ├── pages/                # Admin e Client pages
│   ├── routes/               # React Router definitions
│   ├── services/             # apiService, openaiService
│   ├── contexts/             # Toast, Theme
│   └── App.tsx               # Root
├── shared/types/             # Tipos TypeScript compartilhados (FE ↔ BE)
├── wrangler.toml             # Configuração Cloudflare Workers
├── vite.config.ts            # Vite + Vitest
└── .env.example              # Template de variáveis de ambiente
```

---

## 🔄 Fluxo de Mensagem WhatsApp

```
Cliente envia WhatsApp
  → Evolution API (BaileYS, self-hosted)
    → Webhook POST /api/whatsapp/webhook (Cloudflare Worker)
      → WhatsAppRepository.saveMessage() (D1)
        → Lead tem assigned_to?
          → SIM: Criar notificação para corretor, IA silencia (human handover)
          → NÃO: SalesTools.analyzeIntention() via Agent Hub
            → Move lead no pipeline + responde via Evolution API
            → Se Agent Hub indisponível: fallback com mensagem padrão
```

---

## 🔒 Segurança

- JWT com `jose` para autenticação, verificado em middleware
- Senhas com bcrypt (NUNCA plaintext)
- Rate limiting em rotas de login (5 req/min por IP)
- Circuit breakers para serviços externos (WhatsApp, Agent Hub, Stripe, Google Places)
- CORS com allow-list explícita
- Multi-tenant isolation via `tenant_id` em todas as tabelas
- Segredos via `wrangler secret put` (NUNCA no código)
- Gate de trial/subscription no middleware de auth

---

## 📊 Observabilidade

- **Datadog** — Logs estruturados + métricas customizadas (`oinbox.http.*`, `oinbox.exception.*`)
- **Correlation IDs** — `X-Correlation-ID` em todas as respostas
- **Health Check** — `GET /api/health` retorna status detalhado: D1, Agent Hub, Evolution API
- **Notificações** — `GET /api/notifications?unread=true` — handover, portal leads, alertas

---

## 📄 Licença

Este projeto é proprietário. Todos os direitos reservados a Euimob Tecnologia.
