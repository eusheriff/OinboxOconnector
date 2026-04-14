# Sistema de Migrações do Banco de Dados

Este diretório contém as migrações versionadas para o banco de dados Cloudflare D1.

## Migrações Atuais

| # | Arquivo | Descrição |
|---|---------|-----------|
| 001 | `001_add_missing_tables.sql` | trial_fingerprints, rate_limits, campaigns, campaign_messages, notifications |
| 002 | `002_prospects.sql` | Tabelas de prospecção |
| 003 | `003_add_pitch.sql` | Pitch de vendas |
| 004 | `004_leads_extended.sql` | Extensão de leads |
| 005 | `005_campaigns.sql` | Tabelas de campanhas |
| 006 | `006_trials_addons.sql` | Addons de trial |
| 007 | `007_ai_rate_limits.sql` | Rate limits para AI |
| 008 | `008_qualifications.sql` | Qualificação de leads |
| 009 | `009_enterprise_leads.sql` | Enterprise leads |
| 010 | `010_owner_report.sql` | Owner report |
| 011 | `011_add_user_phone.sql` | Telefone em users |
| 012 | `012_Oconnector_knowledge_base.sql` | Knowledge base |
| 013 | `013_create_contracts.sql` | Contratos |
| 014 | `014_create_commissions.sql` | Comissões |
| 015 | `015_add_trial_ends_at.sql` | Trial ends at |
| 016 | `016_lead_ops.sql` | Lead operations |
| 017 | `017_lead_ops_part2.sql` | Lead operations part 2 |
| 018 | `018_autonomous_crm.sql` | Autonomous CRM |
| 019 | `019_add_tenant_to_campaigns.sql` | Tenant em campaigns |
| 020 | `020_multi_platform_publishing.sql` | Publicação multi-plataforma |

## Convenção de Nomes

Os arquivos devem seguir o formato: `NNNN_descricao.sql`

Onde `NNNN` é um número sequencial de 4 dígitos (ex: `0001`, `0002`, `0015`).

Exemplos:
- `0001_initial_schema.sql`
- `0002_add_leads_table.sql`
- `0003_add_indexes_performance.sql`

## Como Criar uma Migração

1. Crie um novo arquivo SQL com o próximo número sequencial:
   ```bash
   touch backend/migrations/0004_minha_migracao.sql
   ```

2. Adicione o SQL da migração:
   ```sql
   -- Migracao: 0004_minha_migracao
   -- Descrio: Adiciona coluna de status ativo em users

   ALTER TABLE users ADD COLUMN is_active BOOLEAN DEFAULT TRUE;
   CREATE INDEX idx_users_active ON users(is_active);
   ```

## Como Executar Migrações

### Localmente (Desenvolvimento)

```bash
# Executar todas as migrações em sequência
for f in backend/migrations/*.sql; do
  wrangler d1 execute Oconnector-db --local --file=./$f
done

# Ou executar apenas o schema completo (para banco novo)
wrangler d1 execute Oconnector-db --local --file=./backend/schema.sql
```

### Produção

```bash
# Executar todas as migrações
for f in backend/migrations/*.sql; do
  wrangler d1 execute Oconnector-db --file=./$f
done
```

## Boas Práticas

1. **Sempre use `IF NOT EXISTS`** em criações de tabelas/índices
2. **Teste localmente** antes de rodar em produção
3. **Não modifique migrações já executadas** - crie uma nova
4. **Use transações** para migrações complexas
5. **Documente** o propósito de cada migração no arquivo

## Rollback

Para reverter uma migração:
1. Crie um arquivo de rollback: `0004_minha_migracao_rollback.sql`
2. Execute manualmente:
   ```bash
   wrangler d1 execute Oconnector-db --file=./backend/migrations/0004_minha_migracao_rollback.sql
   ```
3. Remova o registro da tabela `schema_migrations`:
   ```sql
   DELETE FROM schema_migrations WHERE migration_name = '0004_minha_migracao';
   ```
