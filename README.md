# Astro Multilingual Blog Template

A public-safe Astro static blog template with multilingual routes, SEO, privacy preferences, bookmarks, and deployment automation for Cloudflare Pages, VPS, and Vercel.

## Features

- English root routes with Traditional Chinese and Simplified Chinese locales
- Markdown/MDX posts, categories, tags, pagination, and pinned posts
- Responsive navigation, bookmarks, clock, cookie preferences, and accessibility support
- Sitemap, robots.txt, canonical URLs, JSON-LD, Open Graph, and security headers
- Cloudflare Pages deployment that detects the project's production branch automatically
- Astro checks, ESLint, Stylelint, Jest, Playwright, and project self-analysis

## Guides

- [Traditional Chinese README](./README.zh-TW.md)
- [Markdown writing guide](./MARKDOWN_GUIDE.md)
- [Bookmark guide](./BOOKMARKS_GUIDE.en.md)
- [Traditional Chinese bookmark guide](./BOOKMARKS_GUIDE.zh-TW.md)
- [Deployment guide](./DEPLOYMENT.en.md)
- [Traditional Chinese deployment guide](./部屬前須知.md)
- [Scripts overview](./scripts/README.en.md)

## Routes

English is the default locale and uses the root route `/`. Traditional Chinese uses `/zh-tw/`, and Simplified Chinese uses `/zh-cn/`.

Example posts are stored under:

```text
src/content/blog/en/
src/content/blog/zh-tw/
src/content/blog/zh-cn/
```

## Quick Start

```bash
pnpm install
pnpm check
pnpm build
pnpm dev
```

The project also supports npm:

```bash
npm install
npm run build
```

## Configuration

Copy `.env.example` to `.env` and set:

```env
PUBLIC_SITE_URL=https://example.com
PUBLIC_CONTACT_EMAIL=hello@example.com
PUBLIC_GA4_ID=
```

Do not commit real credentials or deployment environment files.

## Deployment

Use the guided menu:

```bash
pnpm deploy:menu
```

Or deploy directly:

```bash
pnpm deploy:cf:only
pnpm deploy:vps:only
pnpm deploy:vercel:only
pnpm deploy:all
```

Cloudflare deployment reads the configured Pages project's production branch automatically. Pass `--branch=<name>` only when an explicit override is required.

## Verification

```bash
pnpm check
pnpm lint
pnpm lint:css
pnpm test
pnpm analyze
```
