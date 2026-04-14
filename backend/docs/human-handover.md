# Human Handover ‚ Fluxo de Silenciamento da IA

## Vis√£o Geral

Quando uma mensagem WhatsApp inbound chega e o lead j√° possui um corretor atribu√≠do (`assigned_to`), a **IA √© silenciada** e o corretor assume a conversa. Este processo √© chamado de **Human Handover**.

## Fluxo Completo

```
Mensagem inbound recebida
  ‚
  ‚‚ 1. Salva mensagem no D1 (whatsapp_messages)
  ‚
  ‚‚ 2. Busca lead pelo telefone (WhatsAppRepository.findLeadByPhone)
  ‚
  ‚‚ 3. Lead encontrado e tem assigned_to?
  ‚     ‚
  ‚     ‚‚ SIM ‚ HUMAN HANDOVER
  ‚     ‚   ‚‚ Atualiza lead status para 'responded'
  ‚     ‚   ‚‚ Para automa√ß√£o de campanha (campaign_leads ‚ 'stopped')
  ‚     ‚   ‚‚ IA N√O envia resposta autom√°tica
  ‚     ‚   ‚‚ Cria notifica√ß√£o para o corretor (type: 'handover')
  ‚     ‚   ‚‚ Retorna ao webhook: { received: true, action: 'human_handover' }
  ‚     ‚
  ‚     ‚‚ N√O ‚ IA RESPONDE
  ‚         ‚‚ SalesTools.analyzeIntention() ‚ detecta inten√ß√£o
  ‚         ‚‚ Move lead no pipeline baseado na inten√ß√£o
  ‚         ‚‚ Envia resposta via Evolution API
  ‚
  ‚‚ 4. Se Agent Hub indispon√≠vel ‚ fallback com mensagem padr√£o
```

## Regras de Silenciamento

| Condi√ß√£o | Comportamento da IA |
|----------|-------------------|
| Lead sem `assigned_to` | IA responde automaticamente |
| Lead com `assigned_to` | IA **silencia**, cria notifica√ß√£o |
| Lead respondeu durante campanha | Campanha √© **parada** (`campaign_leads.status = 'stopped'`) |
| Agent Hub indispon√≠vel | Fallback com mensagem gen√©rica |

## O Que Acontece no Handover

### 1. Lead √© atualizado

```sql
UPDATE leads
SET status = 'responded', responded_at = CURRENT_TIMESTAMP
WHERE id = ?
```

### 2. Campanha ativa do lead √© parada

```sql
UPDATE campaign_leads
SET status = 'stopped'
WHERE lead_id = ? AND status IN ('active', 'pending')
```

### 3. Notifica√ß√£o √© criada para o corretor

```sql
INSERT INTO notifications (id, tenant_id, user_id, type, title, message, metadata)
VALUES (?, ?, ?, 'handover', 'Lead respondeu no WhatsApp', '...', '{leadId, phone, content}')
```

### 4. IA n√£o envia mensagem de resposta

O handler do webhook retorna `{ received: true, action: 'human_handover', notificationId }` e **n√£o executa** o bloco de resposta autom√°tica.

## Como Reativar a IA

**Fato observado no c√≥digo:** N√£o h√° mecanismo expl√≠cito de reativa√ß√£o no c√≥digo analisado. A IA permanece silenciada enquanto o lead tiver `assigned_to`.

**Infer√™ncia:** Para reativar a IA em um lead, seria necess√°rio:
1. Remover o `assigned_to` do lead, OU
2. Implementar um flag expl√≠cito (ex: `ai_enabled` na tabela leads)

**Lacuna:** N√£o existe comando ou UI documentados para "reativar IA" em um lead atribu√≠do.

## Arquivos Envolvidos

| Arquivo | Responsabilidade |
|---------|-----------------|
| `backend/src/routes/whatsapp.ts` | Handler do webhook, l√≥gica de handover (linha ~80-120) |
| `backend/src/services/whatsappRepository.ts` | Busca lead por telefone |
| `backend/src/services/salesTools.ts` | An√°lise de inten√ß√£o (s√≥ chamada se N√O h√° handover) |
| `backend/src/services/whatsappService.ts` | Envio de mensagens via Evolution API |

## Tabela `notifications`

O campo `type = 'handover'` identifica notifica√ß√µes de human handover. O frontend deve filtrar por este tipo para exibir alertas ao corretor.

```sql
SELECT * FROM notifications
WHERE type = 'handover' AND is_read = FALSE AND tenant_id = ?
```

## Limita√ß√µes Conhecidas

1. **Sem reativa√ß√£o expl√≠cita** ‚ n√£o h√° flag `ai_enabled` no schema; o silenciamento depende exclusivamente de `assigned_to`
2. **Sem copilot mode** ‚ o README menciona "exceto se for configurada como copiloto" mas esta funcionalidade n√£o est√° implementada
3. **Sem hist√≥rico de handover** ‚ n√£o h√° tabela de auditoria espec√≠fica para registrar quando a IA foi silenciada/reativada
4. **Notifica√ß√£o s√≥ para o corretor** ‚ se `user_id` for NULL na notifica√ß√£o, ela n√£o √© entregue a ningu√©m (bug potencial)
