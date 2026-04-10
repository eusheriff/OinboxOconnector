# Agent Hub e Autopilot

> Serviços externos e automações agendadas.

---

## 1. Agent Hub

### 1.1 O que é

O **Agent Hub** é um serviço externo de orquestração de IA que recebe requests do Oinbox backend e retorna respostas processadas por modelos de linguagem.

- **URL:** `https://agent-hub.oconnector.tech`
- **Endpoint principal:** `POST /v1/hub/orchestrate`
- **Status:** Serviço externo, não parte deste repositório

### 1.2 Como é usado

O Agent Hub é chamado em dois momentos principais:

#### 1.2.1 Análise de Intenção (WhatsApp)

Quando uma mensagem chega via WhatsApp e o lead **não** tem um corretor atribuído:

```typescript
// backend/src/services/salesTools.ts
SalesTools.analyzeIntention(message)
  → POST /v1/hub/orchestrate { request: message, userId: leadId }
  → Retorna: { intention, suggestedAction, suggestedResponse }
```

A intenção é usada para:
- Classificar o lead no pipeline (Novo, Visita, Proposta)
- Gerar resposta automática simulando o corretor
- Atualizar score do lead

#### 1.2.2 Geração de Pitch

```typescript
SalesTools.generatePitch(leadData)
  → POST /v1/hub/orchestrate { request: "generate pitch for...", userId: leadId }
  → Retorna: { pitch, tone, highlights }
```

### 1.3 Circuit Breaker

Todas as chamadas ao Agent Hub são protegidas por circuit breaker:

| Parâmetro | Valor |
|-----------|-------|
| Failure Threshold | 3 falhas |
| Recovery Timeout | 90 segundos |
| Success Threshold | 2 sucessos |

Quando o circuit breaker está **OPEN**, as chamadas ao Agent Hub retornam erro imediatamente sem tentar a requisição.

### 1.4 Fallback

Se o Agent Hub estiver indisponível:

- **WhatsApp:** Mensagem padrão é enviada ao lead
- **Pitch:** Erro é logado, nenhum pitch é gerado
- **Health Check:** Status reportado como `degraded`

### 1.5 Monitoramento

```bash
# Verificar status do Agent Hub
curl http://localhost:8787/api/health | jq .checks.agentHub

# Verificar métricas do circuit breaker
curl http://localhost:8787/api/health/circuit-breakers | jq .breakers.agentHub
```

### 1.6 Perguntas em Aberto

- Quem mantém o Agent Hub? É do mesmo time ou time separado?
- Qual o SLA do serviço?
- Há um contrato de API documentado (OpenAPI, schema)?
- O que acontece se o Agent Hub mudar o formato da resposta?

---

## 2. Autopilot

### 2.1 O que é

O **Autopilot** é um job agendado (cron trigger) que roda periodicamente no Cloudflare Worker para executar tarefas automáticas de CRM e follow-up.

### 2.2 Schedule

```
*/10 11-23 * * 1-5
```

- **Frequência:** A cada 10 minutos
- **Horário:** Seg-Sex, 11h-23h UTC (8h-20h Brasil)
- **Fins de semana:** Não roda

### 2.3 Implementação

```typescript
// backend/src/index.ts
async scheduled(event, env, ctx) {
  const { runAutopilot } = await import('./services/autopilot/scheduler');
  await runAutopilot(env, ctx);
}
```

### 2.4 Arquivos

| Arquivo | Responsabilidade |
|---------|-----------------|
| `backend/src/services/autopilot/scheduler.ts` | Entry point do job |
| `backend/src/services/autopilot/` | Demais módulos do autopilot |

### 2.5 O que o Autopilot faz

*(Baseado no nome e contexto — ler o código do scheduler.ts para detalhes exatos)*

Provavelmente executa:
- Follow-up automático de leads sem interação recente
- Atualização de scores de leads
- Disparo de campanhas agendadas
- Limpeza de dados temporários
- Verificação de trials expirando

### 2.6 Logs

```bash
# Datadog: pesquisar por
"Cron Trigger started: Autopilot Check"

# Logs do autopilot devem estar em
service:oinbox-backend "Autopilot"
```

### 2.7 Perguntas em Aberto

- Quais tarefas exatas o Autopilot executa? (ler `scheduler.ts`)
- Há idempotência? Se o job rodar duas vezes, há duplicação?
- Há timeout configurado? O que acontece se o job exceder o limite do Worker?
- Há retry em caso de falha?

---

## 3. Relação entre Agent Hub e Autopilot

```
┌─────────────────────────────────────────────────────┐
│                    Oinbox Backend                    │
│                                                      │
│  WhatsApp Message                                    │
│       │                                              │
│       ▼                                              │
│  SalesTools.analyzeIntention() ──────────┐           │
│       │                                   │           │
│       ▼                                   ▼           │
│  Agent Hub (externo)              Autopilot (cron)    │
│  POST /v1/hub/orchestrate             A cada 10min    │
│       │                                   │           │
│       ▼                                   ▼           │
│  Intenção do lead                 Follow-ups automáticos│
│  + resposta automática              + score updates    │
└─────────────────────────────────────────────────────┘
```

O Agent Hub processa **reações em tempo real** a mensagens.
O Autopilot executa **ações agendadas** de manutenção e follow-up.
