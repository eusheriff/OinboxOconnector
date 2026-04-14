# API Reference - OInbox

Documentação das rotas da API REST.

## Base URL

- **Produção**: `https://api.oinbox.oconnector.tech`
- **Local**: `http://localhost:8787`

## Autenticação

Todas as rotas (exceto `/api/auth/*` e `/api/health`) requerem header:

```
Authorization: Bearer <JWT_TOKEN>
```

---

## Rotas

### Auth

| Método | Rota                 | Descrição               |
| ------ | -------------------- | ----------------------- |
| POST   | `/api/auth/login`    | Login com emAutomationl/senha   |
| POST   | `/api/auth/register` | Registro de novo tenant |

### Admin

| Método | Rota                 | Descrição       |
| ------ | -------------------- | --------------- |
| GET    | `/api/admin/stats`   | Dashboard stats |
| GET    | `/api/admin/tenants` | Listar tenants  |

### CRM

| Método | Rota               | Descrição       |
| ------ | ------------------ | --------------- |
| GET    | `/api/crm/clients` | Listar clientes |
| POST   | `/api/crm/clients` | Criar cliente   |

### Properties

| Método | Rota                  | Descrição      |
| ------ | --------------------- | -------------- |
| GET    | `/api/properties`     | Listar imóveis |
| POST   | `/api/properties`     | Criar imóvel   |
| DELETE | `/api/properties/:id` | Remover imóvel |

### WhatsApp

| Método | Rota                    | Descrição               |
| ------ | ----------------------- | ----------------------- |
| GET    | `/api/whatsapp/status`  | Status da conexão       |
| GET    | `/api/whatsapp/qrcode`  | QR Code para conectar   |
| POST   | `/api/whatsapp/send`    | Enviar mensagem         |
| POST   | `/api/whatsapp/webhook` | Webhook (Evolution API) |

### Leads (SuperAdmin)

| Método | Rota                     | Descrição            |
| ------ | ------------------------ | -------------------- |
| GET    | `/api/leads`             | Listar leads         |
| POST   | `/api/leads`             | Salvar lead          |
| POST   | `/api/leads/:id/analyze` | Analisar lead com IA |

---

## OpenAPI

_Documentação OpenAPI/Swagger pendente de implementação._
