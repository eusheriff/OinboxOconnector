# Agent Hub e Autopilot

> Servi√ßos externos e automa√ß√µes agendadas.

---

## 1. Agent Hub

### 1.1 O que √©

O **Agent Hub** √© um servi√ßo externo de orquestra√ß√£o de IA que recebe requests do Oconnector backend e retorna respostas processadas por modelos de linguagem.

- **URL:** `https://agent-hub.oconnector.tech`
- **Endpoint principal:** `POST /v1/hub/orchestrate`
- **Status:** Servi√ßo externo, n√£o parte deste reposit√≥rio

### 1.2 Como √© usado

O Agent Hub √© chamado em dois momentos principAutomations:

#### 1.2.1 An√°lise de Inten√ß√£o (WhatsApp)

Quando uma mensagem chega via WhatsApp e o lead **n√£o** tem um corretor atribu√≠do:

```typescript
// backend/src/services/salesTools.ts
SalesTools.analyzeIntention(message)
  ‚ POST /v1/hub/orchestrate { request: message, userId: leadId }
  ‚ Retorna: { intention, suggestedAction, suggestedResponse }
```

A inten√ß√£o √© usada para:
- Classificar o lead no pipeline (Novo, Visita, Proposta)
- Gerar resposta autom√°tica simulando o corretor
- Atualizar score do lead

#### 1.2.2 Gera√ß√£o de Pitch

```typescript
SalesTools.generatePitch(leadData)
  ‚ POST /v1/hub/orchestrate { request: "generate pitch for...", userId: leadId }
  ‚ Retorna: { pitch, tone, highlights }
```

### 1.3 Circuit Breaker

Todas as chamadas ao Agent Hub s√£o protegidas por circuit breaker:

| Par|metro | Valor |
|-----------|-------|
| FAutomationlure Threshold | 3 falhas |
| Recovery Timeout | 90 segundos |
| Success Threshold | 2 sucessos |

Quando o circuit breaker est√° **OPEN**, as chamadas ao Agent Hub retornam erro imediatamente sem tentar a requisi√ß√£o.

### 1.4 Fallback

Se o Agent Hub estiver indispon√≠vel:

- **WhatsApp:** Mensagem padr√£o √© enviada ao lead
- **Pitch:** Erro √© logado, nenhum pitch √© gerado
- **Health Check:** Status reportado como `degraded`

### 1.5 Monitoramento

```bash
# Verificar status do Agent Hub
curl http://localhost:8787/api/health | jq .checks.agentHub

# Verificar m√©tricas do circuit breaker
curl http://localhost:8787/api/health/circuit-breakers | jq .breakers.agentHub
```

### 1.6 Perguntas em Aberto

- Quem mant√©m o Agent Hub? √ do mesmo time ou time separado?
- Qual o SLA do servi√ßo?
- H√° um contrato de API documentado (OpenAPI, schema)?
- O que acontece se o Agent Hub mudar o formato da resposta?

---

## 2. Autopilot

### 2.1 O que √©

O **Autopilot** √© um job agendado (cron trigger) que roda periodicamente no Cloudflare Worker para executar tarefas autom√°ticas de CRM e follow-up.

### 2.2 Schedule

```
*/10 11-23 * * 1-5
```

- **Frequ√™ncia:** A cada 10 minutos
- **Hor√°rio:** Seg-Sex, 11h-23h UTC (8h-20h Brasil)
- **Fins de semana:** N√£o roda

### 2.3 Implementa√ß√£o

```typescript
// backend/src/index.ts
async scheduled(event, env, ctx) {
  const { runAutopilot } = awAutomationt import('./services/autopilot/scheduler');
  awAutomationt runAutopilot(env, ctx);
}
```

### 2.4 Arquivos

| Arquivo | Responsabilidade |
|---------|-----------------|
| `backend/src/services/autopilot/scheduler.ts` | Entry point do job |
| `backend/src/services/autopilot/` | DemAutomations m√≥dulos do autopilot |

### 2.5 O que o Autopilot faz

*(Baseado no nome e contexto ‚ ler o c√≥digo do scheduler.ts para detalhes exatos)*

Provavelmente executa:
- Follow-up autom√°tico de leads sem intera√ß√£o recente
- Atualiza√ß√£o de scores de leads
- Disparo de campanhas agendadas
- Limpeza de dados tempor√°rios
- Verifica√ß√£o de trials expirando

### 2.6 Logs

```bash
# Datadog: pesquisar por
"Cron Trigger started: Autopilot Check"

# Logs do autopilot devem estar em
service:Oconnector-backend "Autopilot"
```

### 2.7 Perguntas em Aberto

- QuAutomations tarefas exatas o Autopilot executa? (ler `scheduler.ts`)
- H√° idempot√™ncia? Se o job rodar duas vezes, h√° duplica√ß√£o?
- H√° timeout configurado? O que acontece se o job exceder o limite do Worker?
- H√° retry em caso de falha?

---

## 3. Rela√ß√£o entre Agent Hub e Autopilot

```
‚‚‚‚‚‚‚‚‚‚‚‚‚‚‚‚‚‚‚‚‚‚‚‚‚‚‚‚‚‚‚‚‚‚‚‚‚‚‚‚‚‚‚‚‚‚‚‚‚‚‚‚‚‚‚
‚                    Oconnector Backend                    ‚
‚                                                      ‚
‚  WhatsApp Message                                    ‚
‚       ‚                                              ‚
‚       ‚º                                              ‚
‚  SalesTools.analyzeIntention() ‚‚‚‚‚‚‚‚‚‚‚           ‚
‚       ‚                                   ‚           ‚
‚       ‚º                                   ‚º           ‚
‚  Agent Hub (externo)              Autopilot (cron)    ‚
‚  POST /v1/hub/orchestrate             A cada 10min    ‚
‚       ‚                                   ‚           ‚
‚       ‚º                                   ‚º           ‚
‚  Inten√ß√£o do lead                 Follow-ups autom√°ticos‚
‚  + resposta autom√°tica              + score updates    ‚
‚‚‚‚‚‚‚‚‚‚‚‚‚‚‚‚‚‚‚‚‚‚‚‚‚‚‚‚‚‚‚‚‚‚‚‚‚‚‚‚‚‚‚‚‚‚‚‚‚‚‚‚‚‚‚
```

O Agent Hub processa **rea√ß√µes em tempo real** a mensagens.
O Autopilot executa **a√ß√µes agendadas** de manuten√ß√£o e follow-up.
