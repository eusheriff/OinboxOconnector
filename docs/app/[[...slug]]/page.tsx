import { DocsPage, DocsBody } from 'fumadocs-ui/page';
import { notFound } from 'next/navigation';
import { docs } from '@/.source';
import { createMDXComponents } from 'fumadocs-mdx/ui';
import { Docs } from '@/components/index-page';

export default async function Page({
  params,
}: {
  params: Promise<{ slug?: string[] }>;
}) {
  const { slug } = await params;
  const page = docs.getPage(slug);

  if (!page) {
    notFound();
  }

  const MDXContent = page.data.body;

  return (
    <Docs>
      <DocsPage
        toc={page.data.toc}
        full={page.data.full}
        tableOfContent={{ style: 'clerk' }}
      >
        <DocsBody>
          <h1>{page.data.title}</h1>
          {page.data.description && (
            <p className="text-muted-foreground -mt-4">{page.data.description}</p>
          )}
          <MDXContent components={createMDXComponents()} />
        </DocsBody>
      </DocsPage>
    </Docs>
  );
}

export async function generateStaticParams() {
  return docs.generateParams();
}
