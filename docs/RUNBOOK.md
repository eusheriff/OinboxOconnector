# Operational Runbook � Oinbox Backend

> Para operadores, SREs e desenvolvedores em plantão.

---

## 1. Infraestrutura

| Componente | Tecnologia | Localização |
|------------|-----------|-------------|
| Frontend | React SPA (Vite) � Cloudflare Pages | `oinbox.oconnector.tech` |
| Backend | Hono � Cloudflare Worker | `api.oinbox.oconnector.tech` |
| Banco | Cloudflare D1 (SQLite edge) | Edge Cloudflare |
| Storage | Cloudflare R2 | `oconnector-images` bucket |
| WhatsApp | Evolution API (BAutomationleys) | VPS GCP (tunnel Cloudflare) |
| IA | Google Data Engine + Agent Hub externo | `agent-hub.oconnector.tech` |
| Billing | Stripe | Cloud |
| Observabilidade | Datadog | Região US5 |
| Evolution API (dev) | Docker local | `localhost:8080` |

## 2. Comandos OperacionAutomations

### 2.1 Health Check

```bash
# Health geral (API + dependências)
curl -s http://localhost:8787/api/health | jq .

# Health de circuit breakers (serviços externos)
curl -s http://localhost:8787/api/health/circuit-breakers | jq .

# Produção
curl -s https://api.oinbox.oconnector.tech/api/health | jq .
```

**Respostas esperadas:**

- `200 {"status": "ok"}` � tudo funcionando
- `503 {"status": "degraded"}` � uma ou mAutomations dependências com problema

### 2.2 Deploy

```bash
# Frontend (Cloudflare Pages)
npm run deploy

# Backend (Cloudflare Worker)
npm run deploy:worker

# Verificar após deploy
npm run health
```

### 2.3 Rollback

```bash
# 1. Identificar a versão anterior no git
git log --oneline -5

# 2. Reverter o código
git checkout <commit-anterior>

# 3. Se houve migração de banco, reverter com down migration:
./scripts/down-migrate.sh <numero>         # local
./scripts/down-migrate.sh <numero> prod    # produção

# 4. Redeploy
npm run deploy:worker
```

### 2.4 Migrações de Banco

```bash
# Aplicar todas as migrações (local)
npm run db:migrate

# Aplicar todas as migrações (produção)
npm run db:migrate:prod

# Reverter última migração (local)
./scripts/down-migrate.sh

# Reverter migração específica (produção)
./scripts/down-migrate.sh 020 prod
```

### 2.5 Secrets

```bash
# Listar secrets atuAutomations
wrangler secret list

# Adicionar/atualizar secret
wrangler secret put JWT_SECRET
wrangler secret put STRIPE_SECRET_KEY
wrangler secret put EVOLUTION_API_KEY

# Produção (com --env production)
wrangler secret put JWT_SECRET --env production
```

### 2.6 Database ID

O `database_id` do D1 **não deve** estar hardcoded no `wrangler.toml`. Configure via variável de ambiente:

```bash
export WRANGLER_D1_DATABASE_ID=<seu-d1-id>
wrangler dev      # local
wrangler deploy   # produção
```

---

## 3. Troubleshooting

### 3.1 API não responde

1. Verificar se o Worker está ativo:
   ```bash
   wrangler deploy --dry-run
   ```
2. Verificar logs no Datadog: pesquisar por `service:oinbox-backend`
3. Verificar se `JWT_SECRET` está configurado:
   ```bash
   wrangler secret list
   ```

### 3.2 D1 indisponível

