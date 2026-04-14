# Perguntas em Aberto � Investigação

## 1. Agent Hub Externo

**Pergunta:** Qual é o contrato exato da API do Agent Hub? O que acontece se o serviço for descontinuado?

**Investigação:**

O Agent Hub (`https://agent-hub.oconnector.tech`) é um serviço externo que fornece duas skills:

- `/api/skill/analyze-response` � análise de intenção de mensagens de leads
- `/api/skill/generate-pitch` � geração de pitch de vendas personalizado
- `/v1/hub/orchestrate` � orquestrador geral de IA (fallback quando analyzeIntention falha)

**Endpoints chamados no código:**

| Endpoint                      | Usado em                                           | Método | Body                                 |
| ----------------------------- | -------------------------------------------------- | ------ | ------------------------------------ |
| `/api/skill/analyze-response` | `salesTools.ts`                                    | POST   | `{ message, history }`               |
| `/api/skill/generate-pitch`   | `salesTools.ts`, `scheduler.ts`                    | POST   | `{ name, business, ...leadData }`    |
| `/v1/hub/orchestrate`         | `whatsapp.ts` (webhook), `index.ts` (health check) | POST   | `{ request, userId, origin_domain }` |

**Fato:** O Agent Hub é **crítico** � sem ele, a IA do inbox funciona de forma degradada (fallback com mensagem genérica).

**Não encontrado:** Documentação da API do Agent Hub, código-fonte, ou SLA no repositório.

**Risco:** Se o Agent Hub sair do ar permanentemente, não há plano B documentado. O fallback atual é uma mensagem genérica ("Entendido. Agradecemos a atenção!"), o que tornaria o produto inutilizável para automação de vendas.

**Recomendação:**

- Documentar o contrato completo da API do Agent Hub
- Implementar fallback com Data Engine/Google GenAI direto (que já está disponível como dependência)
- Adicionar health check do Agent Hub no monitoramento

---

## 2. Client vs Lead � Qual a Diferença?

**Pergunta:** Existem duas tabelas distintas (`clients` e `leads`) e dois tipos TypeScript (`Client` e `Lead`). Qual a diferença conceitual?

**Investigação:**

### Tabela `clients`

```sql
CREATE TABLE clients (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    name TEXT NOT NULL,
    email, phone, status TEXT DEFAULT 'Novo',
    budget REAL,
    score INTEGER DEFAULT 0,
    ai_summary TEXT,
    password_hash TEXT,  -- Senha para acesso ao portal do cliente
    last_login DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);
```

### Tabela `leads`

```sql
CREATE TABLE leads (
    id TEXT PRIMARY KEY,
    tenant_id TEXT,
    name TEXT NOT NULL,
    phone, email, website,
    score INTEGER DEFAULT 0,
    status TEXT DEFAULT 'new',
    source TEXT DEFAULT 'manual',
    assigned_to TEXT,       -- ID do corretor
    stage TEXT DEFAULT 'new', -- Funil de vendas
    next_follow_up_at DATETIME,
    google_place_id TEXT,   -- Para prospecção via Google Places
    -- ... campos de timestamps (captured_at, qualified_at, etc.)
);
```

### Diferença Constatada

| Aspecto        | `clients`                                | `leads`                                                 |
| -------------- | ---------------------------------------- | ------------------------------------------------------- |
| **Perfil**     | Cliente já cadastrado (tem senha, login) | Prospect/interessado capturado                          |
| **Origem**     | Portal do cliente, cadastro manual       | Google Places, WhatsApp, portais, campanhas             |
| **Funil**      | Sem funil de vendas                      | Com funil (`stage`: new, qualified, contacted, etc.)    |
| **Atribuição** | Sem `assigned_to`                        | Com `assigned_to` (corretor responsável)                |
| **Acesso**     | Tem `password_hash` e `last_login`       | Sem acesso ao sistema                                   |
| **Score**      | Lead score genérico                      | Score com `score_breakdown` (JSON)                      |
| **Interações** | Mensagens via tabela `messages`          | Mensagens via `whatsapp_messages` e `campaign_messages` |

**Conclusão:** São **conceitos distintos**:

- `clients` = clientes finais (compradores/inquilinos) que têm acesso ao portal do cliente
- `leads` = prospects (imobiliárias, corretores, construtoras) capturados via prospecção ou canais inbound

**Problema:** A distinção não está documentada em nenhum lugar. Um novo dev vai confundir os dois.

**Recomendação:** Adicionar documentação explicando a diferença e considerar renomear para evitar confusão (ex: `prospects` para leads e `customers` para clients).

---

## 3. AI Providers � Quem é Usado Quando?

