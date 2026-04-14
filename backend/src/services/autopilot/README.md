# Autopilot Scheduler

## Visão Geral

O Autopilot é um **cron job** do Cloudflare Worker que executa a cada **10 minutos** durante horário comercial (Seg-Sex, 11h-23h UTC = 8h-20h Brasil).

Ele automatiza duas funções:
1. **Ingestão de leads qualificados em campanhas**
2. **Processamento de ações pendentes de campanhas** (envio de mensagens WhatsApp)

## Configuração

Definida no `wrangler.toml`:

```toml
[triggers]
crons = ["*/10 11-23 * * 1-5"]
```

## O Que o Scheduler Faz

### Passo 1: Ingestão de Leads Qualificados

Busca leads com `status = 'qualified'` que **não estão em nenhuma campanha** e os adiciona à primeira campanha ativa disponível:

```sql
-- Busca leads qualificados sem campanha
SELECT l.id, l.status
FROM leads l
LEFT JOIN campaign_leads cl ON l.id = cl.lead_id
WHERE l.status = 'qualified' AND cl.id IS NULL
LIMIT 50

-- Adiciona na campanha ativa
INSERT INTO campaign_leads (id, campaign_id, lead_id, current_step, status, next_action_at)
VALUES (?, ?, ?, 0, 'pending', CURRENT_TIMESTAMP)
```

**Limitação:** Pega a **primeira** campanha ativa (`LIMIT 1`), sem critério de matching entre lead e campanha.

### Passo 2: Processamento de Ações Pendentes

Busca leads em campanhas com `status IN ('pending', 'active')` onde `next_action_at <= NOW` e processa a ação:

```sql
SELECT cl.*, l.phone, l.name, l.ai_pitch, l.tenant_id, c.settings
FROM campaign_leads cl
JOIN leads l ON cl.lead_id = l.id
JOIN campaigns c ON cl.campaign_id = c.id
WHERE cl.status IN ('pending', 'active')
AND cl.next_action_at <= CURRENT_TIMESTAMP
LIMIT 20
```

### Passo 3: Execução da Ação (`processAction`)

Para cada lead pendente, o scheduler:

#### Step 0 � Pitch Inicial
- Se o lead tem `ai_pitch` salvo no banco, usa como mensagem
- Senão, gera pitch via `SalesTools.generatePitch()` (chamada ao Agent Hub)
- Fallback final: `"Olá {nome}, tudo bem?"`
- Próximo follow-up em **24 horas**

#### Step 1 � Follow-up
- Mensagem fixa: `"Oi {nome}, conseguiu ver minha mensagem anterior?"`
- Próximo follow-up em **48 horas**

#### Step 2+ � Fim da Sequência
- Marca `campaign_leads.status = 'completed'`

### Regras de Horário

O scheduler **não envia mensagens fora do horário comercial** (9h-19h):
- Se estiver fora do horário, reagenda para o **dia seguinte às 10h**
- A mensagem não é enviada e o lead não avança de step

### Envio da Mensagem

1. Chama `sendWhatsAppMessage(env, tenantId, phone, message)` � Evolution API
2. Se envio falha, **não avança o step** (lead permanece pendente para próxima tentativa)
3. Se envio sucede:
   - Registra em `campaign_messages`
   - Atualiza `current_step` e `next_action_at`
   - Se step era 0: move lead para `status = 'contacted'`

## Tabela: Sequência de Steps

| Step | Ação | Mensagem | Próximo Delay |
|------|------|----------|---------------|
| 0 | Pitch inicial | `ai_pitch` ou gerado por IA | 24h |
| 1 | Follow-up | Mensagem fixa | 48h |
| 2+ | Completado | � | � |

## Dependências Externas

| Serviço | Uso | Fallback |
|---------|-----|----------|
| Agent Hub | Gerar pitch via `generate-pitch` skill | Mensagem genérica "Olá {nome}" |
| Evolution API | Envio de WhatsApp | Falha silenciosa, step não avança |
| D1 | Estado das campanhas e leads | Se D1 falhar, o cron loga erro e aborta |

## Arquivos Envolvidos

| Arquivo | Responsabilidade |
|---------|-----------------|
| `backend/src/services/autopilot/scheduler.ts` | Lógica completa do scheduler |
| `backend/src/index.ts` | Exporta `scheduled()` handler para o Worker |
| `backend/src/services/salesTools.ts` | Geração de pitch via Agent Hub |
| `backend/src/services/whatsappService.ts` | Envio de mensagens WhatsApp |

## Lacunas Conhecidas

1. **Sequência curta** � apenas 2 steps (pitch + 1 follow-up). Campanhas reais podem ter 5-10 steps
2. **Sem matching lead-campanha** � pega a primeira campanha ativa, sem critério de segmentação
3. **Tabela `campaign_leads` não existe no schema.sql** � o scheduler referencia esta tabela mas ela não está definida no schema base. Pode ter sido criada em uma migração não listada
4. **Sem métricas de campanha no scheduler** � não incrementa `sent_count`, `failed_count`, etc. na tabela `campaigns`
5. **Sem retry para mensagens falhadas** � se o step falha, o lead fica preso com `next_action_at` no passado (será re-processado no próximo cron, mas a mensagem não muda)
6. **Código de campanha_leads** � referencia coluna `campaign_leads.error_log` que não existe no schema da tabela `campaign_messages`

## Como Debugar

```bash
# Ver leads qualificados sem campanha
wrangler d1 execute oinbox-db --local --command \
  "SELECT l.id, l.name, l.status FROM leads l LEFT JOIN campaign_leads cl ON l.id = cl.lead_id WHERE l.status = 'qualified' AND cl.id IS NULL;"

# Ver ações pendentes
wrangler d1 execute oinbox-db --local --command \
  "SELECT cl.*, l.name FROM campaign_leads cl JOIN leads l ON cl.lead_id = l.id WHERE cl.status IN ('pending', 'active') AND cl.next_action_at <= CURRENT_TIMESTAMP;"

# Rodar o scheduler manualmente
wrangler dev  # o cron é disparado automaticamente no ambiente local
# Ou via curl ao health check para verificar dependências
curl http://localhost:8787/api/health
```
