import Link from 'next/link';
import { DocsLayout } from 'fumadocs-ui/layouts/docs';
import type { ReactNode } from 'react';
import { docs } from '@/.source';

export function Docs({ children }: { children: ReactNode }) {
  return (
    <DocsLayout
      tree={docs}
      nav={{
        title: 'Oconnector Docs',
        url: '/',
      }}
    >
      {children}
    </DocsLayout>
  );
}

const sections = [
  {
    title: 'Getting Started',
    description: 'Instalação, configuração e primeiros passos',
    href: '/getting-started/overview',
    icon: null,
  },
  {
    title: 'Arquitetura',
    description: 'Estrutura do sistema, banco de dados e segurança',
    href: '/architecture/overview',
    icon: null,
  },
  {
    title: 'Backend API',
    description: 'Referência completa de todas as rotas da API',
    href: '/backend/api-reference',
    icon: null,
  },
  {
    title: 'Frontend',
    description: 'Componentes, hooks, services e estrutura do React',
    href: '/frontend/structure',
    icon: null,
  },
  {
    title: 'Fluxos de Dados',
    description: 'Automação, CRM, Inbox Unificado e Marketing Studio',
    href: '/features/overview',
    icon: null,
  },
  {
    title: 'Deployment',
    description: 'Deploy na Cloudflare e troubleshooting',
    href: '/deployment/cloudflare',
    icon: null,
  },
];

export function IndexPage() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-16">
      {/* Hero */}
      <div className="text-center mb-16">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 text-sm font-medium mb-6">
          v1.0.0
        </div>
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-4">
          Documentação Oconnector
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Sistema Operacional Imobiliário com CRM, Inbox Unificado, Automação e Marketing. Tudo em
          uma única plataforma.
        </p>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {sections.map((section) => (
          <Link
            key={section.href}
            href={section.href}
            className="group block p-6 rounded-xl border bg-card hover:bg-accent/50 hover:border-primary/50 transition-all"
          >
            {section.icon && <div className="text-2xl mb-3">{section.icon}</div>}
            <h3 className="font-semibold text-lg mb-1 group-hover:text-primary transition-colors">
              {section.title}
            </h3>
            <p className="text-sm text-muted-foreground">{section.description}</p>
          </Link>
        ))}
      </div>

      {/* Footer */}
      <div className="mt-16 text-center text-sm text-muted-foreground">
        <p>Oconnector � Real Estate Operating System</p>
        <p className="mt-1">Todos os direitos reservados a Oconnector.tech Tecnologia</p>
      </div>
    </div>
  );
}