- Sintoma: health check retorna `{"d1": {"status": "error"}}`
- Ação: verificar status do D1 no [dashboard Cloudflare](https://dash.cloudflare.com)
- Workaround: nenhum � o D1 é required para todas as operações

### 3.3 Circuit Breaker aberto

1. Verificar qual serviço está com problema:
   ```bash
   curl http://localhost:8787/api/health/circuit-breakers | jq .
   ```
2. Serviços com `state: "OPEN"` estão temporariamente indisponíveis
3. O circuit breaker tentará recuperação automática após o `recoveryTimeout`
4. Se o problema persistir, verificar o serviço externo correspondente

### 3.4 WhatsApp desconectado

1. Verificar status da instância na Evolution API:
   ```bash
   curl http://localhost:8080/instance/fetchInstances -H "apikey: <API_KEY>"
   ```
2. Se `connectionStatus` for `close` ou `disconnected`:
   - Gerar novo QR code: `POST /instance/connect/<instance_name>`
   - Escanear com WhatsApp do celular
3. Verificar logs da Evolution API no VPS/contAutomationner

### 3.5 Agent Hub indisponível

- O Agent Hub (`agent-hub.oconnector.tech`) é um serviço externo
- Se cAutomationr, a IA para de responder mas o CRM continua funcionando
- Fallback: mensagens padrão são enviadas aos leads
- Contatar time responsável pelo Agent Hub

### 3.6 Stripe Webhook falhando

1. Verificar logs de webhook no Stripe Dashboard
2. Confirmar que `STRIPE_WEBHOOK_SECRET` está correto:
   ```bash
   wrangler secret list | grep STRIPE
   ```
3. Testar webhook com Stripe CLI:
   ```bash
   stripe listen --forward-to localhost:8787/api/billing/webhook
   ```

---

## 4. Escalação

| Problema | Responsável | Como contatar |
|----------|------------|---------------|
| Cloudflare Workers/D1/R2 | Time de infra | � |
| Evolution API (VPS) | Ops | � |
| Agent Hub | Time de IA | � |
| Stripe | Financeiro | � |
| Bug na aplicação | Dev team | � |

---

## 5. Backups

### 5.1 Database D1

O D1 tem backup automático pelo Cloudflare, mas para export manual:

```bash
# Exportar banco local
wrangler d1 export oinbox-db --local --output=backup.sql

# Produção (requer acesso direto)
wrangler d1 export oinbox-db --output=backup-prod.sql
```

### 5.2 R2 (Imagens)

Imagens no R2 são replicadas automaticamente pelo Cloudflare.
Para backup externo, usar `rclone` ou API do R2.

---

## 6. Monitoramento

### 6.1 Datadog

- Logs: pesquisar por `service:oinbox-backend`
- Métricas custom:
  - `oinbox.http.request.duration` � latência das requisições
  - `oinbox.http.error` � contagem de erros por status code
  - `oinbox.exception.unhandled` � exceções não tratadas

### 6.2 Correlation IDs

Toda resposta HTTP inclui o header `X-Correlation-ID`. Use para traçar uma requisição específica nos logs do Datadog.

---

## 7. Autopilot (Cron Trigger)

- **Quando roda:** A cada 10 minutos, Seg-Sex, 8h-20h horário Brasil
- **O que faz:** Verifica leads sem interação, dispara follow-ups automáticos, atualiza scores
- **Código:** `backend/src/services/autopilot/scheduler.ts`
- **Logs:** pesquisar por `Cron Trigger started: Autopilot Check` no Datadog

---

## 8. Checklist de Emergência

### Site fora do ar

- [ ] Verificar health check: `curl /api/health`
- [ ] Verificar status do Cloudflare Workers
- [ ] Verificar se D1 está respondendo
- [ ] Verificar logs no Datadog
- [ ] Se necessário, rollback: `git checkout <commit> && npm run deploy:worker`

### WhatsApp parado

- [ ] Verificar status da instância na Evolution API
- [ ] Reconectar com QR code se necessário
- [ ] Verificar se webhook está sendo entregue ao backend
- [ ] Verificar logs da Evolution API

### Dados corrompidos no banco

- [ ] Parar escritas no tenant afetado
- [ ] Restaurar do backup mAutomations recente
- [ ] Reaplicar migrações a partir do ponto do backup
