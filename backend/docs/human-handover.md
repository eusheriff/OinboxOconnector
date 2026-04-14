# Human Handover � Fluxo de Silenciamento da IA

## Visão Geral

Quando uma mensagem WhatsApp inbound chega e o lead já possui um corretor atribuído (`assigned_to`), a **IA é silenciada** e o corretor assume a conversa. Este processo é chamado de **Human Handover**.

## Fluxo Completo

```
Mensagem inbound recebida
  �
  �� 1. Salva mensagem no D1 (whatsapp_messages)
  �
  �� 2. Busca lead pelo telefone (WhatsAppRepository.findLeadByPhone)
  �
  �� 3. Lead encontrado e tem assigned_to?
  �     �
  �     �� SIM � HUMAN HANDOVER
  �     �   �� Atualiza lead status para 'responded'
  �     �   �� Para automação de campanha (campaign_leads � 'stopped')
  �     �   �� IA N�O envia resposta automática
  �     �   �� Cria notificação para o corretor (type: 'handover')
  �     �   �� Retorna ao webhook: { received: true, action: 'human_handover' }
  �     �
  �     �� N�O � IA RESPONDE
  �         �� SalesTools.analyzeIntention() � detecta intenção
  �         �� Move lead no pipeline baseado na intenção
  �         �� Envia resposta via Evolution API
  �
  �� 4. Se Agent Hub indisponível � fallback com mensagem padrão
```

## Regras de Silenciamento

| Condição                        | Comportamento da IA                                         |
| ------------------------------- | ----------------------------------------------------------- |
| Lead sem `assigned_to`          | IA responde automaticamente                                 |
| Lead com `assigned_to`          | IA **silencia**, cria notificação                           |
| Lead respondeu durante campanha | Campanha é **parada** (`campaign_leads.status = 'stopped'`) |
| Agent Hub indisponível          | Fallback com mensagem genérica                              |

## O Que Acontece no Handover

### 1. Lead é atualizado

```sql
UPDATE leads
SET status = 'responded', responded_at = CURRENT_TIMESTAMP
WHERE id = ?
```

### 2. Campanha ativa do lead é parada

```sql
UPDATE campaign_leads
SET status = 'stopped'
WHERE lead_id = ? AND status IN ('active', 'pending')
```

### 3. Notificação é criada para o corretor

```sql
INSERT INTO notifications (id, tenant_id, user_id, type, title, message, metadata)
VALUES (?, ?, ?, 'handover', 'Lead respondeu no WhatsApp', '...', '{leadId, phone, content}')
```

### 4. IA não envia mensagem de resposta

O handler do webhook retorna `{ received: true, action: 'human_handover', notificationId }` e **não executa** o bloco de resposta automática.

## Como Reativar a IA

**Fato observado no código:** Não há mecanismo explícito de reativação no código analisado. A IA permanece silenciada enquanto o lead tiver `assigned_to`.

**Inferência:** Para reativar a IA em um lead, seria necessário:

1. Remover o `assigned_to` do lead, OU
2. Implementar um flag explícito (ex: `ai_enabled` na tabela leads)

**Lacuna:** Não existe comando ou UI documentados para "reativar IA" em um lead atribuído.

## Arquivos Envolvidos

| Arquivo                                      | Responsabilidade                                       |
| -------------------------------------------- | ------------------------------------------------------ |
| `backend/src/routes/whatsapp.ts`             | Handler do webhook, lógica de handover (linha ~80-120) |
| `backend/src/services/whatsappRepository.ts` | Busca lead por telefone                                |
| `backend/src/services/salesTools.ts`         | Análise de intenção (só chamada se N�O há handover)    |
| `backend/src/services/whatsappService.ts`    | Envio de mensagens via Evolution API                   |

## Tabela `notifications`

O campo `type = 'handover'` identifica notificações de human handover. O frontend deve filtrar por este tipo para exibir alertas ao corretor.

```sql
SELECT * FROM notifications
WHERE type = 'handover' AND is_read = FALSE AND tenant_id = ?
```

## Limitações Conhecidas

1. **Sem reativação explícita** � não há flag `ai_enabled` no schema; o silenciamento depende exclusivamente de `assigned_to`
2. **Sem copilot mode** � o README menciona "exceto se for configurada como copiloto" mas esta funcionalidade não está implementada
3. **Sem histórico de handover** � não há tabela de auditoria específica para registrar quando a IA foi silenciada/reativada
4. **Notificação só para o corretor** � se `user_id` for NULL na notificação, ela não é entregue a ninguém (bug potencial)
