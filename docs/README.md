# Oconnector Documentation

Documentation site built with [Fumadocs](https://fumadocs.dev/).

## Getting Started

```bash
cd docs
npm install
npm run dev
```

Open [http://localhost:3001](http://localhost:3001).

## Structure

```
docs/
ттт content/docs/          # MDX documentation
т   ттт index.mdx          # Home page
т   ттт getting-started/   # Overview, installation, config
т   ттт architecture/      # System overview, database, security
т   ттт backend/           # API reference, services
т   ттт frontend/          # React structure, components
т   ттт features/          # Automation, CRM, Marketing
т   ттт deployment/        # Cloudflare deploy guide
т   ттт guides/            # Troubleshooting
ттт app/                   # Next.js App Router
т   ттт layout.tsx         # Root layout with Fumadocs provider
т   ттт page.tsx           # Home page
т   ттт [[...slug]]/       # Dynamic doc pages
ттт components/            # Index page and layouts
```

## Build

```bash
npm run build
npm run start
```

## Deploy

Deploy to Cloudflare Pages:

```bash
npx wrangler pages deploy .vercel/output/static --project-name=Oconnector-docs
```
