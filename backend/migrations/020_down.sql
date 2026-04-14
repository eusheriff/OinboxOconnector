-- Down Migration: Reverter migração 020 (multi-platform publishing)
-- Data: 2026-04-10
-- Descrição: Remover tabelas de publicação multi-plataforma
-- ATEN��O: Isso remove TODAS as configurações de portais e publicações.
-- Backup recomendado antes de executar.

DROP INDEX IF EXISTS idx_property_publications_status;
DROP INDEX IF EXISTS idx_property_publications_portal;
DROP INDEX IF EXISTS idx_property_publications_tenant;
DROP INDEX IF EXISTS idx_property_publications_property;
DROP INDEX IF EXISTS idx_portal_configs_portal;
DROP INDEX IF EXISTS idx_portal_configs_tenant;

DROP TABLE IF EXISTS property_publications;
DROP TABLE IF EXISTS portal_configs;
