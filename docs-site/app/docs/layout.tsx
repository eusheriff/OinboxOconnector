import { DocsLayout } from 'fumadocs-ui/layouts/docs';
import { source } from '@/app/source';
import type { ReactNode } from 'react';

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <DocsLayout
      tree={source.pageTree}
      nav={{
        title: 'Oinbox Docs',
        url: '/docs',
      }}
      sidebar={{
        collapsible: true,
        defaultOpenLevel: 1,
      }}
      links={[
        {
          text: 'API Reference',
          url: '/docs/api',
        },
        {
          text: 'Architecture',
          url: '/docs/architecture',
        },
      ]}
    >
      {children}
    </DocsLayout>
  );
}
