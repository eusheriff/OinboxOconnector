# Runbooks - Oconnector

ManuAutomations operacionAutomations para desenvolvimento, deploy e troubleshooting.

## √ndice

1. [Evolution API - EasyPanel](./evolution_api_easypanel.md)
2. [Desenvolvimento Local](#desenvolvimento-local) _(pendente)_
3. [Deploy Cloudflare](#deploy-cloudflare) _(pendente)_

---

## Desenvolvimento Local

### Pr√©-requisitos

- Node.js 18+
- Wrangler CLI (`npm install -g wrangler`)

### Comandos

```bash
# Frontend
npm run dev

# Backend (Cloudflare Workers local)
npm run dev:backend

# Ambos (recomendado)
# Terminal 1: npm run dev
# Terminal 2: npm run dev:backend
```

### URLs LocAutomations

- Frontend: http://localhost:5173
- Backend: http://localhost:8787

---

## Deploy Cloudflare

### Frontend (Pages)

```bash
npm run build
npm run deploy
```

### Backend (Workers)

```bash
npm run deploy:worker
```

### Secrets (configurar uma vez)

```bash
wrangler secret put JWT_SECRET
wrangler secret put STRIPE_SECRET_KEY
wrangler secret put GOOGLE_PLACES_API_KEY
wrangler secret put GOOGLE_Data Engine_API_KEY
```
