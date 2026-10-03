# @zonatic/web

Zonatic landing page (V1).

## Stack

- Next.js 16 (App Router) with static export (`output: "export"`)
- React 19
- TypeScript
- Tailwind CSS v4 (CSS-first config via `@theme`)
- Lucide icons
- Cloudflare Pages-compatible (pure static output)

## Scripts

```bash
pnpm dev        # local dev on http://localhost:3000
pnpm build      # static export to apps/web/out/
pnpm start      # serve the production build
pnpm lint       # next lint
```

The build output (`apps/web/out/`) is the directory that Cloudflare Pages
(or any static host) should serve. No Node runtime is required at the edge.

## Layout

```
src/
  app/
    globals.css     Tailwind v4 entry + design tokens
    layout.tsx      Root layout, metadata, viewport
    page.tsx        Landing page composition
    not-found.tsx   404 page
  components/       All landing-page sections (server components by default)
  lib/utils.ts      cn() helper (clsx + tailwind-merge)
public/             Static assets (favicon, robots.txt)
```

## Constraints

This package is intentionally isolated:

- It does not import from `app/` (FastAPI backend).
- It does not import from `supabase/` (database layer).
- It uses static mock data only.

The landing page may link to placeholder routes (`/docs`, `/sign-in`,
`/playground`); those will return a 404 until the corresponding pages
exist. No fake functionality is exposed through the page itself.