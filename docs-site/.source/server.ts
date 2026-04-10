// @ts-nocheck
import * as __fd_glob_11 from "../content/docs/guides/evolution_api_easypanel.md?collection=docs"
import * as __fd_glob_10 from "../content/docs/guides/README.md?collection=docs"
import * as __fd_glob_9 from "../content/docs/decisions/ADR-0001-consolidation.md?collection=docs"
import * as __fd_glob_8 from "../content/docs/decisions/004-centralized-trial-gate-interceptor.md?collection=docs"
import * as __fd_glob_7 from "../content/docs/decisions/003-security-hardening.md?collection=docs"
import * as __fd_glob_6 from "../content/docs/decisions/002-routing-prioritization.md?collection=docs"
import * as __fd_glob_5 from "../content/docs/decisions/001-email-normalization.md?collection=docs"
import * as __fd_glob_4 from "../content/docs/audit/previous_audit.md?collection=docs"
import * as __fd_glob_3 from "../content/docs/audit/full_audit_2026-01-17.md?collection=docs"
import * as __fd_glob_2 from "../content/docs/index.mdx?collection=docs"
import * as __fd_glob_1 from "../content/docs/architecture.mdx?collection=docs"
import * as __fd_glob_0 from "../content/docs/api.mdx?collection=docs"
import { server } from 'fumadocs-mdx/runtime/server';
import type * as Config from '../source.config';

const create = server<typeof Config, import("fumadocs-mdx/runtime/types").InternalTypeConfig & {
  DocData: {
  }
}>({"doc":{"passthroughs":["extractedReferences"]}});

export const docs = await create.doc("docs", "content/docs", {"api.mdx": __fd_glob_0, "architecture.mdx": __fd_glob_1, "index.mdx": __fd_glob_2, "audit/full_audit_2026-01-17.md": __fd_glob_3, "audit/previous_audit.md": __fd_glob_4, "decisions/001-email-normalization.md": __fd_glob_5, "decisions/002-routing-prioritization.md": __fd_glob_6, "decisions/003-security-hardening.md": __fd_glob_7, "decisions/004-centralized-trial-gate-interceptor.md": __fd_glob_8, "decisions/ADR-0001-consolidation.md": __fd_glob_9, "guides/README.md": __fd_glob_10, "guides/evolution_api_easypanel.md": __fd_glob_11, });

export const meta = await create.meta("meta", "content/docs", {});