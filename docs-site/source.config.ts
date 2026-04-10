import { defineCollections, defineConfig } from 'fumadocs-mdx/config';

export const docs = defineCollections({
  dir: 'content/docs',
  type: 'doc',
});

export const meta = defineCollections({
  dir: 'content/docs',
  type: 'meta',
});

export default defineConfig();
