# STATE - Oinbox Project

## Last Updated
2026-01-17T17:14:00-03:00

## Current Status
✅ **STABLE** - Build de produção passando, refatoração L0/L1 concluída.

## Recent Decisions
- **Frontend unificado em `/src`**: Todos os componentes, services e arquivos de entrada agora residem em `/src/`.
- **Docs consolidados em `/docs/_consolidated`**: Estrutura padronizada com subpastas temáticas.
- **`server.ts` DEPRECATED**: Mantido com warning, mas divergente de produção (`index.ts`).

## Next Steps (L2)
1. Sincronizar ou depreciar oficialmente `server.ts` (suporte Docker).
2. Remover wildcards de CORS e implementar allow-list dinâmica.
3. Criar pacote compartilhado de tipos Front/Back.
4. Adicionar testes nos fluxos críticos.

## Key Files Changed Recently
- `backend/src/index.ts` - Rota duplicada removida
- `backend/src/server.ts` - Warning de deprecação adicionado
- `src/App.tsx` - Imports corrigidos
- `index.html` - Entry point atualizado para `/src/index.tsx`
- `docs/_consolidated/*` - Nova estrutura de documentação