**Pergunta:** O projeto tem Google Data Engine, Engine (Gemma 4), Agent Hub, e o frontend tem `EngineService.ts` (agora `aiService.ts`). Quem é usado quando?

**Investigação:**

### Backend

| Componente                      | Provider              | Evidência                                   |
| ------------------------------- | --------------------- | ------------------------------------------- |
| `aiService.ts` (backend)        | **Engine** (Gemma 4)  | `callGemma()` chama `${EngineUrl}/api/chat` |
| `salesTools.ts`                 | **Agent Hub**         | Chama `agent-hub.oconnector.tech`           |
| `routes/ai.ts` (`/public-chat`) | **Engine** (Gemma 4)  | Usa `callGemma()`                           |
| `email-handler.ts`              | Nenhum (parse apenas) | Usa PostalMime para extrair dados           |

### Frontend (`aiService.ts`, antigo `EngineService.ts`)

| Função                        | Provider                                       | Lógica                                 |
| ----------------------------- | ---------------------------------------------- | -------------------------------------- |
| `analyzePropertyImage`        | **Engine** (config.provider === 'Engine')      | Chama Engine local com modelo de visão |
| `generatePropertyDescription` | **Engine** ou **Backend** (`/api/ai/generate`) | Depende da config do usuário           |
| `summarizeConversation`       | **Engine** ou **Backend**                      | Depende da config                      |
| `suggestReply`                | **Engine** ou **Backend**                      | Depende da config                      |
| `generateMarketingCaption`    | **Engine** ou **Backend**                      | Depende da config                      |
| `analyzeClientProfile`        | **Engine** ou **Backend**                      | Depende da config                      |
| `fastAgentResponse`           | **Engine** ou **Backend** (`/api/ai/generate`) | Depende da config                      |
| `askGlobalAgent`              | **Backend** (`/api/ai/public-chat`)            | Sempre backend                         |
| `askMarketExpert`             | **Engine** ou **Backend**                      | Depende da config                      |

### Configuração do Frontend

O frontend lê `localStorage.getItem('oconnector_ai_config')`:

```typescript
{
  provider: 'Engine' | 'Engine',  // 'Engine' é o default
  EngineBaseUrl: 'http://localhost:11434',
  selectedModel: 'gemma4:e2b',
  visionModel: 'gemma4:e2b'
}
```

**Conclusão:**

- **Backend** usa Engine (Gemma 4) para IA generativa e Agent Hub para skills de vendas
- **Frontend** pode usar Engine local OU backend AI, dependendo da configuração do usuário
- **Google Data Engine** está nas dependências (`@google/genai`, `@google/generative-ai`) mas **não é chamado em nenhum lugar do código analisado** � possivelmente é um fallback planejado mas não implementado
- **Engine** não é usado diretamente � o nome "Engine" era legado, agora `aiService.ts` usa Engine ou backend

**Recomendação:**

- Remover dependências `@google/genai` e `@google/generative-ai` se não forem usadas, OU implementar o provider Data Engine
- Documentar a matriz de providers em um arquivo `AI_PROVIDERS.md`

---

## 4. Backup D1

**Pergunta:** Existe estratégia de backup para o banco D1?

**Investigação:**

- **Não encontrado** nenhum script, comando npm, ou documentação sobre backup de D1
- Cloudflare oferece export manual de D1 via `wrangler d1 export`
- **Não há** cron job ou automação de backup configurada no wrangler.toml
- **Não há** política de retention ou RPO (Recovery Point Objective) documentada

**Risco:** Se o D1 corromper ou for acidentalmente deletado, não há backup automatizado.

**Recomendação:**

- Implementar backup automatizado via GitHub Actions ou script agendado
- Documentar procedimento de restore
- Definir RPO (ex: backup diário, máxima perda de 24h de dados)

---

## 5. Staging Environment

**Pergunta:** Existe ambiente de staging separado do production?

**Investigação:**

- **wrangler.toml** tem apenas `[env.production]` � não há `[env.staging]` ou `[env.development]`
- **`.env.example`** menciona URLs de localhost para dev
- **CI** roda apenas lint, typecheck, test e build � não faz deploy
- **Deploy** é manual (`npm run deploy`, `npm run deploy:worker`)
- **database_id** no wrangler.toml aponta para um único banco de produção

**Conclusão:** **Não existe ambiente de staging.** Há apenas:

1. Dev local (localhost:5173 + wrangler dev)
2. Produção (Oconnector.oconnector.tech)

**Risco:** Deploy direto em produção sem teste em ambiente isolado. Migrações D1 são executadas diretamente em produção.

**Recomendação:**

- Criar environment de staging no wrangler.toml (`[env.staging]`)
- Configurar deploy automático de staging em CI
- Requerer aprovação manual para deploy em produção
