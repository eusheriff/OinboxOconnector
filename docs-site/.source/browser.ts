// @ts-nocheck
import { browser } from 'fumadocs-mdx/runtime/browser';
import type * as Config from '../source.config';

const create = browser<typeof Config, import("fumadocs-mdx/runtime/types").InternalTypeConfig & {
  DocData: {
  }
}>();
const browserCollections = {
  docs: create.doc("docs", {"api.mdx": () => import("../content/docs/api.mdx?collection=docs"), "architecture.mdx": () => import("../content/docs/architecture.mdx?collection=docs"), "index.mdx": () => import("../content/docs/index.mdx?collection=docs"), "audit/full_audit_2026-01-17.md": () => import("../content/docs/audit/full_audit_2026-01-17.md?collection=docs"), "audit/previous_audit.md": () => import("../content/docs/audit/previous_audit.md?collection=docs"), "decisions/001-email-normalization.md": () => import("../content/docs/decisions/001-email-normalization.md?collection=docs"), "decisions/002-routing-prioritization.md": () => import("../content/docs/decisions/002-routing-prioritization.md?collection=docs"), "decisions/003-security-hardening.md": () => import("../content/docs/decisions/003-security-hardening.md?collection=docs"), "decisions/004-centralized-trial-gate-interceptor.md": () => import("../content/docs/decisions/004-centralized-trial-gate-interceptor.md?collection=docs"), "decisions/ADR-0001-consolidation.md": () => import("../content/docs/decisions/ADR-0001-consolidation.md?collection=docs"), "guides/README.md": () => import("../content/docs/guides/README.md?collection=docs"), "guides/evolution_api_easypanel.md": () => import("../content/docs/guides/evolution_api_easypanel.md?collection=docs"), }),
};
export default browserCollections;