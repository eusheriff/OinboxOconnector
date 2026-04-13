import { loader } from 'fumadocs-core/source';
import { docs } from '../.source/server';

// Use the docs collection directly — fumadocs-mdx collections
// implement the Source interface at runtime
export const source = loader({
  baseUrl: '/docs',
  source: docs as any,
});
