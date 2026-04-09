import { RootProvider } from 'fumadocs-ui/provider';
import { Inter } from 'next/font/google';
import type { ReactNode } from 'react';
import Link from 'next/link';
import './global.css';

const inter = Inter({
  subsets: ['latin'],
});

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR" className={inter.className} suppressHydrationWarning>
      <body className="flex flex-col min-h-screen">
        <RootProvider
          search={{
            options: {
              api: '/api/search',
            },
          }}
        >
          {children}
        </RootProvider>
      </body>
    </html>
  );
}
