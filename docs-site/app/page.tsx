import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="flex flex-col min-h-screen bg-white selection:bg-blue-100">
      {/* Hero Section */}
      <section className="pt-24 pb-16 px-6 sm:px-10 lg:px-20 max-w-5xl mx-auto text-center">
        <div className="inline-flex items-center rounded-full px-3 py-1 text-sm font-medium bg-blue-50 text-blue-700 mb-6">
          Oinbox Ecosystem Documentation
        </div>

        <h1 className="text-4xl sm:text-6xl font-bold tracking-tight text-gray-900 mb-6 leading-tight">
          Omnichannel Platform for{' '}
          <span className="text-blue-600">Real Estate</span>
        </h1>

        <p className="max-w-2xl mx-auto text-lg sm:text-xl text-gray-600 mb-10 leading-relaxed">
          Technical documentation for the Oinbox SaaS platform. Architecture
          guides, API references, deployment runbooks, and integration patterns.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
          <Link
            href="/docs"
            className="inline-flex items-center justify-center rounded-lg px-6 py-3 text-sm font-semibold transition-all bg-blue-600 text-white hover:bg-blue-700 shadow-sm hover:shadow"
          >
            Get Started
          </Link>
          <Link
            href="/docs/api"
            className="inline-flex items-center justify-center rounded-lg px-6 py-3 text-sm font-semibold transition-all bg-white text-gray-700 ring-1 ring-gray-300 hover:bg-gray-50 hover:ring-gray-400"
          >
            API Reference
          </Link>
        </div>
      </section>

      {/* Cards Section */}
      <section className="py-12 px-6 sm:px-10 lg:px-20 max-w-5xl mx-auto w-full">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            {
              title: 'Architecture',
              desc: 'Cloudflare Workers, D1, R2, multi-tenant isolation, and system diagrams.',
              href: '/docs/architecture',
              icon: (
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z"
                  />
                </svg>
              ),
            },
            {
              title: 'API Reference',
              desc: 'Complete REST API documentation — auth, CRM, properties, WhatsApp, billing.',
              href: '/docs/api',
              icon: (
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5"
                  />
                </svg>
              ),
            },
            {
              title: 'Guides',
              desc: 'Step-by-step instructions for deployment, migration, and integration.',
              href: '/docs/guides',
              icon: (
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25"
                  />
                </svg>
              ),
            },
          ].map((item) => (
            <Link
              key={item.title}
              href={item.href}
              className="group relative p-6 rounded-xl border border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50/50 transition-all"
            >
              <div className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-blue-50 text-blue-600 mb-3 group-hover:bg-blue-100 transition-colors">
                {item.icon}
              </div>
              <h3 className="text-base font-semibold text-gray-900 mb-1.5 group-hover:text-blue-700 transition-colors">
                {item.title}
              </h3>
              <p className="text-gray-500 leading-relaxed text-sm">
                {item.desc}
              </p>
            </Link>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto py-8 text-center text-gray-400 text-xs border-t border-gray-100">
        &copy; {new Date().getFullYear()} Euimob Tecnologia. All rights
        reserved.
      </footer>
    </main>
  );
}
