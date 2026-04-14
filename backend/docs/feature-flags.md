# Feature Flags

## Visão Geral

Oinox possui um sistema de feature flags baseado na tabela `feature_flags` no D1, com uma interface de gestão no frontend (`/admin/feature-flags`).

## Tabela `feature_flags`

```sql
CREATE TABLE IF NOT EXISTS feature_flags (
    key TEXT PRIMARY KEY,
    description TEXT,
    is_enabled BOOLEAN DEFAULT FALSE,
    rules TEXT, -- JSON: { "plans": ["Pro"], "tenants": ["id1"] }
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### Campos

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `key` | TEXT | Identificador único da flag (ex: `ai_voice_transcription`) |
| `description` | TEXT | Descrição humana da funcionalidade |
| `is_enabled` | BOOLEAN | Flag master on/off |
| `rules` | TEXT (JSON) | Regras avançadas de ativação |

### Formato das Rules (JSON)

```json
{
  "plans": ["Pro", "Enterprise"],
  "tenants": ["tenant_abc123"]
}
```

| Regra | Descrição |
|-------|-----------|
| `plans` | Lista de planos que têm acesso à feature |
| `tenants` | Lista de tenant IDs com acesso explícito (override) |

## Interface de Gestão

**Arquivo:** `src/pages/admin/FeatureManager.tsx`

A interface permite:
- Criar novas feature flags
- Editar descrição, status e rules
- Excluir flags existentes
- Listar todas as flags

### Endpoints da API (esperados pelo frontend)

| Método | Endpoint | Ação |
|--------|----------|------|
| `GET` | `/api/admin/feature-flags` | Listar todas as flags |
| `POST` | `/api/admin/feature-flags` | Criar ou atualizar flag |
| `DELETE` | `/api/admin/feature-flags/{key}` | Excluir flag |

## Status de Implementação

**Fato observado:** A tabela existe no schema. O componente frontend existe e faz chamadas HTTP.

**Lacuna:** Não foi encontrado o endpoint backend `/api/admin/feature-flags` nos arquivos de rotas analisados. O componente frontend trata erros silenciosamente (`console.warn('Feature flags endpoint not available')`).

**Inferência:** A feature flag é um **esqueleto funcional** � a tabela e a UI existem, mas o backend não implementa as rotas CRUD.

## Flags Conhecidas

Não há flags pré-cadastradas no schema.sql ou seeds. As flags são criadas dinamicamente via UI.

## Recomendações

1. **Implementar endpoints CRUD** em `/api/admin/feature-flags`
2. **Criar middleware** que verifica feature flags antes de executar funcionalidades
3. **Cadastrar flags iniciais** no seed ou migração
4. **Documentar flags ativas** em um arquivo `FEATURE_FLAGS.md` na raiz do projeto
