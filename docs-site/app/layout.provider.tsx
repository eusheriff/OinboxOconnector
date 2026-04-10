'use client';

import { RootProvider } from 'fumadocs-ui/provider';
import { source } from '@/app/source';
import type { ReactNode } from 'react';

export function Provider({ children }: { children: ReactNode }) {
  return (
    <RootProvider
      search={{
        provider: 'static',
      }}
    >
      {children}
    </RootProvider>
  );
}
