# OrbitBoard

Practical online tools for work, money, everyday tasks and developers.

OrbitBoard is a utility-first platform providing free calculators, converters, PDF tools, image/file utilities and developer tools. Core tools are designed to work without an account, and many file/data tools process content directly in the browser.

## Categories

- Career
- Finance
- Everyday
- Developer
- PDF, document and file utilities

## Stack

- React
- Vite
- Tailwind CSS
- Supabase
- Vercel

## Local development

```bash
npm install
npm run dev
```

Open http://localhost:5173.

## Production build

```bash
npm run build
npm run preview
```

## Environment

Create `.env` from `.env.example` and configure:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

## Project structure

```text
src/
├── components/       Shared UI
├── data/             Tool catalogue and SEO content
├── engines/          PDF and spreadsheet processing
├── lib/              Supabase, analytics and telemetry
├── pages/            Home, catalogue and tool routes
└── tools/            Individual tool implementations

public/
├── robots.txt
├── sitemap.xml
└── llms.txt
```

## Product direction

OrbitBoard is evolving from its original project-management prototype into a utility platform. The repository still contains some legacy PM code and database schema from that earlier product phase; treat those files as legacy until they are audited and archived.

## Deployment

The production site is hosted at https://orbitboard.in.

Vercel can be connected to the GitHub repository for automated deployments. Keep production environment variables configured in the Vercel project rather than committing secrets.
