import fs from 'fs';
import path from 'path';

const contentDir = '/Volumes/LexarAPFS/Oinbox/oinbox/docs-site/content/docs';

function extractTOC(content) {
  const lines = content.split('\n');
  const toc = [];
  for (const line of lines) {
    const match = line.match(/^(##|###)\s+(.*)/);
    if (match) {
      const depth = match[1].length;
      const title = match[2].trim();
      const id = title.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');
      toc.push({ id, title, depth, url: `#${id}` });
    }
  }
  return toc;
}

function processDirectory(dir, baseSlug = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const children = [];
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const slug = [...baseSlug, entry.name.replace('.mdx', '')];
    
    if (entry.isDirectory()) {
      const result = processDirectory(fullPath, slug);
      children.push({
        type: 'folder',
        name: entry.name,
        children: result.tree
      });
      files.push(...result.files);
    } else if (entry.name.endsWith('.mdx')) {
      const content = fs.readFileSync(fullPath, 'utf8');
      const titleMatch = content.match(/title:\s*["']?(.*?)["']?(\r?\n|$)/);
      const title = titleMatch ? titleMatch[1].trim() : entry.name.replace('.mdx', '');
      const toc = extractTOC(content);
      const isIndex = entry.name === 'index.mdx';
      const finalSlug = isIndex ? baseSlug : slug;

      children.push({
        type: 'page',
        name: title,
        url: '/docs/' + finalSlug.join('/')
      });

      files.push({
        type: 'page',
        path: path.relative(contentDir, fullPath),
        slugs: finalSlug,
        data: {
          title,
          toc,
          body: content.replace(/---[\s\S]*?---/, '').trim()
        }
      });
    }
  }
  return { tree: children, files };
}

const { tree, files } = processDirectory(contentDir);

const sourceCode = `import { loader } from 'fumadocs-core/source';
import React from 'react';

// FULLY RECONSTRUCTED SOURCE FOR ANTIGRAVITY FIDELITY
export const source = loader({
  baseUrl: '/docs',
  source: {
    pageTree: ${JSON.stringify(tree, null, 2)},
    files: [
${files.map(f => `      {
        type: 'page',
        path: '${f.path}',
        slugs: ${JSON.stringify(f.slugs)},
        data: {
          title: '${f.data.title}',
          toc: ${JSON.stringify(f.data.toc)},
          body: () => React.createElement('div', { className: 'prose dark:prose-invert max-w-none' }, 
            React.createElement('div', { dangerouslySetInnerHTML: { __html: \`${f.data.body.replace(/`/g, '\\`').replace(/\$/g, '\\$')}\` } })
          )
        }
      }`).join(',\n')}
    ]
  } as any,
});
`;

fs.writeFileSync('/Volumes/LexarAPFS/Oinbox/oinbox/docs-site/app/source.ts', sourceCode);
console.log('Successfully updated app/source.ts with Full PageTree and Files');
