# foreignKeyMiddleware

## Visão Geral

Middleware global do Hono que garante que **foreign key enforcement** está ativo em todas as conexões com o banco D1/SQLite.

## Arquivo
`backend/src/middleware/foreignKey.ts`

## O Que Faz

```typescript
app.use('/*', foreignKeyMiddleware);
```

Em **cada request HTTP**, o middleware executa:

```sql
PRAGMA foreign_keys = ON;
```

## Por Que Isso é Necessário

SQLite (e por extensão, Cloudflare D1) **desabilita foreign key constraints por padrão**. Sem `PRAGMA foreign_keys = ON`:

- `INSERT` com foreign key inválida **não falha**
- `DELETE` de um pai **não cascadeia** para filhos
- `UPDATE` de foreign key **não é validada**

Isso significa que dados inconsistentes podem ser inseridos silenciosamente se este pragma não for executado.

## Onde é Aplicado

Confirmado em `backend/src/index.ts`:

```typescript
app.use('/*', foreignKeyMiddleware);
```

� aplicado **globalmente**, antes de todas as rotas.

## Impacto

| Sem o middleware | Com o middleware |
|-----------------|-----------------|
| FK violations são silenciosas | FK violations causam erro |
| Dados órfãos podem existir | Integridade referencial garantida |
| DELETE não cascadeia | CASCADE/SET NULL funcionam |

## Limitações

1. **Executado em toda request** � overhead mínimo (uma query extra por request)
2. **D1 pode não suportar PRAGMA** da mesma forma que SQLite padrão � em algumas versões do D1, o PRAGMA é ignorado
3. **Não valida dados existentes** � apenas previne novas violações. Se já existem dados órfãos, o middleware não os corrige

## Recomendações

1. Verificar se o D1 realmente respeita `PRAGMA foreign_keys = ON` (testar com insert inválido)
2. Considerar adicionar validação de FK em nível de aplicação como defesa em profundidade
3. Documentar quais tabelas têm foreign keys e quais são as regras de cascade/delete
