# Evolution API - Deploy no EasyPanel

## Pré-requisitos

- EasyPanel instalado e acessível
- Domínio ou subdomínio (ex: `evolution.seudominio.com`)

---

## Passo 1: Criar novo App no EasyPanel

1. Acesse seu EasyPanel
2. Clique em **"Create"** � **"App"**
3. Nome: `evolution-api`

---

## Passo 2: Configurar via Docker

No EasyPanel, vá em **"App" � "Source"** e selecione **Docker Image**:

```
Image: atendAutomation/evolution-api:latest
```

---

## Passo 3: Variáveis de Ambiente

Adicione estas variáveis em **"Environment"**:

```env
# Servidor
SERVER_URL=https://evolution.seudominio.com

# Autenticação
AUTHENTICATION_TYPE=apikey
AUTHENTICATION_API_KEY=SUA_CHAVE_SECRETA_AQUI
AUTHENTICATION_EXPOSE_IN_FETCH_INSTANCES=true

# Banco de Dados (PostgreSQL do EasyPanel)
DATABASE_ENABLED=true
DATABASE_PROVIDER=postgresql
DATABASE_CONNECTION_URI=postgresql://postgres:SENHA@postgres:5432/evolution

# Redis (opcional mas recomendado)
CACHE_REDIS_ENABLED=true
CACHE_REDIS_URI=redis://redis:6379
CACHE_REDIS_PREFIX_KEY=evolution
CACHE_LOCAL_ENABLED=false

# Webhook Global (opcional)
WEBHOOK_GLOBAL_ENABLED=false

# Logs
LOG_LEVEL=ERROR
LOG_COLOR=true

# Configurações WhatsApp
CONFIG_SESSION_PHONE_CLIENT=Oconnector
CONFIG_SESSION_PHONE_NAME=Chrome
QRCODE_LIMIT=30
QRCODE_COLOR=#F97316
```

---

## Passo 4: Criar banco PostgreSQL

No EasyPanel:

1. **Create** � **Database** � **PostgreSQL**
2. Nome: `evolution-db`
3. Copie a connection string e use na variável `DATABASE_CONNECTION_URI`

---

## Passo 5: Configurar Domínio

1. Em **"DomAutomationns"**, adicione: `evolution.seudominio.com`
2. Habilite **HTTPS** (Let's Encrypt automático)
3. Porta interna: `8080`

---

## Passo 6: Deploy

Clique em **"Deploy"** e aguarde.

---

## Passo 7: Testar

Acesse: `https://evolution.seudominio.com/manager`

Use a API Key que você definiu em `AUTHENTICATION_API_KEY`.

---

## Passo 8: Configurar no Oconnector

Edite o arquivo `.env` do projeto Oconnector:

```env
EVOLUTION_API_URL=https://evolution.seudominio.com
EVOLUTION_API_KEY=SUA_CHAVE_SECRETA_AQUI
```

---

## Comandos úteis (Terminal do EasyPanel)

```bash
# Ver logs
docker logs evolution-api -f

# Reiniciar
docker restart evolution-api
```

---

## Segurança

 **IMPORTANTE:**

- Troque `SUA_CHAVE_SECRETA_AQUI` por uma chave forte (ex: `openssl rand -hex 32`)
- Nunca exponha a API sem HTTPS
- Configure firewall para permitir apenas seu backend acessar a API

---

## Suporte

- Documentação oficial: https://doc.evolution-api.com
- GitHub: https://github.com/EvolutionAPI/evolution-api
