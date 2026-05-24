# Astro Multilingual Blog Template

A public-safe multilingual Astro static blog template with deployment automation for Cloudflare Pages, VPS, and Vercel.

## Quick Start

```bash
pnpm install
pnpm check
pnpm build
pnpm dev
```

npm is also supported:

```bash
npm install
npm run check
npm run build
npm run dev
```

## Public-Safe Template

This copy is prepared for public Git hosting:

- Real `.env` files are excluded.
- Private posts, GA4 IDs, API keys, tokens, and personal domains are removed.
- Example values use `example.com`.
- Deployment scripts are cross-platform Node.js scripts.
- Both pnpm and npm are supported.

## Content

Blog posts live under:

```text
src/content/blog
```

This template includes one public-safe example post in each supported locale:

```text
src/content/blog/zh-tw/getting-started.md
src/content/blog/en/getting-started.md
src/content/blog/zh-cn/getting-started.md
```

These posts use `draft: false`, so the homepage, post list, category pages, tag pages, sitemap, and deployment checks work immediately after cloning.

## Rename Before Deploying

Review and update:

- `package.json`: project package name.
- `wrangler.toml`: Cloudflare Pages project name.
- `.env.cloudflare`: `CLOUDFLARE_PAGES_PROJECT_NAME`.
- `src/lib/site.ts`: site name, author, URL, description, and contact email.
- `astro.config.mjs`: `site` fallback and any `base` setting.
- `public/_headers`: CSP and security headers for your real domain and third-party resources.

## Deployment

Interactive bilingual menu:

```bash
pnpm deploy:menu
npm run deploy:menu
```

Direct examples:

```bash
pnpm deploy:cf:only
pnpm deploy:vps:only
pnpm deploy:vercel:only
pnpm deploy:all
```

Dry run:

```bash
pnpm deploy:switch --mode=direct:cf --dry-run
npm run deploy:switch -- --mode=direct:cf --dry-run
```

## Safe Astro Upgrade

```bash
pnpm upgrade:astro -- --lang=en --dry-run
pnpm upgrade:astro -- --lang=zh-tw
npm run upgrade:astro -- --lang=en --dry-run
```

The upgrade script detects Astro-related packages, refuses dirty git state by default, supports pnpm/npm, and verifies with the existing `check`, `lint`, and `build` scripts.

## Guides

- [English deployment guide](./DEPLOYMENT.en.md)
- [Traditional Chinese deployment guide](./部屬前須知.md)
- [Scripts overview](./scripts/README.en.md)
